"""Pull the latest A-share close from Tushare and prepare data for the dashboard."""
import datetime as dt
import html
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("TUSHARE_TOKEN="):
            os.environ.setdefault("TUSHARE_TOKEN", line.split("=", 1)[1].strip())
TOKEN = os.environ.get("TUSHARE_TOKEN")
if not TOKEN:
    raise SystemExit("TUSHARE_TOKEN is missing")

def query(api_name, params, fields):
    body = json.dumps({"api_name": api_name, "token": TOKEN, "params": params, "fields": fields}).encode()
    req = Request("https://api.tushare.pro", data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=45) as response:
        payload = json.loads(response.read().decode())
    if payload.get("code", 0) != 0:
        raise RuntimeError(payload.get("msg", "Tushare request failed"))
    data = payload.get("data", {})
    return [dict(zip(data.get("fields", []), row)) for row in data.get("items", [])]

HISTORY_DAYS = 240
today = dt.date.today().strftime("%Y%m%d")
# 240 个交易日约等于一年的日线；预留自然日缓冲以覆盖节假日。
calendar = query("trade_cal", {"exchange": "SSE", "start_date": (dt.date.today()-dt.timedelta(days=420)).strftime("%Y%m%d"), "end_date": today, "is_open": "1"}, "cal_date")
if not calendar:
    raise RuntimeError("No recent SSE trading day returned")
# The calendar can contain today's planned session before the provider has
# published its post-close file.  Search newest to oldest for actual records.
daily = []
trade_date = None
for session in sorted(calendar, key=lambda x: x["cal_date"], reverse=True):
    candidate = query("daily", {"trade_date": session["cal_date"]}, "ts_code,trade_date,open,high,low,close,pre_close,pct_chg,vol,amount")
    if candidate:
        trade_date, daily = session["cal_date"], candidate
        break
if not daily or not trade_date:
    raise RuntimeError("No completed daily stock records found in the recent trading calendar")
stock_meta = query("stock_basic", {"exchange": "", "list_status": "L"}, "ts_code,name,industry")
names = {x["ts_code"]: x["name"] for x in stock_meta}
industry_map = {x["ts_code"]: x.get("industry") or "其他" for x in stock_meta}
basics = {x["ts_code"]: x for x in query("daily_basic", {"trade_date": trade_date}, "ts_code,turnover_rate")}
# Tushare 的 net_mf_amount 单位为万元，换算后统一以亿元展示。
moneyflow = {x["ts_code"]: x.get("net_mf_amount") or 0 for x in query("moneyflow", {"trade_date": trade_date}, "ts_code,net_mf_amount")}
indices = {}
for code, label in (("000001.SH", "上证指数"), ("399001.SZ", "深证成指"), ("399006.SZ", "创业板指"), ("899050.BJ", "北证50"), ("000688.SH", "科创50"), ("000300.SH", "沪深300")):
    row = query("index_daily", {"ts_code": code, "trade_date": trade_date}, "ts_code,trade_date,close,pct_chg,amount")
    if row:
        indices[label] = row[0]

up = sum(1 for x in daily if (x.get("pct_chg") or 0) > 0)
down = sum(1 for x in daily if (x.get("pct_chg") or 0) < 0)
limit_up = sum(1 for x in daily if (x.get("pct_chg") or 0) >= 9.8)
limit_down = sum(1 for x in daily if (x.get("pct_chg") or 0) <= -9.8)
all_stocks = sorted((x for x in daily if (x.get("amount") or 0) > 0), key=lambda x: (x.get("amount") or 0), reverse=True)
stocks = [{"name": names.get(x["ts_code"], x["ts_code"]), "code": x["ts_code"], "industry": industry_map.get(x["ts_code"], "其他"), "close": x.get("close"), "pct_chg": x.get("pct_chg"), "amount_billion": round((x.get("amount") or 0) / 100000, 2), "net_flow_billion": round(moneyflow.get(x["ts_code"], 0) / 10000, 2), "volume": x.get("vol"), "turnover_rate": basics.get(x["ts_code"], {}).get("turnover_rate")} for x in all_stocks]
industry_buckets = {}
for x in daily:
    group = industry_map.get(x["ts_code"], "其他")
    bucket = industry_buckets.setdefault(group, {"name": group, "count": 0, "amount": 0, "net_flow": 0, "pct_sum": 0})
    bucket["count"] += 1; bucket["amount"] += x.get("amount") or 0; bucket["net_flow"] += moneyflow.get(x["ts_code"], 0); bucket["pct_sum"] += x.get("pct_chg") or 0
industries = [{"name": x["name"], "count": x["count"], "amount_billion": round(x["amount"] / 100000, 1), "net_flow_billion": round(x["net_flow"] / 10000, 1), "pct_chg": round(x["pct_sum"] / x["count"], 2)} for x in industry_buckets.values() if x["count"] >= 5]
output = {
    "as_of": trade_date,
    "source": "Tushare Pro",
    "indices": indices,
    "market": {"turnover_billion": round(sum((x.get("amount") or 0) for x in daily) / 100000, 1), "net_flow_billion": round(sum(moneyflow.values()) / 10000, 1), "up": up, "down": down, "limit_up": limit_up, "limit_down": limit_down},
    "stocks": stocks,
    "industries": sorted(industries, key=lambda x: x["pct_chg"], reverse=True),
}
target = ROOT / "data" / "market.json"
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
# Build a rolling year of real post-close daily bars for every tradable A-share.
# A manifest means subsequent closing updates only request the newly completed
# session rather than downloading the complete history again.
history_dir = ROOT / "data" / "history"
history_dir.mkdir(exist_ok=True)
manifest_path = history_dir / "history_manifest.json"
try:
    stored_sessions = set(json.loads(manifest_path.read_text(encoding="utf-8")).get("sessions", []))
except (OSError, json.JSONDecodeError):
    stored_sessions = set()
sessions = sorted(x["cal_date"] for x in calendar)[-HISTORY_DAYS:]
history = {}
for path in history_dir.glob("*.json"):
    if path.name == manifest_path.name:
        continue
    try:
        saved = json.loads(path.read_text(encoding="utf-8"))
        history[saved["code"]] = saved.get("bars", [])
    except (OSError, json.JSONDecodeError, KeyError):
        continue

for session in sessions:
    if session in stored_sessions:
        continue
    session_rows = daily if session == trade_date else query("daily", {"trade_date": session}, "ts_code,trade_date,open,high,low,close,vol,amount")
    for row in session_rows:
        if (row.get("amount") or 0) <= 0:
            continue
        history.setdefault(row["ts_code"], []).append([row["trade_date"], row.get("open"), row.get("high"), row.get("low"), row.get("close"), row.get("vol"), row.get("amount")])
for code, bars in history.items():
    # Deduplicate in case a recovery job re-fetches an already stored session.
    compact = {row[0]: row for row in bars}
    bars = [compact[date] for date in sorted(compact)[-HISTORY_DAYS:]]
    (history_dir / f"{code}.json").write_text(json.dumps({"code": code, "as_of": trade_date, "bars": bars}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
manifest_path.write_text(json.dumps({"as_of": trade_date, "sessions": sessions}, ensure_ascii=False), encoding="utf-8")
rows = "".join(f"<tr><td>{i}</td><td>{html.escape(str(x['name']))}</td><td>{x['code']}</td><td>{x['close']:.2f}</td><td class={'up' if x['pct_chg'] >= 0 else 'down'}>{x['pct_chg']:+.2f}%</td><td>{x['amount_billion']:.2f} 亿</td><td>{x['turnover_rate'] or '-'}%</td><td>{x['volume'] or '-'}</td></tr>" for i, x in enumerate(stocks, 1))
(ROOT / "data" / "stocks.html").write_text(f"<!doctype html><meta charset='utf-8'><title>A股全市场个股表</title><style>body{{font-family:'Microsoft YaHei',sans-serif;color:#172b38;padding:18px}}table{{width:100%;border-collapse:collapse;font-size:13px}}th{{position:sticky;top:0;background:#172b38;color:white}}td,th{{padding:10px;border-bottom:1px solid #e6e8e5;text-align:left}}.up{{color:#d95742}}.down{{color:#06756f}}</style><h2>A股全市场个股表 · {trade_date}</h2><p>共 {len(stocks)} 只，按成交额排序</p><table><thead><tr><th>#</th><th>股票</th><th>代码</th><th>收盘</th><th>涨跌幅</th><th>成交额</th><th>换手率</th><th>成交量(手)</th></tr></thead><tbody>{rows}</tbody></table>", encoding="utf-8")
print(f"Updated A-share close for {trade_date}: {len(daily)} stocks, {len(history)} K-line histories, {len(sessions)} trading days")

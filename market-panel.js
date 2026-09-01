fetch('data/market.json?v=6')
  .then(response => response.json())
  .then(data => {
    const market = data.market || {}, indices = data.indices || {};
    const number = value => Number(value || 0);
    const indexValue = value => number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = value => `${number(value) >= 0 ? '+' : ''}${number(value).toFixed(2)}%`;
    const color = value => number(value) >= 0 ? 'rise' : 'fall';
    const fillMetric = (key, title, value, detail, state = 'muted') => {
      const card = document.querySelector(`[data-metric="${key}"]`);
      if (!card) return;
      card.querySelector('p').textContent = title;
      card.querySelector('strong').innerHTML = value;
      const note = card.querySelector('em'); note.textContent = detail; note.className = state;
    };
    const shanghai = indices['上证指数'] || {}, shenzhen = indices['深证成指'] || {};
    fillMetric('shanghai', '上证指数', indexValue(shanghai.close), pct(shanghai.pct_chg), number(shanghai.pct_chg) >= 0 ? 'up' : 'down');
    fillMetric('shenzhen', '深证成指', indexValue(shenzhen.close), pct(shenzhen.pct_chg), number(shenzhen.pct_chg) >= 0 ? 'up' : 'down');
    fillMetric('turnover', '成交额', `${(number(market.turnover_billion) / 10000).toFixed(2)} 万亿`, '全市场成交额');
    fillMetric('breadth', '市场宽度', `${market.up || 0} <small>/ ${market.down || 0}</small>`, `${market.up || 0} 上涨 · ${market.down || 0} 下跌`, 'up');
    const limits = document.querySelector('[data-limit-value]');
    if (limits) limits.textContent = `${market.limit_up || 0} / ${market.limit_down || 0}`;
    const flowSignal = document.querySelector('[data-signal="flow"] b');
    if (flowSignal) { const netFlow = number(market.net_flow_billion); flowSignal.textContent = `${netFlow >= 0 ? '+' : ''}${netFlow.toFixed(1)}`; flowSignal.className = color(netFlow); flowSignal.insertAdjacentHTML('beforeend', ' <small>亿</small>'); }

    const panel = document.querySelector('#indexPanel'), list = ['创业板指', '科创50', '北证50', '沪深300'];
    if (panel) panel.innerHTML = `<div class="index-head">主要指数 · ${data.as_of || '最近完整收盘日'}</div><div class="index-grid">${list.map(name => { const item = indices[name] || {}; return `<div class="index-item"><span>${name}</span><b>${indexValue(item.close)}</b><em class="${color(item.pct_chg)}">${pct(item.pct_chg)}</em></div>`; }).join('')}</div><div class="market-line"><span>全市场：</span>${market.up || 0} 家上涨 · ${market.down || 0} 家下跌　<span>主力净流入：</span><b class="${color(market.net_flow_billion)}">${number(market.net_flow_billion) >= 0 ? '+' : ''}${number(market.net_flow_billion).toFixed(1)} 亿</b>　<span>涨停 / 跌停：</span>${market.limit_up || 0} / ${market.limit_down || 0}</div>`;

    const map = document.querySelector('.heatmap');
    const render = mode => {
      const amount = mode === 'amount', flow = mode === 'flow';
      const value = item => amount ? item.amount_billion : flow ? item.net_flow_billion : item.pct_chg;
      const ascending = flow ? item => item.net_flow_billion < 0 : item => item.pct_chg < 0;
      const up = data.industries.filter(item => flow ? item.net_flow_billion >= 0 : item.pct_chg >= 0).sort((a, b) => value(b) - value(a)).slice(0, 20);
      const down = data.industries.filter(ascending).sort((a, b) => value(a) - value(b)).slice(0, 20);
      const largest = Math.max(...up.map(value), ...down.map(item => Math.abs(value(item))), 1);
      const card = item => { const primary = flow ? `${number(item.net_flow_billion) >= 0 ? '+' : ''}${number(item.net_flow_billion).toFixed(1)}<small class="flow-unit">亿</small>` : `${item.pct_chg >= 0 ? '+' : ''}${item.pct_chg}%`; const detail = flow ? `涨跌 ${item.pct_chg >= 0 ? '+' : ''}${item.pct_chg}% · ${item.count}股` : `${item.amount_billion}亿 · ${item.count}股`; const intensity = Math.max(.12, Math.abs(value(item)) / largest); const direction = value(item) >= 0 ? 'rise-tile' : 'fall-tile'; return `<a class="sector-card ${direction}" style="--shade:${Math.round(intensity * 15)}%;--bar:${Math.round(22 + intensity * 74)}%" href="#industry" data-industry="${item.name}"><b>${item.name}</b><strong>${primary}</strong><small>${detail}</small></a>`; };
      const leftTitle = amount ? '高成交行业' : flow ? '资金净流入' : '涨幅行业';
      const rightTitle = amount ? '其余活跃行业' : flow ? '资金净流出' : '跌幅行业';
      map.innerHTML = `<div class="sector-col rise-col"><h3>${leftTitle}</h3><div>${up.map(card).join('')}</div></div><div class="sector-col fall-col"><h3>${rightTitle}</h3><div>${down.map(card).join('')}</div></div>`;
    };
    render('pct');
    const modal = document.querySelector('#industryModal');
    const openIndustry = industry => {
      const stocks = (data.stocks || []).filter(stock => stock.industry === industry).sort((a, b) => b.amount_billion - a.amount_billion);
      const sector = (data.industries || []).find(item => item.name === industry) || {};
      const volume = stocks.reduce((total, stock) => total + number(stock.volume), 0);
      const upCount = stocks.filter(stock => number(stock.pct_chg) > 0).length;
      const netFlow = number(sector.net_flow_billion);
      document.querySelector('#industryTitle').textContent = `${industry} · 股票池`;
      document.querySelector('#industryMeta').textContent = `${stocks.length} 只成分股 · 按当日成交额排序`;
      document.querySelector('#industrySummary').innerHTML = `<div><span>板块涨跌幅</span><b class="${color(sector.pct_chg)}">${number(sector.pct_chg) >= 0 ? '+' : ''}${number(sector.pct_chg).toFixed(2)}%</b><small>${upCount} 上涨 · ${stocks.length - upCount} 下跌</small></div><div><span>成交量</span><b>${(volume / 10000).toFixed(1)} 万手</b><small>当日合计</small></div><div><span>成交额</span><b>${number(sector.amount_billion).toFixed(1)} 亿</b><small>行业合计</small></div><div><span>主力资金</span><b class="${color(netFlow)}">${netFlow >= 0 ? '+' : ''}${netFlow.toFixed(1)} 亿</b><small>净流入 / 流出</small></div>`;
      document.querySelector('#industryBody').innerHTML = stocks.length ? `<table><thead><tr><th>股票</th><th>收盘</th><th>涨跌幅</th><th>成交额</th><th>换手率</th></tr></thead><tbody>${stocks.map(stock => `<tr><td><a href="data/stock_detail.html?code=${encodeURIComponent(stock.code)}">${stock.name}<span class="industry-modal__code">${stock.code}</span></a></td><td>${Number(stock.close).toFixed(2)}</td><td class="${stock.pct_chg >= 0 ? 'up' : 'down'}">${stock.pct_chg >= 0 ? '+' : ''}${Number(stock.pct_chg).toFixed(2)}%</td><td>${stock.amount_billion} 亿</td><td>${stock.turnover_rate ?? '-'}%</td></tr>`).join('')}</tbody></table>` : '<p class="industry-modal__empty">该行业暂无可展示的成分股。</p>';
      modal.hidden = false; modal.setAttribute('aria-hidden', 'false');
    };
    map.addEventListener('click', event => { const card = event.target.closest('[data-industry]'); if (!card) return; event.preventDefault(); openIndustry(card.dataset.industry); });
    modal.addEventListener('click', event => { if (event.target.matches('[data-close-industry]') || event.target.closest('[data-close-industry]')) { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); } });
    document.querySelector('.heat-filter')?.addEventListener('click', event => {
      if (event.target.tagName !== 'BUTTON') return;
      const button = event.target;
      document.querySelectorAll('.heat-filter button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected'); render(button.textContent.includes('成交') ? 'amount' : button.textContent.includes('资金') ? 'flow' : 'pct');
    });
  })
  .catch(() => { const panel = document.querySelector('#indexPanel'); if (panel) panel.innerHTML = '<p>收盘指数暂未载入，请稍后刷新。</p>'; });

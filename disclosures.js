(() => {
  const panel = document.querySelector('#disclosures');
  if (!panel) return;
  const $ = selector => panel.querySelector(selector);
  const text = value => String(value || '').trim();
  const date = value => text(value).length === 8 ? `${text(value).slice(0, 4)}.${text(value).slice(4, 6)}.${text(value).slice(6)}` : text(value);
  const detailUrl = code => `data/stock_detail.html?code=${encodeURIComponent(code)}&from=${encodeURIComponent('/index.html#disclosures')}`;
  Promise.all([fetch(`data/reports.json?v=${Date.now()}`, { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject()), fetch(`data/market.json?v=${Date.now()}`, { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject())])
    .then(([feed, market]) => {
      const names = new Map((market.stocks || []).map(stock => [stock.code, stock.name]));
      const reports = (feed.reports || []).slice().sort((a, b) => text(b.report_date).localeCompare(text(a.report_date)) || text(a.ts_code).localeCompare(text(b.ts_code)));
      $('#reportCoverage').textContent = feed.coverage ? `${date(feed.coverage.start)} 起 · 已接入` : '已接入';
      $('#reportCount').textContent = `${reports.length.toLocaleString()} 条研报`;
      $('#reportRows').innerHTML = reports.slice(0, 12).map(report => {
        const code = text(report.ts_code), name = names.get(code) || code;
        return `<article class="report-row"><time>${date(report.report_date)}</time><div><p><a href="${detailUrl(code)}">${name}</a><a class="report-code" href="${detailUrl(code)}">${code}</a><span class="report-org">${text(report.org_name) || '机构未标注'}</span></p><b>${text(report.report_title) || '研报标题未提供'}</b></div><span class="rating">${text(report.rating) || text(report.report_type) || '研报'}</span></article>`;
      }).join('') || '<p class="report-loading">当前范围内暂无可展示研报。</p>';
    })
    .catch(() => { $('#reportCoverage').textContent = '研报数据待生成'; $('#reportCount').textContent = '—'; $('#reportRows').innerHTML = '<p class="report-loading">研报历史正在生成；完成后刷新本页即可查看。</p>'; });
})();

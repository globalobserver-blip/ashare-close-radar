(() => {
  let source = [];
  let filtered = [];
  let page = 1;
  const $ = selector => document.querySelector(selector);
  const storageKey = 'radar-groups';
  const groups = () => JSON.parse(localStorage.getItem(storageKey) || '{}');
  const detailUrl = code => `stock_detail.html?code=${encodeURIComponent(code)}&from=${encodeURIComponent('/index.html#all-stocks')}`;

  const draw = () => {
    const start = (page - 1) * 50;
    const items = filtered.slice(start, start + 50);
    const group = $('#g').value;
    const saved = groups();
    $('#b').innerHTML = items.map((stock, index) => {
      const active = (saved[group] || []).includes(stock.code);
      const change = Number(stock.pct_chg);
      const sign = change > 0 ? '+' : '';
      const tone = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
      return `<tr><td>${start + index + 1}</td><td><a href="${detailUrl(stock.code)}">${stock.name}</a><a href="${detailUrl(stock.code)}"><small>${stock.code}</small></a></td><td>${Number(stock.close).toFixed(2)}</td><td class="${tone}">${sign}${Number(stock.pct_chg).toFixed(2)}%</td><td>${stock.amount_billion}亿</td><td>${stock.turnover_rate ?? '-'}%</td><td><button class="add ${active ? 'added' : ''}" data-code="${stock.code}">${active ? '已加入' : '加入自选'}</button></td></tr>`;
    }).join('');
    $('#n').textContent = `${filtered.length}只`;
    $('#pg').textContent = `第${page}/${Math.max(1, Math.ceil(filtered.length / 50))}页`;
    document.querySelectorAll('#b .add').forEach(button => {
      button.onclick = () => {
        const saved = groups();
        const group = $('#g').value;
        const code = button.dataset.code;
        saved[group] = saved[group] || [];
        saved[group] = saved[group].includes(code) ? saved[group].filter(item => item !== code) : [...saved[group], code];
        localStorage.setItem(storageKey, JSON.stringify(saved));
        draw();
      };
    });
  };

  const filter = () => {
    const term = $('#q').value.trim().toLowerCase();
    filtered = source.filter(stock => `${stock.name}${stock.code}`.toLowerCase().includes(term));
    page = 1;
    draw();
  };

  fetch(`market.json?v=${Date.now()}`, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => {
      if (!Array.isArray(data.stocks) || !data.stocks.length) throw Error();
      source = data.stocks;
      filter();
    })
    .catch(() => { $('#b').innerHTML = '<tr><td colspan="7" class="load-error">行情数据暂未载入，请刷新页面后重试。</td></tr>'; });

  $('#q').oninput = filter;
  $('#g').onchange = draw;
  $('#prev').onclick = () => { if (page > 1) { page--; draw(); } };
  $('#next').onclick = () => { if (page < Math.ceil(filtered.length / 50)) { page++; draw(); } };
})();

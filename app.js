const rows = document.querySelector('#stockRows');
const detailHref = code => `data/stock_detail.html?code=${encodeURIComponent(code)}&from=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`;
const pctClass = value => Number(value) > 0 ? 'up' : Number(value) < 0 ? 'down' : 'flat';
const pctText = value => `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
const renderRows = stocks => {
  if (!rows) return;
  rows.innerHTML = stocks.map(stock => `<tr><td><a class="stock-link" href="${detailHref(stock.code)}"><b>${stock.name}</b></a><a class="code stock-link" href="${detailHref(stock.code)}">${stock.code}</a></td><td>${Number(stock.close).toFixed(2)}</td><td class="${pctClass(stock.pct_chg)}">${pctText(stock.pct_chg)}</td><td>${stock.amount_billion} 亿</td><td><span class="pill">成交额居前</span></td><td>→</td></tr>`).join('');
};

const renderScanner = data => {
  const mount = document.querySelector('#scannerMount');
  if (!mount) return;
  let source = data.stocks || [], filtered = source, page = 1;
  const groupsKey = 'radar-groups';
  const getGroups = () => JSON.parse(localStorage.getItem(groupsKey) || '{}');
  const draw = () => {
    const group = mount.querySelector('#scannerGroup').value, start = (page - 1) * 50, visible = filtered.slice(start, start + 50), groups = getGroups();
    mount.querySelector('#scannerRows').innerHTML = visible.map((stock, index) => {
      const saved = (groups[group] || []).includes(stock.code);
      return `<tr><td>${start + index + 1}</td><td><a href="${detailHref(stock.code)}">${stock.name}</a><a class="scanner-code" href="${detailHref(stock.code)}">${stock.code}</a></td><td>${Number(stock.close).toFixed(2)}</td><td class="${pctClass(stock.pct_chg)}">${pctText(stock.pct_chg)}</td><td>${stock.amount_billion} 亿</td><td>${stock.turnover_rate ?? '-'}%</td><td><button class="scanner-add ${saved ? 'saved' : ''}" data-code="${stock.code}">${saved ? '已加入' : '加入自选'}</button></td></tr>`;
    }).join('');
    mount.querySelector('#scannerCount').textContent = `${filtered.length} 只`;
    mount.querySelector('#scannerPage').textContent = `第 ${page} / ${Math.max(1, Math.ceil(filtered.length / 50))} 页`;
    mount.querySelectorAll('.scanner-add').forEach(button => button.onclick = () => { const groups = getGroups(), group = mount.querySelector('#scannerGroup').value, code = button.dataset.code; groups[group] = groups[group] || []; groups[group] = groups[group].includes(code) ? groups[group].filter(item => item !== code) : [...groups[group], code]; localStorage.setItem(groupsKey, JSON.stringify(groups)); draw(); });
  };
  mount.innerHTML = `<div class="scanner-intro"><p class="eyebrow">FULL MARKET UNIVERSE · ${data.as_of || ''}</p><h1>个股扫描</h1><p>搜索、浏览并加入本地分组；全部数据以最近完整收盘日为准。</p></div><div class="scanner-bar"><input id="scannerQuery" placeholder="搜索名称或代码"><select id="scannerGroup"><option>观察池</option><option>长期跟踪</option><option>事件关注</option></select><span class="scanner-count" id="scannerCount"></span></div><div class="scanner-wrap"><table class="scanner-table"><thead><tr><th>#</th><th>股票</th><th>收盘</th><th>涨跌幅</th><th>成交额</th><th>换手率</th><th>自选</th></tr></thead><tbody id="scannerRows"></tbody></table></div><div class="scanner-pager"><button id="scannerPrev">← 上一页</button><span id="scannerPage"></span><button id="scannerNext">下一页 →</button></div>`;
  mount.querySelector('#scannerQuery').oninput = event => { const query = event.target.value.toLowerCase(); filtered = source.filter(stock => `${stock.name}${stock.code}`.toLowerCase().includes(query)); page = 1; draw(); };
  mount.querySelector('#scannerGroup').onchange = draw;
  mount.querySelector('#scannerPrev').onclick = () => { if (page > 1) { page--; draw(); } };
  mount.querySelector('#scannerNext').onclick = () => { if (page < Math.ceil(filtered.length / 50)) { page++; draw(); } };
  draw();
};

fetch(`data/market.json?scanner=${Date.now()}`)
  .then(response => response.ok ? response.json() : Promise.reject())
  .then(data => {
    renderRows((data.stocks || []).slice(0, 5));
    renderScanner(data);
    const status = document.querySelector('.status');
    if (status && data.as_of) status.innerHTML = `<i></i>上一交易日已收盘 <strong>${data.as_of.slice(4, 6)}.${data.as_of.slice(6)} · ${data.source || '数据源'}</strong>`;
    const eyebrow = document.querySelector('.intro .eyebrow');
    if (eyebrow && data.as_of) eyebrow.textContent = `LATEST COMPLETE CLOSE / ${data.as_of.slice(0, 4)}.${data.as_of.slice(4, 6)}.${data.as_of.slice(6)}`;
  })
  .catch(() => renderRows([]));

document.querySelector('.primary')?.addEventListener('click', event => {
  event.currentTarget.innerHTML = '今日复盘已就绪 <span>✓</span>';
  event.currentTarget.style.background = '#06756f';
});

const updateButton = document.querySelector('#manualUpdate');
updateButton?.addEventListener('click', async () => {
  updateButton.disabled = true;
  updateButton.textContent = '更新中…';
  try {
    const response = await fetch('http://127.0.0.1:4174/api/update', { method: 'POST' });
    if (!response.ok) throw Error();
    const poll = async () => {
      const status = await fetch('http://127.0.0.1:4174/api/status').then(item => item.json());
      if (status.running) return setTimeout(poll, 2000);
      updateButton.textContent = status.ok ? '已更新，刷新页面' : '更新失败，查看日志';
      updateButton.disabled = false;
      if (status.ok) setTimeout(() => location.reload(), 700);
    };
    poll();
  } catch (_) {
    updateButton.textContent = '更新服务未启动';
    updateButton.disabled = false;
  }
});

document.querySelectorAll('.stock-frame').forEach(frame => frame.addEventListener('load', () => {
  const embeddedNav = frame.contentDocument?.querySelector('.scan-nav');
  if (embeddedNav) embeddedNav.remove();
  const embeddedScan = frame.contentDocument?.querySelector('.scan');
  if (embeddedScan) embeddedScan.style.paddingTop = '18px';
  const tableBody = frame.contentDocument?.querySelector('#b');
  tableBody?.addEventListener('click', event => {
    if (event.target.tagName !== 'SMALL') return;
    const code = event.target.textContent.trim();
    if (code) frame.contentWindow.location.href = `stock_detail.html?code=${encodeURIComponent(code)}`;
  });
}));

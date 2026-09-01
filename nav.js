(() => {
  const nav = document.querySelector('nav');
  const workspace = document.querySelector('#workspace');
  const market = document.querySelectorAll('.intro,.metrics,.thesis,.layout');
  if (!nav || !workspace) return;
  const stockCards = `
    <article class="stock-card"><b>中际旭创</b><small>300308.SZ</small><span class="price">858.35</span><footer><span class="muted">-0.90%</span><button class="add-watch">加入自选</button></footer></article>
    <article class="stock-card"><b>亨通光电</b><small>600487.SH</small><span class="price">68.70</span><footer><span class="muted">-3.65%</span><button class="add-watch">加入自选</button></footer></article>
    <article class="stock-card"><b>新易盛</b><small>300502.SZ</small><span class="price">399.00</span><footer><span class="muted">-2.47%</span><button class="add-watch">加入自选</button></footer></article>`;
  const content = {
    stocks: `<div class="workspace-header"><div><p class="eyebrow">LAST COMPLETE CLOSE</p><h1>个股扫描</h1><p>基于上一完整交易日的成交额排序。</p></div><input class="search-input" placeholder="搜索名称或代码" /></div><div class="stock-grid">${stockCards}</div>`,
    disclosures: `<div class="workspace-header"><div><p class="eyebrow">DISCLOSURE CENTER</p><h1>公告研报</h1><p>按重要度归档的公司披露与机构观点。</p></div></div><div class="disclosure-grid"><article class="disclosure-card"><span class="type">业绩公告</span><b>定期报告与业绩预告</b><p>将接入巨潮资讯官方公告并提供原文入口。</p><time>待接入</time></article><article class="disclosure-card"><span class="type">公司公告</span><b>回购、分红与重大事项</b><p>后续自动分类、去重、关联自选股。</p><time>待接入</time></article><article class="disclosure-card"><span class="type">机构观点</span><b>研报与评级变动</b><p>保留机构、日期、摘要和授权来源链接。</p><time>待接入</time></article></div>`,
    watchlist: `<div class="workspace-header"><div><p class="eyebrow">MY LIST</p><h1>自选股</h1><p>在个股扫描中点击“加入自选”即可建立关注列表。</p></div></div><div class="watch-empty">还没有自选股。<button data-target="stocks">去个股扫描添加 →</button></div>`
  };
  function go(view) {
    nav.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    market.forEach(section => { section.hidden = view !== 'market'; });
    workspace.hidden = view === 'market';
    if (view !== 'market') workspace.innerHTML = content[view];
    workspace.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => go(button.dataset.target)));
  }
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) go(button.dataset.view);
  });
  window.__radarNavigationReady = true;
})();

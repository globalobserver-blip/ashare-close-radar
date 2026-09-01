(() => {
  const style = document.createElement('style');
  style.textContent = '.up,.rise{color:#cf4e3d!important}.down,.fall{color:#08756f!important}.flat{color:#172b38!important}';
  document.head.append(style);

  const normalizeFlat = () => document.querySelectorAll('.up,.down,.rise,.fall').forEach(node => {
    if (!/^[+-]?0(?:\.0+)?%$/.test(node.textContent.trim())) return;
    node.classList.remove('up', 'down', 'rise', 'fall');
    node.classList.add('flat');
  });

  normalizeFlat();
  new MutationObserver(normalizeFlat).observe(document.documentElement, { childList: true, subtree: true });
})();

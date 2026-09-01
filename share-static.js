(function () {
  const button = document.getElementById('manualUpdate');
  if (!button) return;

  button.disabled = true;
  button.textContent = '公开快照';
  button.title = '公开版由维护者在本地更新数据后重新发布';
  button.setAttribute('aria-label', '公开数据快照，仅显示最近一次发布的数据');
})();

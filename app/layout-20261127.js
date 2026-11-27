(() => {
  const hud = document.getElementById('hud');
  const tabs = hud?.querySelector('.appTabs');
  if (!tabs) return;
  const sync = () => {
    const segments = window.visualViewport?.segments || window.getWindowSegments?.() || [];
    const [left, right] = Array.from(segments).sort((a,b) => a.left - b.left);
    const dual = segments.length === 2 && right.left > left.left && Math.abs(right.top - left.top) < 4;
    hud.dataset.vinciDual = String(dual);
    if (dual) hud.style.setProperty('--vinci-hinge', `${Math.max(0, right.left - left.right)}px`);
    else hud.style.removeProperty('--vinci-hinge');
    hud.style.setProperty('--vinci-nav-height', `${tabs.getBoundingClientRect().height}px`);
  };
  new ResizeObserver(sync).observe(tabs);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);
  sync();
})();

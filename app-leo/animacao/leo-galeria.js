(() => {
  const hud = document.getElementById('hud');
  const avatar = document.getElementById('leoOficialPoster');
  const logo = avatar.getAttribute('src');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const gallery = Array.from({length: 10}, (_, i) =>
    `animacao/aprovadas/${String(i + 2).padStart(2, '0')}-robo-leo.png`);
  const active = () => !document.hidden && !reducedMotion.matches &&
    hud.dataset.tab === 'home' && ['listening', 'thinking', 'speaking'].includes(hud.dataset.state);
  let frame = 0;
  function update() {
    if (!active()) {
      if (avatar.getAttribute('src') !== logo) avatar.src = logo;
      return;
    }
    const next = gallery[frame++ % gallery.length];
    const image = new Image();
    image.onload = () => {
      if (!active()) return;
      avatar.src = next;
      avatar.animate([{opacity: 0.55}, {opacity: 1}], {duration: 280});
    };
    image.src = next;
  }
  setInterval(update, 1300);
  new MutationObserver(update).observe(hud, {attributes: true, attributeFilter: ['data-state', 'data-tab']});
})();

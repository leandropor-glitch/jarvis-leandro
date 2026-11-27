const canvas = document.getElementById('paola-particles');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const tau = 2 * Math.PI;
function draw(time) {
  const t = reduced.matches ? 0 : time / 1000;
  ctx.clearRect(0, 0, 360, 360);
  for (let strand = 0; strand < 3; strand++) {
    for (let i = 0; i < 105; i++) {
      const u = tau * i / 105;
      const phase = 2 * u + strand * tau / 3 + t * .42;
      const radius = 105 + 19 * Math.cos(phase);
      const x = radius * Math.cos(u);
      const y = radius * Math.sin(u) * .63;
      const z = 46 * Math.sin(phase);
      const angle = t * .29;
      const depth = z * Math.cos(angle) - x * Math.sin(angle);
      const scale = 280 / (280 - depth);
      ctx.fillStyle = strand === 0 ? '#ddfbff' : strand === 1 ? '#54e8ff' : '#527fff';
      ctx.globalAlpha = Math.max(.24, Math.min(.94, .62 + depth / 330));
      ctx.beginPath();
      ctx.arc(180 + (x * Math.cos(angle) + z * Math.sin(angle)) * scale, 180 + y * scale, 1.5 * scale, 0, tau);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

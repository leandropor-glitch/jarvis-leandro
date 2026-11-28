const TAU = Math.PI * 2;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const eyes = new Map();
const target = { x: 0, y: 0 };
window.addEventListener(
  "pointermove",
  (event) => {
    target.x = event.clientX / Math.max(1, innerWidth) - 0.5;
    target.y = event.clientY / Math.max(1, innerHeight) - 0.5;
  },
  { passive: true },
);

function draw(canvas, time, still) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  const w = Math.round(rect.width * dpr),
    h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, w, h);
  const s = Math.min(w * 0.91, h * 1.48),
    r = s * 0.181;
  c.save();
  c.translate(w / 2, h / 2);
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, s * 0.6);
  glow.addColorStop(0, "rgba(35,173,226,.16)");
  glow.addColorStop(1, "rgba(0,50,90,0)");
  c.fillStyle = glow;
  c.fillRect(-w / 2, -h / 2, w, h);
  const phase = still ? 0 : time / 6500;
  for (let row = -9; row <= 9; row++) {
    for (let col = -16; col <= 16; col++) {
      const x = (col * s) / 24,
        y =
          (row * s) / 25 +
          s * 0.026 * Math.sin(col * 0.31 + row * 0.14 + phase);
      const f = Math.min(1, Math.hypot(x / s, y / s));
      c.fillStyle = "rgba(74,191,230," + (0.07 + f * 0.14) + ")";
      c.beginPath();
      c.arc(x, y, s * 0.0019, 0, TAU);
      c.fill();
    }
  }
  c.beginPath();
  c.moveTo(-s * 0.48, 0);
  c.bezierCurveTo(-s * 0.2, -s * 0.33, s * 0.2, -s * 0.33, s * 0.48, 0);
  c.bezierCurveTo(s * 0.2, s * 0.33, -s * 0.2, s * 0.33, -s * 0.48, 0);
  c.closePath();
  c.fillStyle = "rgba(4,33,52,.82)";
  c.fill();
  c.lineWidth = Math.max(1.2, s * 0.006);
  c.strokeStyle = "#92edf7";
  c.shadowBlur = s * 0.025;
  c.shadowColor = "#37cbe8";
  c.stroke();
  c.shadowBlur = 0;
  c.clip();
  c.translate(
    still ? 0 : target.x * s * 0.072,
    still ? 0 : target.y * s * 0.064,
  );
  const iris = c.createRadialGradient(-r * 0.26, -r * 0.3, r * 0.09, 0, 0, r);
  iris.addColorStop(0, "#b7ffff");
  iris.addColorStop(0.55, "#3ddcea");
  iris.addColorStop(0.85, "#167c9c");
  iris.addColorStop(1, "#05263c");
  c.fillStyle = iris;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  for (let i = 0; i < 238; i++) {
    const a = (i * TAU) / 238,
      b = a + 0.025 * Math.sin(i * 71),
      j = 0.8 + 0.16 * Math.sin(i * 39.73);
    c.beginPath();
    c.moveTo(Math.cos(a) * r * 0.31, Math.sin(a) * r * 0.31);
    c.quadraticCurveTo(
      Math.cos(b + 0.035) * r * 0.63,
      Math.sin(b + 0.035) * r * 0.63,
      Math.cos(b) * r * j,
      Math.sin(b) * r * j,
    );
    c.lineWidth = Math.max(0.42, r * 0.007);
    c.strokeStyle = i % 3 ? "#368caa75" : "#c6ffffaa";
    c.stroke();
  }
  c.fillStyle = "#031321";
  c.beginPath();
  c.arc(0, 0, r * 0.3, 0, TAU);
  c.fill();
  c.fillStyle = "#e0ffffc9";
  c.beginPath();
  c.ellipse(-r * 0.31, -r * 0.38, r * 0.145, r * 0.084, -0.73, 0, TAU);
  c.fill();
  c.restore();
}
let next = 0;
function loop(time) {
  if (!document.hidden && time >= next) {
    next = time + 48;
    for (const [canvas, visible] of eyes)
      if (visible) draw(canvas, time, reduced.matches);
  }
  requestAnimationFrame(loop);
}
export function startEyes() {
  const observer = new IntersectionObserver((entries) =>
    entries.forEach((x) => eyes.set(x.target, x.isIntersecting)),
  );
  document.querySelectorAll("[data-eye]").forEach((x) => observer.observe(x));
  requestAnimationFrame(loop);
}

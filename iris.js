// Desbloqueio de íris do Felyx (Lite, PRO, FULL e app): um radar que mira em quem está diante da tela
// (não nos olhos do Felyx), a fala "Efetuando desbloqueio de íris", a varredura com cliques, o "tanarã" de validação
// e "Íris desbloqueada com sucesso" com calma. Só então o rosto do Felyx aparece.
// Uso: no toque, felyxIris.preparar(); depois await felyxIris.desbloquear(elementoDoRosto).
// As falas vêm de iris-sons.js (voz Algieba). Sem som liberado, a animação roda do mesmo jeito.
(function () {
  let ctx = null;
  const buffers = {};

  function preparar() { // chamar dentro do toque: libera o som no Safari e no Chrome
    const AC = window.AudioContext || window.webkitAudioContext;
    try { if (!ctx || ctx.state === 'closed') ctx = new AC(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
    ['anuncio', 'sucesso'].forEach((n) => carregar(n).catch(() => {}));
  }
  async function carregar(nome) {
    if (buffers[nome]) return buffers[nome];
    const sons = window.FELYX_IRIS_SONS || {};
    if (!ctx || !sons[nome]) throw new Error('sem som');
    const ab = await fetch(sons[nome]).then((r) => r.arrayBuffer());
    buffers[nome] = await new Promise((ok, falha) => ctx.decodeAudioData(ab, ok, falha));
    return buffers[nome];
  }
  async function tocar(nome) { // termina quando a fala acaba; sem som, espera o tempo aproximado
    try {
      const buf = await carregar(nome);
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
      await new Promise((fim) => { src.onended = fim; src.start(); setTimeout(fim, buf.duration * 1000 + 300); });
    } catch (e) { await espera(nome === 'anuncio' ? 2600 : 3000); }
  }
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  function tom(t, f0, f1, dur, vol, tipo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function varredura(seg) { // zumbido baixo que sobe e desce + cliques de leitura
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(380, t + seg * 0.6); o.frequency.linearRampToValueAtTime(220, t + seg);
    f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.2); g.gain.setValueAtTime(0.035, t + seg - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + seg);
    o.connect(f).connect(g).connect(ctx.destination); o.start(t); o.stop(t + seg + 0.1);
    for (let i = 0, k = 0; i < seg - 0.15; k++) { tom(t + i, 2600 + (k % 3) * 350, 0, 0.035, 0.05, 'square'); i += 0.09 + Math.random() * 0.16; }
  }
  function tanara() { // "tanarã": validação em três notas subindo
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.03;
    tom(t, 784, 0, 0.16, 0.09, 'triangle'); tom(t + 0.16, 1047, 0, 0.16, 0.09, 'triangle'); tom(t + 0.32, 1568, 0, 0.6, 0.08, 'triangle');
  }

  // radar desenhado por cima do rosto: anéis, varredura girando, mira central e pontos de leitura
  function radar(alvo) {
    if (getComputedStyle(alvo).position === 'static') alvo.style.position = 'relative';
    const tela = document.createElement('div');
    // fundo preto opaco entrando rápido: o rosto não aparece por baixo do radar
    tela.style.cssText = 'position:absolute;inset:0;z-index:20;background:#000;border-radius:inherit;overflow:hidden;opacity:0;transition:opacity .18s;pointer-events:none';
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    tela.append(cv); alvo.appendChild(tela);
    requestAnimationFrame(() => { tela.style.opacity = '1'; });
    const c2 = cv.getContext('2d'); let fase = 'lendo', t0 = performance.now(), vivo = true, sucessoEm = 0, legenda = '';
    // a legenda é desenhada no próprio radar, numa linha só, no tamanho que couber no círculo (no iPhone o rosto é pequeno)
    function escrever(W, H, cx, cy, R, dpr) {
      if (!legenda) return;
      const txt = legenda.toUpperCase(), y = cy + R * 0.66, larguraMax = 2 * Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) * 0.86;
      let tam = Math.max(8 * dpr, R * 0.1), esp = 0.22;
      const medir = () => { c2.font = `600 ${tam}px ui-monospace, Menlo, monospace`; return c2.measureText(txt).width + txt.length * tam * esp; };
      while (medir() > larguraMax && tam > 6 * dpr) { tam *= 0.92; esp = Math.max(0.08, esp * 0.9); }
      c2.save(); c2.textAlign = 'left'; c2.textBaseline = 'middle'; c2.fillStyle = '#d6ff1a'; c2.shadowColor = 'rgba(214,255,26,.6)'; c2.shadowBlur = 10 * dpr;
      let x = cx - medir() / 2 + tam * esp / 2;
      for (const ch of txt) { c2.fillText(ch, x, y); x += c2.measureText(ch).width + tam * esp; }
      c2.restore();
    }
    const pontos = Array.from({ length: 14 }, () => ({ a: Math.random() * Math.PI * 2, r: 0.25 + Math.random() * 0.7, v: 0 }));
    function desenhar(agora) {
      if (!vivo) return;
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.42, t = (agora - t0) / 1000, ang = t * 2.4;
      c2.clearRect(0, 0, W, H);
      const ok = fase === 'ok', cor = (a) => `rgba(214,255,26,${a})`;
      c2.lineWidth = 1 * dpr;
      for (let i = 1; i <= 4; i++) { c2.strokeStyle = cor(0.12 + i * 0.05); c2.beginPath(); c2.arc(cx, cy, R * i / 4, 0, Math.PI * 2); c2.stroke(); }
      c2.strokeStyle = cor(0.18);
      c2.beginPath(); c2.moveTo(cx - R, cy); c2.lineTo(cx + R, cy); c2.moveTo(cx, cy - R); c2.lineTo(cx, cy + R); c2.stroke();
      if (!ok) { // feixe girando
        const g = c2.createConicGradient ? c2.createConicGradient(ang - 0.9, cx, cy) : null;
        if (g) { g.addColorStop(0, 'rgba(214,255,26,0)'); g.addColorStop(0.14, 'rgba(214,255,26,.28)'); g.addColorStop(0.145, 'rgba(214,255,26,0)'); c2.fillStyle = g; c2.beginPath(); c2.arc(cx, cy, R, 0, Math.PI * 2); c2.fill(); }
        c2.strokeStyle = cor(0.9); c2.lineWidth = 2 * dpr;
        c2.beginPath(); c2.moveTo(cx, cy); c2.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); c2.stroke();
        for (const p of pontos) { // pontos acendem quando o feixe passa
          const d = ((ang - p.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          if (d < 0.08) p.v = 1; p.v *= 0.965;
          if (p.v > 0.03) { c2.fillStyle = cor(p.v); c2.beginPath(); c2.arc(cx + Math.cos(p.a) * R * p.r, cy + Math.sin(p.a) * R * p.r, 2.6 * dpr, 0, Math.PI * 2); c2.fill(); }
        }
      }
      // mira central (é a sua íris que está sendo lida)
      const pulso = ok ? 1 : 0.75 + Math.sin(t * 6) * 0.25, rm = R * (ok ? 0.2 : 0.16 + Math.sin(t * 3) * 0.02);
      c2.strokeStyle = cor(ok ? 1 : pulso); c2.lineWidth = (ok ? 3 : 2) * dpr;
      c2.beginPath(); c2.arc(cx, cy, rm, 0, Math.PI * 2); c2.stroke();
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (ok ? 0 : t * 0.8); c2.beginPath(); c2.moveTo(cx + Math.cos(a) * rm * 1.25, cy + Math.sin(a) * rm * 1.25); c2.lineTo(cx + Math.cos(a) * rm * 1.8, cy + Math.sin(a) * rm * 1.8); c2.stroke(); }
      if (ok) { const k = Math.min(1, (agora - sucessoEm) / 500); c2.strokeStyle = cor(0.6 * (1 - k)); c2.lineWidth = 2 * dpr; c2.beginPath(); c2.arc(cx, cy, rm + R * 0.8 * k, 0, Math.PI * 2); c2.stroke(); }
      escrever(W, H, cx, cy, R, dpr);
      requestAnimationFrame(desenhar);
    }
    requestAnimationFrame(desenhar);
    return {
      texto(t) { legenda = t; },
      validar() { fase = 'ok'; sucessoEm = performance.now(); },
      async sair() { tela.style.transition = 'opacity .8s'; tela.style.opacity = '0'; await espera(820); vivo = false; tela.remove(); },
    };
  }

  let emCurso = null;
  function desbloquear(alvo) {
    if (!emCurso) emCurso = rodar(alvo).finally(() => { emCurso = null; });
    return emCurso;
  }
  async function rodar(alvo) {
    preparar();
    const r = radar(alvo);
    r.texto('desbloqueio de íris');
    await tocar('anuncio');
    r.texto('lendo íris');
    varredura(2.4); await espera(2450);
    r.validar(); r.texto('íris validada'); tanara(); await espera(700);
    await tocar('sucesso');
    await r.sair();
  }

  window.felyxIris = { preparar, desbloquear };
})();

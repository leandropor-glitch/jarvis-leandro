/* Botões dos Favoritos e Ambientes — 24/11/2026, Claude, pedido do Leandro.
   Felyx: botões quadrados (data-forma="quadrado"), todos do mesmo tamanho em Favoritos e Ambientes (25/11). Leda e Leo: retângulos (data-forma="retangulo").
   Em todos: o texto nunca encosta na borda (sobra pelo menos 7% de cada lado); a fonte diminui o
   quanto precisar e nome de duas palavras quebra em duas linhas, sem cortar palavra no meio. */
(function(){
  'use strict';
  const eu = document.currentScript, forma = (eu && eu.dataset.forma) || 'retangulo';
  const css = document.createElement('style');
  css.textContent = '.tile span{word-break:normal!important;overflow-wrap:normal!important;hyphens:none!important;line-height:1.15}'
    + '.tile{padding-left:7%!important;padding-right:7%!important}'
    + (forma === 'quadrado'
      ? '.matrix .grid{grid-template-columns:repeat(auto-fill,min(calc((100vw - 72px) / 4),104px))!important;gap:6px!important;justify-content:center!important}.matrix .grid,.amb .grid,.tiles{align-content:start}.tile{aspect-ratio:1/1;height:auto!important;min-height:0!important;font-size:.95rem!important}.tile span{font-size:1em!important;line-height:1.12!important;-webkit-line-clamp:2}'
      : '.matrix .grid{grid-auto-rows:auto!important;align-content:start!important}.matrix .tile,.tile{aspect-ratio:auto!important;height:auto!important;min-height:44px!important}.tile .rcIco{top:auto!important;bottom:5px!important;right:6px!important;width:12px!important;height:12px!important}');
  document.head.appendChild(css);
  const cv = document.createElement('canvas').getContext('2d');
  function largura(txt, fs, base){ cv.font = base.replace(/\d+(\.\d+)?px/, fs + 'px'); return cv.measureText(txt).width; }
  // Melhor divisão em até 2 linhas (pelas palavras) e a largura da linha maior.
  function linhas(txt, fs, base){
    const p = txt.split(/\s+/).filter(Boolean); let melhor = { n: 1, w: largura(txt, fs, base) };
    for(let i = 1; i < p.length; i++){ const w = Math.max(largura(p.slice(0, i).join(' '), fs, base), largura(p.slice(i).join(' '), fs, base)); if(w < melhor.w) melhor = { n: 2, w }; }
    return melhor;
  }
  function ajustar(t){
    const s = t.querySelector('span'); if(!s || !t.offsetParent) return;
    const txt = (s.textContent || '').trim(); if(!txt) return;
    s.style.removeProperty('font-size');
    const lw = t.clientWidth * 0.86, lh = t.clientHeight * 0.86; if(lw <= 0) return;
    const cs = getComputedStyle(s), base = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    if(forma === 'quadrado') return;   // Felyx: tamanho único por grade, calculado em tudo()
    let fs = parseFloat(cs.fontSize) || 12, n = 0;
    while(n++ < 40 && fs > 8 && (s.scrollWidth > lw + 0.5 || s.scrollHeight > s.clientHeight + 1)){ fs -= 0.5; s.style.setProperty('font-size', fs + 'px', 'important'); }
  }
  let agendado = 0;
  // Felyx (quadrado): uma fonte só para a grade inteira, pela palavra/nome que mais ocupa,
  // com 7% de margem de cada lado; nome de duas palavras pode ir em duas linhas.
  function maxFonte(t){
    const s = t.querySelector('span'); if(!s || !t.offsetParent) return null;
    const txt = (s.textContent || '').trim(); if(!txt) return null;
    const lw = t.clientWidth * 0.86, lh = t.clientHeight * 0.86; if(lw <= 0) return null;
    s.style.removeProperty('font-size');
    const cs = getComputedStyle(s), base = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    let lo = 8, hi = 60;
    for(let k = 0; k < 16; k++){ const fs = (lo + hi) / 2, l = linhas(txt, fs, base); if(l.w <= lw && l.n * fs * 1.12 <= lh) lo = fs; else hi = fs; }
    return lo;
  }
  function tudo(){
    agendado = 0;
    if(forma !== 'quadrado'){ document.querySelectorAll('.tile').forEach(ajustar); return; }
    const grades = new Map();
    document.querySelectorAll('.tile').forEach(t=>{ if(!t.offsetParent) return; const g = t.parentElement; if(!grades.has(g)) grades.set(g, []); grades.get(g).push(t); });
    grades.forEach(tiles=>{
      let fs = Infinity; tiles.forEach(t=>{ const m = maxFonte(t); if(m) fs = Math.min(fs, m); });
      if(!isFinite(fs)) return; fs = Math.floor(fs * 2) / 2;
      tiles.forEach(t=>{ const s = t.querySelector('span'); if(s){ s.style.setProperty('font-size', fs + 'px', 'important'); s.style.removeProperty('max-width'); } });
    });
  }
  function agendar(){ if(!agendado) agendado = requestAnimationFrame(tudo); }
  function iniciar(){
    tudo();
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true });
    addEventListener('resize', agendar);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* Fotos das notícias (Felyx, Leda e Léo) — 24/11/2026, Claude, pedido do Leandro.
   O servidor da Vinci acha a foto publicada pela própria fonte a cada 15 min (noticias-fotos.json).
   Aqui, toda notícia que aparecer sem foto recebe a foto da matéria; sem foto encontrada, fica um fundo
   na cor da IA com o nome da fonte, nunca a área preta. */
(function(){
  'use strict';
  const URL_FOTOS = 'https://ia.uservinci.com/vinci/noticias-fotos.json';
  let fotos = null, pedindo = null;
  const chave = t => String(t || '').replace(/\s+[-|]\s+[^-|]{2,40}$/, '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
  function carregar(){
    if(pedindo) return pedindo;
    pedindo = fetch(URL_FOTOS + '?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {}).then(j => { fotos = j || {}; return fotos; })
      .catch(() => { fotos = fotos || {}; return fotos; })
      .finally(() => { setTimeout(() => { pedindo = null; }, 600000); });
    return pedindo;
  }
  const css = document.createElement('style');
  css.textContent = '.news .slide .noimg{background:radial-gradient(ellipse at 25% 20%,rgba(var(--accent-rgb,201,138,75),.45),transparent 62%),radial-gradient(ellipse at 85% 90%,rgba(var(--accent-rgb,201,138,75),.22),transparent 55%),linear-gradient(160deg,#1a1d22,#0b0c0f)!important}'
    + '.news .slide .noimg::after{content:attr(data-fonte);font-size:1.1rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55)}';
  document.head.appendChild(css);
  function tratar(slide){
    const vazio = slide.querySelector('.noimg'); if(!vazio || slide.dataset.fotoVista) return;
    const tt = slide.querySelector('.tt'), src = slide.querySelector('.src');
    if(src && !vazio.dataset.fonte) vazio.dataset.fonte = String(src.textContent || '').replace(/^\s*fonte:\s*/i, '').split('·')[0].trim().slice(0, 24);
    if(!tt || !fotos) return;
    const f = fotos[chave(tt.textContent)];
    slide.dataset.fotoVista = '1';
    if(!/^https:\/\//.test(String(f || ''))) return;
    const img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    img.onload = () => { if(vazio.parentNode) vazio.replaceWith(img); };
    img.src = f;
  }
  // 25/11/2026 (Leandro): a checagem é no card da tela. Foto que não carrega volta a ser "sem foto" e recebe a da matéria.
  function quebradas(){
    document.querySelectorAll('.news .slide img').forEach(img => {
      if(img.dataset.vigia) return; img.dataset.vigia = '1';
      const falhou = () => { const s = img.closest('.slide'); if(!s) return; const d = document.createElement('div'); d.className = 'noimg'; img.replaceWith(d); delete s.dataset.fotoVista; if(fotos) tratar(s); };
      if(img.complete && img.naturalWidth === 0 && img.src) falhou(); else img.addEventListener('error', falhou, { once: true });
    });
  }
  function varrer(){ document.querySelectorAll('.news .slide').forEach(tratar); quebradas(); }
  function iniciar(){
    carregar().then(varrer);
    new MutationObserver(() => { if(fotos) varrer(); else carregar().then(varrer); }).observe(document.body, { childList: true, subtree: true });
    setInterval(() => { carregar().then(() => { document.querySelectorAll('.news .slide[data-foto-vista]').forEach(s => { if(s.querySelector('.noimg')) delete s.dataset.fotoVista; }); varrer(); }); }, 900000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

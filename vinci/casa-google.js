/* A casa como está no Google Link (25/11/2026, Leandro; versão oficial).
   1) Ambientes: barra de categorias (Iluminação, Ar-condicionado, TVs, Tomadas, Cenas, Outros) para separar os aparelhos
      do jeito que o Google os classifica (comodos.json → "categorias").
   2) Nomes de cena "de engenharia" ganham apelido na tela; o nome mandado para a casa não muda.
   3) Aparelhos com nome técnico, que não estão no Google, não aparecem.
   Não mexe no acionamento: só no que a tela mostra. */
(function(){
  'use strict';
  const APELIDOS = {
    'OffautACSala': 'Ar da sala: desligar automático', 'ONAutACSala': 'Ar da sala: ligar automático',
    'Cont aoff TV Suite': 'TV da suíte: desligar', 'Cont OnTV Suíte': 'TV da suíte: ligar',
    'Vol+ Z1': 'Volume + sala', 'Vol Z1': 'Volume sala', 'Vol SM': 'Volume suíte',
    '3wBM': 'Banheiro master', 'CH': 'Chuveiro', 'PW Z1': 'Som da sala', 'PW Z2': 'Som zona 2', 'PW Net': 'Internet',
    'MudoSM': 'Mudo suíte', 'CortDir': 'Cortina direita', 'OFF_Sala': 'Desligar sala', 'OFF Sala': 'Desligar sala'
  };
  const TECNICOS = /^(Switch \d+|Restart\d+s?|backlight switch|Cozinha switch \d+|Cab Leandro switch \d+|Interruptor desconhecido|Fita \d+|Ar)$/i;
  const ORDEM = ['Tudo', 'Iluminação', 'Ar-condicionado', 'TVs', 'Tomadas', 'Persianas', 'Cenas', 'Outros'];
  let filtro = 'Tudo';
  const nomeDe = (s) => (s && (s.dataset.nomeOriginal || s.textContent) || '').trim();
  const cfg = () => (typeof roomConfig !== 'undefined' && roomConfig) ? roomConfig : {};
  function categoria(nome, t){
    const c = (cfg().categorias || {})[nome]; if(c) return c;
    if(t && t.querySelector('.rcIco')) return 'TVs';   // TV e ar com o controle inteligente
    try{ if(typeof casaGen !== 'undefined' && (casaGen.cenas || []).includes(nome)) return 'Cenas'; }catch(e){}
    if(t && (t.classList.contains('scene-command') || t.querySelector('.rcIco'))) return t.querySelector('.rcIco') ? 'TVs' : 'Cenas';
    return 'Outros';
  }
  function barra(){
    const rb = document.getElementById('roomBar'); if(!rb) return null;
    let b = document.getElementById('catBar');
    if(!b){
      b = document.createElement('nav'); b.id = 'catBar'; b.className = 'catbar'; b.setAttribute('aria-label', 'Categorias');
      rb.insertAdjacentElement('afterend', b);
      b.addEventListener('click', e => { const x = e.target.closest('button[data-cat]'); if(!x) return; filtro = x.dataset.cat; aplicar(); });
    }
    return b;
  }
  function aplicar(){
    document.querySelectorAll('.tile span').forEach(s => {
      const n = nomeDe(s);
      if(APELIDOS[n] && s.textContent.trim() === n){ s.dataset.nomeOriginal = n; s.textContent = APELIDOS[n]; s.title = n; }
    });
    const grid = document.getElementById('grid'), rb = document.getElementById('roomBar');
    const emAmbientes = rb && rb.offsetParent !== null;
    const presentes = new Set(['Tudo']);
    document.querySelectorAll('#grid .tile').forEach(t => {
      const n = nomeDe(t.querySelector('span'));
      if(TECNICOS.test(n)){ t.style.display = 'none'; return; }
      const c = categoria(n, t); t.dataset.cat = c; presentes.add(c);
      t.style.display = (!emAmbientes || filtro === 'Tudo' || filtro === c) ? '' : 'none';
    });
    const b = barra();
    if(b){
      b.hidden = !emAmbientes;
      const cats = ORDEM.filter(c => presentes.has(c));
      if(!cats.includes(filtro)) filtro = 'Tudo';
      const html = cats.map(c => `<button type="button" data-cat="${c}" aria-pressed="${c === filtro}">${c}</button>`).join('');
      if(b.dataset.h !== html){ b.dataset.h = html; b.innerHTML = html; }
    }
    try{ if(typeof casaGen !== 'undefined' && Array.isArray(casaGen.aparelhos)){ const f = casaGen.aparelhos.filter(n => !TECNICOS.test(String(n).trim())); if(f.length !== casaGen.aparelhos.length) casaGen.aparelhos = f; } }catch(e){}
  }
  const css = document.createElement('style');
  css.textContent = '#catBar{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:-2px 0 8px}#catBar[hidden]{display:none}#catBar button{flex:0 0 auto;font:inherit;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:inherit;opacity:.75;cursor:pointer}#catBar button[aria-pressed="true"]{opacity:1;border-color:currentColor}';
  document.head.appendChild(css);
  let ag = 0; const agendar = () => { if(!ag) ag = requestAnimationFrame(() => { ag = 0; aplicar(); }); };
  function iniciar(){ aplicar(); new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'data-tab'] }); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* 25/11/2026 (Leandro): editar o que uma cena faz, nas IAs da Vinci (Felyx, Leda, Leo).
   No modo Editar, cada cena ganha os 3 pontinhos no canto de cima; eles abrem uma caixa com microfone e texto.
   Na conversa, a ferramenta editar_cena faz o mesmo. Quem interpreta é o Gemini (POST /api/vinci/cena-editar, acao interpretar);
   a gravação é na mesma rota (adicionar / definir / limpar). Não aciona nada na casa. */
(function(){
  'use strict';
  const IA = /\/(app-)?leda\//.test(location.pathname) ? 'leda' : /\/(app-)?leo\//.test(location.pathname) ? 'leo' : 'felyx';
  const URL_ = '/api/vinci/cena-editar';
  const sessao = () => { try{ if(typeof SESSAO !== 'undefined' && SESSAO) return SESSAO; }catch(e){}
    try{ return localStorage.getItem(IA === 'leo' ? 'vinci.google.leo.sessao' : IA === 'leda' ? 'leda_sessao' : 'felyx_sessao') || localStorage.getItem('felyx_sessao') || ''; }catch(e){ return ''; } };
  const nomesCasa = () => { try{ return (casaGen.aparelhos || []).concat(casaGen.cenas || []).slice(0, 400); }catch(e){ return []; } };
  const cenasCasa = () => { try{ return casaGen.cenas || []; }catch(e){ return []; } };
  async function chamar(corpo){
    const r = await fetch(URL_, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(Object.assign({ s: sessao(), ia: IA }, corpo)) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.ok) throw new Error(j.erro || j.error || ('falha ' + r.status));
    return j;
  }
  async function pedir(cena, pedido){
    cena = String(cena || '').trim().slice(0, 80); pedido = String(pedido || '').trim().slice(0, 600);
    if(!cena) return { ok:false, erro:'diga o nome da cena' };
    if(!pedido){ const j = await chamar({ acao:'ler', cena }); return { ok:true, cena, acoes: j.acoes || [] }; }
    if(/\b(original|limpar|apagar tudo|zerar|desfazer)\b/i.test(pedido)){ const j = await chamar({ acao:'limpar', cena }); return { ok:true, cena, acoes: j.acoes || [], texto: j.texto || 'Pronto.' }; }
    const it = await chamar({ acao:'interpretar', cena, pedido, aparelhos: nomesCasa() });
    const frases = (it.frases || []).map(f => String(f).trim()).filter(Boolean).slice(0, 10);
    if(!frases.length){ const p = it.pergunta || 'O que essa cena deve fazer?'; return { ok:true, cena, pergunta: p, texto: p }; }
    let j;
    if(/\b(s[óo]|somente|apenas)\b/i.test(pedido)){ j = await chamar({ acao:'definir', cena, frase: frases[0] }); for(const f of frases.slice(1)) j = await chamar({ acao:'adicionar', cena, frase: f }); }
    else for(const f of frases) j = await chamar({ acao:'adicionar', cena, frase: f });
    const acoes = (j && j.acoes) || frases;
    return { ok:true, cena, acoes, texto: 'Ok, combinado. Quando acionar ' + cena + ': ' + acoes.join('; ') + '.' };
  }
  async function tool({ cena, pedido }){ try{ return await pedir(cena, pedido); }catch(e){ return { ok:false, erro: String(e.message || e) }; } }
  const declaracao = { name:'editar_cena', behavior:'BLOCKING',
    description:'Muda o que uma CENA da casa faz quando é acionada (ex.: "quando eu clicar em Cama, aumenta o volume da TV Sala"). Passe o nome da cena e o pedido do cliente com as palavras dele. Se a resposta trouxer "pergunta" (ex.: qual televisão), faça a pergunta e chame de novo com a resposta. No fim diga "ok, combinado" e o que ficou. Para voltar a cena ao original, pedido "voltar ao original". Não aciona nada na casa.',
    parameters:{ type:'OBJECT', properties:{ cena:{ type:'STRING' }, pedido:{ type:'STRING' } }, required:['cena','pedido'] } };
  window.VinciCenaPedido = { pedir, tool, declaracao };

  /* caixa dos 3 pontinhos */
  const css = document.createElement('style');
  css.textContent = '.matrix .tile .cena-mais{display:none;position:absolute;top:2px;right:4px;z-index:3;font-size:1.1rem;line-height:1;padding:2px 6px;border-radius:8px;color:var(--accent,#ffd400);cursor:pointer;background:rgba(0,0,0,.35)}'
    + '.matrix[data-edit="1"] .tile.tem-mais::after{content:none!important}.matrix[data-edit="1"] .tile .cena-mais{display:block}'
    + 'dialog.cena-pedido{max-width:min(440px,92vw);width:100%;border:1px solid var(--accent,#ffd400);border-radius:16px;background:#0b0b0d;color:#f4f4f7;padding:18px;font:inherit}'
    + 'dialog.cena-pedido::backdrop{background:rgba(0,0,0,.6)}dialog.cena-pedido h3{margin:0 0 6px;font-size:18px}'
    + 'dialog.cena-pedido .cp-acoes{opacity:.75;font-size:14px;margin:0 0 10px}dialog.cena-pedido label{display:block;font-size:14px;margin-bottom:6px}'
    + 'dialog.cena-pedido textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid #333;background:#000;color:#f4f4f7;padding:10px;font:inherit}'
    + 'dialog.cena-pedido .cp-st{min-height:1.2em;font-size:14px;color:var(--accent,#ffd400)}dialog.cena-pedido .cp-bt{display:flex;flex-wrap:wrap;gap:8px}'
    + 'dialog.cena-pedido .cp-bt button{border-radius:10px;border:1px solid var(--accent,#ffd400);background:transparent;color:#f4f4f7;padding:8px 12px;font:inherit;cursor:pointer}';
  document.head.appendChild(css);
  function caixa(nome){
    let d = document.getElementById('cenaPedido');
    if(!d){
      d = document.createElement('dialog'); d.id = 'cenaPedido'; d.className = 'cena-pedido'; d.setAttribute('data-noswipe', '1');
      d.innerHTML = '<form method="dialog"><h3 id="cpTit"></h3><p class="cp-acoes" id="cpAcoes"></p><label for="cpTxt">O que esta cena deve fazer?</label><textarea id="cpTxt" rows="3" maxlength="600" placeholder="Ex.: quando eu clicar, aumente o volume da TV Sala"></textarea><p class="cp-st" id="cpSt" role="status" aria-live="polite"></p><div class="cp-bt"><button type="button" id="cpMic" aria-label="Falar">🎤</button><button type="button" id="cpOk">Salvar</button><button type="button" id="cpLimpar">Voltar ao original</button><button value="x">Fechar</button></div></form>';
      document.body.appendChild(d);
      const st = t => { d.querySelector('#cpSt').textContent = t; };
      const mostra = a => { d.querySelector('#cpAcoes').textContent = (a && a.length) ? 'Hoje faz: ' + a.join('; ') + '.' : 'Faz o que já fazia na casa.'; };
      d._envia = async (pedido) => { st(pedido ? 'Entendendo o pedido…' : 'Lendo a cena…');
        try{ const j = await pedir(d.dataset.cena, pedido); if(j.acoes) mostra(j.acoes); st(j.pergunta || j.texto || ''); if(pedido && !j.pergunta) d.querySelector('#cpTxt').value = ''; }
        catch(e){ st(/sessao/i.test(e.message) ? 'Entre de novo no aplicativo.' : 'Não consegui agora. Tente de novo.'); } };
      d.querySelector('#cpOk').onclick = () => { const t = d.querySelector('#cpTxt').value.trim(); if(!t){ st('Diga ou escreva o que a cena deve fazer.'); return; } d._envia(t); };
      d.querySelector('#cpLimpar').onclick = () => d._envia('voltar ao original');
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = d.querySelector('#cpMic');
      if(!SR) mic.hidden = true; else mic.onclick = () => { const r = new SR(); r.lang = 'pt-BR'; r.interimResults = false; st('Ouvindo…');
        r.onresult = e => { const t = e.results[0][0].transcript; d.querySelector('#cpTxt').value = t; d._envia(t); }; r.onerror = () => st('Não ouvi. Tente de novo ou escreva.'); r.start(); };
    }
    d.dataset.cena = nome; d.querySelector('#cpTit').textContent = nome; d.querySelector('#cpAcoes').textContent = ''; d.querySelector('#cpTxt').value = '';
    d.showModal(); d._envia('');
  }
  const nomeTile = t => { const s = t.querySelector('span'); return ((s && (s.dataset.nomeOriginal || s.textContent)) || '').trim(); };
  const ehCena = t => { if(t.dataset.cat === 'Cenas' || t.classList.contains('scene-command')) return true; const n = nomeTile(t); return cenasCasa().includes(n); };
  function marcar(){
    document.querySelectorAll('.matrix .tile').forEach(t => {
      const cena = ehCena(t), tem = t.querySelector(':scope>.cena-mais');
      if(cena && !tem){ const m = document.createElement('span'); m.className = 'cena-mais'; m.setAttribute('role', 'button'); m.tabIndex = 0; m.setAttribute('aria-label', 'O que esta cena faz'); m.textContent = '⋮'; t.appendChild(m); t.classList.add('tem-mais'); if(getComputedStyle(t).position === 'static') t.style.position = 'relative'; }
      if(!cena && tem){ tem.remove(); t.classList.remove('tem-mais'); }
    });
  }
  const abrir = ev => { const m = ev.target.closest && ev.target.closest('.cena-mais'); if(!m) return;
    if(ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault(); ev.stopImmediatePropagation(); const t = m.closest('.tile'); if(t) caixa(nomeTile(t)); };
  ['pointerdown', 'mousedown', 'touchstart'].forEach(tp => document.addEventListener(tp, ev => { if(ev.target.closest && ev.target.closest('.cena-mais')){ ev.stopImmediatePropagation(); } }, true));
  document.addEventListener('click', abrir, true); document.addEventListener('keydown', abrir, true);

  function ligar(){
    try{ if(typeof GEN_FERRAMENTAS !== 'undefined') GEN_FERRAMENTAS.editar_cena = tool; }catch(e){}
    try{ if(typeof GEN_TOOLS !== 'undefined' && GEN_TOOLS[0] && Array.isArray(GEN_TOOLS[0].functionDeclarations) && !GEN_TOOLS[0].functionDeclarations.some(d => d.name === 'editar_cena')) GEN_TOOLS[0].functionDeclarations.push(declaracao); }catch(e){}
    try{ if(typeof LEO_TOOLS_TELA !== 'undefined' && !LEO_TOOLS_TELA.some(d => d.name === 'editar_cena')){ LEO_TOOLS_TELA.push(declaracao); LEO_TELA_NOMES.add('editar_cena'); } }catch(e){}
    marcar(); new MutationObserver(() => { clearTimeout(ligar._t); ligar._t = setTimeout(marcar, 150); }).observe(document.body, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();

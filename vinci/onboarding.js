/* =====================================================================
   Onboarding Vinci (Felyx, Leda e Léo) — 14/11/2026
   Base: PDF "Alterações fundamentais · Vinci" (14/11). Visual, animado e curto:
   só o necessário (como chamar, casa Google ou Amazon, ambientes desta IA,
   recursos, contato, responsabilidades) e a ativação em até 24 horas.
   As respostas vão para o n8n (POST /webhook/vinci/onboarding, tabela
   vinci_onboarding, uma linha por telefone e IA) e entram no cérebro
   Gemini Live de cada app por VinciOnboarding.contexto().
   Nunca pede senha. Pontos ainda abertos (pagamento, preços, créditos,
   WhatsApp, ponte de cada IA) ficam em CONFIG, sem valor inventado.
   Usa as cores da página (--accent, --bg, --ink, --muted, --sans).
   ===================================================================== */
(function(){
  'use strict';

  /* ---------- pontos configuráveis (decisões ainda abertas do Leandro) ---------- */
  const CONFIG = {
    versao: '2026-11-14',
    url: 'https://vinciautomacao.app.n8n.cloud/webhook/vinci/onboarding',
    // Onboarding antes ou depois do pagamento: decisão aberta. Hoje ele roda no primeiro acesso ao app.
    momento: 'primeiro-acesso',
    // Ponte da casa. Google ainda em validação (PDF, item 7): aparece, mas marcado como em validação.
    pontes: [
      { id:'amazon', rotulo:'Amazon', detalhe:'Echo e dispositivos ligados à conta Amazon' },
      { id:'google', rotulo:'Google', detalhe:'Google Home (em validação pela Vinci)' },
      { id:'nao-sei', rotulo:'Ainda não sei', detalhe:'A Vinci confere com você na ativação' }
    ],
    // Recursos: o cliente marca o que contratou. Preços e franquias ficam fora até o Leandro decidir.
    recursos: {
      comum: [
        { id:'voz', rotulo:'Conversa por voz', fixo:true },
        { id:'casa', rotulo:'Controle da casa', fixo:true },
        { id:'noticias', rotulo:'Notícias e cotações' },
        { id:'liveavatar', rotulo:'Rosto em vídeo (Live Avatar)' },
        { id:'whatsapp', rotulo:'WhatsApp' }
      ],
      leda: [ { id:'receitas', rotulo:'Receitas' } ]
    },
    ambientesPadrao: ['Sala', 'Cozinha', 'Suíte', 'Quarto', 'Escritório', 'Varanda', 'Área de serviço'],
    textoPlano: 'Os valores seguem a sua proposta. Recursos extras podem ser ligados depois.'
  };

  const NOMES = { felyx:'Felyx', leda:'Leda', leo:'Léo' };
  const COM_ARTIGO = { felyx:'o Felyx', leda:'a Leda', leo:'o Léo' };
  let opt = { ia:'felyx', sessao: ()=>'' , salas: null };
  let perfil = null;          // perfil salvo (ou em edição)
  let aoTerminar = null;

  const chave = ()=> 'vinci.onb.' + opt.ia;
  const lerLocal = ()=>{ try{ return JSON.parse(localStorage.getItem(chave()) || 'null'); }catch(e){ return null; } };
  const gravarLocal = (p)=>{ try{ localStorage.setItem(chave(), JSON.stringify(p)); }catch(e){} };
  const esc = (s)=> String(s == null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const espera = (ms)=> new Promise(ok=>setTimeout(ok, ms));

  async function chamar(corpo){
    const s = opt.sessao(); if(!s) return null;
    try{
      const r = await Promise.race([
        fetch(CONFIG.url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({ s }, corpo)) }),
        espera(8000).then(()=>null)
      ]);
      if(!r) return null;
      let j = null; try{ j = await r.json(); }catch(e){}
      return j;
    }catch(e){ return null; }
  }

  /* ---------- perfil ---------- */
  async function carregar(){
    perfil = lerLocal();
    if(perfil && perfil.concluido) return perfil;
    const j = await chamar({ acao:'ler' });
    const p = j && j.ok && j.perfis && j.perfis[opt.ia] && j.perfis[opt.ia].perfil;
    if(p && p.concluido){ perfil = p; gravarLocal(p); }
    return perfil;
  }
  function concluido(){ const p = perfil || lerLocal(); return !!(p && p.concluido); }

  /* ---------- texto que entra no cérebro Gemini Live ---------- */
  function contexto(){
    const p = perfil || lerLocal();
    const nome = NOMES[opt.ia];
    const regras = '\n\nREGRAS VINCI (onboarding, 14/11/2026):' +
      '\n- Resposta direta: entrada, execução, resposta. Comando simples da casa vai direto, sem cadeia longa.' +
      '\n- Se um aparelho não suporta a ação pedida, diga o limite com clareza. Nunca finja que executou.' +
      '\n- Nunca apague cena nem ambiente. Pedido para apagar = mover para "itens não usados", que dá para recuperar.' +
      '\n- Você (' + nome + ') tem contexto e escopo próprios. O cliente pode usar outra IA da Vinci em outro ambiente.';
    if(!p || !p.concluido) return regras + '\n- O cliente ainda não concluiu o cadastro inicial no app. Se fizer sentido, lembre com gentileza que ele pode concluir em Ajustes.';
    const ponte = (CONFIG.pontes.find(x=>x.id === p.casa) || {}).rotulo || 'a definir';
    const linhas = [
      'PERFIL DO CLIENTE (cadastro inicial no app):',
      '- Chame o cliente de: ' + (p.chamar || 'pelo nome do cadastro'),
      '- Conta da casa: ' + ponte + (p.casa === 'google' ? ' (em validação: confirme com a Vinci antes de prometer comando pelo Google)' : ''),
      '- Ambientes em que você (' + nome + ') atua: ' + ((p.ambientes || []).join(', ') || 'toda a casa'),
      '- Recursos que o cliente marcou: ' + ((p.recursos || []).map(id=>{ const r = todosRecursos().find(x=>x.id === id); return r ? r.rotulo : id; }).join(', ') || 'básico'),
      '- O cliente aceitou os termos de responsabilidade em ' + (p.aceiteEm ? new Date(p.aceiteEm).toLocaleDateString('pt-BR') : 'data não registrada') + '.'
    ];
    return regras + '\n\n' + linhas.join('\n');
  }

  function todosRecursos(){ return CONFIG.recursos.comum.concat(CONFIG.recursos[opt.ia] || []); }
  function ambientesDisponiveis(){
    let lista = [];
    try{ if(typeof opt.salas === 'function') lista = opt.salas() || []; }catch(e){ lista = []; }
    lista = lista.filter(n=> n && !/^(outros|favoritos)$/i.test(n));
    if(!lista.length) lista = CONFIG.ambientesPadrao.slice();
    return [...new Set(lista)];
  }

  /* ---------- tela ---------- */
  let el = null, passo = 0, rascunho = null;
  function css(){
    if(document.getElementById('vonbCss')) return;
    const st = document.createElement('style'); st.id = 'vonbCss';
    st.textContent = `
#vonb{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:var(--bg,#06070a);color:var(--ink,#e9eae6);font-family:var(--sans,system-ui,-apple-system,sans-serif);padding:max(20px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:auto}
#vonb::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 30%,rgba(var(--accent-rgb,214,255,26),.10),transparent 60%)}
#vonb .cx{position:relative;width:min(100%,440px);display:grid;gap:18px}
#vonb .pt{display:flex;gap:6px;justify-content:center}
#vonb .pt i{width:22px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);transition:background .4s,width .4s}
#vonb .pt i[data-on="1"]{background:var(--accent,#d6ff1a);width:34px}
#vonb .ia{font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--accent,#d6ff1a);text-align:center}
#vonb h2{font-size:clamp(22px,6vw,28px);line-height:1.2;margin:0;text-align:center;font-weight:600;text-wrap:balance}
#vonb p{margin:0;color:var(--muted,#8a8d86);font-size:15px;line-height:1.5;text-align:center;text-wrap:pretty}
#vonb .tela{display:grid;gap:14px;animation:vonbEntra .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes vonbEntra{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
#vonb input[type=text],#vonb input[type=email],#vonb input[type=tel]{width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:inherit;border-radius:14px;padding:15px 16px;font:inherit;font-size:17px;outline:none}
#vonb input:focus{border-color:var(--accent,#d6ff1a)}
#vonb .ops{display:grid;gap:10px}
#vonb .op{display:flex;align-items:center;gap:12px;text-align:left;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:inherit;border-radius:14px;padding:14px 16px;font:inherit;font-size:16px;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
#vonb .op:active{transform:scale(.98)}
#vonb .op small{display:block;color:var(--muted,#8a8d86);font-size:13px;margin-top:2px}
#vonb .op[aria-pressed="true"]{border-color:var(--accent,#d6ff1a);background:rgba(var(--accent-rgb,214,255,26),.10)}
#vonb .op .mk{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.25);display:grid;place-items:center;transition:all .2s}
#vonb .op[aria-pressed="true"] .mk{border-color:var(--accent,#d6ff1a);background:var(--accent,#d6ff1a)}
#vonb .op[aria-pressed="true"] .mk::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent-ink,#000)}
#vonb .op[disabled]{opacity:.7;cursor:default}
#vonb .chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#vonb .chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:inherit;border-radius:999px;padding:10px 16px;font:inherit;font-size:15px;cursor:pointer;transition:all .2s}
#vonb .chip[aria-pressed="true"]{background:var(--accent,#d6ff1a);border-color:var(--accent,#d6ff1a);color:var(--accent-ink,#000);font-weight:600}
#vonb ul{margin:0;padding:0 0 0 18px;display:grid;gap:8px;color:var(--ink,#e9eae6);font-size:14px;line-height:1.45}
#vonb .bt{display:grid;gap:8px;margin-top:4px}
#vonb .pri{width:100%;background:var(--accent,#d6ff1a);color:var(--accent-ink,#000);border:0;border-radius:14px;padding:16px;font:inherit;font-size:17px;font-weight:700;cursor:pointer}
#vonb .pri:disabled{opacity:.4;cursor:default}
#vonb .sec{background:none;border:0;color:var(--muted,#8a8d86);font:inherit;font-size:14px;padding:8px;cursor:pointer}
#vonb .er{color:#ff6a62;font-size:13px;text-align:center;min-height:1em}
#vonb .ok{width:84px;height:84px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:rgba(var(--accent-rgb,214,255,26),.12);box-shadow:0 0 0 0 rgba(var(--accent-rgb,214,255,26),.5);animation:vonbPulso 1.8s ease-out infinite}
#vonb .ok svg{width:40px;height:40px;stroke:var(--accent,#d6ff1a);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:vonbRisco .6s .2s ease forwards}
@keyframes vonbPulso{70%{box-shadow:0 0 0 22px rgba(var(--accent-rgb,214,255,26),0)}100%{box-shadow:0 0 0 0 rgba(var(--accent-rgb,214,255,26),0)}}
@keyframes vonbRisco{to{stroke-dashoffset:0}}
#vonb button:focus-visible,#vonb input:focus-visible{outline:2px solid var(--accent,#d6ff1a);outline-offset:2px}
@media (prefers-reduced-motion:reduce){#vonb .tela,#vonb .ok,#vonb .ok svg{animation:none}#vonb .ok svg{stroke-dashoffset:0}}`;
    document.head.appendChild(st);
  }

  const PASSOS = ['chamar', 'casa', 'ambientes', 'recursos', 'contato', 'termos', 'fim'];

  function abrir(cb){
    aoTerminar = cb || null;
    css();
    const base = perfil || lerLocal() || {};
    rascunho = {
      chamar: base.chamar || '',
      casa: base.casa || '',
      ambientes: Array.isArray(base.ambientes) ? base.ambientes.slice() : [],
      recursos: Array.isArray(base.recursos) ? base.recursos.slice() : ['voz', 'casa'],
      email: base.email || '',
      whatsapp: base.whatsapp || '',
      contaCasa: base.contaCasa || ''
    };
    passo = 0;
    if(el) el.remove();
    el = document.createElement('div'); el.id = 'vonb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Primeiros passos');
    document.body.appendChild(el);
    desenhar();
  }

  function desenhar(){
    const id = PASSOS[passo], nome = NOMES[opt.ia];
    const pontos = PASSOS.slice(0, -1).map((_, i)=>`<i data-on="${i <= passo ? 1 : 0}"></i>`).join('');
    let corpo = '', podeSeguir = true, rotulo = 'Continuar', voltar = passo > 0 && id !== 'fim';
    if(id === 'chamar'){
      corpo = `<h2>Oi! Eu sou ${esc(COM_ARTIGO[opt.ia] || nome)}.<br>Como você quer que eu te chame?</h2>
        <p>São só 6 passos rápidos. Depois é só conversar.</p>
        <input type="text" id="vonbNome" autocomplete="given-name" placeholder="Seu nome" value="${esc(rascunho.chamar)}" maxlength="40">`;
      podeSeguir = rascunho.chamar.trim().length > 0;
    } else if(id === 'casa'){
      corpo = `<h2>A sua casa está em qual conta?</h2>
        <p>É por ela que eu acendo luzes, ligo a TV e ativo as cenas.</p>
        <div class="ops">${CONFIG.pontes.map(p=>`<button type="button" class="op" data-casa="${p.id}" aria-pressed="${rascunho.casa === p.id}"><span class="mk"></span><span>${esc(p.rotulo)}<small>${esc(p.detalhe)}</small></span></button>`).join('')}</div>
        <input type="email" id="vonbConta" autocomplete="email" placeholder="E-mail dessa conta (opcional)" value="${esc(rascunho.contaCasa)}" maxlength="80">
        <p>Nunca peço a sua senha. A Vinci liga a conta com você na ativação.</p>`;
      podeSeguir = !!rascunho.casa;
    } else if(id === 'ambientes'){
      const amb = ambientesDisponiveis();
      corpo = `<h2>Em quais ambientes eu vou atuar?</h2>
        <p>Você pode ter outra IA da Vinci em outro cômodo. Cada uma cuida do seu espaço.</p>
        <div class="chips">${amb.map(a=>`<button type="button" class="chip" data-amb="${esc(a)}" aria-pressed="${rascunho.ambientes.includes(a)}">${esc(a)}</button>`).join('')}
        <button type="button" class="chip" data-amb="*" aria-pressed="${rascunho.ambientes.includes('*')}">A casa toda</button></div>`;
      podeSeguir = rascunho.ambientes.length > 0;
    } else if(id === 'recursos'){
      corpo = `<h2>O que você contratou?</h2>
        <p>${esc(CONFIG.textoPlano)}</p>
        <div class="ops">${todosRecursos().map(r=>`<button type="button" class="op" data-rec="${r.id}" aria-pressed="${r.fixo || rascunho.recursos.includes(r.id)}" ${r.fixo ? 'disabled' : ''}><span class="mk"></span><span>${esc(r.rotulo)}${r.fixo ? '<small>Incluído</small>' : ''}</span></button>`).join('')}</div>`;
    } else if(id === 'contato'){
      corpo = `<h2>Para onde eu mando a confirmação?</h2>
        <p>Você recebe por e-mail o aviso de que tudo está ativado.</p>
        <input type="email" id="vonbEmail" autocomplete="email" placeholder="Seu e-mail" value="${esc(rascunho.email)}" maxlength="80">
        <input type="tel" id="vonbZap" autocomplete="tel" inputmode="tel" placeholder="WhatsApp com DDD (opcional)" value="${esc(rascunho.whatsapp)}" maxlength="20">`;
      podeSeguir = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rascunho.email.trim());
    } else if(id === 'termos'){
      corpo = `<h2>Combinado entre nós</h2>
        <ul>
          <li>Se você trocar a senha da conta ${rascunho.casa === 'google' ? 'Google' : rascunho.casa === 'amazon' ? 'Amazon' : 'da casa'}, avise a Vinci: a casa pode desconectar até a gente religar.</li>
          <li>Se perder o acesso a essa conta, a Vinci ajuda a recuperar a ligação com a casa, mas a recuperação da conta é feita com a Amazon ou o Google.</li>
          <li>Quando a Amazon, o Google, a internet ou a energia da casa caem, eu não consigo acionar os aparelhos. Isso não é falha da Vinci.</li>
          <li>O suporte da Vinci cobre o app, a IA e as cenas. A rede e os aparelhos da casa ficam por conta do cliente.</li>
          <li>Quem você convidar para usar a casa responde pelas mudanças que fizer.</li>
        </ul>`;
      rotulo = 'Li e aceito';
    } else {
      corpo = `<div class="ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h2>Tudo certo, ${esc(rascunho.chamar.trim())}!</h2>
        <p>O seu serviço é ativado em até 24 horas. A confirmação chega no e-mail ${esc(rascunho.email.trim())}.</p>`;
      rotulo = 'Começar a conversar';
    }
    el.innerHTML = `<div class="cx"><div class="ia">${esc(nome)} · Vinci</div>${id !== 'fim' ? `<div class="pt" aria-label="Passo ${passo + 1} de ${PASSOS.length - 1}">${pontos}</div>` : ''}
      <div class="tela">${corpo}</div><div class="er" id="vonbErro" aria-live="polite"></div>
      <div class="bt"><button type="button" class="pri" id="vonbSeguir" ${podeSeguir ? '' : 'disabled'}>${rotulo}</button>
      ${voltar ? '<button type="button" class="sec" id="vonbVoltar">Voltar</button>' : ''}
      ${passo === 0 ? '<button type="button" class="sec" id="vonbDepois">Fazer depois</button>' : ''}</div></div>`;
    ligar(id);
  }

  function atualizarBotao(ok){ const b = document.getElementById('vonbSeguir'); if(b) b.disabled = !ok; }

  function ligar(id){
    const seguir = document.getElementById('vonbSeguir');
    const v = document.getElementById('vonbVoltar'); if(v) v.onclick = ()=>{ passo--; desenhar(); };
    const d = document.getElementById('vonbDepois'); if(d) d.onclick = ()=>{ try{ sessionStorage.setItem(chave() + '.depois', '1'); }catch(e){} fechar(); };
    if(id === 'chamar'){
      const i = document.getElementById('vonbNome');
      i.oninput = ()=>{ rascunho.chamar = i.value; atualizarBotao(i.value.trim().length > 0); };
      i.onkeydown = (e)=>{ if(e.key === 'Enter' && i.value.trim()) seguir.click(); };
      setTimeout(()=>{ try{ i.focus(); }catch(e){} }, 300);
    }
    if(id === 'casa'){
      el.querySelectorAll('[data-casa]').forEach(b=> b.onclick = ()=>{ rascunho.casa = b.dataset.casa; el.querySelectorAll('[data-casa]').forEach(x=>x.setAttribute('aria-pressed', String(x === b))); atualizarBotao(true); });
      const c = document.getElementById('vonbConta'); c.oninput = ()=>{ rascunho.contaCasa = c.value.trim(); };
    }
    if(id === 'ambientes'){
      el.querySelectorAll('[data-amb]').forEach(b=> b.onclick = ()=>{
        const a = b.dataset.amb;
        if(a === '*') rascunho.ambientes = rascunho.ambientes.includes('*') ? [] : ['*'];
        else { rascunho.ambientes = rascunho.ambientes.filter(x=>x !== '*'); rascunho.ambientes = rascunho.ambientes.includes(a) ? rascunho.ambientes.filter(x=>x !== a) : rascunho.ambientes.concat(a); }
        el.querySelectorAll('[data-amb]').forEach(x=>x.setAttribute('aria-pressed', String(rascunho.ambientes.includes(x.dataset.amb))));
        atualizarBotao(rascunho.ambientes.length > 0);
      });
    }
    if(id === 'recursos'){
      el.querySelectorAll('[data-rec]:not([disabled])').forEach(b=> b.onclick = ()=>{
        const r = b.dataset.rec; rascunho.recursos = rascunho.recursos.includes(r) ? rascunho.recursos.filter(x=>x !== r) : rascunho.recursos.concat(r);
        b.setAttribute('aria-pressed', String(rascunho.recursos.includes(r)));
      });
    }
    if(id === 'contato'){
      const e = document.getElementById('vonbEmail'), z = document.getElementById('vonbZap');
      const val = ()=>{ rascunho.email = e.value.trim(); rascunho.whatsapp = z.value.trim(); atualizarBotao(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rascunho.email)); };
      e.oninput = val; z.oninput = val;
    }
    seguir.onclick = async ()=>{
      if(id === 'termos'){ seguir.disabled = true; seguir.textContent = 'Salvando…'; await concluir(); return; }
      if(id === 'fim'){ fechar(true); return; }
      passo++; desenhar();
    };
  }

  async function concluir(){
    const p = {
      concluido: true, versao: CONFIG.versao, momento: CONFIG.momento,
      chamar: rascunho.chamar.trim().slice(0, 40),
      casa: rascunho.casa, contaCasa: rascunho.contaCasa.slice(0, 80),
      ambientes: rascunho.ambientes.includes('*') ? ['A casa toda'] : rascunho.ambientes.slice(0, 30),
      recursos: [...new Set(todosRecursos().filter(r=>r.fixo).map(r=>r.id).concat(rascunho.recursos))],
      email: rascunho.email.trim().slice(0, 80), whatsapp: rascunho.whatsapp.replace(/[^\d+]/g, '').slice(0, 20),
      aceiteEm: new Date().toISOString(), termos: 'responsabilidades-2026-11-14'
    };
    perfil = p; gravarLocal(p);
    const j = await chamar({ acao:'salvar', ia: opt.ia, versao: CONFIG.versao, perfil: p });
    if(!(j && j.ok)){
      // fica salvo neste aparelho e tenta de novo na próxima abertura
      try{ localStorage.setItem(chave() + '.pendente', '1'); }catch(e){}
    } else { try{ localStorage.removeItem(chave() + '.pendente'); }catch(e){} }
    passo = PASSOS.length - 1; desenhar();
  }

  function fechar(terminou){
    if(el){ el.remove(); el = null; }
    const cb = aoTerminar; aoTerminar = null;
    if(cb) try{ cb(!!terminou); }catch(e){}
  }

  async function reenviarPendente(){
    let pend = false; try{ pend = localStorage.getItem(chave() + '.pendente') === '1'; }catch(e){}
    const p = lerLocal();
    if(pend && p && p.concluido){
      const j = await chamar({ acao:'salvar', ia: opt.ia, versao: CONFIG.versao, perfil: p });
      if(j && j.ok) try{ localStorage.removeItem(chave() + '.pendente'); }catch(e){}
    }
  }

  /* ---------- API usada pelas páginas ---------- */
  window.VinciOnboarding = {
    CONFIG,
    iniciar(o){ opt = Object.assign(opt, o || {}); perfil = lerLocal(); },
    carregar, concluido, contexto,
    abrir,
    // Ao abrir o app com sessão: mostra o onboarding uma vez se ainda não foi feito.
    async talvezAbrir(cb){
      if(!opt.sessao()) return false;
      reenviarPendente();
      let adiado = false; try{ adiado = sessionStorage.getItem(chave() + '.depois') === '1'; }catch(e){}
      await carregar();
      if(concluido() || adiado){ if(cb) cb(false); return false; }
      abrir(cb); return true;
    },
    // Depois do login: onboarding primeiro; a conversa começa no toque final.
    async depoisDoLogin(seguir){
      await carregar();
      if(concluido()){ seguir(); return; }
      abrir(()=> seguir());
    },
    limpar(){ try{ localStorage.removeItem(chave()); localStorage.removeItem(chave() + '.pendente'); sessionStorage.removeItem(chave() + '.depois'); }catch(e){} perfil = null; }
  };
})();

/* =====================================================================
   Vinci IA padrão — Felyx, Leda e Léo iA Vinci (ordem do Leandro, 14/11/2026)
   - PADRÃO: Gemini Live com cérebro próprio e resposta na lata. Fatos que mudam
     (cotações, notícias, resultados) vão pela Busca Google nativa do Gemini
     (googleSearch). As ferramentas antigas que buscavam cotação e notícia no n8n
     (bolsas, noticias, manchetes_do_dia) ficam desligadas: era redundância.
   - FULL: o n8n entra só em paralelo (WhatsApp de entrada e saída; no Felyx,
     também o Live Avatar). O modo vem do plano do cliente (vinci_clientes),
     lido em POST /webhook/vinci/ia {acao:'modo'} e guardado neste aparelho.
   - ABAS: a IA conhece e edita tudo do Dashboard (favoritos), dos Ambientes e,
     na Leda, das Receitas. Cada edição confirmada vai sozinha para a fila
     vinci_replicacao (POST /webhook/vinci/ia {acao:'replicar'}): o Gemini
     (padrão) ou o Claude (Full) escreve o passo a passo para repetir o mesmo
     ajuste no App Vinci (emuladores), no Google Home e na Amazon.
   Carregar ANTES do script principal da página. Modo e reenvios rodam em
   segundo plano; uma edição só confirma envio da réplica depois do HTTP OK.
   ===================================================================== */
(function(){
  'use strict';
  const URL_IA = 'https://vinciautomacao.app.n8n.cloud/webhook/vinci/ia';
  const caminho = String(location.pathname || '');
  const daTag = (document.currentScript && document.currentScript.dataset && document.currentScript.dataset.ia) || '';
  const IA = ['felyx','leda','leo'].includes(daTag) ? daTag : (/app-leda/i.test(caminho) ? 'leda' : (/app-leo/i.test(caminho) ? 'leo' : 'felyx'));
  const NOME = { felyx:'Felyx', leda:'Leda', leo:'Léo' }[IA];
  const DESLIGADAS = new Set(['bolsas', 'noticias', 'manchetes_do_dia']);
  const EDITA = {
    favoritos: { aba:'dashboard', ops:['colocar','tirar','renomear','trocar','padrao'] },
    ambientes: { aba:'ambientes', ops:['dividir','criar','renomear','excluir','mover','padrao'] },
    automacoes: { aba:'dashboard (automações)', ops:['salvar','apagar','pausar','ativar'] },
    receitas: { aba:'receitas', ops:['criar','editar','renomear','apagar','padrao'] }
  };

  const sessao = ()=> { try{ return (typeof SESSAO !== 'undefined' && SESSAO) ? SESSAO : (localStorage.getItem('felyx_sessao') || ''); }catch(e){ return ''; } };
  const ler = (k)=> { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const gravar = (k, v)=> { try{ if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} };

  /* ---------- modo: padrão (Gemini) ou Full (Claude + n8n em paralelo) ---------- */
  (function(){ try{ const q = new URLSearchParams(location.search).get('modo'); if(q === 'full' || q === 'padrao') gravar('vinci.modo.forcado', q); if(q === 'auto') gravar('vinci.modo.forcado', null); }catch(e){} })();
  function modo(){ const f = ler('vinci.modo.forcado'); if(f === 'full' || f === 'padrao') return f; return ler('vinci.modo') === 'full' ? 'full' : 'padrao'; }
  async function atualizarModo(){
    const s = sessao(); if(!s) return modo();
    const ctl = window.AbortController ? new AbortController() : null;
    const tm = setTimeout(()=>{ try{ ctl && ctl.abort(); }catch(e){} }, 4000);
    try{
      const r = await fetch(URL_IA, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ s, acao:'modo', ia: IA }), signal: ctl ? ctl.signal : undefined });
      const j = await r.json().catch(()=>null);
      if(j && j.ok && (j.modo === 'full' || j.modo === 'padrao')) gravar('vinci.modo', j.modo);
    }catch(e){}
    finally{ clearTimeout(tm); }
    return modo();
  }

  /* ---------- relatório de cada edição para a réplica ---------- */
  const FILA_REPLICA = 'vinci.replica.pendentes.' + IA;
  let envioReplica = null, timerReplica = null;
  function lerReplicas(){
    try{ const fila = JSON.parse(ler(FILA_REPLICA) || '[]'); return Array.isArray(fila) ? fila : []; }catch(e){ return []; }
  }
  function guardarReplicas(fila){
    try{ if(fila.length) localStorage.setItem(FILA_REPLICA, JSON.stringify(fila)); else localStorage.removeItem(FILA_REPLICA); return true; }catch(e){ return false; }
  }
  function agendarReplicas(){
    if(timerReplica !== null || !lerReplicas().length) return;
    timerReplica = setTimeout(()=>{ timerReplica = null; reenviarPendentes(); }, 30000);
  }
  async function enviarReplica(pedido){
    const ctl = window.AbortController ? new AbortController() : null;
    let tm;
    try{
      const limite = new Promise((_, rejeitar)=>{ tm = setTimeout(()=>{ rejeitar(new Error('replica timeout')); if(ctl) ctl.abort(); }, 4000); });
      const r = await Promise.race([fetch(URL_IA, { method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
        body: JSON.stringify(pedido), signal: ctl ? ctl.signal : undefined }), limite]);
      return !!(r && r.ok);
    }catch(e){ return false; }
    finally{ clearTimeout(tm); }
  }
  function reenviarPendentes(){
    if(envioReplica) return envioReplica;
    envioReplica = (async()=>{
      const enviados = new Set();
      while(true){
        const s = sessao(); if(!s) break;
        const fila = lerReplicas();
        // Uma troca de conta não pode atribuir a edição de outra sessão ao novo cliente.
        const item = fila.find(x => x && x.pedido && (!x.pedido.s || x.pedido.s === s));
        if(!item) break;
        if(!item.pedido.s){ item.pedido.s = s; if(!guardarReplicas(fila)) break; }
        if(!await enviarReplica(item.pedido)) break;
        enviados.add(item.id);
        if(!guardarReplicas(lerReplicas().filter(x => x.id !== item.id))) break;
      }
      return enviados;
    })().finally(()=>{ envioReplica = null; agendarReplicas(); });
    return envioReplica;
  }
  async function reportar(ferramenta, args, resultado){
    const def = EDITA[ferramenta] || { aba: ferramenta };
    const detalhe = { ferramenta, pedido: args || {}, resultado: resumo(resultado), modo: modo(), destino: modo() === 'full' ? 'claude' : 'gemini', em: new Date().toISOString() };
    const item = { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
      pedido: { s: sessao(), acao:'replicar', ia: IA, aba: def.aba, operacao: String((args && (args.operacao || args.operation)) || ''), detalhe } };
    const fila = lerReplicas(); fila.push(item);
    if(!guardarReplicas(fila)) return { enviada: !!item.pedido.s && await enviarReplica(item.pedido), pendente: false };
    const enviados = await reenviarPendentes();
    return { enviada: enviados.has(item.id), pendente: lerReplicas().some(x => x.id === item.id) };
  }
  function resumo(r){ try{ const t = JSON.stringify(r || {}); return t.length > 1200 ? t.slice(0, 1200) : JSON.parse(t); }catch(e){ return {}; } }

  /* ---------- Receitas da Leda: a IA cria, edita, renomeia e apaga ---------- */
  const RECEITAS_DECL = { name:'receitas', behavior:'BLOCKING',
    description:'Edita a aba Receitas (receitas e boas práticas do lar). operacao: listar (mostra todas, chame antes de mudar); criar (nome, tipo, resumo e, se quiser, pedido = a frase que o botão "Ensina, Leda" manda); editar (nome e o que mudar: resumo, tipo ou pedido); renomear (nome e novo_nome); apagar (nome); padrao (volta a lista original). tipo: doce, salgado, lar ou força. Depois confirme em meia frase e abra a tela Receitas com abrir_tela.',
    parameters:{ type:'OBJECT', properties:{ operacao:{ type:'STRING', enum:['listar','criar','editar','renomear','apagar','padrao'] }, nome:{ type:'STRING' }, novo_nome:{ type:'STRING' },
      tipo:{ type:'STRING', enum:['doce','salgado','lar','força'] }, resumo:{ type:'STRING' }, pedido:{ type:'STRING' } }, required:['operacao'] } };
  async function receitas(a){
    const R = window.ledaReceitas; if(!R) return { ok:false, erro:'a aba Receitas não está nesta tela' };
    const op = String((a && a.operacao) || 'listar');
    const lista = R.lista();
    const norm = (s)=> String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    const achar = (n)=> { const k = norm(n); let i = lista.findIndex(r => norm(r.nome) === k); if(i < 0 && k) i = lista.findIndex(r => norm(r.nome).includes(k)); return i; };
    const duplicado = (nome, exceto = -1)=> lista.some((r, i)=> i !== exceto && norm(r.nome) === norm(nome));
    const limpa = (s, n)=> String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
    const tipoOk = (t)=> ['doce','salgado','lar','força'].includes(t) ? t : 'salgado';
    if(op === 'listar') return { ok:true, total: lista.length, receitas: lista.map(r => ({ nome:r.nome, tipo:r.tipo, resumo:r.resumo })) };
    if(op === 'padrao'){ R.padrao(); return { ok:true, mensagem:'Receitas de volta à lista original.' }; }
    if(op === 'criar'){
      const nome = limpa(a.nome, 60); if(!nome) return { ok:false, erro:'diga o nome da receita' };
      if(duplicado(nome)) return { ok:false, erro:'já existe uma receita com esse nome: use editar' };
      lista.push({ tipo: tipoOk(a.tipo), nome, resumo: limpa(a.resumo, 220) || 'Receita da casa.', pedido: limpa(a.pedido, 200) || ('me ensina ' + nome + ', passo a passo') });
      R.salvar(lista); return { ok:true, mensagem: nome + ' entrou nas Receitas.' };
    }
    const i = achar(a.nome); if(i < 0) return { ok:false, erro:'não achei essa receita: liste primeiro' };
    if(op === 'apagar'){ const [x] = lista.splice(i, 1); R.salvar(lista); return { ok:true, mensagem: x.nome + ' saiu das Receitas.' }; }
    if(op === 'renomear'){
      const novo = limpa(a.novo_nome, 60); if(!novo) return { ok:false, erro:'diga o nome novo' };
      if(duplicado(novo, i)) return { ok:false, erro:'já existe uma receita com esse nome: use editar' };
      const velho = lista[i].nome; lista[i].nome = novo; R.salvar(lista); return { ok:true, mensagem: velho + ' agora se chama ' + novo + '.' };
    }
    if(op === 'editar'){
      const novo = a.novo_nome ? limpa(a.novo_nome, 60) : null;
      if(novo !== null && !novo) return { ok:false, erro:'diga o nome novo' };
      if(novo !== null && duplicado(novo, i)) return { ok:false, erro:'já existe uma receita com esse nome: use editar' };
      if(a.resumo) lista[i].resumo = limpa(a.resumo, 220);
      if(a.tipo) lista[i].tipo = tipoOk(a.tipo);
      if(a.pedido) lista[i].pedido = limpa(a.pedido, 200);
      if(novo !== null) lista[i].nome = novo;
      R.salvar(lista); return { ok:true, mensagem: lista[i].nome + ' atualizada.' };
    }
    return { ok:false, erro:'operação desconhecida' };
  }

  /* ---------- liga tudo nas ferramentas da página (uma vez) ---------- */
  let instalado = false;
  function instalar(){
    if(instalado || typeof GEN_FERRAMENTAS === 'undefined') return;
    instalado = true;
    if(IA === 'leda') GEN_FERRAMENTAS.receitas = receitas;
    for(const nome of Object.keys(EDITA)){
      const original = GEN_FERRAMENTAS[nome]; if(typeof original !== 'function') continue;
      GEN_FERRAMENTAS[nome] = async function(args){
        const r = await original.call(GEN_FERRAMENTAS, args);
        const op = String((args && (args.operacao || args.operation)) || '');
        const mudou = EDITA[nome].ops.includes(op) && r && r.ok !== false && !r.erro;
        if(mudou){
          const replica = await reportar(nome, args, r);
          return Object.assign({}, r, { replica: replica.enviada ? 'enviada para a Vinci repetir no App Vinci, no Google Home e na Amazon' :
            (replica.pendente ? 'pendente na fila local para reenvio' : 'não enviada; armazenamento local indisponível') });
        }
        return r;
      };
    }
  }
  function tools(base){
    instalar();
    const decl = ((base && base[0] && base[0].functionDeclarations) || []).filter(d => !DESLIGADAS.has(d.name)).map(d => {
      if(d.name === 'dados_do_cumprimento') return Object.assign({}, d, { description:'Chame quando disserem bom dia, boa tarde ou boa noite: diz se o cumprimento completo está liberado e traz clima, dólar do painel e manchetes do painel. Para o porquê do mercado, use a Busca Google.' });
      return d;
    });
    if(IA === 'leda' && !decl.some(d => d.name === 'receitas')) decl.push(RECEITAS_DECL);
    return [{ functionDeclarations: decl }, { googleSearch: {} }];
  }

  /* ---------- o que entra no cérebro (regras e conteúdo das abas) ---------- */
  function abas(){
    const linhas = [];
    try{ if(typeof tiles !== 'undefined') linhas.push('Dashboard (favoritos, posição: nome): ' + tiles.map((t, i)=> (i + 1) + ': ' + (t.n || 'vazio')).join('; ')); }catch(e){}
    try{
      if(typeof listaSalas === 'function' && typeof tiles !== 'undefined'){
        const sem = (typeof roomConfig !== 'undefined' && roomConfig.semComodo) || 'Outros';
        const sala = (t)=> (typeof roomForTile === 'function' ? roomForTile(t) : (t.s || sem));
        const amb = listaSalas().map(s => s + ' (' + (tiles.filter(t => t.n && sala(t) === s).map(t => t.n).join(', ') || 'vazio') + ')');
        linhas.push('Ambientes (nome e botões): ' + amb.join('; ') + '. Para a divisão exata use ambientes listar.');
      }
    }catch(e){}
    try{ if(IA === 'leda' && window.ledaReceitas) linhas.push('Receitas: ' + window.ledaReceitas.lista().map(r => r.nome + ' [' + r.tipo + ']').join('; ')); }catch(e){}
    return linhas.join('\n');
  }
  function contexto(){
    const full = modo() === 'full';
    return '\n\nMODO VINCI (ordem do Leandro, 14/11/2026; vale acima de qualquer regra anterior destas instruções):' +
      '\n- Você é ' + ({ felyx:'o Felyx', leda:'a Leda', leo:'o Léo' }[IA]) + ' iA Vinci, ' + (full ? 'modo Full' : 'modo padrão') + '. Cérebro próprio: responda na hora com o seu conhecimento, sem passar por outro cérebro.' +
      '\n- Cotações, preços, notícias, resultados, o porquê do mercado e tudo que muda com o tempo: use a Busca Google, que está ligada para você. As ferramentas antigas bolsas, noticias e manchetes_do_dia foram desligadas; ignore qualquer menção a elas acima. Dólar, euro e bitcoin da tela: use o PAINEL. Notícia do painel: abrir_manchete.' +
      '\n- Suas abas: você conhece todo o conteúdo delas (abaixo) e faz qualquer edição pedida: criar, apagar, renomear, mover botões entre ambientes, colocar, tirar e trocar favoritos' + (IA === 'leda' ? ', criar, editar, renomear e apagar receitas (ferramenta receitas)' : '') + '. Liste antes, aplique sem pedir confirmação quando o pedido for claro, e confirme em meia frase.' +
      '\n- Apagar: quando o cliente pedir, pode apagar ambiente, favorito' + (IA === 'leda' ? ', receita' : '') + ' ou automação. Cena da central da casa você não apaga: só tira do botão.' +
      '\n- Toda edição confirmada tenta enviar a réplica para a Vinci repetir o mesmo ajuste no App Vinci, no Google Home e na Amazon. Só diga que foi enviada quando o campo "replica" começar com "enviada"; "pendente" significa que aguarda reenvio local, não confirma envio. Diga o estado em meia frase, uma vez por conversa, sem citar Claude, Gemini nem GPT.' +
      '\n- O que não é seu (falha, mudança na programação do app da Vinci ou da Amazon, pedido de outra equipe): avisar_falha, em silêncio, para a engenharia da Vinci (Claude ou GPT). Nunca comente isso com o cliente.' +
      (full ? '\n- Modo Full: o WhatsApp do cliente corre em paralelo pela Vinci' + (IA === 'felyx' ? ', e o seu rosto ao vivo (Live Avatar) acompanha a sua voz' : '') + '. Aqui no app, quem responde é você, na hora.' : '') +
      '\n\nCONTEÚDO DAS SUAS ABAS AGORA:\n' + (abas() || 'sem leitura');
  }

  window.VinciIA = { IA, NOME, modo, atualizarModo, tools, contexto, reportar, reenviarPendentes, instalar };
  window.addEventListener('online', ()=>{ reenviarPendentes(); });
  // lê o modo do plano logo que a página abre (em segundo plano; nunca segura a conversa)
  setTimeout(()=>{ atualizarModo(); reenviarPendentes(); }, 0);
})();

/* Cenas do aplicativo (25/11/2026, ordem do Leandro): "cria uma cena que liga o 1, o 2 e o 3 e chama de cena João".
   A IA cria por voz; a cena vira botão (entra na lista de cenas da casa) e, ao ser ativada, manda cada passo
   pelo mesmo caminho de sempre (controlar_casa / comando da central). Não muda a ponte nem o acionamento:
   só junta comandos que já existem. Guardada neste aparelho, por IA. */
(function(){
  'use strict';
  const IA = /\/(app-)?leda\//.test(location.pathname) ? 'leda' : /\/(app-)?leo\//.test(location.pathname) ? 'leo' : 'felyx';
  const KEY = 'vinci.cenasApp.' + IA;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^cena\s+/, '').replace(/\s+/g, ' ').trim();
  const ler = () => { try{ const l = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(l) ? l : []; }catch(e){ return []; } };
  const gravar = l => { try{ localStorage.setItem(KEY, JSON.stringify(l.slice(0, 60))); }catch(e){} sincronizar(); };
  const achar = nome => ler().find(c => norm(c.nome) === norm(nome));
  function sincronizar(){
    try{
      if(typeof casaGen === 'undefined' || !Array.isArray(casaGen.cenas)) return;
      const nomes = ler().map(c => c.nome);
      const base = casaGen.cenas.filter(n => !casaGen._app || !casaGen._app.includes(n));
      casaGen.cenas = base.concat(nomes.filter(n => !base.some(b => norm(b) === norm(n))));
      casaGen._app = nomes;
    }catch(e){}
  }
  async function passo(p){
    const f = (typeof GEN_FERRAMENTAS !== 'undefined') && GEN_FERRAMENTAS.controlar_casa;
    if(typeof f !== 'function') return { ok:false };
    try{ return await f.call(GEN_FERRAMENTAS, { dispositivo: p.dispositivo, acao: p.acao || 'ligar' }); }catch(e){ return { ok:false }; }
  }
  async function ativar(nome){
    const c = achar(nome); if(!c) return { ok:false, erro:'cena não existe' };
    const res = [];
    for(const p of c.passos){ const r = await passo(p); res.push({ dispositivo: p.dispositivo, ok: !!(r && r.ok) }); }
    const falhas = res.filter(r => !r.ok).map(r => r.dispositivo);
    return { ok: falhas.length === 0, cena: c.nome, passos: res, resposta: falhas.length ? 'Não confirmou: ' + falhas.join(', ') : 'Feito: cena ' + c.nome + ' ativada.' };
  }
  const nomesCasa = () => { try{ return (casaGen.aparelhos || []).concat(casaGen.cenas || []); }catch(e){ return []; } };
  function tool({ operacao, nome, novo_nome, passos }){
    const l = ler();
    if(operacao === 'listar') return { ok:true, cenas: l.map(c => ({ nome: c.nome, passos: c.passos })) };
    if(operacao === 'ativar') return ativar(nome);
    if(!nome) return { ok:false, erro:'diga o nome da cena' };
    if(operacao === 'criar'){
      const ps = (Array.isArray(passos) ? passos : []).map(p => ({ dispositivo: String(p && p.dispositivo || '').trim(), acao: /deslig|apag|off/i.test(String(p && p.acao || '')) ? 'desligar' : (/ativ/i.test(String(p && p.acao || '')) ? 'ativar' : 'ligar') })).filter(p => p.dispositivo);
      if(!ps.length) return { ok:false, erro:'diga quais aparelhos a cena aciona' };
      const casa = nomesCasa(); let semLista = false; try{ semLista = !(casaGen.aparelhos || []).length; }catch(e){ semLista = true; }
      const desconhecidos = (casa.length && !semLista) ? ps.filter(p => !casa.some(n => norm(n) === norm(p.dispositivo))).map(p => p.dispositivo) : [];
      if(desconhecidos.length) return { ok:false, erro:'não achei na casa: ' + desconhecidos.join(', '), aparelhos_da_casa: casa.slice(0, 120) };
      const limpo = String(nome).trim().slice(0, 40);
      const nova = l.filter(c => norm(c.nome) !== norm(limpo)); nova.push({ nome: limpo, passos: ps, criada: new Date().toISOString() });
      gravar(nova); return { ok:true, persisted:true, cena: limpo, passos: ps, aviso:'A cena já aparece na lista de cenas; para virar botão no painel use favoritos colocar.' };
    }
    const c = l.find(x => norm(x.nome) === norm(nome)); if(!c) return { ok:false, erro:'cena não existe: ' + nome, cenas: l.map(x => x.nome) };
    if(operacao === 'renomear'){ if(!novo_nome) return { ok:false, erro:'diga o novo nome' }; c.nome = String(novo_nome).trim().slice(0, 40); gravar(l); return { ok:true, persisted:true, cena: c.nome }; }
    if(operacao === 'excluir'){ gravar(l.filter(x => x !== c)); return { ok:true, persisted:true, excluida: c.nome }; }
    if(operacao === 'editar'){ return tool({ operacao:'criar', nome: c.nome, passos }); }
    return { ok:false, erro:'operação desconhecida' };
  }
  const declaracao = { name:'cenas_app', description:'CENAS criadas pelo cliente no aplicativo: um nome que aciona vários aparelhos de uma vez. Use quando pedirem para CRIAR, editar, renomear, excluir, listar ou ATIVAR uma cena feita de aparelhos (ex.: "cria uma cena que liga o Abajur e a Indireta e chama de cena João"). operacao: criar (nome + passos: lista de {dispositivo, acao: ligar|desligar|ativar}, com os nomes exatos dos aparelhos da casa); editar (nome + passos novos); renomear (nome, novo_nome); excluir (nome); listar; ativar (nome). Faça na hora, sem ensinar o caminho.',
    behavior:'BLOCKING',
    parameters:{ type:'OBJECT', properties:{ operacao:{ type:'STRING', enum:['criar','editar','renomear','excluir','listar','ativar'] }, nome:{ type:'STRING' }, novo_nome:{ type:'STRING' },
      passos:{ type:'ARRAY', items:{ type:'OBJECT', properties:{ dispositivo:{ type:'STRING' }, acao:{ type:'STRING' } }, required:['dispositivo'] } } }, required:['operacao'] } };
  window.VinciCenasApp = { declaracao, tool, ativar, ler, achar };
  // botão da cena do app (Felyx e Leda): o "ativar cena X" que iria para a central vira os passos da cena
  const fetchOrig = window.fetch.bind(window);
  window.fetch = async function(url, opt){
    try{
      if(opt && opt.method === 'POST' && /\/(felix|leda)\/app$/.test(String(url)) && typeof opt.body === 'string'){
        const b = JSON.parse(opt.body);
        const m = b && b.acao === 'comando' && String(b.texto || '').match(/^\s*(?:ativar|acionar|ligar)\s+(?:a\s+)?cena\s+(.+?)\s*$/i);
        if(m && achar(m[1])){ const r = await ativar(m[1]); return new Response(JSON.stringify({ ok: r.ok, atalho:true, recusado:false, text: r.resposta }), { headers:{ 'Content-Type':'application/json' } }); }
      }
    }catch(e){}
    return fetchOrig(url, opt);
  };
  function ligar(){
    try{ if(typeof GEN_FERRAMENTAS !== 'undefined') GEN_FERRAMENTAS.cenas_app = tool; }catch(e){}
    try{ if(typeof GEN_TOOLS !== 'undefined' && GEN_TOOLS[0] && Array.isArray(GEN_TOOLS[0].functionDeclarations) && !GEN_TOOLS[0].functionDeclarations.some(d => d.name === 'cenas_app')) GEN_TOOLS[0].functionDeclarations.push(declaracao); }catch(e){}
    try{ if(typeof LEO_TOOLS_TELA !== 'undefined' && !LEO_TOOLS_TELA.some(d => d.name === 'cenas_app')){ LEO_TOOLS_TELA.push(declaracao); LEO_TELA_NOMES.add('cenas_app'); } }catch(e){}
    sincronizar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
  setInterval(sincronizar, 5000);
})();

/* Cartões: Gemini Live + Busca Google, no padrão e no Full (14/11/2026).
   O n8n só emite o token efêmero. Sessão própria, sem microfone/reprodução.
   gemini-3.8-live exige AUDIO: o JSON vem de uma função local, não da fala.
   Só publica depois de receber grounding e concluir o turno. */
(function(){
  'use strict';
  const GOOGLE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
  const TTL = 14 * 60000, INTERVALO = 20000, LIMITE = 45000;
  const numero = { type:'NUMBER' };
  const manchete = { type:'OBJECT', properties:{ title:{type:'STRING'}, source:{type:'STRING'}, link:{type:'STRING'}, date:{type:'STRING'} }, required:['title','source','link','date'] };
  const entrega = {
    name:'entregar_paineis',
    description:'Entrega local dos cartões após pesquisar no Google. Não faz requisições externas. Use valores numéricos sem separador de milhar, datas ISO e links das fontes encontradas.',
    parameters:{ type:'OBJECT', properties:{
      mercado:{ type:'OBJECT', properties:{
        cambio:{ type:'OBJECT', properties:{usdbrl:numero,eurbrl:numero,
          usdbrlChg:{type:'NUMBER',nullable:true,description:'Variação percentual do dia do dólar comercial USD/BRL, pesquisada no Google (ex.: -0.5 significa -0.5%). Null se não encontrada.'},
          eurbrlChg:{type:'NUMBER',nullable:true,description:'Variação percentual do dia do euro EUR/BRL, pesquisada no Google (ex.: 0.5 significa 0.5%). Null se não encontrada.'},
          data:{type:'STRING'}}, required:['usdbrl','eurbrl','usdbrlChg','eurbrlChg','data'] },
        cripto:{ type:'OBJECT', properties:{bitcoin:{type:'OBJECT',properties:{usd:numero,brl:numero,chgUsdt:numero},required:['usd','brl']}},required:['bitcoin'] },
        ibovespa:{ type:'OBJECT', properties:{pontos:numero,chg:numero},required:['pontos'] }
      },required:['cambio','cripto','ibovespa'] },
      noticias:{ type:'OBJECT', properties:{politica:{type:'ARRAY',items:manchete},tecnologia:{type:'ARRAY',items:manchete}},required:['politica','tecnologia'] }
    },required:['mercado','noticias'] }
  };
  function texto(v, max){ return typeof v === 'string' ? v.trim().slice(0,max) : ''; }
  function link(v){ try{ const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }catch(e){ return ''; } }
  function positivo(v){ return typeof v === 'number' && Number.isFinite(v) && v > 0; }
  function percentual(v){ return typeof v === 'number' && Number.isFinite(v) ? v : null; }
  function temBusca(g){ return !!(g && Array.isArray(g.webSearchQueries) && g.webSearchQueries.some(q=>texto(q,500)) && Array.isArray(g.groundingChunks) && g.groundingChunks.some(c=>c.web && link(c.web.uri))); }
  function normalizar(dados, atualizadoEm, groundingMetadata){
    if(!temBusca(groundingMetadata) || !Number.isFinite(Date.parse(atualizadoEm))) throw new Error('cartões sem busca confirmada');
    const m = dados && dados.mercado, n = dados && dados.noticias;
    const cambio = m && m.cambio, btc = m && m.cripto && m.cripto.bitcoin, ibov = m && m.ibovespa;
    if(!cambio || !positivo(cambio.usdbrl) || !positivo(cambio.eurbrl) || !btc || !positivo(btc.usd) || !positivo(btc.brl) || !ibov || !positivo(ibov.pontos)) throw new Error('cotação incompleta');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(cambio.data) || !Number.isFinite(Date.parse(cambio.data))) throw new Error('data de cotação inválida');
    const lista = items => (Array.isArray(items) ? items : []).slice(0,6).map(v=>({
      title:texto(v && v.title,240), source:texto(v && v.source,100), link:link(v && v.link),
      date:v && Number.isFinite(Date.parse(v.date)) ? new Date(v.date).toISOString() : ''
    })).filter(v=>v.title && v.source && v.link && v.date);
    const politica = lista(n && n.politica), tecnologia = lista(n && n.tecnologia);
    if(!politica.length || !tecnologia.length) throw new Error('manchetes incompletas');
    return { fonte:'googleSearch', atualizadoEm, groundingMetadata,
      mercado:{ok:true,atualizadoEm,cambio:{usdbrl:cambio.usdbrl,eurbrl:cambio.eurbrl,usdbrlChg:percentual(cambio.usdbrlChg),eurbrlChg:percentual(cambio.eurbrlChg),data:cambio.data},
        cripto:{bitcoin:{usd:btc.usd,usdt:btc.usd,brl:btc.brl,chgUsdt:percentual(btc.chgUsdt)}},
        ibovespa:{pontos:ibov.pontos,chg:percentual(ibov.chg)}},
      noticias:{ok:true,atualizadoEm,politica,tecnologia}
    };
  }
  function criar({ia, tokenUrl, sessao, model}){
    const chave = 'vinci.paineis.google.v1.' + ia;
    let ultimo = null, voo = null, tentativa = 0;
    try{
      const salvo = JSON.parse(localStorage.getItem(chave) || 'null');
      if(salvo && salvo.fonte === 'googleSearch') ultimo = normalizar(salvo,salvo.atualizadoEm,salvo.groundingMetadata);
    }catch(e){}
    function buscar(){
      return new Promise((resolve,reject)=>{
        const ctl = new AbortController();
        let ws = null, encerrado = false, pronto = false, dados = null;
        const grounding = {webSearchQueries:[],groundingChunks:[]};
        function terminar(erro, resultado){
          if(encerrado) return;
          encerrado = true; clearTimeout(timer); ctl.abort();
          if(ws){ ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null; try{ ws.close(); }catch(e){} }
          if(erro) reject(erro); else resolve(resultado);
        }
        const timer = setTimeout(()=>terminar(new Error('tempo da busca excedido')),LIMITE);
        (async()=>{
          // Nunca reutiliza o token da conversa: tokens efêmeros podem ser de uso único.
          const r = await fetch(tokenUrl(),{cache:'no-store',redirect:'error',signal:ctl.signal});
          if(!r.ok) throw new Error('token indisponível');
          const tk = await r.json();
          if(encerrado) return;
          if(!tk || typeof tk.token !== 'string' || !tk.token) throw new Error('token vazio');
          ws = new WebSocket(GOOGLE_WS + '?access_token=' + encodeURIComponent(tk.token));
          ws.onopen = ()=>{
            try{ ws.send(JSON.stringify({setup:{
              model:'models/' + model().replace(/^models\//,''),
              generationConfig:{responseModalities:['AUDIO']},
              outputAudioTranscription:{},
              systemInstruction:{parts:[{text:'Você atualiza cartões de mercado e notícias. Obrigatoriamente faça pesquisas atuais com googleSearch antes de entregar dados. Use só os resultados dessas pesquisas, nunca sua memória. Encontre dólar comercial USD/BRL (não USDT), EUR/BRL, bitcoin em USD e BRL e Ibovespa em pontos; use o último fechamento disponível quando o mercado estiver fechado. Encontre até três manchetes recentes de política brasileira e três de tecnologia, com fonte, URL e data de publicação. Não invente valores nem manchetes se a busca falhar. Entregue os dados uma única vez pela função entregar_paineis; depois encerre o turno. Não leia os cartões em voz alta.'}]},
              tools:[{googleSearch:{}},{functionDeclarations:[entrega]}]
            }})); }catch(e){ terminar(e); }
          };
          // Serializa Blob.text(): grounding e turnComplete devem manter a ordem do fio.
          let mensagens = Promise.resolve();
          ws.onmessage = ev=>{
            mensagens = mensagens.then(async()=>{
              if(encerrado) return;
              const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text());
              if(encerrado) return;
              if(msg.error) throw new Error('busca recusada');
              if(msg.setupComplete && !pronto){
                pronto = true;
                ws.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'Pesquise no Google e atualize os cartões agora. Data e hora de referência: ' + new Date().toISOString() + '. Retorne números JSON e datas ISO na função entregar_paineis.'}]}],turnComplete:true}}));
              }
              const sc = msg.serverContent || {};
              if(sc.groundingMetadata){
                const g = sc.groundingMetadata;
                if(Array.isArray(g.webSearchQueries)) grounding.webSearchQueries.push(...g.webSearchQueries);
                if(Array.isArray(g.groundingChunks)) grounding.groundingChunks.push(...g.groundingChunks);
                if(g.searchEntryPoint) grounding.searchEntryPoint = g.searchEntryPoint;
                if(Array.isArray(g.groundingSupports)) grounding.groundingSupports = g.groundingSupports;
              }
              if(msg.toolCall){
                const responses = [];
                for(const call of msg.toolCall.functionCalls || []){
                  if(call.name !== entrega.name || dados) throw new Error('entrega inesperada');
                  dados = call.args;
                  responses.push({id:call.id,name:call.name,response:{ok:true}});
                }
                ws.send(JSON.stringify({toolResponse:{functionResponses:responses}}));
              }
              if(sc.interrupted || msg.toolCallCancellation || msg.goAway) throw new Error('busca interrompida');
              // inlineData (áudio) e transcrição não entram na UI nem no cache.
              if(sc.turnComplete) terminar(null,normalizar(dados,new Date().toISOString(),grounding));
            }).catch(terminar);
          };
          ws.onerror = ()=>terminar(new Error('busca desconectada'));
          ws.onclose = ()=>terminar(new Error('busca encerrada sem dados'));
        })().catch(terminar);
      });
    }
    function carregar(force){
      if(voo) return voo;
      const agora = Date.now();
      if(!sessao() || (tentativa && agora - tentativa < INTERVALO) || (!force && ultimo && agora - Date.parse(ultimo.atualizadoEm) < TTL)) return Promise.resolve(ultimo);
      tentativa = agora;
      voo = buscar().then(resultado=>{
        ultimo = resultado;
        try{ localStorage.setItem(chave,JSON.stringify(ultimo)); }catch(e){}
        return ultimo;
      }).catch(()=>ultimo).finally(()=>{ voo = null; });
      return voo;
    }
    return {cache:()=>ultimo,carregar};
  }
  window.VinciPaineis = {criar};
})();

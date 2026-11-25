/* Cartões: Gemini Live + Busca Google, no padrão e no Full (14/11/2026).
   O n8n só emite o token efêmero. Sessão própria, sem microfone/reprodução.
   gemini-3.8-live exige AUDIO: o JSON vem de uma função local, não da fala.
   Pesquisa em um turno falado (sem reprodução), entrega no turno seguinte.
   Prova de busca no Live: webSearchQueries não vazio (ordem de 14/11/2026).
   Links de manchetes são buscas Google geradas localmente pelo título.
   Regra do Leandro (14/11/2026, 21h37): dados sempre atualizados; USDT/BRL e BTC/USDT na Binance,
   Ibovespa no Google; notícias mais importantes em português brasileiro (política: GloboNews e
   Jovem Pan News; tecnologia: Globo Tecnologia). Fonte exibida: sempre "Fonte: Google".
   Atualiza só a cada 15 min; entre uma atualização e outra o app abre com o cache já carregado. */
(function(){
  'use strict';
  const GOOGLE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
  const TTL = 15 * 60000, INTERVALO = TTL, LIMITE = 45000;
  const numero = { type:'NUMBER' };
  const manchete = { type:'OBJECT', properties:{ title:{type:'STRING'}, source:{type:'STRING'}, date:{type:'STRING'} }, required:['title','source','date'] };
  const entrega = {
    name:'entregar_paineis',
    description:'Use SOMENTE no segundo turno, quando o usuário pedir ENTREGAR_PAINEIS. No primeiro turno pesquise no Google e responda em fala, sem chamar esta função. Entrega local dos cartões com os resultados da pesquisa anterior, sem requisições externas. Use valores numéricos sem separador de milhar e datas ISO. Para manchetes entregue título, fonte e data pesquisados; não entregue URLs.',
    parameters:{ type:'OBJECT', properties:{
      mercado:{ type:'OBJECT', properties:{
        cambio:{ type:'OBJECT', properties:{usdbrl:numero,eurbrl:numero,
          usdbrlChg:{type:'NUMBER',nullable:true,description:'Variação percentual de 24h do USDT/BRL na Binance, pesquisada no Google (ex.: -0.5 significa -0.5%). Null se não encontrada.'},
          eurbrlChg:{type:'NUMBER',nullable:true,description:'Variação percentual do dia do euro EUR/BRL, pesquisada no Google (ex.: 0.5 significa 0.5%). Null se não encontrada.'},
          data:{type:'STRING'}}, required:['usdbrl','eurbrl','usdbrlChg','eurbrlChg','data'] },
        cripto:{ type:'OBJECT', properties:{bitcoin:{type:'OBJECT',properties:{usd:numero,brl:numero,chgUsdt:numero},required:['usd','brl']}},required:['bitcoin'] },
        ibovespa:{ type:'OBJECT', properties:{pontos:numero,chg:numero},required:['pontos'] }
      },required:['cambio','cripto','ibovespa'] },
      noticias:{ type:'OBJECT', properties:{politica:{type:'ARRAY',minItems:1,items:manchete},tecnologia:{type:'ARRAY',minItems:1,items:manchete}},required:['politica','tecnologia'] }
    },required:['mercado','noticias'] }
  };
  function texto(v, max){ return typeof v === 'string' ? v.trim().slice(0,max) : ''; }
  function positivo(v){ return typeof v === 'number' && Number.isFinite(v) && v > 0; }
  function percentual(v){ return typeof v === 'number' && Number.isFinite(v) ? v : null; }
  function temBusca(g){ return !!(g && Array.isArray(g.webSearchQueries) && g.webSearchQueries.some(q=>texto(q,500))); }
  function normalizar(dados, atualizadoEm, groundingMetadata){
    if(!temBusca(groundingMetadata) || !Number.isFinite(Date.parse(atualizadoEm))) throw new Error('cartões sem busca confirmada');
    const m = dados && dados.mercado, n = dados && dados.noticias;
    const cambio = m && m.cambio, btc = m && m.cripto && m.cripto.bitcoin, ibov = m && m.ibovespa;
    if(!cambio || !positivo(cambio.usdbrl) || !positivo(cambio.eurbrl) || !btc || !positivo(btc.usd) || !positivo(btc.brl) || !ibov || !positivo(ibov.pontos)) throw new Error('cotação incompleta');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(cambio.data) || !Number.isFinite(Date.parse(cambio.data))) throw new Error('data de cotação inválida');
    const lista = items => (Array.isArray(items) ? items : []).slice(0,6).map(v=>({
      title:texto(v && v.title,240), source:texto(v && v.source,100),
      date:v && Number.isFinite(Date.parse(v.date)) ? new Date(v.date).toISOString() : ''
    })).filter(v=>v.title && v.source && v.date).map(v=>({...v,source:'Google',link:'https://www.google.com/search?q=' + encodeURIComponent(v.title)}));
    const politica = lista(n && n.politica), tecnologia = lista(n && n.tecnologia);
    if(!politica.length || !tecnologia.length) throw new Error('manchetes incompletas');
    return { fonte:'googleSearch', atualizadoEm, groundingMetadata,
      mercado:{ok:true,atualizadoEm,cambio:{usdbrl:cambio.usdbrl,eurbrl:cambio.eurbrl,usdbrlChg:percentual(cambio.usdbrlChg),eurbrlChg:percentual(cambio.eurbrlChg),data:cambio.data},
        cripto:{bitcoin:{usd:btc.usd,usdt:btc.usd,brl:btc.brl,chgUsdt:percentual(btc.chgUsdt)}},
        ibovespa:{pontos:ibov.pontos,chg:percentual(ibov.chg)}},
      noticias:{ok:true,atualizadoEm,politica,tecnologia}
    };
  }
  // 19/11/2026 (Claude): ordem do Leandro — cartões vêm de um lugar central atualizado a cada 15 min, zero API e zero n8n.
  // O "Motor de Cotações e Notícias" (Apps Script do Google) já faz isso; a página só lê. A busca Gemini fica de reserva.
  const MOTOR_URL = 'https://script.google.com' + '/macros/s/' + 'AKfycbyYzB4W_omCbBVCqUNGLqz4EGJps2PHoDbiOeRHqc-iKsU70lHAsLiFShNIRgCtxgen' + '/exec';
  function doMotor(j){
    const c = j && j.cotacoes, n = j && j.noticias, quando = j && Date.parse(j.atualizado);
    if(!c || !n || !Number.isFinite(quando)) throw new Error('motor sem dados');
    const v = k => c[k] && typeof c[k].valor === 'number' && c[k].valor > 0 ? c[k].valor : null, d = k => c[k] && typeof c[k].variacao === 'number' ? c[k].variacao : null;
    const usd = v('usd_brl'), eur = v('eur_brl'), btc = v('btc_usd'), ibov = v('ibovespa');
    if(!usd || !eur || !btc) throw new Error('motor sem cotação');
    const atualizadoEm = new Date(quando).toISOString();
    const lista = items => (Array.isArray(items) ? items : []).slice(0,6).map(x=>({
      title: texto(x && x.titulo,240).replace(/\s+-\s+[^-]{2,40}$/,''), source: texto(x && x.fonte,100) || 'Google',
      date: x && Number.isFinite(Date.parse(x.horario)) ? new Date(x.horario).toISOString() : atualizadoEm,
      image: /^https:\/\//.test(String(x && (x.imagem || x.image) || '')) ? String(x.imagem || x.image) : '',   // 20/11: foto da matéria quando o motor mandar
      link: /^https:\/\//.test(String(x && x.link || '')) ? x.link : 'https://www.google.com/search?q=' + encodeURIComponent(texto(x && x.titulo,240))
    })).filter(x=>x.title);
    const politica = lista(n.politica), tecnologia = lista(n.tecnologia);
    if(!politica.length || !tecnologia.length) throw new Error('motor sem manchetes');
    return { fonte:'motor', atualizadoEm,
      mercado:{ ok:true, atualizadoEm, cambio:{ usdbrl:usd, eurbrl:eur, usdbrlChg:d('usd_brl'), eurbrlChg:d('eur_brl'), data:atualizadoEm.slice(0,10) },
        cripto:{ bitcoin:{ usd:btc, usdt:btc, brl:Math.round(btc*usd), chgUsdt:d('btc_usd') } }, ibovespa:{ pontos:ibov, chg:d('ibovespa') } },
      noticias:{ ok:true, atualizadoEm, politica, tecnologia } };
  }
  // 24/11/2026 (Claude, pedido do Leandro): fotos das matérias achadas no servidor da Vinci a cada 15 min.
  const FOTOS_URL = 'https://ia.uservinci.com/vinci/noticias-fotos.json';
  const chaveTitulo = t => String(t || '').replace(/\s+[-|]\s+[^-|]{2,40}$/, '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
  function comFotos(r, fotos){
    if(!r || !r.noticias || !fotos) return r;
    ['politica', 'tecnologia'].forEach(k=>{ (r.noticias[k] || []).forEach(n=>{ if(!n.image){ const f = fotos[chaveTitulo(n.title)]; if(/^https:\/\//.test(String(f || ''))) n.image = f; } }); });
    return r;
  }
  function buscarMotor(){
    const ctl = typeof AbortController === 'function' ? new AbortController() : null; const t = setTimeout(()=>ctl && ctl.abort(), 6000);
    const fotos = fetch(FOTOS_URL + '?t=' + Math.floor(Date.now() / 600000), { cache:'no-store' }).then(r=>r.ok ? r.json() : null).catch(()=>null);
    return fetch(MOTOR_URL, { cache:'no-store', signal: ctl ? ctl.signal : undefined }).then(r=>r.json()).then(doMotor).then(r=>fotos.then(f=>comFotos(r, f))).finally(()=>clearTimeout(t));
  }
  function criar({ia, tokenUrl, sessao, model, onEstado}){
    const chave = 'vinci.paineis.google.v1.' + ia;
    let ultimo = null, voo = null, tentativa = 0;
    try{
      const salvo = JSON.parse(localStorage.getItem(chave) || 'null');
      if(salvo && salvo.fonte === 'googleSearch') ultimo = normalizar(salvo,salvo.atualizadoEm,salvo.groundingMetadata);
      else if(salvo && salvo.fonte === 'motor' && salvo.mercado && salvo.noticias) ultimo = salvo;
    }catch(e){}
    function avisar(estado){
      try{ if(typeof onEstado === 'function') onEstado({estado,comCache:!!ultimo}); }catch(e){}
    }
    function buscar(){
      return new Promise((resolve,reject)=>{
        const ctl = new AbortController();
        let ws = null, encerrado = false, pronto = false, dados = null, fase = 'pesquisa';
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
              systemInstruction:{parts:[{text:'Você atualiza cartões de mercado e notícias em DUAS ETAPAS na mesma sessão. PRIMEIRO TURNO: obrigatoriamente pesquise agora com googleSearch, use só os resultados dessas pesquisas, nunca sua memória. Traga sempre os dados mais atualizados do momento da pesquisa. Cotações na Binance: USDT/BRL (no campo usdbrl) e BTC/USDT (no campo bitcoin usd), com as variações percentuais de 24h; também bitcoin em BRL e euro EUR/BRL. Ibovespa em pontos: pesquise no Google mesmo; use o último fechamento disponível quando o mercado estiver fechado. Notícias: pesquise as notícias mais importantes e mais recentes, em português brasileiro: política na GloboNews e na Jovem Pan News; tecnologia no Globo Tecnologia. Encontre de uma a três manchetes concretas de cada categoria, com título da matéria em português brasileiro, fonte e data de publicação. Páginas iniciais, diretórios e nomes de seções não são manchetes. Não encerre a pesquisa após achar apenas cotações; pesquise também as duas categorias de notícias. Se a busca não fornecer um item obrigatório, não invente para completar a entrega. Não invente valores nem manchetes. Não forneça URLs; os links de busca serão montados pelo app. Finalize o primeiro turno com uma breve resposta falada sobre a pesquisa. NÃO chame entregar_paineis nesse primeiro turno. SEGUNDO TURNO: somente quando receber ENTREGAR_PAINEIS, organize os resultados já pesquisados na função entregar_paineis, uma única vez, e encerre o turno. Se não encontrou um dado obrigatório, não invente.'}]},
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
                ws.send(JSON.stringify({realtimeInput:{text:'PESQUISAR: faça buscas Google para todos os cartões, sempre com os dados mais atualizados: na Binance, USDT/BRL e BTC/USDT (e também bitcoin em BRL e euro EUR/BRL); Ibovespa no Google mesmo; e as notícias mais importantes e mais recentes em português brasileiro: política na GloboNews e na Jovem Pan News, tecnologia no Globo Tecnologia. Pesquise explicitamente política e tecnologia; guarde ao menos uma manchete concreta com título, fonte e data em CADA categoria. Não deixe de pesquisar notícias após achar as cotações. Data e hora de referência: ' + new Date().toISOString() + '. Guarde todos os valores, títulos, datas e fontes encontrados. Ao terminar, fale somente "Pesquisa concluída". Guarde os dados pesquisados para a entrega. Não chame entregar_paineis ainda; aguardarei sua resposta antes de pedir a entrega.'}}));
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
                  if(fase !== 'entrega' || !temBusca(grounding) || call.name !== entrega.name || dados) throw new Error('entrega inesperada');
                  dados = call.args;
                  responses.push({id:call.id,name:call.name,response:{ok:true}});
                }
                ws.send(JSON.stringify({toolResponse:{functionResponses:responses}}));
              }
              if(sc.interrupted || msg.toolCallCancellation || msg.goAway) throw new Error('busca interrompida');
              // inlineData (áudio) e transcrição não entram na UI nem no cache.
              if(sc.turnComplete){
                if(fase === 'pesquisa'){
                  if(!temBusca(grounding)) throw new Error('pesquisa sem comprovação do Google');
                  fase = 'entrega';
                  ws.send(JSON.stringify({realtimeInput:{text:'ENTREGAR_PAINEIS: agora entregue pela função entregar_paineis somente os dados e as notícias que você pesquisou no turno anterior. Inclua as cotações e ao menos uma das manchetes pesquisadas em politica e em tecnologia, com título, fonte e data. Preserve números, títulos, fontes e datas, sem preencher lacunas de memória. Não use lista vazia para omitir notícias que foram encontradas; se não foram encontradas, não invente. Variações percentuais não encontradas devem ser null. Não forneça URLs: o app gera a Busca Google pelo título de cada notícia. Depois da função, encerre com uma confirmação curta.'}}));
                }else terminar(null,normalizar(dados,new Date().toISOString(),grounding));
              }
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
      // Só a cada 15 min: abrir o app ou visitar o Dashboard mostra o cache; force não fura o prazo.
      if(!sessao() || (tentativa && agora - tentativa < INTERVALO) || (ultimo && agora - Date.parse(ultimo.atualizadoEm) < TTL)) return Promise.resolve(ultimo);
      tentativa = agora;
      avisar('carregando');
      voo = buscarMotor().then(r=>{ tentativa = Date.now() - INTERVALO + 3*60000; return r; }, ()=>buscar()).then(resultado=>{   // motor: confere de novo em 3 min se o dado já estiver velho
        ultimo = resultado;
        try{ localStorage.setItem(chave,JSON.stringify(ultimo)); }catch(e){}
        avisar('pronto');
        return ultimo;
      }).catch(()=>{ avisar('erro'); if(!ultimo) tentativa = Date.now() - INTERVALO + 60000; return ultimo; })  // 19/11/2026 (Claude): sem cache, falha tenta de novo em 1 min, e não trava os cartões vazios por 15 min.finally(()=>{ voo = null; });
      return voo;
    }
    return {cache:()=>ultimo,carregar};
  }
  window.VinciPaineis = {criar};
})();

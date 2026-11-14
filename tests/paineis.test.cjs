const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const pages = ['app/full.html', 'app-leo/full.html', 'app-leda/full.html'];
const NOW = Date.parse('2026-11-14T21:00:00.000Z');
const key = ia => 'vinci.paineis.google.v1.' + ia;
const payload = () => ({
  mercado:{cambio:{usdbrl:5.35, eurbrl:5.83, usdbrlChg:0.42, eurbrlChg:-0.31, data:'2026-11-14'},
    cripto:{bitcoin:{usd:99000, brl:529650, chgUsdt:1.5}}, ibovespa:{pontos:130500, chg:0.7}},
  noticias:{politica:[{title:'Manchete política', source:'Fonte política', link:'https://politica.example/noticia', date:'2026-11-14T20:00:00Z', image:'https://images.example/politica.jpg'}],
    tecnologia:[{title:'Manchete de tecnologia', source:'Fonte tecnologia', link:'https://tecnologia.example/noticia', date:'2026-11-14T20:00:00Z'}]}
});
const grounding = () => ({webSearchQueries:['cotação dólar euro bitcoin Ibovespa hoje', 'notícias política tecnologia hoje'],
  groundingChunks:[{web:{uri:'https://politica.example/noticia', title:'Fonte política'}}, {web:{uri:'https://tecnologia.example/noticia', title:'Fonte tecnologia'}}]});

function section(html, start, end) {
  const from = html.indexOf(start), to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'panel functions found: ' + start);
  return html.slice(from, to);
}

function load(page = pages[0], mode = 'padrao', options = {}) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const module = fs.readFileSync(path.join(root, 'vinci/paineis-google.js'), 'utf8');
  const ia = page.includes('leda') ? 'leda' : page.includes('leo') ? 'leo' : 'felyx';
  const tokenPath = ia === 'leda' ? '/leda/token' : '/felix/token';
  const tokenURL = 'https://vinciautomacao.app.n8n.cloud/webhook' + tokenPath + '?s=test-session';
  const requests = [], sockets = [], rendered = [], timers = new Map();
  const values = options.values || new Map();
  const state = {failure:options.failure || '', data:payload(), metadata:grounding(), now:NOW, nextTimer:0, audio:0, session:'test-session', blob:options.blob, groundingLate:options.groundingLate};
  const panel = () => ({items:[], slides:{innerHTML:''}, el:{dataset:{}, title:''}, set(items) { this.items = items; }});
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [state.now])); } static now() { return state.now; } }
  class Socket {
    constructor(url) {
      requests.push({kind:'websocket', url:String(url)}); this.url = String(url); this.readyState = 0; this.sent = []; this.closed = false; sockets.push(this);
      queueMicrotask(() => { if(!this.closed) { this.readyState = 1; this.onopen?.(); } });
    }
    message(value) {
      const data=JSON.stringify(value);
      // A slower Blob conversion must not reorder grounding and turnComplete.
      if(!this.closed) return this.onmessage?.({data:state.blob ? {text:()=>new Promise(resolve=>setTimeout(()=>resolve(data), value.serverContent?.groundingMetadata ? 15 : 0))} : data});
    }
    send(raw) {
      const m = JSON.parse(raw); this.sent.push(m);
      if(m.setup) queueMicrotask(() => this.message({setupComplete:{}}));
      if(m.clientContent) queueMicrotask(() => {
        if(state.failure === 'timeout') return;
        if(state.failure === 'close') { this.readyState = 3; this.onclose?.({code:1011, reason:'unavailable'}); return; }
        if(state.failure === 'socket') { this.onerror?.(new Error('network')); return; }
        const metadata = state.failure === 'ungrounded' ? {} : state.metadata;
        if(!state.groundingLate) this.message({serverContent:{groundingMetadata:metadata, modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000', data:'AAAA'}}]}}});
        this.message({toolCall:{functionCalls:[{id:'panels-1', name:'entregar_paineis', args:state.data}]}});
        if(state.groundingLate) this.message({serverContent:{groundingMetadata:metadata}});
      });
      if(m.toolResponse) queueMicrotask(() => this.message({serverContent:{turnComplete:true}}));
    }
    close() { this.closed = true; this.readyState = 3; }
  }
  Socket.OPEN = 1; Socket.CLOSED = 3;
  const c = {
    Date:Clock, URL, URLSearchParams, AbortController, console,
    location:{pathname:'/' + page}, document:{visibilityState:'visible'},
    localStorage:{getItem:k=>values.get(k) || null, setItem(k,v) { if(options.storageFails) throw Error('storage unavailable'); values.set(k,v); }, removeItem:k=>values.delete(k)},
    WebSocket:Socket,
    setTimeout(fn, ms) { const id = ++state.nextTimer; timers.set(id,{fn, at:state.now + Number(ms), ms:Number(ms)}); return id; },
    clearTimeout:id=>timers.delete(id),
    fetch:async (url, opts = {}) => {
      requests.push({kind:'fetch', url:String(url), opts});
      assert.equal(String(url), tokenURL, 'cards may fetch only the current token endpoint');
      if(state.failure === 'token') throw Error('offline');
      if(state.failure === 'http') return {ok:false, status:503, json:async()=>({})};
      if(state.failure === 'bad-token') return {ok:true, status:200, json:async()=>({})};
      if(state.failure === 'token-json') return {ok:true, status:200, json:async()=>{throw Error('bad JSON')}};
      if(state.failure === 'token-timeout') return new Promise(() => {});
      return {ok:true, status:200, json:async()=>({token:'ephemeral-token'})};
    },
    AudioContext:class { constructor() { state.audio++; throw Error('cards cannot play audio'); } },
    navigator:{mediaDevices:{getUserMedia() { state.audio++; throw Error('cards cannot open the microphone'); }}},
    marketWhen:{textContent:'carregando', title:'', dataset:{}}, newsPol:panel(), newsTec:panel(),
    renderMercado:data=>rendered.push(data),
    hhmm:date=>date.toISOString().slice(11,16),
    conv:{active:true, ws:{send(){throw Error('cards cannot reuse the conversation socket')}}},
    VinciIA:{modo:()=>mode},
    SESSAO:state.session,
    comS:url=>url + '?s=' + state.session,
    MODEL:'gemini-3.8-live'
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(module,c,{filename:'vinci/paineis-google.js'});
  vm.runInContext(section(html, 'const N8N =', 'const SESSION_ID ='),c);
  vm.runInContext(section(html, 'const paineisGoogle =', '/* ===================== notícias'),c);
  vm.runInContext(section(html, 'let noticiasAt', '/* ===================== matriz'),c);
  async function flush() { await new Promise(setImmediate); }
  async function advance(ms) {
    state.now += ms;
    for(const [id, timer] of [...timers]) if(timer.at <= state.now) { timers.delete(id); timer.fn(); }
    await flush();
  }
  return {c, ia, tokenURL, requests, sockets, rendered, values, state, timers, flush, advance};
}

for(const page of pages) for(const mode of ['padrao','full']) {
  test(page + ' / ' + mode + ': both loaders contact only the token endpoint and Google, sharing one grounded Live session', async () => {
    const h = load(page,mode);
    const m = h.c.loadMercado(true), n = h.c.loadNoticias(true);
    assert.equal(h.c.loadMercado(true),m);
    assert.equal(h.c.loadNoticias(true),n);
    const [market] = await Promise.all([m,n]);
    assert.equal(market.cambio.usdbrl,5.35); assert.equal(market.cripto.bitcoin.usd,99000);
    assert.equal(market.cambio.usdbrlChg,0.42); assert.equal(market.cambio.eurbrlChg,-0.31);
    assert.equal(market.ibovespa.pontos,130500);
    assert.equal(h.c.newsPol.items[0].title,'Manchete política');
    assert.equal(h.c.newsTec.items[0].title,'Manchete de tecnologia');
    assert.equal(h.requests.length,2);
    assert.equal(h.requests[0].url,h.tokenURL);
    assert.equal(h.requests[0].opts.redirect,'error', 'token redirects cannot escape the allowed endpoint');
    const url = new URL(h.requests[1].url);
    assert.equal(url.protocol,'wss:'); assert.equal(url.hostname,'generativelanguage.googleapis.com');
    assert.match(url.pathname,/BidiGenerateContentConstrained$/); assert.equal(url.searchParams.get('access_token'),'ephemeral-token');
    const setup = h.sockets[0].sent.find(m=>m.setup).setup;
    assert.ok(setup.tools.some(tool=>tool.googleSearch));
    assert.deepEqual(setup.generationConfig.responseModalities,['AUDIO']);
    assert.ok(setup.tools.some(tool=>tool.functionDeclarations?.some(fn=>fn.name==='entregar_paineis')));
    assert.equal(h.state.audio,0); assert.equal(h.c.conv.active,true); assert.equal(h.sockets[0].closed,true);
    assert.ok(!h.c.newsPol.items[0].image,'news rendering does not request an external image host');
    const stored = JSON.parse(h.values.get(key(h.ia)));
    assert.equal(stored.fonte,'googleSearch'); assert.equal(Date.parse(stored.atualizadoEm),NOW);
    assert.equal(stored.mercado.cambio.usdbrlChg,0.42); assert.equal(stored.mercado.cambio.eurbrlChg,-0.31);
    assert.ok(stored.groundingMetadata.webSearchQueries.length);
    await Promise.all([h.c.loadMercado(),h.c.loadNoticias()]);
    assert.equal(h.requests.length,2,'fresh data is served from cache');
  });
}

test('Google delivery requests nullable daily percentage changes for both currencies', async () => {
  const h=load(); await h.c.loadMercado(true);
  const setup=h.sockets[0].sent.find(m=>m.setup).setup;
  const delivery=setup.tools.flatMap(tool=>tool.functionDeclarations || []).find(fn=>fn.name==='entregar_paineis');
  const cambio=delivery.parameters.properties.mercado.properties.cambio;
  for(const field of ['usdbrlChg','eurbrlChg']) {
    assert.equal(cambio.properties[field].type,'NUMBER');
    assert.equal(cambio.properties[field].nullable,true);
    assert.ok(cambio.required.includes(field));
    assert.match(cambio.properties[field].description,/dia/i);
    assert.match(cambio.properties[field].description,/Google/);
    assert.match(cambio.properties[field].description,/null/i);
  }
});

test('currency changes preserve zero and normalize unavailable values to null, including after reload', async () => {
  for(const value of [0, null, undefined, '0.42', false, {}, NaN, Infinity]) {
    const h=load();
    h.state.data.mercado.cambio.usdbrlChg=value;
    h.state.data.mercado.cambio.eurbrlChg=value;
    const market=await h.c.loadMercado(true), expected=value === 0 ? 0 : null;
    assert.equal(market.cambio.usdbrlChg,expected);
    assert.equal(market.cambio.eurbrlChg,expected);
    assert.equal(market.cambio.usdbrl,5.35,'unavailable percentage does not discard the price');
    const reloaded=load(pages[0],'full',{values:h.values});
    const cached=await reloaded.c.loadMercado();
    assert.equal(cached.cambio.usdbrlChg,expected);
    assert.equal(cached.cambio.eurbrlChg,expected);
    assert.equal(reloaded.requests.length,0);
  }
});

test('cache survives reload and an offline refresh without changing values or their timestamp', async () => {
  const first = load(); await Promise.all([first.c.loadMercado(true),first.c.loadNoticias(true)]);
  const saved = first.values.get(key(first.ia));
  const second = load(pages[0],'full',{values:first.values, failure:'token'});
  await second.advance(15*60000);
  const market = second.c.loadMercado(true), news = second.c.loadNoticias(true);
  assert.equal(second.rendered[0].cambio.usdbrl,5.35,'cached market renders before the refresh finishes');
  assert.equal(second.rendered[0].cambio.usdbrlChg,0.42); assert.equal(second.rendered[0].cambio.eurbrlChg,-0.31);
  assert.equal(second.c.newsPol.items[0].title,'Manchete política','cached headlines render immediately');
  await Promise.all([market,news]);
  assert.equal(second.values.get(key(second.ia)),saved,'failed refresh must not renew the cache timestamp');
  assert.equal(second.rendered.at(-1).atualizadoEm,new Date(NOW).toISOString());
  assert.equal(second.c.newsTec.items[0].title,'Manchete de tecnologia');
  assert.doesNotMatch(second.c.marketWhen.textContent,/erro|conexão|indispon/i);
  assert.doesNotMatch(second.c.newsPol.slides.innerHTML,/erro|indispon/i);
});

test('cache expires and a forced refresh is throttled, with a fresh single-use token each session', async () => {
  const h=load(); await h.c.loadMercado(true);
  await h.c.loadMercado(true); assert.equal(h.requests.length,2);
  await h.advance(21000); h.state.data.mercado.cambio.usdbrl=5.4;
  assert.equal((await h.c.loadMercado(true)).cambio.usdbrl,5.4); assert.equal(h.requests.length,4);
  await h.advance(15*60000); await Promise.all([h.c.loadMercado(),h.c.loadNoticias()]);
  assert.equal(h.requests.length,6); assert.equal(h.sockets.length,3);
});

for(const failure of ['token','http','bad-token','token-json','socket','close','ungrounded']) {
  test(failure + ': first-load failure is silent and never caches invented values', async () => {
    const h=load(pages[0],'padrao',{failure});
    const [market]=await Promise.all([h.c.loadMercado(true),h.c.loadNoticias(true)]);
    assert.equal(market,null); assert.equal(h.values.has(key(h.ia)),false);
    assert.equal(h.rendered.length,0); assert.equal(h.c.newsPol.items.length,0);
    assert.doesNotMatch(h.c.marketWhen.textContent,/erro|conexão|indispon/i);
    assert.doesNotMatch(h.c.newsPol.slides.innerHTML,/erro|indispon/i);
    assert.equal(h.state.audio,0);
  });
}

for(const failure of ['timeout','token-timeout']) test(failure + ': the deadline releases the request and preserves cached data', async () => {
  const h=load(); await h.c.loadMercado(true);
  const saved=h.values.get(key(h.ia)); await h.advance(15*60000); h.state.failure=failure;
  const pending=h.c.loadMercado(true); await h.flush(); await h.advance(45001);
  assert.equal((await pending).cambio.usdbrl,5.35);
  assert.equal(h.values.get(key(h.ia)),saved);
  assert.ok(h.sockets.every(s=>s.closed));
  assert.equal(h.requests.filter(r=>r.kind==='fetch').at(-1).opts.signal.aborted,true);
  assert.equal(h.timers.size,0);
});

test('delayed Blob frames preserve message order and allow grounding after the tool call', async () => {
  const h=load(pages[0],'padrao',{blob:true,groundingLate:true});
  const [market,news]=await Promise.all([h.c.loadMercado(true),h.c.loadNoticias(true)]);
  assert.equal(market.cambio.usdbrl,5.35); assert.equal(news.politica[0].title,'Manchete política');
  assert.equal(h.sockets[0].closed,true);
});

for(const field of ['webSearchQueries','groundingChunks']) test('missing ' + field + ' is not accepted as Google grounding', async () => {
  const h=load(); h.state.metadata[field]=[];
  assert.equal(await h.c.loadMercado(true),null);
  assert.equal(h.values.has(key(h.ia)),false);
});

test('market rendering shows the cached observation time, not the time of an offline reload', () => {
  const html=fs.readFileSync(path.join(root,pages[0]),'utf8');
  const fields=new Map(), row={dataset:{},querySelector(selector){if(!fields.has(selector)) fields.set(selector,{textContent:''}); return fields.get(selector)}};
  const c={ASSETS:[{id:'usd',dec:4,pick:m=>({brl:m.cambio.usdbrl})}], marketRows:{querySelector:()=>row},
    marketWhen:{textContent:'',title:''},shown:{},tween(el,from,to){el.textContent=String(to)},fmt:String,
    setTimeout:()=>1,hhmm:date=>date.toISOString().slice(11,16)};
  vm.createContext(c); vm.runInContext(section(html,'function renderMercado(m){','const paineisGoogle ='),c);
  assert.equal(c.renderMercado({cambio:{usdbrl:5.35,data:'2026-11-14'},atualizadoEm:'2026-11-14T20:17:00Z'}),true);
  assert.equal(c.marketWhen.textContent,'20:17'); assert.match(c.marketWhen.title,/14\/11\/2026/);
});

for(const page of pages) test(page + ': currency cards render signed changes, zero and unavailable percentages', () => {
  const html=fs.readFileSync(path.join(root,page),'utf8');
  const rows=new Map(['usd','eur','btc'].map(id=>{
    const fields=new Map();
    return [id,{dataset:{},querySelector(selector){if(!fields.has(selector)) fields.set(selector,{textContent:''}); return fields.get(selector)}}];
  }));
  const c={marketRows:{querySelector:selector=>rows.get(selector.match(/data-id="([^"]+)"/)[1])},
    marketWhen:{textContent:'',title:''},shown:{},tween(el,from,to){el.textContent=String(to)},
    fmt:(value,dec)=>value.toFixed(dec).replace('.',','),setTimeout:()=>1,hhmm:date=>date.toISOString().slice(11,16)};
  vm.createContext(c);
  vm.runInContext(section(html,'const ASSETS =','const marketRows ='),c);
  vm.runInContext(section(html,'function renderMercado(m){','const paineisGoogle ='),c);
  for(const [usd,eur,usdText,eurText,usdClass,eurClass] of [
    [0.42,-0.31,'+0,42% 24h','-0,31% 24h','chg up','chg dn'],
    [-0.31,0.42,'-0,31% 24h','+0,42% 24h','chg dn','chg up'],
    [0,0,'0,00% 24h','0,00% 24h','chg','chg'],
    [null,null,'ref. 14/11','ref. 14/11','chg','chg'],
    [undefined,undefined,'ref. 14/11','ref. 14/11','chg','chg'],
  ]) {
    const market=payload().mercado;
    Object.assign(market.cambio,{usdbrlChg:usd,eurbrlChg:eur});
    market.atualizadoEm=new Date(NOW).toISOString();
    assert.equal(c.renderMercado(market),true);
    for(const [id,text,css] of [['usd',usdText,usdClass],['eur',eurText,eurClass]]) {
      const change=rows.get(id).querySelector('[data-chg]');
      assert.equal(change.textContent,text);
      assert.equal(change.className.trim(),css);
      assert.equal(rows.get(id).dataset.stale,'0');
    }
  }
});

test('without a login session the loaders can render cache but never request a token', async () => {
  const first=load(); await first.c.loadMercado(true);
  const h=load(pages[0],'padrao',{values:first.values}); h.c.SESSAO='';
  assert.equal((await h.c.loadMercado(true)).cambio.usdbrl,5.35);
  assert.equal(h.requests.length,0);
});

for(const [name,change] of [
  ['invalid market price',p=>{p.mercado.cambio.usdbrl=-1}],
  ['missing news',p=>{p.noticias.tecnologia=[]}],
  ['malformed payload',p=>{delete p.mercado}],
]) test(name + ' cannot replace the last grounded snapshot', async () => {
  const h=load(); await h.c.loadMercado(true);
  const saved=h.values.get(key(h.ia)); await h.advance(15*60000); change(h.state.data);
  assert.equal((await h.c.loadMercado(true)).cambio.usdbrl,5.35);
  assert.equal(h.values.get(key(h.ia)),saved);
});

test('storage failure still retains the last valid snapshot in memory', async () => {
  const h=load(pages[0],'padrao',{storageFails:true});
  await h.c.loadMercado(true); await h.advance(15*60000); h.state.failure='token';
  assert.equal((await h.c.loadMercado(true)).cambio.usdbrl,5.35);
  assert.equal(h.values.size,0);
});

test('each app uses its own cache and ignores corrupt or legacy non-Google data', async () => {
  const values = new Map([[key('felyx'),'{invalid json']]);
  const h=load(pages[0],'padrao',{values}); await h.c.loadMercado(true);
  assert.ok(values.has(key('felyx')));
  const leda=load('app-leda/full.html','full',{values,failure:'token'});
  assert.equal(await leda.c.loadMercado(true),null);
  values.set(key('leo'),JSON.stringify({...JSON.parse(values.get(key('felyx'))),fonte:'binance'}));
  const leo=load('app-leo/full.html','full',{values,failure:'token'});
  assert.equal(await leo.c.loadMercado(true),null);
});

test('all three pages remove legacy panel routes, public APIs and Full-only gating', () => {
  for(const page of pages) {
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/<script[^>]+src="\.\.\/vinci\/paineis-google\.js/);
    assert.doesNotMatch(html,/paineisNoFull|mercadoNoFull|fetchMercadoDireto|MERCADO_URL|NOTICIAS_URL/);
    assert.doesNotMatch(html,/MOTOR_GOOGLE|apoioGen\('(mercado|noticia)'|name:'(bolsas|noticias|manchetes_do_dia)'/);
    assert.match(section(html,'const GEN_TOOLS =','/* 13/11/2026: falha'),/googleSearch:\s*\{\}/);
    assert.doesNotMatch(html,/https?:\/\/[^'"\s]*(?:frankfurter|coingecko|binance|\/felix\/(?:mercado|noticias)|rss)/i);
  }
});

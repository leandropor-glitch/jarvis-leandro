/* QA REAL: serve o código local; não simula fetch, token, WebSocket ou grounding.
   node tests/live-paineis-server.cjs [--output ../evidencias-rodada-3b]
   Abra http://127.0.0.1:8787/qa. A senha só vai do browser ao login oficial. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outputAt = args.indexOf('--output');
const output = path.resolve(outputAt >= 0 ? args[outputAt + 1] : path.join(repo, '../evidencias-rodada-3b'));
const MAX_BODY = 2 * 1024 * 1024;

function sanitize(value) {
  if(Array.isArray(value)) return value.map(sanitize);
  if(value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([name])=>!/^(?:password|senha|token|access_token|authorization|api_key|apiKey|sessao|session)$/i.test(name))
      .map(([name,item])=>[name,sanitize(item)]));
  }
  if(typeof value === 'string') return value
    .replace(/([?&](?:access_token|token|key|s)=)[^\s&"'<>]+/gi,'$1[REMOVIDO]')
    .replace(/Bearer\s+[^\s"'<>]+/gi,'Bearer [REMOVIDO]');
  return value;
}

function qaPage(hash) {
  return String.raw`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VINCI · QA real rodada-3b</title>
<style>body{font:16px system-ui;background:#111;color:#eee;max-width:1050px;margin:25px auto;padding:0 20px}button,input{font:inherit;padding:10px;margin:5px 5px 5px 0}button{cursor:pointer}button:disabled{opacity:.45}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#202020;padding:12px;border-radius:8px}a{color:#b8dcff}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid #444}small{color:#aaa}.ok{color:#b0f093}.falha{color:#ffbb9c}</style>
<h1>Teste real dos cartões · rodada-3b</h1>
<p>Mesmo módulo da versão local, token n8n real e Gemini Live real. Sem dados simulados, reprodução de áudio ou microfone.</p>
<p><small>Módulo SHA-256: <span id="moduleHash"></span></small></p>
<form id="login" autocomplete="off"><label>Senha DEMO · 0000000000<br><input id="password" type="password" autocomplete="off" required aria-label="Senha DEMO"></label><button id="loginButton" type="submit">Entrar DEMO</button></form>
<p id="loginStatus" role="status" aria-live="polite">Login confirmado: não</p>
<p><button class="run" data-ia="felyx" disabled>Executar Felyx · uma carga</button><button class="run" data-ia="leda" disabled>Executar Leda · uma carga</button><button class="run" data-ia="leo" disabled>Executar Leo · uma carga</button></p>
<p><a href="/jarvis-leandro/app/full.html" target="_blank" rel="noopener">Abrir Felyx local</a> · <a href="/jarvis-leandro/app-leda/full.html" target="_blank" rel="noopener">Abrir Leda local</a> · <a href="/jarvis-leandro/app-leo/full.html" target="_blank" rel="noopener">Abrir Leo local</a></p>
<p id="status" role="status" aria-live="polite">Pronto para login.</p>
<table><thead><tr><th>Carga</th><th>Resultado</th><th>Tempo</th><th>USD/BRL</th><th>EUR/BRL</th><th>Busca</th></tr></thead><tbody id="summary"></tbody></table>
<h2>Eventos da carga atual</h2><pre id="events"></pre><h2>Resultados e links</h2><div id="results"></div>
<script>
'use strict';
const MODULE_HASH = '__MODULE_HASH__';
// Transporte local autenticado: o servidor encaminha a resposta original do n8n,
// sem gravar credenciais nem alterar CORS ou workflows de produção.
const N8N = '/qa/n8n';
const MODEL = 'gemini-3.8-live';
const $ = id=>document.getElementById(id);
$('moduleHash').textContent = MODULE_HASH;
let session = '', current = null, count = 0;
const knownSecrets = new Set();
function clean(value) {
  if(Array.isArray(value)) return value.map(clean);
  if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name])=>!/^(?:password|senha|token|access_token|authorization|api_key|apiKey|sessao|session)$/i.test(name))
    .map(([name,item])=>[name,clean(item)]));
  if(typeof value !== 'string') return value;
  for(const secret of knownSecrets) if(secret && secret.length >= 8) value = value.split(secret).join('[REMOVIDO]');
  return value.replace(/([?&](?:access_token|token|key|s)=)[^\s&"'<>]+/gi,'$1[REMOVIDO]').replace(/Bearer\s+[^\s"'<>]+/gi,'Bearer [REMOVIDO]');
}
function persist(run,body) {
  run.saves = run.saves.then(async()=>{
    const response = await fetch('/qa/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(clean(body))});
    if(!response.ok) throw new Error('não salvou');
  }).catch(()=>{ run.saveFailed = true; });
}
function record(run,type,details) {
  if(!run || run.finished) return;
  const event = clean({seq:run.events.length + 1,ms:Math.round(performance.now()-run.started),type,...details});
  run.events.push(event);
  $('events').textContent = JSON.stringify(run.events,null,2);
  persist(run,{kind:'event',id:run.id,ia:run.ia,event});
}
const NativeWebSocket = window.WebSocket;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (...args)=>{
  const isToken=typeof args[0]==='string' && /^\/qa\/n8n\/(felix|leda)\/token\?/.test(args[0]);
  const run=current;
  try{
    const response=await nativeFetch(...args);
    if(isToken){
      const raw=await response.clone().text();let body={};try{body=JSON.parse(raw);}catch{}
      if(typeof body.token==='string') knownSecrets.add(body.token);
      record(run,'token_response',{status:response.status,upstream:response.headers.get('X-QA-Upstream-Status'),keys:Object.keys(body),temToken:!!body.token,relogar:!!body.relogar,erro:!response.ok?clean(raw.slice(0,180)):undefined});
    }
    return response;
  }catch(error){if(isToken) record(run,'token_network_error',{});throw error;}
};
// Subclasse observadora: super.send e os eventos reais seguem intactos para o módulo.
window.WebSocket = class ObservedWebSocket extends NativeWebSocket {
  constructor(...args) {
    super(...args);
    this.qaRun = current;
    try{ const token = new URL(args[0]).searchParams.get('access_token'); if(token) knownSecrets.add(token); }catch{}
    if(this.qaRun) this.qaRun.sockets.push(this);
    this.qaMessages = Promise.resolve();
    this.addEventListener('open',()=>record(this.qaRun,'socket_open',{}));
    this.addEventListener('error',()=>record(this.qaRun,'socket_error',{}));
    this.addEventListener('close',event=>record(this.qaRun,'socket_close',{code:event.code}));
    this.addEventListener('message',event=>{
      this.qaMessages = this.qaMessages.then(async()=>{
        const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
        const sc = message.serverContent || {};
        const parts=(sc.modelTurn?.parts || []).filter(part=>!part.inlineData);
        if(parts.length) record(this.qaRun,'model_parts',{parts});
        if(Object.keys(message).some(key=>!['serverContent','toolCall','setupComplete','usageMetadata','toolCallCancellation','goAway','sessionResumptionUpdate'].includes(key))) record(this.qaRun,'message_extra',{message:Object.fromEntries(Object.entries(message).filter(([key])=>key!=='serverContent'))});
        if(message.setupComplete) record(this.qaRun,'setup_complete',{});
        if(sc.groundingMetadata) record(this.qaRun,'grounding',{metadata:sc.groundingMetadata});
        if(sc.outputTranscription) record(this.qaRun,'output_transcription',{transcription:sc.outputTranscription});
        if(message.toolCall) record(this.qaRun,'tool_call',{calls:(message.toolCall.functionCalls || []).map(call=>({id:call.id,name:call.name,args:call.args}))});
        if(sc.turnComplete) record(this.qaRun,'turn_complete',{interactionStatus:sc.interactionStatus});
        if(sc.interrupted) record(this.qaRun,'interrupted',{});
        if(message.toolCallCancellation) record(this.qaRun,'tool_cancelled',{});
        if(message.goAway) record(this.qaRun,'go_away',{});
        if(message.error) record(this.qaRun,'server_error',{error:message.error});
        // modelTurn.inlineData (áudio) e setup/auth nunca são registrados.
      }).catch(()=>record(this.qaRun,'message_parse_error',{}));
    });
  }
  send(raw) {
    try{
      const message = JSON.parse(raw);
      if(message.setup) record(this.qaRun,'setup_sent',{model:message.setup.model,tools:(message.setup.tools||[]).map(t=>Object.keys(t))});
      if(message.clientContent) record(this.qaRun,'client_content',{texts:(message.clientContent.turns || []).flatMap(turn=>(turn.parts || []).filter(part=>typeof part.text === 'string').map(part=>part.text))});
      if(message.realtimeInput?.text) record(this.qaRun,'realtime_input',{text:message.realtimeInput.text});
      if(message.toolResponse) record(this.qaRun,'tool_response',{responses:message.toolResponse.functionResponses});
    }catch{}
    return super.send(raw);
  }
};
function controls(busy) {
  document.querySelectorAll('.run').forEach(button=>{ button.disabled=busy || !session; });
  $('loginButton').disabled=busy;
}
$('login').addEventListener('submit',async event=>{
  event.preventDefault();
  let password = $('password').value;
  if(!password || current) return;
  $('password').value = '';
  controls(true); $('loginStatus').textContent='Confirmando login DEMO…';
  try{
    let response = await fetch(N8N+'/felix/app',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({acao:'entrar',telefone:'0000000000',senha:password,aparelho:'Codex rodada-3b QA'})});
    let data = await response.json();
    if(!(response.ok && data.ok && data.token)){
      response = await fetch(N8N+'/felix/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telefone:'0000000000',senha:password})});
      data = await response.json();
    }
    password = '';
    if(!response.ok || !data.ok || typeof data.token !== 'string' || !data.token) throw new Error('login recusado HTTP '+response.status+' ok='+Boolean(data.ok)+' token='+Boolean(data.token));
    session = data.token; knownSecrets.add(session);
    // Única persistência de autenticação: armazenamento local deste navegador, usado pelo app local.
    localStorage.setItem('felyx_sessao',session);
    $('loginStatus').textContent='Login confirmado: sim'; $('status').textContent='Pronto para uma carga real.';
  }catch(error){
    session=''; localStorage.removeItem('felyx_sessao');
    $('loginStatus').textContent='Login confirmado: não. '+(error.message.startsWith('login recusado HTTP ')?error.message:'Falha de rede ou resposta inválida.');
  }finally{ password=''; $('password').value=''; controls(false); }
});
async function run(ia) {
  if(!session || current) return;
  const run = {id:ia+'-'+Date.now()+'-'+(++count),ia,started:performance.now(),startedAt:new Date().toISOString(),events:[],sockets:[],saves:Promise.resolve(),saveFailed:false,finished:false};
  current=run; controls(true); $('events').textContent=''; $('status').textContent='Buscando no Google: '+ia+'…';
  let data=null, error='';
  try{
    localStorage.removeItem('vinci.paineis.google.v1.'+ia);
    record(run,'start',{ia,model:MODEL,moduleSha256:MODULE_HASH,cacheLimpo:true});
    const panels = VinciPaineis.criar({ia,model:()=>MODEL,sessao:()=>session,
      tokenUrl:()=>N8N+(ia==='leda'?'/leda/token':'/felix/token')+'?s='+encodeURIComponent(session),
      onEstado:state=>record(run,'state',{state})});
    data=await panels.carregar(true);
  }catch{ error='Exceção na carga; confira os eventos sanitizados.'; }
  const elapsed = Math.round(performance.now()-run.started);
  await Promise.all(run.sockets.map(socket=>socket.qaMessages));
  await new Promise(resolve=>setTimeout(resolve,200));
  const observedGrounding=run.events.filter(event=>event.type==='grounding');
  const metadata=data?.groundingMetadata || {webSearchQueries:observedGrounding.flatMap(e=>e.metadata.webSearchQueries || []),groundingChunks:observedGrounding.flatMap(e=>e.metadata.groundingChunks || [])};
  const result=clean({id:run.id,ia,startedAt:run.startedAt,finishedAt:new Date().toISOString(),moduleSha256:MODULE_HASH,model:run.events.find(e=>e.type==='setup_sent')?.model || MODEL,
    ok:!!data,tempoMs:elapsed,primeiroGroundingMs:observedGrounding[0]?.ms ?? null,
    motivoFalha:data?'':error || (observedGrounding.length?'A entrega não foi validada; confira os eventos.':'Nenhum groundingMetadata observado; cartões não validados.'),
    mercado:data?.mercado || null,noticias:data?.noticias || null,groundingMetadata:metadata || null,
    queries:metadata?.webSearchQueries?.length || 0,chunks:metadata?.groundingChunks?.length || 0,
    links:data ? [...data.noticias.politica,...data.noticias.tecnologia].map(item=>({title:item.title,url:item.link})) : [],events:run.events});
  run.finished=true;
  persist(run,{kind:'result',id:run.id,ia,result}); await run.saves;
  const row=document.createElement('tr');
  [run.id,result.ok?'OK':'FALHOU',(elapsed/1000).toFixed(2)+' s',result.mercado?.cambio?.usdbrl ?? '—',result.mercado?.cambio?.eurbrl ?? '—',result.queries+' queries / '+result.chunks+' fontes'].forEach(value=>{const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);});
  $('summary').append(row);
  const detail=document.createElement('details'),title=document.createElement('summary'),pre=document.createElement('pre');
  title.textContent=run.id+' · '+(result.ok?'OK':'FALHOU');pre.textContent=JSON.stringify(result,null,2);detail.append(title,pre);
  for(const link of result.links) {const p=document.createElement('p'),a=document.createElement('a');a.textContent=link.title;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);detail.append(p);}
  detail.open=true;$('results').prepend(detail);
  $('status').textContent=(result.ok?'Carga real concluída.':'Carga real falhou.')+(run.saveFailed?' Não foi possível salvar toda a evidência.':' Evidência salva no servidor local.');
  current=null;controls(false);
}
document.querySelectorAll('.run').forEach(button=>button.addEventListener('click',()=>run(button.dataset.ia)));
session=localStorage.getItem('felyx_sessao') || '';
if(session){knownSecrets.add(session);$('loginStatus').textContent='Sessão DEMO recuperada neste navegador; token será validado pelo n8n.';controls(false);}
</script>
<script src="/jarvis-leandro/vinci/paineis-google.js?qa=__MODULE_HASH__"></script>
</html>`.replaceAll('__MODULE_HASH__',hash);
}

const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav'};
function createServer() {
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const url=new URL(req.url,'http://127.0.0.1:8787');
      if(req.headers.host!=='127.0.0.1:8787') {res.writeHead(403);res.end();return;}
      if(url.pathname.startsWith('/qa/n8n/')) {
        if(req.headers.origin && req.headers.origin!=='http://127.0.0.1:8787') {res.writeHead(403);res.end();return;}
        const endpoint=url.pathname.slice('/qa/n8n'.length);
        const method=endpoint.endsWith('/token')?'GET':'POST';
        if(!['/felix/app','/felix/login','/felix/token','/leda/token'].includes(endpoint) || req.method!==method) {res.writeHead(403);res.end();return;}
        const chunks=[];let length=0;
        for await(const chunk of req) {length+=chunk.length;if(length>8192) {res.writeHead(413);res.end();return;}chunks.push(chunk);}
        // Reproduz o cabeçalho que o navegador envia a partir do app publicado.
        // A sessão continua sendo autenticada pelo próprio n8n; nenhuma resposta é simulada.
        const upstream=await fetch('https://vinciautomacao.app.n8n.cloud/webhook'+endpoint+url.search,{method,headers:{'Content-Type':'application/json','Origin':'https://leandropor-glitch.github.io','User-Agent':req.headers['user-agent'] || ''},body:method==='POST'?Buffer.concat(chunks):undefined,redirect:'error',signal:AbortSignal.timeout(25000)});
        res.writeHead(upstream.status,{'Content-Type':'application/json; charset=utf-8','X-QA-Upstream-Status':String(upstream.status)});
        res.end(Buffer.from(await upstream.arrayBuffer()));return;
      }
      if(req.method==='GET' && (url.pathname==='/qa' || url.pathname==='/')) {
        const source=await fsp.readFile(path.join(repo,'vinci/paineis-google.js'));
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end(qaPage(crypto.createHash('sha256').update(source).digest('hex')));return;
      }
      if(req.method==='POST' && url.pathname==='/qa/result') {
        if(req.headers.origin && req.headers.origin!=='http://127.0.0.1:8787') { res.writeHead(403);res.end();return; }
        const chunks=[];let length=0;
        for await(const chunk of req) { length+=chunk.length;if(length>MAX_BODY) {res.writeHead(413);res.end();return;}chunks.push(chunk); }
        const data=sanitize(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        if(!/^(?:felyx|leda|leo)-\d+-\d+$/.test(data.id) || !['felyx','leda','leo'].includes(data.ia) || !['event','result'].includes(data.kind)) {res.writeHead(400);res.end();return;}
        await fsp.mkdir(output,{recursive:true});
        if(data.kind==='event') await fsp.appendFile(path.join(output,data.id+'.events.ndjson'),JSON.stringify(data.event)+'\n');
        else await fsp.writeFile(path.join(output,data.id+'.json'),JSON.stringify(data.result,null,2)+'\n');
        res.setHeader('Content-Type','application/json');res.end('{"ok":true}');return;
      }
      if(req.method==='GET' && url.pathname.startsWith('/jarvis-leandro/')) {
        const relative=decodeURIComponent(url.pathname.slice('/jarvis-leandro/'.length));
        if(relative.split('/').some(part=>part.startsWith('.'))) {res.writeHead(403);res.end();return;}
        let filename=path.resolve(repo,relative || 'index.html');
        if(!filename.startsWith(repo+path.sep)) {res.writeHead(403);res.end();return;}
        if((await fsp.stat(filename)).isDirectory()) filename=path.join(filename,'index.html');
        const real=await fsp.realpath(filename);
        if(!real.startsWith(repo+path.sep)) {res.writeHead(403);res.end();return;}
        res.setHeader('Content-Type',mime[path.extname(real).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(real).pipe(res);return;
      }
      res.writeHead(404);res.end('Não encontrado');
    }catch {if(!res.headersSent) res.writeHead(400);res.end('Solicitação inválida');}
  });
}
if(require.main===module) {
  if(args.includes('--help')) console.log('node tests/live-paineis-server.cjs [--output ../evidencias-rodada-3b]\nInterface: http://127.0.0.1:8787/qa');
  else createServer().listen(8787,'127.0.0.1',()=>console.log('QA REAL: http://127.0.0.1:8787/qa\nEvidências sanitizadas: '+output));
}
module.exports={qaPage,sanitize,createServer};

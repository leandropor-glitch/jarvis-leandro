const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
const code=fs.readFileSync(require('node:path').join(__dirname,'../vinci/ia-padrao.js'),'utf8');
const FILA='vinci.replica.pendentes.felyx';
const recibo=()=>({ok:true,json:async()=>({ok:true,persistida:true,id:7})});
const pendentes=(c,ia='felyx')=>JSON.parse(c.localStorage.getItem('vinci.replica.pendentes.'+ia)||'[]');
function load(fetch,{ia='felyx',values=new Map([['felyx_sessao','test-session']]),storageFails=false,original=async()=>({ok:true})}={}){
 const timers=new Map(),events=new Map();let timerId=0;
 const c={location:{pathname:'/app/',search:''},document:{currentScript:{dataset:{ia}}},
  localStorage:{getItem:k=>values.get(k)||null,setItem(k,v){if(storageFails)throw Error('storage unavailable');values.set(k,v)},removeItem(k){if(storageFails)throw Error('storage unavailable');values.delete(k)}},
  fetch,AbortController,setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),URLSearchParams,
  GEN_FERRAMENTAS:{favoritos:original,ambientes:original,automacoes:original}};
 let receitas=[];c.ledaReceitas={lista:()=>receitas,salvar:r=>{receitas=r},padrao:()=>{receitas=[]}};
 c.addEventListener=(name,fn)=>events.set(name,fn);c.window=c;
 vm.createContext(c);vm.runInContext(code,c);c.VinciIA.instalar();
 c.fire=name=>events.get(name)();
 c.runTimer=ms=>{const timer=[...timers].find(([,t])=>t.ms===ms);assert.ok(timer,'timer '+ms+' scheduled');timers.delete(timer[0]);timer[1].fn()};
 c.hasTimer=ms=>[...timers.values()].some(t=>t.ms===ms);
 return c;
}
function assertQueued(r){
 assert.equal(r.ok,true);assert.equal(r.replica_status,'na_fila');
 assert.equal(r.replica,'feito, e já mandei para a fila da Vinci replicar');
}
for(const [name,fetch] of [
 ['network failure',async()=>{throw Error('offline')}],
 ['HTTP rejection',async()=>({ok:false})],
 ['invalid receipt',async()=>({ok:true,json:async()=>({})})],
 ['invalid JSON',async()=>({ok:true,json:async()=>{throw Error('invalid JSON')}})],
 ['early acknowledgement without persistence',async()=>({ok:true,json:async()=>({ok:true})})],
 ['receipt without persistence',async()=>({ok:true,json:async()=>({ok:true,id:7})})],
 ['receipt without n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true})})],
 ['receipt with null n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:null})})],
 ['receipt with empty n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:''})})],
 ['receipt with blank n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:'  '})})],
 ['receipt with boolean n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:true})})],
 ['receipt with object n8n id',async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:{}})})],
 ['business rejection',async()=>({ok:true,json:async()=>({ok:false,persistida:true,id:7})})]
])test(name+' keeps the local queue for background retry',async()=>{
 const c=load(fetch);const r=await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});
 assertQueued(r);await c.VinciIA.reenviarPendentes();
 assert.equal(pendentes(c).length,1);assert.ok(c.hasTimer(30000));
});
test('persisted receipt removes the local item without claiming application',async()=>{
 const c=load(async()=>recibo());
 const r=await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});
 assertQueued(r);await c.VinciIA.reenviarPendentes();
 assert.equal(pendentes(c).length,0);
 assert.match(c.VinciIA.contexto(),/nunca diga que eles já foram alterados sem prova/);
});
test('persisted receipt accepts a nonempty string n8n id',async()=>{
 const c=load(async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:'replica-7'})}));
 assertQueued(await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}));
 await c.VinciIA.reenviarPendentes();assert.equal(pendentes(c).length,0);
});
test('all four editing tools respond in less than 300 ms with n8n delayed by 600 ms',async t=>{
 const edits=[['favoritos',{operacao:'colocar'}],['ambientes',{operacao:'renomear'}],['automacoes',{operacao:'salvar'}],['receitas',{operacao:'criar',nome:'Bolo'}]];
 await Promise.all(edits.map(async([name,args])=>{
  let received=false;
  const c=load(()=>new Promise(resolve=>setTimeout(()=>{received=true;resolve(recibo())},600)),{ia:name==='receitas'?'leda':'felyx'});
  let deadline;const start=performance.now();
  try{
   const r=await Promise.race([c.GEN_FERRAMENTAS[name](args),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error(name+' waited 300 ms for n8n')),300)})]);
   const elapsed=performance.now()-start;
   assertQueued(r);assert.ok(elapsed<300,name+': '+elapsed+' ms');assert.equal(received,false);
   assert.equal(pendentes(c,name==='receitas'?'leda':'felyx').length,1);
   t.diagnostic(name+': '+elapsed.toFixed(2)+' ms (n8n: 600 ms)');
  }finally{clearTimeout(deadline);await c.VinciIA.reenviarPendentes()}
  assert.equal(received,true);assert.equal(pendentes(c,name==='receitas'?'leda':'felyx').length,0);
 }));
});
test('HTTP OK does not remove the item before the persisted JSON receipt arrives',async()=>{
 let finish;const c=load(async()=>({ok:true,json:()=>new Promise(resolve=>finish=resolve)}));
 assertQueued(await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}));
 await new Promise(setImmediate);assert.equal(pendentes(c).length,1);
 finish({ok:true,persistida:true,id:7});await c.VinciIA.reenviarPendentes();assert.equal(pendentes(c).length,0);
});
test('receipt timeout aborts the request and leaves the item queued',async()=>{
 let finish,signal;
 const c=load(async(url,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise(resolve=>finish=resolve)}});
 assertQueued(await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}));
 await new Promise(setImmediate);const sending=c.VinciIA.reenviarPendentes();c.runTimer(4000);await sending;
 assert.equal(signal.aborted,true);assert.equal(pendentes(c).length,1);assert.ok(c.hasTimer(30000));
 finish({ok:true,persistida:true,id:7});await new Promise(setImmediate);assert.equal(pendentes(c).length,1);
});
for(const trigger of ['online','timer'])test(trigger+' retries the same queued edit after a missing receipt',async()=>{
 const pedidos=[];const c=load(async(url,options)=>{pedidos.push(JSON.parse(options.body));return pedidos.length===1?{ok:true,json:async()=>({ok:true})}:recibo()});
 await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear',nome:'Sala'});await c.VinciIA.reenviarPendentes();
 assert.equal(pendentes(c).length,1);
 if(trigger==='online')c.fire('online');else c.runTimer(30000);
 await c.VinciIA.reenviarPendentes();assert.equal(pendentes(c).length,0);
 assert.equal(pedidos.length,2);assert.deepEqual(pedidos[0],pedidos[1]);
});
test('startup resends the queue persisted by the previous page',async()=>{
 const values=new Map([['felyx_sessao','test-session']]);
 const old=load(async()=>{throw Error('offline')},{values});
 await old.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});await old.VinciIA.reenviarPendentes();
 assert.equal(pendentes(old).length,1);
 const pedidos=[];const c=load(async(url,options)=>{pedidos.push(JSON.parse(options.body));return recibo()},{values});
 c.runTimer(0);await c.VinciIA.reenviarPendentes();
 assert.equal(pendentes(c).length,0);assert.equal(pedidos.filter(p=>p.acao==='replicar').length,1);
});
test('changing accounts does not send the previous account edit as the new account',async()=>{
 let online=false;const pedidos=[];
 const c=load(async(url,options)=>{pedidos.push(JSON.parse(options.body));if(!online)throw Error('offline');return recibo()});
 await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});await c.VinciIA.reenviarPendentes();online=true;
 c.localStorage.setItem('felyx_sessao','other-session');await c.VinciIA.reenviarPendentes();
 assert.equal(pedidos.length,1);assert.equal(pendentes(c).length,1);
 c.localStorage.setItem('felyx_sessao','test-session');await c.VinciIA.reenviarPendentes();
 assert.equal(pendentes(c).length,0);assert.equal(pedidos[1].s,'test-session');
});
test('concurrent edits respond immediately and each waits for its own receipt in the background',async()=>{
 const finish=[],pedidos=[];const c=load((url,options)=>{pedidos.push(JSON.parse(options.body));return new Promise(resolve=>finish.push(resolve))});
 const results=await Promise.all([c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}),c.GEN_FERRAMENTAS.favoritos({operacao:'trocar'})]);
 results.forEach(assertQueued);assert.equal(pendentes(c).length,2);assert.equal(pedidos.length,1);
 finish[0](recibo());await new Promise(setImmediate);
 assert.equal(pedidos.length,2);assert.equal(pendentes(c).length,1);assert.equal(pendentes(c)[0].pedido.detalhe.ferramenta,'favoritos');
 finish[1](recibo());await c.VinciIA.reenviarPendentes();assert.equal(pendentes(c).length,0);
});
test('storage failure preserves edits in memory for background retry',async()=>{
 let attempts=0;const c=load(async()=>{if(++attempts===1)throw Error('offline');return recibo()},{storageFails:true});
 assertQueued(await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}));await c.VinciIA.reenviarPendentes();
 assert.ok(c.hasTimer(30000));c.runTimer(30000);await c.VinciIA.reenviarPendentes();assert.equal(attempts,2);
 await c.VinciIA.reenviarPendentes();assert.equal(attempts,2);
});
test('listing and unsuccessful edits do not enqueue a replica',async()=>{
 let requests=0;const c=load(async()=>{requests++;return recibo()});
 const listed=await c.GEN_FERRAMENTAS.ambientes({operacao:'listar'});assert.equal(listed.replica,undefined);
 for(const failure of [{ok:false},{ok:true,erro:'failed'}]){
  const failed=load(async()=>{requests++;return recibo()},{original:async()=>failure});
  const r=await failed.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});assert.equal(r.replica,undefined);assert.equal(pendentes(failed).length,0);
 }
 assert.equal(requests,0);assert.equal(c.localStorage.getItem(FILA),null);
});
test('Gemini keeps googleSearch and excludes the three legacy news/market tools',()=>{
 const c=load(async()=>recibo());
 const tools=c.VinciIA.tools([{functionDeclarations:['bolsas','noticias','manchetes_do_dia','ambientes'].map(name=>({name}))}]);
 assert.deepEqual(Array.from(tools[0].functionDeclarations,d=>d.name),['ambientes']);assert.ok(tools[1].googleSearch);
});
test('Leo clássico cannot start an avatar even if its local toggle changes',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../app-leo/index.html'),'utf8');
 const start=html.indexOf('const FelyxAvatar =');
 const source=html.slice(start);
 assert.match(source,/const AVATAR_DISPONIVEL = false/);
 const guard=source.match(/if\(!AVATAR_DISPONIVEL[^\n]+return abrindo;/)[0];
 const c={AVATAR_DISPONIVEL:false,ligado:true,pronto:false,abrindo:null,sessao:{token:'test'},Date,bloqueadoAte:0};
 const result=vm.runInNewContext('(function(){'+guard+'throw Error("opened avatar");})()',c);
 assert.equal(result,null);
});

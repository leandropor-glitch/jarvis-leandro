const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../vinci/ia-padrao.js'),'utf8');
function load(fetch){
 const values=new Map([['felyx_sessao','test-session']]);
 const c={location:{pathname:'/app/',search:''},document:{currentScript:{dataset:{ia:'felyx'}}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},fetch,AbortController,setTimeout:()=>1,clearTimeout(){},URLSearchParams,GEN_FERRAMENTAS:{ambientes:async()=>({ok:true})}};
 c.addEventListener=()=>{};c.window=c;vm.createContext(c);vm.runInContext(code,c);c.VinciIA.instalar();return c;
}
for(const [name,fetch] of [
 ['network failure',async()=>{throw Error('offline')}],
 ['HTTP rejection',async()=>({ok:false})],
 ['invalid receipt',async()=>({ok:true,json:async()=>({})})],
 ['early acknowledgement without persistence',async()=>({ok:true,json:async()=>({ok:true})})],
 ['business rejection',async()=>({ok:true,json:async()=>({ok:false})})]
])test(name+' does not claim replication',async()=>{
 const c=load(fetch);const r=await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});
 assert.equal(r.ok,true);assert.equal(r.replica_status,'falha_envio');
 assert.equal(JSON.parse(c.localStorage.getItem('vinci.replica.pendentes.felyx')).length,1);
});
test('acknowledgement means pending, never applied',async()=>{
 const c=load(async()=>({ok:true,json:async()=>({ok:true,persistida:true,id:7})}));
 const r=await c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'});
 assert.equal(r.replica_status,'aguardando_replica');assert.match(r.replica,/não confirmada/);
});
test('does not claim receipt while HTTP is unresolved',async()=>{
 let finish;const c=load(()=>new Promise(resolve=>finish=resolve));let done=false;
 const result=c.GEN_FERRAMENTAS.ambientes({operacao:'renomear'}).then(r=>{done=true;return r});
 await new Promise(setImmediate);assert.equal(done,false);
 finish({ok:true,json:async()=>({ok:true,persistida:true,id:7})});await result;assert.equal(done,true);
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

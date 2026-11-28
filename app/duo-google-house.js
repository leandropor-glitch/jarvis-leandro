/* Official native Google Home bridge. No credentials are collected by this page. */
(function(root){
'use strict';
function createBridge(host, options={}){
 const pending=new Map(); let sequence=0,generation=0;
 const previous=host.felyxGoogleHomeResposta;
 host.felyxGoogleHomeResposta=function(id,raw){
  const job=pending.get(String(id));
  if(!job){if(typeof previous==='function')previous(id,raw);return;}
  pending.delete(String(id));host.clearTimeout(job.timer);
  if(job.generation!==generation||(options.getOwner&&job.owner!==options.getOwner())){job.reject(Error('A conta do aplicativo mudou. Tente novamente.'));return;}
  try{const value=typeof raw==='string'?JSON.parse(raw):raw;if(!value||typeof value!=='object')throw Error('Resposta Google inválida.');job.resolve(value);}catch(e){job.reject(e);}
 };
 function available(){return !!(host.webkit?.messageHandlers?.felyx?.postMessage || host.FelyxAndroid?.googleHome);}
 function request(op,args={}){
  if(!available())return Promise.reject(Error('Abra o aplicativo para conectar sua conta Google.'));
  return new Promise((resolve,reject)=>{
   const id='duo-google-'+Date.now()+'-'+(++sequence);
   const timer=host.setTimeout(()=>{pending.delete(id);reject(Error('O Google não respondeu a tempo. Tente novamente.'));},op==='conectar'?180000:30000);
   pending.set(id,{resolve,reject,timer,owner:options.getOwner?.(),generation});
   try{if(host.webkit?.messageHandlers?.felyx?.postMessage)host.webkit.messageHandlers.felyx.postMessage({tipo:'googleHome',id,op,args});else host.FelyxAndroid.googleHome(JSON.stringify({id,op,args}));}
   catch(e){host.clearTimeout(timer);pending.delete(id);reject(e);}
  });
 }
 let state={connected:false,email:'',house:'',available:available(),checked:false,capable:false};
 function invalidate(){state={...state,connected:false,email:'',house:'',structureId:''};options.onState?.({...state});}
 function snapshot(){const g=generation,o=options.getOwner?.();return ()=>{if(g!==generation||o!==options.getOwner?.())throw Error('A sessão da casa mudou. Tente novamente.');};}
 function update(response,connecting=false){
  if(response.ok===false){invalidate();throw Error(response.aviso||response.erro||'O Google não confirmou a solicitação.');}
  state={...state,checked:true,available:response.disponivel!==false,capable:response.houseContractVersion>=2,connected:response.conectado===true,email:typeof response.email==='string'?response.email:'',house:response.casa||'',structureId:response.structureId||''};
  const binding=options.getBinding?.();
  if(!state.email||!state.structureId||(!connecting&&(!binding||binding.provider!=='google'||binding.email!==state.email||binding.structureId!==state.structureId)))state={...state,connected:false,email:'',house:'',structureId:''};
  options.onState?.({...state});return {...state};
 }
 async function status(){try{return update(await request('status'));}catch(e){invalidate();throw e;}}
 async function list(){const check=snapshot(),expected={...state};const response=await request('listar');check();if(!response.ok||!expected.connected||response.email!==expected.email||response.structureId!==expected.structureId)throw Error('A identidade da casa Google não foi confirmada.');return response;}
 async function connect(){
  const check=snapshot();
  if(!(await status()).capable)throw Error('Atualize o aplicativo para conectar sua conta Google com identificação segura.');
  check();const response=await request('conectar');check();const next=update(response,true);
  if(!next.capable||!next.email)throw Error('O aplicativo não confirmou a identidade da conta Google.');
  if(!next.connected)throw Error('A conexão Google não foi concluída.');
  const house=await list();check();await options.onImport?.(house,{reset:!!options.shouldReset?.()});return {...next,data:house};
 }
 async function refresh(){
  const check=snapshot();
  const current=await status();if(!current.capable)throw Error('Atualize o aplicativo para importar sua conta Google com identificação segura.');if(!current.connected||!current.email)throw Error('Conecte sua conta Google primeiro.');
  const house=await list();check();await options.onImport?.(house,{reset:false});return house;
 }
 async function disconnect(){
  const check=snapshot();
  const active=await status();
  if(!active.capable)throw Error('Atualize o aplicativo para desconectar esta casa com segurança.');
  if(!active.connected)throw Error('Esta conta não tem uma casa Google vinculada.');
  const confirmed=await (options.confirmDisconnect||(()=>host.confirm('Desconectar sua casa Google e apagar a configuração deste aplicativo? Ao reconectar, a casa será importada novamente com a configuração padrão.')))();
  if(!confirmed)return {cancelled:true};check();
  generation++;invalidate();const disconnectCheck=snapshot();
  const response=await request('desconectar');
  if(response.manual)throw Error(response.aviso||'Desvincule este aplicativo nas configurações do Google Home.');
  if(!response.ok || response.conectado!==false)throw Error(response.erro||'O Google não confirmou a desconexão.');
  disconnectCheck();await options.onDisconnected?.();return update(response);
 }
 const safe=fn=>async(...args)=>{try{return await fn(...args);}catch(e){invalidate();throw e;}};
 return {available,request,status,list:safe(list),connect:safe(connect),refresh:safe(refresh),disconnect:safe(disconnect),snapshot,getState:()=>({...state})};
}
function createHouseRouter(host,getBridge,getMode,legacy){
 return async function(body){
  const owner=host.VinciGoogleHouseOwner?.();const check=()=>{if(host.VinciGoogleHouseOwner&&owner!==host.VinciGoogleHouseOwner())throw Error('A conta do aplicativo mudou. Tente novamente.');};
  if(!['casa','comando','estados'].includes(body.acao))return legacy(body);
  if(!getMode()){const result=await legacy(body);check();if(!getMode())return result;return {ok:false,status:409,json:async()=>({ok:false,erro:'casa_alterada',mensagem:'A conexão da casa mudou. Atualize novamente.'})};}
  const reply=data=>({ok:data.ok!==false,status:data.ok===false?409:200,json:async()=>data});
  const bridge=getBridge();
  if(!bridge)return reply({ok:false,erro:'casa_desconectada',mensagem:'Conecte sua conta Google.'});
  try{
   const sessionCheck=bridge.snapshot();const state=await bridge.status();sessionCheck();
   if(!state.capable||!state.connected||!state.email)throw Error('Conecte sua conta Google neste aplicativo atualizado.');
   check();const house=await bridge.list(),devices=house.dispositivos||[];check();sessionCheck();
   if(body.acao==='casa')return reply({ok:true,conectado:true,email:state.email,aparelhos:devices,cenas:house.cenas||[]});
   if(body.acao==='estados')return reply({ok:true,estados:devices.map(d=>({nome:d.nome,ligado:d.ligado})),aparelhos:devices});
   const sceneMatch=/^(?:ativar|ativa|acionar)\s+(?:a\s+)?cena\s+(.+)$/i.exec(String(body.texto||''));
   if(sceneMatch||body.googleSceneId){
    const name=sceneMatch?.[1]?.trim().toLocaleLowerCase(),matches=(house.cenas||[]).filter(c=>body.googleSceneId?String(c.id)===String(body.googleSceneId):String(c.nome||'').trim().toLocaleLowerCase()===name);
    if(matches.length!==1||!matches[0].executavel)throw Error('Cena não disponível para execução nesta conta Google.');
    check();const result=await bridge.request('executarCena',{id:String(matches[0].id)});
    return reply({...result,ok:result.ok===true&&result.confirmado===true,text:result.ok?'Solicitação enviada ao Google; execução ainda não confirmada.':(result.erro||'O Google não aceitou a cena.')});
   }
   const match=/^(ligar|liga|acender|acende|desligar|desliga|apagar|apaga)\s+(.+)$/i.exec(String(body.texto||''));
   if(!match)throw Error('Escolha um dispositivo para ligar/desligar ou uma cena para ativar.');
   const name=match[2].trim().toLocaleLowerCase(),matches=devices.filter(d=>body.googleDeviceId?String(d.id)===String(body.googleDeviceId):String(d.nome||'').trim().toLocaleLowerCase()===name);
   if(matches.length!==1)throw Error('Escolha um dispositivo único da conta Google.');
   const device=matches[0];
   if(!device||!device.liga_desliga)throw Error('Dispositivo não disponível para ligar/desligar nesta conta Google.');
   const result=await bridge.request(/^(deslig|apag)/i.test(match[1])?'desligar':'ligar',{dispositivo:String(device.id)});
   return reply({...result,text:result.ok?'Comando confirmado pela casa Google.':(result.erro||'O Google não confirmou o comando.')});
  }catch(e){return reply({ok:false,erro:'google_casa',mensagem:e.message,text:e.message});}
 };
}
const api={createBridge,createHouseRouter};if(typeof module==='object'&&module.exports)module.exports=api;if(root){root.VinciGoogleHouse=api;root.VinciGoogleHouseMode=()=>{try{const owner=root.localStorage.getItem('felyx.house.owner.v2')||'signed-out',v=JSON.parse(root.localStorage.getItem('felyx.google.house.v2:'+owner)||'{}');return v.provider==='google'||v.disconnected===true;}catch(e){return false;}};}
})(typeof window==='object'?window:null);

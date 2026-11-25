/* Casa 4D · página de cenários (Claude 24/11/2026). Palanteer e Felyx (?marca=felyx). */
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {lerPlano,casaModelo,listFloors} from './plano.mjs';
import {construirCasa} from './casa3d.mjs';
import {prepareCommand,confirmCommand} from '../control.mjs';

const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
try{if(q.get('marca')==='felyx')sessionStorage.setItem('marca','felyx');if(q.get('marca')==='palanteer')sessionStorage.removeItem('marca');if(sessionStorage.getItem('marca')==='felyx')document.documentElement.dataset.marca='felyx';}catch{}
if(q.get('embed')==='1')document.documentElement.dataset.embed='1';
const felyx=document.documentElement.dataset.marca==='felyx';
$('#marca').textContent=felyx?'FELYX':'PALANTEER';document.title='Casa 4D · '+(felyx?'Felyx':'Palanteer');
if(felyx)$('#voltar').href='https://ia.uservinci.com/felyx';

const ICONE={luz:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
 ar:'<path d="M12 2v20M4.9 6l14.2 12M19.1 6 4.9 18M9 3l3 3 3-3M9 21l3-3 3 3"/>',tv:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
 cortina:'<path d="M3 3h18M5 3v18M19 3v18M5 3c3 4 3 14 0 18M19 3c-3 4-3 14 0 18"/>',ventilador:'<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4 0-7 3-7 2 0 2 3-3 7zM14 12c4-1 7 0 7 3 0 2-3 2-7-3zM12 14c1 4 0 7-3 7-2 0-2-3 3-7zM10 12c-4 1-7 0-7-3 0-2 3-2 7 3z"/>',
 som:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
 cheguei:'<path d="M3 11 12 4l9 7v9H3z"/><path d="M10 20v-5h4v5"/>',saindo:'<path d="M15 3h4v18h-4M10 17l5-5-5-5M15 12H3"/>',master:'<path d="M12 3v9M6.3 7a8 8 0 1 0 11.4 0"/>',
 cinema:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m10 9 5 3-5 3z"/>',noite:'<path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z"/>',dia:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[k]||''}</svg>`;

const CENAS=[
 {id:'cheguei',nome:'Cheguei',icone:'cheguei',f:(d)=>d.kind==='luz'?(['sala','circulacao','cozinha','varanda'].includes(d.room?.func)?{on:true,v:100}:{on:false}):d.kind==='ar'?{on:d.room?.func==='sala',v:23}:d.kind==='cortina'?{on:true}:d.kind==='som'?{on:d.room?.func==='sala'}:{on:false}},
 {id:'cinema',nome:'Cinema',icone:'cinema',noite:true,f:(d)=>{const sala=d.room?.func==='sala';return d.kind==='luz'?(sala?{on:true,v:18}:{on:false}):d.kind==='tv'?{on:sala}:d.kind==='cortina'?{on:sala?true:d.state.on}:d.kind==='ar'?{on:sala,v:22}:{on:false};}},
 {id:'noite',nome:'Boa noite',icone:'noite',noite:true,f:(d)=>d.kind==='ar'?{on:d.room?.func==='quarto',v:24}:d.kind==='ventilador'?{on:d.room?.func==='quarto',v:1}:d.kind==='cortina'?{on:true}:{on:false}},
 {id:'dia',nome:'Bom dia',icone:'dia',noite:false,f:(d)=>d.kind==='cortina'?{on:false}:d.kind==='som'?{on:d.room?.func==='sala'}:{on:false}},
 {id:'saindo',nome:'Estou saindo',icone:'saindo',f:(d)=>d.kind==='cortina'?{on:true}:{on:false}},
 {id:'master',nome:'Master OFF',icone:'master',f:(d)=>d.kind==='cortina'?{on:d.state.on}:{on:false}}];

const texto=d=>{const s=d.state;if(d.kind==='ar')return s.on?`${s.v}°`:'Desligado';if(d.kind==='cortina')return s.on?'Fechada':'Aberta';if(d.kind==='ventilador')return s.on?`Vel. ${s.v}`:'Desligado';if(d.kind==='luz')return s.on?(s.v<100?s.v+'%':'Acesa'):'Apagada';if(d.kind==='tv')return s.on?'Ligada':'Desligada';if(d.kind==='som')return s.on?'Tocando':'Parado';return '';};
const ativo=d=>d.kind==='cortina'?!d.state.on:d.state.on;

let api=async(path,{method='GET',body}={})=>{const r=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j.error||'falha'),{status:r.status});return j;};

async function carregar(){
  if(q.get('projeto')!=='minha')return {raw:casaModelo(),modelo:true,ctx:null};
  try{const j=await api('/api/casa4d/project');if(!j.project)throw Error('sem projeto');let ctx=null;try{ctx=await api('/api/casa4d/context');}catch{}return {raw:j.project,modelo:false,ctx};}
  catch(e){if(e.status===401){location.href='/login/?next='+encodeURIComponent(location.pathname+location.search);throw e;}if(e.message==='sem projeto'){$('#erro').innerHTML='Você ainda não enviou a planta. <a href="../">Enviar planta</a>';$('#erro').hidden=false;throw e;}return {raw:casaModelo(),modelo:true,ctx:null,aviso:'Não consegui abrir sua planta agora. Mostrando a casa modelo.'};}
}

const {raw,modelo,ctx,aviso}=await carregar();
const andares=listFloors(raw);let andar=andares[0]||null;

const renderer=new T.WebGLRenderer({canvas:$('#cena'),antialias:true});
const mobile=matchMedia('(max-width:760px)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.6:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
const hemi=new T.HemisphereLight(0xffffff,0x8a7a66,1.2);scene.add(hemi);
const sol=new T.DirectionalLight(0xfff0dc,2.6);sol.castShadow=true;sol.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sol.shadow.bias=-.0003;sol.shadow.normalBias=.03;sol.shadow.radius=3;scene.add(sol,sol.target);
const camera=new T.PerspectiveCamera(36,1,.5,120);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;const POLAR=.74;controls.maxPolarAngle=POLAR;controls.minPolarAngle=POLAR;controls.enablePan=false;controls.rotateSpeed=.6;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(512,512),.45,.5,.88);composer.addPass(bloom);composer.addPass(new OutputPass());

let casa=null,plano=null,noite=false,sel=null,foco='todos',visao=null;
const chips=$('#chips');
function montar(){
  if(casa){scene.remove(casa.group);casa.group.traverse(o=>{o.geometry?.dispose();});chips.replaceChildren();}
  plano=lerPlano(raw,{floor:andar});casa=construirCasa(T,plano);scene.add(casa.group);
  const [sx,sz]=plano.size,span=Math.max(sx,sz,6);
  Object.assign(sol.shadow.camera,{left:-span*.8,right:span*.8,top:span*.8,bottom:-span*.8,near:.5,far:span*4});sol.position.set(-span*.6,span*1.2,span*.5);sol.shadow.camera.updateProjectionMatrix();
  for(const d of casa.devices){const el=document.createElement('button');el.type='button';el.className='chip k-'+d.kind;el.innerHTML=svg(d.kind)+(d.kind==='luz'?'':'<span></span>');el.setAttribute('aria-label',d.name);el.onclick=e=>{e.stopPropagation();acionar(d);};d.chip=el;chips.append(el);}
  for(const r of plano.rooms){const el=document.createElement('div');el.className='rotulo';el.textContent=r.name;r.el=el;chips.append(el);}
  // pílulas de ambientes
  const box=$('#ambientes');box.replaceChildren();const pil=(id,nome)=>{const b=document.createElement('button');b.type='button';b.textContent=nome;b.dataset.id=id;b.onclick=()=>focar(id);box.append(b);return b;};
  pil('todos','Casa toda');for(const r of plano.rooms.filter(r=>r.area>2))pil(r.id,r.name.charAt(0)+r.name.slice(1).toLowerCase());
  foco='todos';visaoGeral(true);atualizar();
}
let AZ=.42,distBase=20;
const posDe=(alvo,dist,az=null)=>{if(az===null){const o=camera.position.clone().sub(controls.target);az=Math.atan2(o.x,o.z);}return [alvo[0]+dist*Math.sin(POLAR)*Math.sin(az),dist*Math.cos(POLAR),alvo[2]+dist*Math.sin(POLAR)*Math.cos(az)];};
function visaoGeral(instant){const [sx,sz]=plano.size,longo=Math.max(sx,sz),curto=Math.min(sx,sz),asp=camera.aspect||1.4,tv=Math.tan(T.MathUtils.degToRad(camera.fov/2)),th=tv*asp;
  const retrato=asp<1;if(instant)AZ=(sz>sx?Math.PI/2:0)+.42;
  const h1=longo,v1=curto;const larg=h1*.98+v1*.42,alt=(v1*.98+h1*.42)*Math.cos(POLAR)+1.6;distBase=Math.max(larg/2/th,alt/2/tv)*(retrato?.66:.88)+1;
  controls.minDistance=distBase*.45;controls.maxDistance=distBase*1.25;voar([0,0,0],posDe([0,0,0],distBase,instant?AZ:null),instant);}
function focar(id){foco=id;for(const b of $('#ambientes').children)b.setAttribute('aria-pressed',String(b.dataset.id===id));if(id==='todos')return visaoGeral();const r=plano.rooms.find(r=>r.id===id);if(!r)return;const s=Math.max(r.rect.x1-r.rect.x0,r.rect.z1-r.rect.z0,3);const d=Math.max(distBase*.45,s*2.1);voar([r.center[0],0,r.center[1]],posDe([r.center[0],0,r.center[1]],d));}
function voar(alvo,pos,instant){visao={t0:performance.now(),dur:instant?0:900,a0:controls.target.clone(),p0:camera.position.clone(),a1:new T.Vector3(...alvo),p1:new T.Vector3(...pos)};if(instant){controls.target.copy(visao.a1);camera.position.copy(visao.p1);visao=null;}}

function setNoite(v){noite=v;document.documentElement.dataset.noite=v?'1':'0';$('#diaNoite').innerHTML=svg(v?'noite':'dia')+`<span>${v?'Noite':'Dia'}</span>`;}
function aplicarAmbiente(){const k=noite?1:0;scene.background=new T.Color(noite?0x0d1322:0xc4c4c6);hemi.intensity=noite?.35:1.35;hemi.color.set(noite?0x7f9cff:0xffffff);sol.intensity=noite?.22:2.1;sol.color.set(noite?0x9fb4ff:0xfff0dc);sol.castShadow=!noite;scene.environmentIntensity=noite?.06:.55;bloom.strength=noite?.42:.18;bloom.threshold=noite?.82:.97;renderer.toneMappingExposure=noite?1.0:1.12;}

const toast=$('#aviso');let tt;function avisar(m){toast.textContent=m;toast.hidden=false;clearTimeout(tt);tt=setTimeout(()=>toast.hidden=true,2600);}
async function enviarReal(d,acao,valor){if(!d.catalogId||!ctx?.controlsAvailable)return false;const ad=(p,method,body)=>api(p,{method,body});const prep=await prepareCommand(ad,{deviceId:d.catalogId,action:acao,value:valor});const res=await confirmCommand(ad,prep);if(!res.confirmed)throw Error('A casa não confirmou.');return true;}
async function definir(d,st){const antes={...d.state};Object.assign(d.state,st);atualizar();
  if(d.catalogId&&ctx?.controlsAvailable){try{await enviarReal(d,d.state.on?'on':'off');}catch(e){d.state=antes;atualizar();avisar('Não foi: '+e.message);}}}
function acionar(d){
  const st=d.kind==='cortina'?{on:!d.state.on}:{on:!d.state.on};definir(d,st);abrirFicha(d);
  if(d.kind==='luz'||d.kind==='tv'||d.kind==='ar')if(d.state.on&&!noite&&d.kind==='tv')null;
}
function cenaDe(id){const c=CENAS.find(c=>c.id===id);if(!c)return;if(c.noite!==undefined){setNoite(c.noite);aplicarAmbiente();}for(const d of casa.devices){const s=c.f(d);if(s)Object.assign(d.state,s);}for(const b of $('#cenas').children)b.setAttribute('aria-pressed',String(b.dataset.id===id));atualizar();avisar(c.nome+' ativada'+(modelo||!ctx?.controlsAvailable?' · simulação':''));fecharFicha();}
function cenasCom(d){return CENAS.filter(c=>{const s=c.f({...d,state:{...d.state}});return s&&(d.kind==='cortina'?s.on===true:s.on===true);});}

function abrirFicha(d){sel=d;const f=$('#ficha');f.hidden=false;f.dataset.kind=d.kind;f.innerHTML='';
  const h=document.createElement('div');h.className='f-topo';h.innerHTML=`<i>${svg(d.kind)}</i><div><b></b><small></small></div><button class="liga" type="button" aria-label="Ligar ou desligar"></button><button class="x" type="button" aria-label="Fechar">✕</button>`;h.querySelector('b').textContent=d.name;h.querySelector('small').textContent=(d.room?d.room.name+' · ':'')+texto(d)+(d.sugestao?' · sugestão':'');
  h.querySelector('.liga').onclick=()=>{definir(d,{on:!d.state.on});abrirFicha(d);};h.querySelector('.liga').setAttribute('aria-pressed',String(ativo(d)));h.querySelector('.x').onclick=fecharFicha;f.append(h);
  const ctl=document.createElement('div');ctl.className='f-ctl';
  const passo=(rot,menos,mais,val)=>{ctl.innerHTML=`<span>${rot}</span><button type="button">−</button><b>${val}</b><button type="button">+</button>`;const [a,b]=ctl.querySelectorAll('button');a.onclick=()=>{menos();abrirFicha(d);};b.onclick=()=>{mais();abrirFicha(d);};};
  if(d.kind==='ar')passo('Temperatura',()=>definir(d,{on:true,v:Math.max(16,d.state.v-1)}),()=>definir(d,{on:true,v:Math.min(30,d.state.v+1)}),d.state.v+'°');
  else if(d.kind==='luz')passo('Brilho',()=>definir(d,{on:true,v:Math.max(10,d.state.v-20)}),()=>definir(d,{on:true,v:Math.min(100,d.state.v+20)}),d.state.v+'%');
  else if(d.kind==='ventilador')passo('Velocidade',()=>definir(d,{on:true,v:Math.max(1,d.state.v-1)}),()=>definir(d,{on:true,v:Math.min(3,d.state.v+1)}),String(d.state.v));
  else if(d.kind==='cortina'){ctl.innerHTML='<button type="button">Abrir</button><button type="button">Fechar</button>';const [a,b]=ctl.querySelectorAll('button');a.onclick=()=>{definir(d,{on:false});abrirFicha(d);};b.onclick=()=>{definir(d,{on:true});abrirFicha(d);};}
  if(ctl.innerHTML)f.append(ctl);
  const cs=cenasCom(d);if(cs.length){const w=document.createElement('div');w.className='f-cenas';w.innerHTML='<span>Cenas com este aparelho</span>';for(const c of cs){const b=document.createElement('button');b.type='button';b.innerHTML=svg(c.icone)+c.nome;b.onclick=()=>cenaDe(c.id);w.append(b);}f.append(w);}
  const n=document.createElement('p');n.className='f-nota';n.textContent=d.catalogId&&ctx?.controlsAvailable?'Ligado à sua casa: o comando vai para o aparelho.':modelo?'Casa modelo: simulação.':'Simulação no desenho. Para acionar de verdade, ligue a casa no onboarding.';f.append(n);
}
function fecharFicha(){sel=null;$('#ficha').hidden=true;}

function atualizar(){
  let luzes=0,acesas=0,ares=[];for(const d of casa.devices){if(d.kind==='luz'){luzes++;if(d.state.on)acesas++;}if(d.kind==='ar'&&d.state.on)ares.push(d.state.v+'°');
    if(d.chip){d.chip.classList.toggle('on',ativo(d));const s=d.chip.querySelector('span');if(s)s.textContent=d.kind==='ar'?(d.state.on?d.state.v+'°':'Desl.'):d.kind==='cortina'?texto(d):d.kind==='tv'?'TV':d.kind==='ventilador'?(d.state.on?'Vel. '+d.state.v:'Vent.'):d.kind==='som'?(d.state.on?'♪':'Som'):'';}}
  $('#status').textContent=`${acesas} de ${luzes} luzes acesas`+(ares.length?` · Ar ${ares.join(', ')}`:' · Ar desligado');
  if(sel)$('#ficha .f-topo small').textContent=(sel.room?sel.room.name+' · ':'')+texto(sel)+(sel.sugestao?' · sugestão':'');
}

// clique no desenho: aparelho aciona; móvel/piso abre o ambiente
const ray=new T.Raycaster(),ptr=new T.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);
  const hits=ray.intersectObjects(casa.clicaveis,false);const dv=hits.find(h=>h.object.userData.dev);
  if(dv&&(!hits[0]||hits[0].distance>=dv.distance-.6)){const d=casa.devices.find(x=>x.id===dv.object.userData.dev);if(d)return acionar(d);}
  const all=ray.intersectObject(casa.group,true)[0];if(all){const p=all.point,room=plano.roomAt([p.x,p.z]);if(room){fecharFicha();abrirComodo(room);return;}}fecharFicha();});
function abrirComodo(r){sel=null;const f=$('#ficha');f.hidden=false;f.dataset.kind='comodo';f.innerHTML='';const lista=casa.porComodo.get(r.id)||[];
  const h=document.createElement('div');h.className='f-topo';h.innerHTML=`<i>${svg('cheguei')}</i><div><b></b><small></small></div><button class="x" type="button" aria-label="Fechar">✕</button>`;h.querySelector('b').textContent=r.name;h.querySelector('small').textContent=lista.length?lista.length+' aparelhos · toque para ligar ou desligar':'Nenhum aparelho neste ambiente';h.querySelector('.x').onclick=fecharFicha;f.append(h);
  const g=document.createElement('div');g.className='f-lista';for(const d of lista){const b=document.createElement('button');b.type='button';b.className=ativo(d)?'on':'';b.innerHTML=svg(d.kind)+'<span></span><small></small>';b.querySelector('span').textContent=d.name.replace(/ · .*/,'')||d.name;b.querySelector('small').textContent=texto(d);b.onclick=()=>{acionar(d);};g.append(b);}f.append(g);
  const t=document.createElement('div');t.className='f-cenas';const on=document.createElement('button');on.type='button';on.innerHTML=svg('dia')+'Tudo ligado';on.onclick=()=>{for(const d of lista)if(d.kind!=='cortina')d.state.on=true;atualizar();abrirComodo(r);};const off=document.createElement('button');off.type='button';off.innerHTML=svg('master')+'Tudo desligado';off.onclick=()=>{for(const d of lista)if(d.kind!=='cortina')d.state.on=false;atualizar();abrirComodo(r);};t.append(on,off);f.append(t);
  focar(r.id);}

// cenas
for(const c of CENAS){const b=document.createElement('button');b.type='button';b.dataset.id=c.id;b.innerHTML=svg(c.icone)+`<span>${c.nome}</span>`;b.onclick=()=>cenaDe(c.id);$('#cenas').append(b);}
$('#diaNoite').onclick=()=>{setNoite(!noite);aplicarAmbiente();};
$('#tela').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('#app').requestFullscreen?.();
if(andares.length>1){const tabs=$('#andares');tabs.hidden=false;for(const a of andares){const b=document.createElement('button');b.type='button';b.textContent=a;b.setAttribute('aria-pressed',String(a===andar));b.onclick=()=>{andar=a;for(const x of tabs.children)x.setAttribute('aria-pressed',String(x===b));fecharFicha();montar();};tabs.append(b);}}
$('#titulo').textContent=modelo?'Casa modelo':(raw.name&&raw.name!=='Minha Casa 4D'?raw.name:'Minha Casa 4D');
$('#selo').textContent=modelo?'Exemplo · simulação':(ctx?.controlsAvailable?'Casa conectada':'Simulação de cenários');
if(modelo&&q.get('projeto')!=='minha'){$('#planta').hidden=false;}
if(aviso)avisar(aviso);

setNoite(false);montar();aplicarAmbiente();
// abre com a casa acesa à noite (Cheguei), como demonstração
setTimeout(()=>{cenaDe('cheguei');for(const d of casa.devices)if(d.kind==='tv'&&d.room?.func==='sala')d.state.on=true;atualizar();},500);

const v=new T.Vector3();
function resize(){const el=$('#palco'),w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(()=>{const first=!camera.userData.ok;resize();if(first&&casa){camera.userData.ok=1;visaoGeral(true);}}).observe($('#palco'));
let last=performance.now();const clock0=last;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;
  if(visao){const k=Math.min(1,(now-visao.t0)/Math.max(1,visao.dur)),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;controls.target.lerpVectors(visao.a0,visao.a1,e);camera.position.lerpVectors(visao.p0,visao.p1,e);if(k>=1)visao=null;}
  controls.update();casa.update((now-clock0)/1000,dt);composer.render();
  const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight;
  const perto=camera.position.distanceTo(controls.target)<Math.max(plano.size[0],plano.size[1])*1.05;const pos=[];for(const d of casa.devices){if(!d.chip)continue;v.copy(d.anchor).project(camera);const vis=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05&&(d.kind!=='luz'||perto||(foco!=='todos'&&d.room?.id===foco));d.chip.style.display=vis?'':'none';if(vis){let x=(v.x+1)/2*w,y=(1-v.y)/2*h;const cw=d.kind==='luz'?30:84;for(let k=0;k<4;k++){const hit=pos.find(p=>Math.abs(p[0]-x)<(p[2]+cw)/2&&Math.abs(p[1]-y)<30);if(!hit)break;y=hit[1]+32;}pos.push([x,y,cw]);d.chip.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;}}
  for(const r of plano.rooms){v.set(r.center[0],.05,r.center[1]).project(camera);const vis=r.area>2.5&&v.z<1;r.el.style.display=vis?'':'none';if(vis)r.el.style.transform=`translate(${(v.x+1)/2*w}px,${(1-v.y)/2*h}px) translate(-50%,-50%)`;}
}
requestAnimationFrame(loop);
$('#carregando').hidden=true;
controls.addEventListener('start',()=>{visao=null;});

window.__c4={casa:()=>casa,plano:()=>plano,cenaDe,focar,setNoite:v=>{setNoite(v);aplicarAmbiente();}};

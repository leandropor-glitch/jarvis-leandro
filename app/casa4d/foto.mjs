/* Casa 4D sobre a foto do Leandro (ordem expressa 24/11/2026 22h04): a planta isométrica dele é a casa,
   com os aparelhos desenhados por cima e clicáveis. Coordenadas no espaço da imagem (1536 × 1024). */
const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
try{if(q.get('marca')==='felyx')sessionStorage.setItem('marca','felyx');if(q.get('marca')==='palanteer')sessionStorage.removeItem('marca');if(sessionStorage.getItem('marca')==='felyx')document.documentElement.dataset.marca='felyx';}catch{}
if(q.get('embed')==='1')document.documentElement.dataset.embed='1';
const felyx=document.documentElement.dataset.marca==='felyx';
$('#marca').textContent=felyx?'FELYX':'PALANTEER';document.title='Casa 4D · '+(felyx?'Felyx':'Palanteer');if(felyx)$('#voltar').href='../full.html';
const NS='http://www.w3.org/2000/svg';
const ICONE={luz:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',ar:'<path d="M12 2v20M4.9 6l14.2 12M19.1 6 4.9 18M9 3l3 3 3-3M9 21l3-3 3 3"/>',tv:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',cortina:'<path d="M3 3h18M5 3v18M19 3v18M5 3c3 4 3 14 0 18M19 3c-3 4-3 14 0 18"/>',ventilador:'<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4 0-7 3-7 2 0 2 3-3 7zM14 12c4-1 7 0 7 3 0 2-3 2-7-3zM12 14c1 4 0 7-3 7-2 0-2-3 3-7zM10 12c-4 1-7 0-7-3 0-2 3-2 7 3z"/>',som:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',cheguei:'<path d="M3 11 12 4l9 7v9H3z"/><path d="M10 20v-5h4v5"/>',saindo:'<path d="M15 3h4v18h-4M10 17l5-5-5-5M15 12H3"/>',master:'<path d="M12 3v9M6.3 7a8 8 0 1 0 11.4 0"/>',cinema:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m10 9 5 3-5 3z"/>',noite:'<path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z"/>',dia:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'};
const svgI=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[k]||''}</svg>`;

const ROOMS={suite:'Suíte',quarto:'Quarto',escritorio:'Escritório',banhoSuite:'Banho da suíte',banho:'Banho social',sala:'Sala de estar',jantar:'Jantar',varanda:'Varanda',cozinha:'Cozinha',hall:'Hall e circulação'};
const ROOM_AREAS={suite:[[215,95],[650,95],[650,270],[215,270]],quarto:[[190,270],[690,270],[690,530],[190,530]],banhoSuite:[[515,60],[790,60],[790,300],[515,300]],escritorio:[[790,120],[1190,120],[1190,380],[790,380]],banho:[[525,325],[1215,325],[1215,525],[525,525]],sala:[[180,540],[700,540],[700,850],[180,850]],jantar:[[700,540],[1100,540],[1100,860],[700,860]],varanda:[[20,250],[180,250],[180,860],[20,860]],cozinha:[[1190,270],[1440,270],[1440,830],[1190,830]],hall:[[1100,830],[1440,830],[1440,980],[1100,980]]};
// Aparelhos sobre a foto. x,y = ponto do aparelho; ar: lado do vento (dx,dy).
const DEV=[
 {id:'luz-sala',kind:'luz',name:'Luz da sala',room:'sala',x:470,y:690,r:190},
 {id:'luz-jantar',kind:'luz',name:'Pendente do jantar',room:'jantar',x:600,y:520,r:170},
 {id:'luz-mesa',kind:'luz',name:'Luz da mesa',room:'jantar',x:900,y:650,r:180},
 {id:'luz-suite',kind:'luz',name:'Luz da suíte',room:'suite',x:430,y:190,r:170},
 {id:'luz-quarto',kind:'luz',name:'Luz do quarto',room:'quarto',x:470,y:420,r:170},
 {id:'luz-escr',kind:'luz',name:'Luz do escritório',room:'escritorio',x:1000,y:260,r:160},
 {id:'luz-banhos',kind:'luz',name:'Luz do banho da suíte',room:'banhoSuite',x:610,y:200,r:110},
 {id:'luz-banho',kind:'luz',name:'Luz do banho social',room:'banho',x:640,y:440,r:120},
 {id:'luz-circ',kind:'luz',name:'Luz da circulação',room:'hall',x:730,y:360,r:150},
 {id:'luz-coz',kind:'luz',name:'Luz da cozinha',room:'cozinha',x:1250,y:520,r:180},
 {id:'luz-hall',kind:'luz',name:'Luz do hall',room:'hall',x:1180,y:760,r:150},
 {id:'luz-var',kind:'luz',name:'Luz da varanda',room:'varanda',x:120,y:520,r:170},
 {id:'ar-sala',kind:'ar',name:'Ar da sala',room:'sala',x:960,y:552,dx:0,dy:1},
 {id:'ar-suite',kind:'ar',name:'Ar da suíte',room:'suite',x:585,y:108,dx:0,dy:1},
 {id:'ar-quarto',kind:'ar',name:'Ar do quarto',room:'quarto',x:600,y:292,dx:0,dy:1},
 {id:'ar-escr',kind:'ar',name:'Ar do escritório',room:'escritorio',x:870,y:150,dx:0,dy:1},
 {id:'tv-sala',kind:'tv',name:'TV da sala',room:'sala',x:400,y:563,poly:'401,541 597,547 596,590 400,585'},
 {id:'cort-var',kind:'cortina',name:'Cortina da varanda',room:'varanda',x:150,y:300,w:90,h:70},
 {id:'cort-suite',kind:'cortina',name:'Cortina da suíte',room:'suite',x:338,y:165,w:42,h:150,vert:true},
 {id:'cort-quarto',kind:'cortina',name:'Cortina do quarto',room:'quarto',x:300,y:400,w:40,h:160,vert:true},
 {id:'vent-var',kind:'ventilador',name:'Ventilador da varanda',room:'varanda',x:110,y:640},
 {id:'vent-escr',kind:'ventilador',name:'Ventilador do escritório',room:'escritorio',x:1080,y:330},
 {id:'som-sala',kind:'som',name:'Som da sala',room:'sala',x:330,y:735}];
const devs=DEV.map(d=>({...d,state:{on:false,v:d.kind==='ar'?23:d.kind==='ventilador'?2:100}}));
const CENAS=[
 {id:'cheguei',nome:'Cheguei',icone:'cheguei',f:d=>d.kind==='luz'?{on:['sala','jantar','hall','cozinha','varanda'].includes(d.room)}:d.kind==='ar'?{on:d.room==='sala',v:23}:d.kind==='cortina'?{on:true}:d.kind==='som'?{on:true}:{on:false}},
 {id:'cinema',nome:'Cinema',icone:'cinema',noite:true,f:d=>d.kind==='luz'?{on:d.id==='luz-sala',v:20}:d.kind==='tv'?{on:true}:d.kind==='cortina'?{on:true}:d.kind==='ar'?{on:d.room==='sala',v:22}:{on:false}},
 {id:'noite',nome:'Boa noite',icone:'noite',noite:true,f:d=>d.kind==='ar'?{on:['suite','quarto'].includes(d.room),v:24}:d.kind==='cortina'?{on:true}:d.kind==='ventilador'?{on:false}:{on:false}},
 {id:'dia',nome:'Bom dia',icone:'dia',noite:false,f:d=>d.kind==='cortina'?{on:false}:d.kind==='som'?{on:true}:d.kind==='ventilador'?{on:d.room==='varanda',v:1}:{on:false}},
 {id:'saindo',nome:'Estou saindo',icone:'saindo',f:d=>d.kind==='cortina'?{on:true}:{on:false}},
 {id:'master',nome:'Master OFF',icone:'master',f:d=>d.kind==='cortina'?{on:d.state.on}:{on:false}}];
const texto=d=>{const s=d.state;if(d.kind==='ar')return s.on?`Ligado · ${s.v}°`:'Desligado';if(d.kind==='cortina')return s.on?'Fechada':'Aberta';if(d.kind==='ventilador')return s.on?`Ligado · vel. ${s.v}`:'Desligado';if(d.kind==='luz')return s.on?(s.v<100?s.v+'%':'Acesa'):'Apagada';if(d.kind==='tv')return s.on?'Ligada':'Desligada';if(d.kind==='som')return s.on?'Tocando':'Parado';};
const ativo=d=>d.kind==='cortina'?!d.state.on:d.state.on;

// palco: foto + svg
const palco=$('#palco'),wrap=document.createElement('div');wrap.id='foto';palco.prepend(wrap);
const img=new Image();img.src='casa-foto.jpg?v=1';img.alt='Planta da casa';wrap.append(img);
const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 1536 1024');wrap.append(svg);
const el=(tag,attrs={},parent=svg)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);parent.append(n);return n;};
const defs=el('defs');defs.innerHTML=`<radialGradient id="gl"><stop offset="0" stop-color="#ffd48a" stop-opacity=".95"/><stop offset=".35" stop-color="#ffb860" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>
<linearGradient id="pl" x1="0" x2="1"><stop offset="0" stop-color="#e9dcc4"/><stop offset=".5" stop-color="#cdbb99"/><stop offset="1" stop-color="#e9dcc4"/></linearGradient><pattern id="dobra" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#eadfca"/><rect width="4" height="10" fill="#cbb894"/></pattern><pattern id="dobraH" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#eadfca"/><rect width="10" height="4" fill="#cbb894"/></pattern>`;
const noiteL=el('rect',{x:0,y:0,width:1536,height:1024,fill:'#0b1230',class:'noite'});
const luzesL=el('g',{class:'glows'});
const roomsL=el('g',{class:'rooms'});
const devL=el('g',{class:'devs'});
for(const [id,pts] of Object.entries(ROOM_AREAS)){const p=el('polygon',{points:pts.map(p=>p.join(',')).join(' '),class:'room'},roomsL);p.onclick=()=>abrirComodo(id);}
for(const d of devs){
  const g=el('g',{class:'dev k-'+d.kind,transform:`translate(${d.x},${d.y})`},devL);d.g=g;g.onclick=e=>{e.stopPropagation();acionar(d);};
  if(d.kind==='luz'){d.glow=el('circle',{cx:d.x,cy:d.y,r:d.r,fill:'url(#gl)',class:'glow'},luzesL);el('circle',{r:9,class:'bulbo'},g);el('circle',{r:26,class:'hit'},g);}
  if(d.kind==='ar'){el('rect',{x:-36,y:-11,width:72,height:22,rx:7,class:'ar-corpo'},g);el('rect',{x:-30,y:5,width:60,height:3,rx:1.5,class:'ar-fenda'},g);el('circle',{cx:27,cy:-3,r:2.6,class:'ar-led'},g);const w=el('g',{class:'vento'},g);for(let i=0;i<5;i++){const x=-26+i*13;el('path',{d:`M${x} 12 C ${x*1.1} 40, ${x*1.35} 60, ${x*1.6} 92`},w);}el('rect',{x:-40,y:-14,width:80,height:110,class:'hit'},g);}
  if(d.kind==='tv'){g.setAttribute('transform','');d.tela=el('polygon',{points:d.poly,class:'tv-off'},g);el('polygon',{points:d.poly,class:'hit'},g);}
  if(d.kind==='cortina'){const sc=el('g',{class:'cort'},g);if(d.vert){d.a=el('rect',{x:-d.w/2,y:-d.h/2,width:d.w,height:d.h/2,fill:'url(#dobraH)',class:'folha'},sc);d.b=el('rect',{x:-d.w/2,y:0,width:d.w,height:d.h/2,fill:'url(#dobraH)',class:'folha'},sc);}else{d.a=el('rect',{x:-d.w/2,y:-d.h/2,width:d.w/2,height:d.h,fill:'url(#dobra)',class:'folha'},sc);d.b=el('rect',{x:0,y:-d.h/2,width:d.w/2,height:d.h,fill:'url(#dobra)',class:'folha'},sc);}el('rect',{x:-d.w/2-6,y:-d.h/2-6,width:d.w+12,height:d.h+12,class:'hit'},g);}
  if(d.kind==='ventilador'){const p=el('g',{class:'pas'},g);for(let i=0;i<4;i++)el('ellipse',{cx:30,cy:0,rx:30,ry:7,transform:`rotate(${i*90})`},p);el('circle',{r:9,class:'cubo'},g);el('circle',{r:66,class:'hit'},g);}
  if(d.kind==='som'){for(let i=0;i<3;i++)el('circle',{r:20,class:'onda',style:`animation-delay:${i*.6}s`},g);el('circle',{r:12,class:'cx-som'},g);el('circle',{r:30,class:'hit'},g);}
}
// etiquetas (só aparelhos que não são luz)
const chips=$('#chips');
for(const d of devs){if(d.kind==='luz')continue;const b=document.createElement('button');b.type='button';b.className='chip k-'+d.kind;b.innerHTML=svgI(d.kind)+'<span></span>';b.onclick=e=>{e.stopPropagation();acionar(d);};d.chip=b;chips.append(b);}
chips.remove();chips.id='chipsFoto';wrap.append(chips);
for(const d of devs){if(!d.chip)continue;const oy=d.kind==='ar'?-30:d.kind==='tv'?-36:d.kind==='cortina'?-(d.h/2+22):-44;d.chip.style.left=(d.x/1536*100)+'%';d.chip.style.top=((d.y+oy)/1024*100)+'%';}
// girar: arrastar gira a casa em torno do centro (sem virar de cabeça para baixo)
let ang=0,ini=null,mov=false;palco.addEventListener('pointerdown',e=>{if(e.target.closest('#ficha'))return;ini={x:e.clientX,a:ang};mov=false;});
addEventListener('pointermove',e=>{if(!ini)return;const dx=e.clientX-ini.x;if(Math.abs(dx)>6)mov=true;if(!mov)return;ang=Math.max(-35,Math.min(35,ini.a+dx*.25));wrap.style.transform=`rotate(${ang}deg) scale(${1-Math.abs(ang)/220})`;});
addEventListener('pointerup',()=>{ini=null;setTimeout(()=>mov=false,0);});
palco.addEventListener('click',e=>{if(mov){e.stopPropagation();e.preventDefault();}},true);

let noite=false;
function setNoite(v){noite=v;document.documentElement.dataset.noite=v?'1':'0';$('#diaNoite').innerHTML=svgI(v?'noite':'dia')+`<span>${v?'Noite':'Dia'}</span>`;}
function atualizar(){
  let luzes=0,acesas=0,ares=[];
  for(const d of devs){d.g.classList.toggle('on',ativo(d));
    if(d.kind==='luz'){luzes++;if(d.state.on)acesas++;d.glow.style.opacity=d.state.on?(.35+.65*d.state.v/100)*(noite?1:.75):0;}
    if(d.kind==='ar'&&d.state.on)ares.push(d.state.v+'°');
    if(d.kind==='tv')d.tela.setAttribute('class',d.state.on?'tv-on':'tv-off');
    if(d.kind==='cortina'){const f=d.state.on?1:.22;if(d.vert){d.a.setAttribute('height',d.h/2*f);d.b.setAttribute('y',d.h/2-d.h/2*f);d.b.setAttribute('height',d.h/2*f);}else{d.a.setAttribute('width',d.w/2*f);d.b.setAttribute('x',d.w/2-d.w/2*f);d.b.setAttribute('width',d.w/2*f);}}
    if(d.kind==='ventilador')d.g.style.setProperty('--vel',(1.6/d.state.v)+'s');
    if(d.chip){d.chip.classList.toggle('on',ativo(d));d.chip.querySelector('span').textContent=d.kind==='ar'?(d.state.on?d.state.v+'°':'Desl.'):d.kind==='cortina'?texto(d):d.kind==='tv'?'TV':d.kind==='ventilador'?(d.state.on?'Vel. '+d.state.v:'Vent.'):d.state.on?'♪':'Som';}}
  $('#status').textContent=`${acesas} de ${luzes} luzes acesas`+(ares.length?` · Ar ${ares.join(', ')}`:' · Ar desligado');
  if(sel)abrirFicha(sel,true);
}
const toast=$('#aviso');let tt;const avisar=m=>{toast.textContent=m;toast.hidden=false;clearTimeout(tt);tt=setTimeout(()=>toast.hidden=true,2400);};
let sel=null;
function definir(d,st){Object.assign(d.state,st);atualizar();}
function acionar(d){definir(d,{on:!d.state.on});abrirFicha(d);}
function cenaDe(id){const c=CENAS.find(c=>c.id===id);if(c.noite!==undefined)setNoite(c.noite);for(const d of devs)Object.assign(d.state,c.f(d));for(const b of $('#cenas').children)b.setAttribute('aria-pressed',String(b.dataset.id===id));sel=null;$('#ficha').hidden=true;atualizar();avisar(c.nome+' ativada · simulação');}
const cenasCom=d=>CENAS.filter(c=>c.f({...d,state:{...d.state}}).on===true);
function abrirFicha(d,soAtualiza){sel=d;const f=$('#ficha');if(soAtualiza&&f.hidden)return;f.hidden=false;f.innerHTML='';
  const h=document.createElement('div');h.className='f-topo';h.innerHTML=`<i>${svgI(d.kind)}</i><div><b></b><small></small></div><button class="liga" type="button" aria-label="Ligar ou desligar"></button><button class="x" type="button" aria-label="Fechar">✕</button>`;h.querySelector('b').textContent=d.name;h.querySelector('small').textContent=ROOMS[d.room]+' · '+texto(d);const lg=h.querySelector('.liga');lg.setAttribute('aria-pressed',String(ativo(d)));lg.onclick=()=>definir(d,{on:!d.state.on});h.querySelector('.x').onclick=()=>{sel=null;f.hidden=true;};f.append(h);
  const ctl=document.createElement('div');ctl.className='f-ctl';const passo=(rot,menos,mais,val)=>{ctl.innerHTML=`<span>${rot}</span><button type="button">−</button><b>${val}</b><button type="button">+</button>`;const [a,b]=ctl.querySelectorAll('button');a.onclick=menos;b.onclick=mais;};
  if(d.kind==='ar')passo('Temperatura',()=>definir(d,{on:true,v:Math.max(16,d.state.v-1)}),()=>definir(d,{on:true,v:Math.min(30,d.state.v+1)}),d.state.v+'°');
  else if(d.kind==='luz')passo('Brilho',()=>definir(d,{on:true,v:Math.max(10,d.state.v-20)}),()=>definir(d,{on:true,v:Math.min(100,d.state.v+20)}),d.state.v+'%');
  else if(d.kind==='ventilador')passo('Velocidade',()=>definir(d,{on:true,v:Math.max(1,d.state.v-1)}),()=>definir(d,{on:true,v:Math.min(3,d.state.v+1)}),String(d.state.v));
  else if(d.kind==='cortina'){ctl.innerHTML='<button type="button">Abrir</button><button type="button">Fechar</button>';const [a,b]=ctl.querySelectorAll('button');a.onclick=()=>definir(d,{on:false});b.onclick=()=>definir(d,{on:true});}
  if(ctl.innerHTML)f.append(ctl);
  const cs=cenasCom(d);if(cs.length){const w=document.createElement('div');w.className='f-cenas';w.innerHTML='<span>Cenas com este aparelho</span>';for(const c of cs){const b=document.createElement('button');b.type='button';b.innerHTML=svgI(c.icone)+c.nome;b.onclick=()=>cenaDe(c.id);w.append(b);}f.append(w);}
  const n=document.createElement('p');n.className='f-nota';n.textContent='Simulação no desenho. Para acionar de verdade, ligue a casa no onboarding.';f.append(n);}
function abrirComodo(id){sel=null;const f=$('#ficha');f.hidden=false;f.innerHTML='';const lista=devs.filter(d=>d.room===id||(id==='sala'&&d.room==='jantar'));
  const h=document.createElement('div');h.className='f-topo';h.innerHTML=`<i>${svgI('cheguei')}</i><div><b></b><small></small></div><button class="x" type="button" aria-label="Fechar">✕</button>`;h.querySelector('b').textContent=ROOMS[id];h.querySelector('small').textContent=lista.length+' aparelhos · toque para ligar ou desligar';h.querySelector('.x').onclick=()=>f.hidden=true;f.append(h);
  const g=document.createElement('div');g.className='f-lista';for(const d of lista){const b=document.createElement('button');b.type='button';b.className=ativo(d)?'on':'';b.innerHTML=svgI(d.kind)+'<span></span><small></small>';b.querySelector('span').textContent=d.name;b.querySelector('small').textContent=texto(d);b.onclick=()=>{definir(d,{on:!d.state.on});abrirComodo(id);};g.append(b);}f.append(g);
  const t=document.createElement('div');t.className='f-cenas';for(const [rot,ic,v] of [['Tudo ligado','dia',true],['Tudo desligado','master',false]]){const b=document.createElement('button');b.type='button';b.innerHTML=svgI(ic)+rot;b.onclick=()=>{for(const d of lista)if(d.kind!=='cortina')d.state.on=v;atualizar();abrirComodo(id);};t.append(b);}f.append(t);}
svg.addEventListener('click',e=>{if(e.target===svg||e.target.classList.contains('noite')){sel=null;$('#ficha').hidden=true;}});
for(const c of CENAS){const b=document.createElement('button');b.type='button';b.dataset.id=c.id;b.innerHTML=svgI(c.icone)+`<span>${c.nome}</span>`;b.onclick=()=>cenaDe(c.id);$('#cenas').append(b);}
const amb=$('#ambientes');for(const [id,n] of Object.entries(ROOMS)){const b=document.createElement('button');b.type='button';b.textContent=n;b.onclick=()=>abrirComodo(id);amb.append(b);}
$('#diaNoite').onclick=()=>{setNoite(!noite);atualizar();};
$('#tela').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('#app').requestFullscreen?.();
$('#titulo').textContent='Minha Casa 4D';$('#selo').textContent='Simulação de cenários';$('#carregando').hidden=true;
setNoite(false);cenaDe('cheguei');for(const d of devs)if(d.kind==='tv')d.state.on=true;atualizar();
window.__c4={cenaDe,devs,setNoite:v=>{setNoite(v);atualizar();}};

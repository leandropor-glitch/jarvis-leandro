/* Casa 4D · cenários (Claude 24/11/2026)
 * Desenha a casa legível (paredes cortadas com topo grafite, piso de madeira/porcelanato, móveis coloridos)
 * e os aparelhos com estado visível: luz, ar (vento saindo), TV (tela acesa), cortina, ventilador, som.
 * Referências: planta isométrica enviada pelo Leandro em 24/11 e a casa 3D do Asno. */
import {dentro,distSeg} from './plano.mjs';

const CORTE=1.5; // altura do corte das paredes (topo grafite)
const lerp=(a,b,t)=>a+(b-a)*t;

function canvasTex(T,w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(repeat)t.repeat.set(repeat,repeat);t.anisotropy=8;return t;}
const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
function madeira(T,base){return canvasTex(T,1024,1024,(g,w,h)=>{const rows=11,rh=h/rows;for(let r=0;r<rows;r++){let x=-rnd()*w*.5;while(x<w){const len=w*(.35+rnd()*.3),v=(rnd()-.5)*26;g.fillStyle=`rgb(${base[0]+v},${base[1]+v*.8},${base[2]+v*.6})`;g.fillRect(x,r*rh,len,rh);for(let i=0;i<7;i++){g.strokeStyle=`rgba(60,30,10,${.05+rnd()*.07})`;g.lineWidth=1+rnd()*2;g.beginPath();const y=r*rh+rnd()*rh;g.moveTo(x,y);g.bezierCurveTo(x+len*.3,y+rnd()*6-3,x+len*.6,y+rnd()*6-3,x+len,y);g.stroke();}g.fillStyle='rgba(40,20,8,.55)';g.fillRect(x,r*rh,2,rh);x+=len;}g.fillStyle='rgba(40,20,8,.45)';g.fillRect(0,r*rh,w,2);}},1/2.2);}
function piso(T,base,grout,n,tile){return canvasTex(T,512,512,(g,w,h)=>{g.fillStyle=grout;g.fillRect(0,0,w,h);const s=w/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=(rnd()-.5)*10;g.fillStyle=`rgb(${base[0]+v},${base[1]+v},${base[2]+v})`;g.fillRect(i*s+2,j*s+2,s-4,s-4);for(let k=0;k<5;k++){g.strokeStyle=`rgba(255,255,255,${rnd()*.12})`;g.beginPath();g.moveTo(i*s+rnd()*s,j*s);g.lineTo(i*s+rnd()*s,j*s+s);g.stroke();}}},1/(tile*n));}
function brilho(T){return canvasTex(T,128,128,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,214,150,1)');r.addColorStop(.35,'rgba(255,190,110,.45)');r.addColorStop(1,'rgba(255,170,90,0)');g.fillStyle=r;g.fillRect(0,0,w,h);});}
function listras(T){return canvasTex(T,256,32,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<4;i++){const x=i*w/4,gr=g.createLinearGradient(x,0,x+w/4,0);gr.addColorStop(0,'rgba(140,220,255,0)');gr.addColorStop(.5,'rgba(190,240,255,.95)');gr.addColorStop(1,'rgba(140,220,255,0)');g.fillStyle=gr;g.fillRect(x+6,h*.3,w/4-12,h*.4);}});}

export function construirCasa(T,plano){
  const M=(color,o={})=>new T.MeshStandardMaterial({color,roughness:.75,...o});
  const mats={
    paredeFace:M(0xf2eadc,{roughness:.9}),paredeTopo:new T.MeshBasicMaterial({color:0x1a1a1c}),base:M(0xe6dccb,{roughness:.9}),
    madeira:M(0xffffff,{map:madeira(T,[124,70,34]),roughness:.55,envMapIntensity:.35}),madeiraClara:M(0xffffff,{map:madeira(T,[124,70,34]),roughness:.55,envMapIntensity:.35}),
    porcelanato:M(0xffffff,{map:piso(T,[222,206,176],'#c2b296',1,.9),roughness:.4,envMapIntensity:.4}),banho:M(0xffffff,{map:piso(T,[214,200,172],'#b7a689',1,.6),roughness:.4,envMapIntensity:.4}),
    deck:M(0xffffff,{map:madeira(T,[124,70,34]),roughness:.55,envMapIntensity:.35}),cimento:M(0xa9a59d,{roughness:.9}),
    carvalho:M(0xc1925e,{roughness:.5}),nogueira:M(0x7a4e2d,{roughness:.5}),preto:M(0x1d1e20,{roughness:.35,metalness:.2}),
    metal:M(0xb9bcbf,{roughness:.3,metalness:.8}),branco:M(0xf4f1ec,{roughness:.45}),louca:M(0xffffff,{roughness:.15}),
    linho:M(0xefe8de,{roughness:.95}),manta:M(0xb58b62,{roughness:.95}),tapete:M(0xcfc6b5,{roughness:1}),tapete2:M(0xb9ad98,{roughness:1}),
    sofa:M(0xb5532b,{roughness:.95}),sofaBege:M(0xd9c7a6,{roughness:.95}),couro:M(0x9a4f26,{roughness:.55}),cadeira:M(0xe6dccb,{roughness:.9}),
    marmore:M(0xf0ede8,{roughness:.2}),pedraEscura:M(0x34363a,{roughness:.3}),folha:M(0x3f7d3a,{roughness:.8}),folha2:M(0x5a9a46,{roughness:.8}),vaso:M(0xd8d2c8,{roughness:.6}),
    vidro:new T.MeshPhysicalMaterial({color:0xcfe3ee,roughness:.05,transmission:.9,transparent:true,opacity:.28,depthWrite:false}),
    caixilho:M(0x2b2d30,{roughness:.4,metalness:.5}),porta:M(0xc49a6c,{roughness:.55}),tecido:M(0xe9dcc4,{roughness:1,side:T.DoubleSide}),
    roupas:[M(0x3a4a66),M(0xd8cfc2),M(0x8a5a3c),M(0x2d2d2d),M(0xa9b7c6)],
  };
  const pisoDe={sala:mats.madeira,circulacao:mats.madeira,quarto:mats.madeiraClara,escritorio:mats.madeiraClara,outro:mats.madeira,cozinha:mats.porcelanato,servico:mats.porcelanato,banho:mats.banho,varanda:mats.deck,garagem:mats.cimento};
  const group=new T.Group(),clicaveis=[],anim=[];
  const mesh=(geo,mat,x=0,y=0,z=0,p=group)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;};
  const box=(w,h,d,mat,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,p);
  const cyl=(r1,r2,h,mat,x,y,z,p,seg=24)=>mesh(new T.CylinderGeometry(r1,r2,h,seg),mat,x,y,z,p);
  const soft=(w,h,d,mat,x,y,z,p,pw=.25)=>{const g=new T.SphereGeometry(1,24,16),a=g.attributes.position,f=v=>Math.sign(v)*Math.pow(Math.abs(v),pw);for(let i=0;i<a.count;i++)a.setXYZ(i,w/2*f(a.getX(i)),h/2*f(a.getY(i)),d/2*f(a.getZ(i)));g.computeVertexNormals();return mesh(g,mat,x,y,z,p);};
  const grupo=(x,z,rot=0,p=group)=>{const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;p.add(g);return g;};

  /* ---------- base, pisos ---------- */
  const xs=plano.rooms.flatMap(r=>r.poly.map(p=>p[0])),zs=plano.rooms.flatMap(r=>r.poly.map(p=>p[1]));
  const bmin=[Math.min(...xs),Math.min(...zs)],bmax=[Math.max(...xs),Math.max(...zs)];
  for(const r of plano.rooms){
    let pts=r.poly.map(([x,z])=>new T.Vector2(x,-z));if(T.ShapeUtils.isClockWise(pts))pts=pts.reverse();const s=new T.Shape(pts);
    const laje=new T.ExtrudeGeometry(s,{depth:.25,bevelEnabled:false});laje.rotateX(-Math.PI/2);laje.translate(0,-.27,0);
    const l=mesh(laje,mats.base);l.castShadow=false;
    const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);const f=mesh(g,pisoDe[r.func]||mats.madeira,0,0,0);f.castShadow=false;f.userData.sala=r.id;clicaveis.push(f);
  }

  /* ---------- paredes com vãos ---------- */
  const paredeMats=[mats.paredeFace,mats.paredeFace,mats.paredeTopo,mats.paredeFace,mats.paredeFace,mats.paredeFace];
  const peca=(a,b,y0,y1,th,mat=paredeMats)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.02||y1-y0<.02)return null;const m=mesh(new T.BoxGeometry(len+(mat===paredeMats?th*.98:0),y1-y0,th),mat,(a[0]+b[0])/2,(y0+y1)/2,(a[1]+b[1])/2);m.rotation.y=-Math.atan2(dz,dx);return m;};
  const janelas=[];const portas=[];
  const usadas=new Set();
  for(const w of plano.walls){
    const a=w.a,b=w.b,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,th=Math.max(.2,w.th),H=Math.min(CORTE,w.h);
    const proj=p=>[(p[0]-a[0])*ux+(p[1]-a[1])*uz,Math.abs(-(p[0]-a[0])*uz+(p[1]-a[1])*ux)];
    const holes=[];
    plano.openings.forEach((o,i)=>{const [t0,d0]=proj(o.a),[t1,d1]=proj(o.b);if(d0>Math.max(th,.3)||d1>Math.max(th,.3))return;const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(len,Math.max(t0,t1));if(hi-lo<.4)return;holes.push({lo,hi,o,i});});
    holes.sort((p,q)=>p.lo-q.lo);
    const at=t=>[a[0]+ux*t,a[1]+uz*t];let cur=0;
    for(const h of holes){
      if(h.lo<cur)continue;usadas.add(h.i);
      peca(at(cur),at(h.lo),0,H,th);
      const win=h.o.tipo==='janela',sill=win?(h.o.peitoril>0?h.o.peitoril:1):0,top=Math.min(H,sill+(h.o.altura>0?h.o.altura:(win?1.2:2.1)));
      if(sill>0)peca(at(h.lo),at(h.hi),0,sill,th);
      if(top<H-.02)peca(at(h.lo),at(h.hi),top,H,th);
      const mid=at((h.lo+h.hi)/2),info={a:at(h.lo),b:at(h.hi),mid,ux,uz,th,sill,top,len:h.hi-h.lo};
      if(win||h.o.tipo==='porta_correr'){
        const v=peca(at(h.lo),at(h.hi),sill,top,.03,mats.vidro);if(v){v.castShadow=false;v.renderOrder=2;}
        peca(at(h.lo),at(h.hi),sill-.02,sill+.03,th+.03,mats.caixilho);peca(at(h.lo),at(h.hi),top-.03,top,th+.01,mats.caixilho);
        if(h.o.tipo==='porta_correr'){const m2=at((h.lo+h.hi)/2);peca([m2[0]-ux*.025,m2[1]-uz*.025],[m2[0]+ux*.025,m2[1]+uz*.025],0,top,th+.02,mats.caixilho);}
        janelas.push(info);
      }else if(h.o.tipo==='porta'){
        // batentes + folha aberta 80° rente à parede, para dentro do cômodo mais próximo
        peca(at(h.lo),at(h.lo+.05),0,top,th+.04,mats.porta);peca(at(h.hi-.05),at(h.hi),0,top,th+.04,mats.porta);peca(at(h.lo),at(h.hi),top-.05,top,th+.04,mats.porta);
        const nx=-uz,nz=ux,lado=(plano.roomAt([mid[0]+nx*.5,mid[1]+nz*.5])?.area||0)>=(plano.roomAt([mid[0]-nx*.5,mid[1]-nz*.5])?.area||0)?1:-1;
        const largura=Math.max(.5,h.hi-h.lo-.1),hinge=at(h.lo+.05),folha=box(largura,top-.06,.04,mats.porta,0,0,0);folha.geometry.translate(largura/2,0,0);
        const base=-Math.atan2(dz,dx);folha.position.set(hinge[0]+nx*lado*.02,(top-.06)/2,hinge[1]+nz*lado*.02);folha.rotation.y=base-lado*Math.PI*.44;
        cyl(.012,.012,.12,mats.metal,0,0,0,folha).position.set(largura-.08,0,.04);
        portas.push(info);
      }else portas.push(info);
      cur=h.hi;
    }
    peca(at(cur),b,0,H,th);
  }

  /* ---------- lados livres de cada cômodo ---------- */
  const lados=r=>{const {x0,x1,z0,z1}=r.rect;return [
    {s:'n',a:[x0,z0],b:[x1,z0],len:x1-x0,rot:0},{s:'s',a:[x0,z1],b:[x1,z1],len:x1-x0,rot:Math.PI},
    {s:'w',a:[x0,z0],b:[x0,z1],len:z1-z0,rot:Math.PI/2},{s:'e',a:[x1,z0],b:[x1,z1],len:z1-z0,rot:-Math.PI/2}];};
  const pontuar=(r,l,{evitaJanela=false}={})=>{let s=9;for(const p of portas){const d=distSeg(p.mid,l.a,l.b).d;if(d<.6)s=Math.min(s,distSeg(p.mid,l.a,l.b).t>0&&distSeg(p.mid,l.a,l.b).t<1?-2:0);}if(evitaJanela)for(const j of janelas)if(distSeg(j.mid,l.a,l.b).d<.6)s-=3;return s+l.len*.4;};
  // posição encostada no lado l, item de profundidade d, centro deslocado `u` metros ao longo do lado a partir do meio
  const encosta=(r,l,d,u=0)=>{const {x0,x1,z0,z1}=r.rect,cxm=(x0+x1)/2,czm=(z0+z1)/2;
    if(l.s==='n')return {x:cxm+u,z:z0+d/2,rot:0};if(l.s==='s')return {x:cxm-u,z:z1-d/2,rot:Math.PI};
    if(l.s==='w')return {x:x0+d/2,z:czm-u,rot:Math.PI/2};return {x:x1-d/2,z:czm+u,rot:-Math.PI/2};};
  const oposto={n:'s',s:'n',w:'e',e:'w'};
  const ladoPerto=(r,p)=>lados(r).reduce((b,l)=>{const d=distSeg(p,l.a,l.b).d;return !b||d<b.d?{l,d}:b;},null).l;

  /* ---------- móveis (frente = +z local) ---------- */
  const planta=(x,z,s=1,p=group)=>{const g=grupo(x,z,0,p);cyl(.16*s,.12*s,.32*s,mats.vaso,0,.16*s,0,g);for(let i=0;i<7;i++){const f=soft(.18*s,.34*s,.06*s,i%2?mats.folha:mats.folha2,Math.cos(i*.9)*.1*s,.5*s+rnd()*.15*s,Math.sin(i*.9)*.1*s,g,.6);f.rotation.set(rnd()*.8-.4,i*.9,rnd()*.8-.4);}return g;};
  const cadeira=(x,z,rot,p,mat=mats.cadeira)=>{const g=grupo(x,z,rot,p);soft(.46,.1,.46,mat,0,.46,0,g,.3);soft(.44,.42,.08,mat,0,.72,-.2,g,.3);for(const a of [-.18,.18])for(const b of [-.18,.18])cyl(.015,.015,.42,mats.preto,a,.21,b,g,8);return g;};
  const abajur=(x,y,z,p)=>{cyl(.07,.07,.02,mats.preto,x,y+.01,z,p);cyl(.01,.01,.25,mats.metal,x,y+.14,z,p);const c=mesh(new T.CylinderGeometry(.09,.12,.16,24,1,true),M(0xfff1d8,{emissive:0xffc980,emissiveIntensity:.9,side:T.DoubleSide}),x,y+.3,z,p);c.castShadow=false;};
  function cama(x,z,rot,larg=1.6,comp=2.0,cor=mats.manta){const g=grupo(x,z,rot);
    box(larg+.1,.28,comp,mats.nogueira,0,.14,0,g);soft(larg,.24,comp-.05,mats.linho,0,.4,.02,g,.3);
    soft(larg+.14,.9,.1,M(0xcdbfa9,{roughness:1}),0,.6,-comp/2-.02,g,.3);
    soft(larg*.98,.06,comp*.36,cor,0,.53,comp*.28,g,.3);
    const n=larg>1.2?2:1;for(let i=0;i<n;i++)soft(larg/n*.8,.14,.32,mats.branco,-larg/2+larg/n*(i+.5),.58,-comp/2+.3,g,.4);
    for(const sgn of [-1,1]){box(.45,.5,.4,mats.carvalho,sgn*(larg/2+.32),.25,-comp/2+.22,g);abajur(sgn*(larg/2+.32),.5,-comp/2+.22,g);}
    box(larg+1.5,.012,comp*.95,mats.tapete,0,.008,comp*.05,g).castShadow=false;const pn=box(larg+1.3,1.25,.05,mats.carvalho,0,.63,-comp/2-.13,g);for(let i=-6;i<=6;i++)box(.035,1.2,.02,mats.nogueira,i*(larg+1.2)/13,.63,-comp/2-.1,g);const led=box(larg+1.2,.02,.02,M(0xffe2b0,{emissive:0xffb86b,emissiveIntensity:2}),0,1.24,-comp/2-.09,g);led.castShadow=false;return g;}
  function armario(x,z,rot,len,p=group){const g=grupo(x,z,rot,p);box(len,1.55,.6,mats.carvalho,0,.78,0,g);const n=Math.max(2,Math.round(len/.5));for(let i=0;i<n;i++){box(len/n-.015,1.5,.02,M(0xd0a874),-len/2+len/n*(i+.5),.78,.31,g);box(.015,.3,.03,mats.preto,-len/2+len/n*(i+.5)+(i%2?-.18:.18)*len/n*2,.8,.33,g);}return g;}
  function sofa(x,z,rot,larg=2.3,mat=mats.sofa){const g=grupo(x,z,rot);soft(larg,.42,.95,mat,0,.25,0,g,.25);soft(larg,.45,.22,mat,0,.62,-.36,g,.3);for(const s of [-1,1])soft(.2,.32,.95,mat,s*(larg/2-.1),.5,0,g,.3);const n=Math.max(2,Math.round(larg/.85));for(let i=0;i<n;i++)soft((larg-.4)/n*.94,.14,.62,mat,-larg/2+.2+(larg-.4)/n*(i+.5),.52,.1,g,.3);soft(.36,.36,.12,mats.manta,-larg/2+.45,.7,-.18,g,.4).rotation.z=.2;soft(.36,.36,.12,mats.manta,larg/2-.45,.7,-.18,g,.4).rotation.z=-.2;return g;}
  function mesaJantar(x,z,rot,c=1.8,l=.95,cad=6,p=group){const g=grupo(x,z,rot,p);box(c,.05,l,mats.carvalho,0,.75,0,g);for(const a of [-1,1])for(const b of [-1,1])box(.06,.72,.06,mats.carvalho,a*(c/2-.1),.36,b*(l/2-.1),g);const lado=Math.floor(cad/2);for(let i=0;i<lado;i++){const u=-c/2+c/lado*(i+.5);cadeira(u,-l/2-.32,0,g);cadeira(u,l/2+.32,Math.PI,g);}planta(0,0,.55,g).position.y=.77;return g;}
  function mesaOval(x,z,rot,p=group){const g=grupo(x,z,rot,p);const t=cyl(.5,.5,.04,mats.marmore,0,.74,0,g,40);t.scale.set(1.6,1,1);cyl(.06,.2,.72,mats.carvalho,0,.36,0,g);for(const [a,b,r] of [[-.45,-.62,0],[.45,-.62,0],[-.45,.62,Math.PI],[.45,.62,Math.PI]])cadeira(a,b,r,g,mats.branco);return g;}

  const hasObj=(r,t)=>plano.objects.some(o=>o.room===r&&o.type===t);
  const cabe={bed:['quarto'],sofa:['sala','escritorio'],table:['sala','varanda'],cabinet:['quarto','escritorio','servico']};
  // móveis salvos pelo editor antigo eram aproximações automáticas: a ambientação abaixo os substitui
  plano.objects=plano.objects.filter(o=>o.manual&&o.room&&(cabe[o.type]||[]).includes(o.room.func));
  for(const o of plano.objects){
    if(o.type==='bed')cama(o.pos[0],o.pos[1],-o.rot,o.w,o.d,[mats.manta,M(0x37506e),M(0x7c9a7e)][plano.objects.indexOf(o)%3]);
    else if(o.type==='sofa')sofa(o.pos[0],o.pos[1],-o.rot,o.w);
    else if(o.type==='table')mesaJantar(o.pos[0],o.pos[1],-o.rot,Math.max(1.2,o.w),Math.max(.8,o.d),o.w>=1.6?6:4);
    else if(o.type==='cabinet')armario(o.pos[0],o.pos[1],-o.rot,o.w);
  }
  const tvLado=new Map();
  for(const q of plano.points)if(q.kind==='tv'&&q.room&&!tvLado.has(q.room.id))tvLado.set(q.room.id,ladoPerto(q.room,q.pos));
  for(const r of plano.rooms){
    const {x0,x1,z0,z1}=r.rect,w=x1-x0,d=z1-z0,L=lados(r),best=(opts,f={})=>opts.slice().sort((a,b)=>pontuar(r,b,f)-pontuar(r,a,f))[0];
    if(w<.9||d<.9)continue;
    if(r.func==='quarto'){
      let head=null;
      if(!hasObj(r,'bed')){
        const larg=r.area>=11?1.6:1.4,comp=2.0;
        const cand=L.filter(l=>l.len>=larg+1.1&&(l.s==='n'||l.s==='s'?d:w)>=comp+.6);
        head=best(cand.length?cand:L,{evitaJanela:true});
        const p=encosta(r,head,comp);cama(p.x,p.z,p.rot,larg,comp,[mats.manta,M(0x37506e),M(0x7c9a7e)][plano.rooms.indexOf(r)%3]);
        const across=head.s==='n'||head.s==='s'?w:d,along=head.s==='n'||head.s==='s'?d:w;
        if(!hasObj(r,'cabinet')){
          if(across>=larg+.9+1.3){const perp=L.filter(l=>l.s!==head.s&&l.s!==oposto[head.s]);const lw=best(perp,{evitaJanela:true});const len=Math.min(lw.len-.7,2.4);if(len>1){const q=encosta(r,lw,.6,(head.s==='n'||head.s==='w'?-1:1)*(lw.s==='s'||lw.s==='e'?-1:1)*0);armario(q.x,q.z,q.rot,len);}}
          else if(along>=comp+1.4){const lo=L.find(l=>l.s===oposto[head.s]);const len=Math.min(lo.len-.6,2.2);if(len>1){const q=encosta(r,lo,.6);armario(q.x,q.z,q.rot,len);}}
        }
      }
      if(r.area>12){const l=L.find(x=>head&&x.s!==head.s&&x.s!==oposto[head.s]&&pontuar(r,x)>0);if(l){const q=encosta(r,l,.25,l.len*.35);planta(q.x,q.z,.9);}}
    }else if(r.func==='sala'){
      const longX=w>=d,Lg=longX?w:d;let viver=r.rect,jantar=null;
      if(Lg>6&&!hasObj(r,'table')){const cut=Lg*.58;if(longX){viver={x0,x1:x0+cut,z0,z1};jantar={x0:x0+cut,x1,z0,z1};}else{viver={x0,x1,z0,z1:z0+cut};jantar={x0,x1,z0:z0+cut,z1};}
        const tvp=tvLado.get(r.id);if(tvp){const tvSide=tvp.s;const inV=(longX?(tvSide==='w'):(tvSide==='n'));if(!inV&&(tvSide==='w'||tvSide==='e'||tvSide==='n'||tvSide==='s')&&((longX&&tvSide==='e')||(!longX&&tvSide==='s'))){const t=viver;viver=jantar;jantar=t;}}}
      const sub={...r,rect:viver},Ls=lados(sub),vw=viver.x1-viver.x0,vd=viver.z1-viver.z0;
      let tv=tvLado.get(r.id);if(tv)tv=Ls.find(l=>l.s===tv.s);
      if(!tv){const par=vw>=vd?Ls.filter(l=>l.s==='n'||l.s==='s'):Ls.filter(l=>l.s==='w'||l.s==='e');tv=best(par);}
      tvLado.set(r.id,tv);
      const across=tv.s==='n'||tv.s==='s'?vd:vw;
      const rack=encosta(sub,tv,.42);{const g=grupo(rack.x,rack.z,rack.rot);const rl=Math.min(2.4,tv.len-.5);box(rl,.4,.42,mats.preto,0,.22,0,g);const pw=Math.min(3.2,tv.len-.3);box(pw,1.42,.05,mats.carvalho,0,.73,-.2,g);for(let i=0;i<Math.floor(pw/.09);i++)box(.04,1.4,.025,mats.nogueira,-pw/2+.05+i*.09,.73,-.17,g);const led=box(rl,.02,.02,M(0xffe2b0,{emissive:0xffb86b,emissiveIntensity:2.2}),0,.02,.2,g);led.castShadow=false;planta(rl/2-.15,0,.45,g).position.y=.43;planta(-rl/2+.15,0,.4,g).position.y=.43;}
      if(!hasObj(r,'sofa')){
        const dist=Math.min(across-.5,3.4),c=encosta(sub,tv,0);const nx=Math.sin(tv.rot),nz=Math.cos(tv.rot);
        const sx=c.x+nx*dist,sz=c.z+nz*dist;sofa(sx,sz,tv.rot+Math.PI,Math.min(2.5,tv.len*.7));
        const mx=c.x+nx*dist*.55,mz=c.z+nz*dist*.55;box(Math.min(3,tv.len*.85),.012,dist*.75,mats.tapete,mx,.01,mz).rotation.y=tv.rot;
        cyl(.42,.42,.05,mats.preto,mx,.38,mz);{const px2=-Math.cos(tv.rot),pz2=Math.sin(tv.rot),o2=Math.min(3,tv.len*.85)/2-.35;for(const k of [-1,1]){const xx=mx+px2*o2*k*1.05+Math.sin(tv.rot)*.2,zz=mz+pz2*o2*k*1.05+Math.cos(tv.rot)*.2;soft(.55,.38,.55,mats.sofaBege,xx,.2,zz,group,.3);}}cyl(.05,.05,.36,mats.preto,mx,.18,mz);planta(mx+.1,mz,.35).position.y=.4;
        const px=-Math.cos(tv.rot),pz=Math.sin(tv.rot),off=Math.min(2.5,tv.len*.7)/2+.65;
        if(tv.len>3.4){const g=grupo(mx+px*off,mz+pz*off,Math.atan2(-px,-pz));soft(.8,.42,.8,mats.couro,0,.3,0,g,.3);soft(.8,.42,.16,mats.couro,0,.62,-.32,g,.3);}
        planta(c.x+nx*.3-px*(tv.len/2-.3),c.z+nz*.3-pz*(tv.len/2-.3),1.1);
      }
      if(jantar){const jw=jantar.x1-jantar.x0,jd=jantar.z1-jantar.z0;mesaJantar((jantar.x0+jantar.x1)/2,(jantar.z0+jantar.z1)/2,jw>=jd?0:Math.PI/2,Math.min(2,Math.max(jw,jd)-1.3),.95,Math.max(jw,jd)>3.2?6:4);}
    }else if(r.func==='cozinha'){
      const main=best(L.filter(l=>l.len>=1.6).length?L.filter(l=>l.len>=1.6):L);const len=main.len-.15;const p=encosta(r,main,.62);
      const g=grupo(p.x,p.z,p.rot);box(len,.86,.6,mats.branco,0,.43,0,g);box(len+.02,.04,.62,mats.marmore,0,.88,0,g);
      box(.6,.02,.5,mats.preto,-len*.25,.91,0,g);for(const a of [-.13,.13])for(const b of [-.12,.12])cyl(.07,.07,.01,mats.metal,-len*.25+a,.925,b,g);
      box(.55,.05,.4,mats.metal,len*.12,.89,0,g);cyl(.012,.012,.3,mats.metal,len*.12,1.05,-.15,g);
      if(len>2.4){box(.75,1.55,.68,mats.metal,len/2-.38,.78,.02,g);}
      const across=main.s==='n'||main.s==='s'?d:w;if(across>=2.3){const op=L.find(l=>l.s===oposto[main.s]);const q=encosta(r,op,.6);const g2=grupo(q.x,q.z,q.rot);const l2=Math.min(op.len-.9,len*.7);if(l2>.8){box(l2,.86,.6,mats.nogueira,0,.43,0,g2);box(l2,.04,.62,mats.pedraEscura,0,.88,0,g2);}}
      const m=encosta(r,main,across*.5);box(.7,.01,Math.min(len*.6,2.4),mats.tapete2,m.x,.01,m.z).rotation.y=m.rot+Math.PI/2;
    }else if(r.func==='banho'){
      const s1=best(L);const p=encosta(r,s1,.5,-s1.len*.22);const g=grupo(p.x,p.z,p.rot);box(.8,.8,.5,mats.carvalho,0,.4,0,g);box(.82,.04,.52,mats.marmore,0,.82,0,g);const cuba=cyl(.18,.16,.12,mats.louca,0,.9,.02,g);cuba.scale.z=.75;box(.6,.5,.02,M(0xdfe8ee,{roughness:.05,metalness:.6}),0,1.3,-.24,g);
      if(s1.len>1.5){const q=encosta(r,s1,.35,s1.len*.12);const v=grupo(q.x,q.z,q.rot);box(.38,.4,.2,mats.louca,0,.38,-.14,v);soft(.38,.38,.5,mats.louca,0,.2,.06,v,.45);}
      const op=L.find(l=>l.s===oposto[s1.s]);if(w>=1.5&&d>=1.8&&op){const q=encosta(r,op,.9,op.len/2-.45);const b=grupo(q.x,q.z,q.rot);box(.9,.03,.9,mats.branco,0,.015,0,b);box(.9,1.5,.02,mats.vidro,0,.75,.45,b).castShadow=false;box(.02,1.5,.9,mats.vidro,-.45,.75,0,b).castShadow=false;}
    }else if(r.func==='servico'){
      const s1=best(L);const p=encosta(r,s1,.62);const g=grupo(p.x,p.z,p.rot);box(.62,.85,.6,mats.branco,-.35,.43,0,g);const porta=cyl(.2,.2,.02,mats.preto,-.35,.5,.31,g);porta.rotation.x=Math.PI/2;box(.55,.85,.5,mats.branco,.35,.43,0,g);box(.5,.12,.4,mats.louca,.35,.86,0,g);
    }else if(r.func==='varanda'){
      if(r.area>=6&&Math.min(w,d)>=2.2)mesaOval((x0+x1)/2,(z0+z1)/2,w>=d?0:Math.PI/2);else{cadeira(x0+w*.3,z0+d*.5,Math.PI/2,group,mats.branco);cadeira(x0+w*.7,z0+d*.5,-Math.PI/2,group,mats.branco);}
      planta(x0+.35,z0+.35,1.1);planta(x1-.35,z1-.35,1);
    }else if(r.func==='escritorio'){
      const s1=best(L);const p=encosta(r,s1,.65);const g=grupo(p.x,p.z,p.rot);box(Math.min(1.8,s1.len-.4),.04,.65,mats.carvalho,0,.75,0,g);box(.04,.74,.6,mats.carvalho,-.85,.37,0,g);box(.04,.74,.6,mats.carvalho,.85,.37,0,g);box(.5,.32,.02,mats.preto,0,1.0,-.15,g);cadeira(0,.55,Math.PI,g,mats.sofaBege);
      planta(x1-.3,z1-.3,.9);
    }else if(r.func==='circulacao'||r.func==='outro'){
      if(r.area>2.5&&Math.min(w,d)>1.1){const l=best(L);const q=encosta(r,l,.25,l.len/2-.3);planta(q.x,q.z,.9);}
    }
  }

  /* ---------- aparelhos ---------- */
  const devices=[];const glowTex=brilho(T),ventoTex=listras(T);
  const naParede=(r,p,prof)=>{let melhor=null;for(const w of plano.walls){const s=distSeg(p,w.a,w.b);if(!melhor||s.d<melhor.s.d)melhor={w,s};}
    if(!melhor||melhor.s.d>1.2)return null;const {w,s}=melhor;const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz);let nx=-dz/len,nz=dx/len;
    const c=r?r.center:p;if((c[0]-s.q[0])*nx+(c[1]-s.q[1])*nz<0){nx=-nx;nz=-nz;}
    const off=w.th/2+prof/2+.005;return {x:s.q[0]+nx*off,z:s.q[1]+nz*off,rot:Math.atan2(nx,nz),nx,nz,wall:w};};
  const novo=(kind,name,room,extra={})=>{const d={id:kind+'-'+devices.length,kind,name,room,state:{on:false,v:kind==='ar'?23:kind==='ventilador'?2:100},cur:0,group:new T.Group(),...extra};group.add(d.group);d.group.traverse?.(()=>{});devices.push(d);return d;};
  const marca=(d,obj)=>{obj.traverse(o=>{if(o.isMesh){o.userData.dev=d.id;clicaveis.push(o);}});};
  let nLuzes=0;
  function luz(name,room,x,z,pend=false,H=2.7){
    const d=novo('luz',name,room);d.group.position.set(x,0,z);
    const tampa=cyl(.11,.11,.02,mats.branco,0,CORTE+.06,0,d.group);tampa.castShadow=false;
    const bulbo=mesh(new T.SphereGeometry(.05,16,12),M(0xfff4e0,{emissive:0xffc070,emissiveIntensity:0}),0,CORTE+.03,0,d.group);bulbo.castShadow=false;
    if(pend){cyl(.004,.004,CORTE-1.6,mats.preto,0,(CORTE+1.6)/2+.05,0,d.group,6);const c=mesh(new T.CylinderGeometry(.06,.22,.22,28,1,true),M(0x1f1f1f,{side:T.DoubleSide,roughness:.4}),0,1.62,0,d.group);c.castShadow=false;bulbo.position.y=1.55;}
    const g=new T.Mesh(new T.PlaneGeometry(1.7,1.7),new T.MeshBasicMaterial({map:glowTex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));g.rotation.x=-Math.PI/2;g.position.y=.03;d.group.add(g);
    let pl=null;if(nLuzes<14){pl=new T.PointLight(0xffc98a,0,7.5,1.6);pl.position.set(0,pend?1.45:2.0,0);d.group.add(pl);nLuzes++;}
    const hit=new T.Mesh(new T.SphereGeometry(.28,8,6),new T.MeshBasicMaterial({visible:false}));hit.position.y=pend?1.6:CORTE;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(x,(pend?1.6:CORTE)+.35,z);
    d.render=(t,dt)=>{const k=d.cur;bulbo.material.emissiveIntensity=k*3;g.material.opacity=k*.45;if(pl)pl.intensity=k*3.2;};
    return d;
  }
  function ar(name,room,p){
    const s=naParede(room,p,.24);if(!s)return null;const d=novo('ar',name,room);const y=CORTE-.22;
    d.group.position.set(s.x,0,s.z);d.group.rotation.y=s.rot;
    soft(.9,.3,.24,mats.branco,0,y,0,d.group,.2);box(.8,.02,.02,M(0x9aa3aa),0,y-.06,.12,d.group);
    const flap=box(.78,.012,.08,mats.branco,0,y-.15,.1,d.group);
    const led=mesh(new T.SphereGeometry(.012,8,6),M(0x333333,{emissive:0x39d6ff,emissiveIntensity:0}),.36,y-.05,.12,d.group);
    const ventos=[];for(let i=0;i<4;i++){const x0=-.3+i*.2;const curva=new T.CatmullRomCurve3([new T.Vector3(x0,y-.15,.14),new T.Vector3(x0*1.1,y-.4,.6),new T.Vector3(x0*1.25,y-.75,1.15),new T.Vector3(x0*1.4,y-1.2,1.7)]);const mt=new T.MeshBasicMaterial({map:ventoTex.clone(),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,color:0x9fe6ff});mt.map.repeat.set(2,1);mt.map.needsUpdate=true;const v=mesh(new T.TubeGeometry(curva,40,.035,6,false),mt,0,0,0,d.group);v.castShadow=v.receiveShadow=false;ventos.push(v);}
    const hit=new T.Mesh(new T.BoxGeometry(1,.5,.5),new T.MeshBasicMaterial({visible:false}));hit.position.y=y;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(s.x,y+.45,s.z);
    d.render=(t,dt)=>{const k=d.cur;flap.rotation.x=k*.9;led.material.emissiveIntensity=k*5;ventos.forEach((v,i)=>{v.material.opacity=k*(.75-i%2*.15);v.material.map.offset.x-=dt*(1.1+i*.15)*k;});};
    return d;
  }
  function tv(name,room,p){
    const s=naParede(room,p,.06);if(!s)return null;const d=novo('tv',name,room);d.group.position.set(s.x,0,s.z);d.group.rotation.y=s.rot;
    const y=.98;box(1.5,.86,.05,mats.preto,0,y,0,d.group);
    const c=document.createElement('canvas');c.width=256;c.height=144;const ctx=c.getContext('2d');const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    const tela=mesh(new T.PlaneGeometry(1.44,.8),new T.MeshBasicMaterial({map:tex,color:0xffffff}),0,y,.027,d.group);tela.castShadow=false;
    const pl=new T.PointLight(0x8fb8ff,0,4,1.8);pl.position.set(0,y,.7);d.group.add(pl);
    let acc=0;const desenha=t=>{const g=ctx;const sky=g.createLinearGradient(0,0,0,144);sky.addColorStop(0,`hsl(${200+Math.sin(t*.2)*20},70%,62%)`);sky.addColorStop(1,'hsl(30,80%,70%)');g.fillStyle=sky;g.fillRect(0,0,256,144);g.fillStyle='hsl(140,35%,30%)';g.beginPath();g.moveTo(0,100);for(let x=0;x<=256;x+=16)g.lineTo(x,92+Math.sin(x*.05+t*.3)*10);g.lineTo(256,144);g.lineTo(0,144);g.fill();g.fillStyle='hsl(200,60%,45%)';g.fillRect(0,118,256,26);g.fillStyle='rgba(255,240,200,.9)';g.beginPath();g.arc(190+Math.sin(t*.1)*20,40,14,0,7);g.fill();tex.needsUpdate=true;};
    ctx.fillStyle='#050607';ctx.fillRect(0,0,256,144);tex.needsUpdate=true;
    const hit=new T.Mesh(new T.BoxGeometry(1.6,1,.3),new T.MeshBasicMaterial({visible:false}));hit.position.y=y;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(s.x,y+.65,s.z);
    d.render=(t,dt)=>{const k=d.cur;pl.intensity=k*2.5;tela.material.color.setScalar(.05+.95*k);acc+=dt;if(k>.02&&acc>.12){acc=0;desenha(t);}};
    return d;
  }
  function cortina(name,room,j){
    const d=novo('cortina',name,room);let nx=-j.uz,nz=j.ux;const c=room?room.center:[0,0];if((c[0]-j.mid[0])*nx+(c[1]-j.mid[1])*nz<0){nx=-nx;nz=-nz;}
    const off=j.th/2+.09;d.group.position.set(j.mid[0]+nx*off,0,j.mid[1]+nz*off);d.group.rotation.y=Math.atan2(nx,nz);
    const W=j.len+.4,h=CORTE-.08,meia=W/2;cyl(.012,.012,W,mats.preto,0,h+.04,0,d.group,8).rotation.z=Math.PI/2;
    const folhas=[];for(const sg of [-1,1]){const geo=new T.PlaneGeometry(meia,h,40,1);const a=geo.attributes.position;for(let i=0;i<a.count;i++){a.setZ(i,Math.sin((a.getX(i)/meia)*Math.PI*12)*.035);}geo.translate(sg*meia/2,0,0);geo.computeVertexNormals();const pv=new T.Group();pv.position.set(sg*meia,h/2+.02,0);d.group.add(pv);const m=mesh(geo,mats.tecido,-sg*meia,0,0,pv);m.castShadow=false;folhas.push(pv);}
    const hit=new T.Mesh(new T.BoxGeometry(W,h,.25),new T.MeshBasicMaterial({visible:false}));hit.position.y=h/2;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(d.group.position.x,h+.35,d.group.position.z);d.state.on=false;// on = fechada
    d.render=()=>{const k=d.cur;for(const f of folhas)f.scale.x=lerp(.16,1,k);};
    return d;
  }
  function ventilador(name,room,x,z){
    const d=novo('ventilador',name,room);d.group.position.set(x,0,z);const y=CORTE+.45;
    cyl(.015,.015,.3,mats.preto,0,y+.15,0,d.group,8);cyl(.14,.12,.12,mats.nogueira,0,y-.04,0,d.group);const pas=new T.Group();pas.position.y=y-.06;d.group.add(pas);
    for(let i=0;i<4;i++){const b=box(.62,.012,.13,mats.carvalho,.42,0,0,pas);const piv=new T.Group();piv.rotation.y=i*Math.PI/2;pas.add(piv);piv.add(b);}
    const hit=new T.Mesh(new T.CylinderGeometry(.75,.75,.3,16),new T.MeshBasicMaterial({visible:false}));hit.position.y=y;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(x,y+.4,z);let w=0;
    d.render=(t,dt)=>{w=lerp(w,d.state.on?d.state.v*4:0,Math.min(1,dt*1.5));pas.rotation.y+=w*dt;};
    return d;
  }
  function som(name,room,x,z){
    const d=novo('som',name,room);d.group.position.set(x,0,z);cyl(.1,.1,.03,mats.branco,0,CORTE+.04,0,d.group);
    const ondas=[0,1,2].map(i=>{const m=new T.Mesh(new T.RingGeometry(.3,.34,48),new T.MeshBasicMaterial({color:0x7fe3ff,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.03;d.group.add(m);return m;});
    const hit=new T.Mesh(new T.SphereGeometry(.25,8,6),new T.MeshBasicMaterial({visible:false}));hit.position.y=CORTE;d.group.add(hit);marca(d,d.group);
    d.anchor=new T.Vector3(x,CORTE+.35,z);
    d.render=t=>{ondas.forEach((o,i)=>{const f=((t*.6+i/3)%1);o.scale.setScalar(.4+f*2.2);o.material.opacity=d.cur*(1-f)*.8;});};
    return d;
  }

  const nomeComodo=r=>r?r.name.charAt(0)+r.name.slice(1).toLowerCase():'';
  const porComodo=new Map();
  for(const q of plano.points){
    const r=q.room,nm=q.desc&&q.desc.length<34?q.desc:null;let d=null;
    if(['luminaria','pendente','fita_led'].includes(q.kind))d=luz(nm||'Luz · '+nomeComodo(r),r,q.pos[0],q.pos[1],q.kind==='pendente');
    else if(q.kind==='ar_condicionado')d=ar(nm||'Ar · '+nomeComodo(r),r,q.pos);
    else if(q.kind==='tv')d=tv(nm||'TV · '+nomeComodo(r),r,q.pos);
    else if(q.kind==='caixa_som')d=som(nm||'Som · '+nomeComodo(r),r,q.pos[0],q.pos[1]);
    else if(q.kind==='cortina'&&r){const j=janelas.filter(j=>plano.roomAt([j.mid[0],j.mid[1]])===r||distSeg(q.pos,j.a,j.b).d<1).sort((a,b)=>distSeg(q.pos,a.a,a.b).d-distSeg(q.pos,b.a,b.b).d)[0];if(j&&!j.cortina){j.cortina=true;d=cortina(nm||'Cortina · '+nomeComodo(r),r,j);}}
    if(d&&q.google)d.google=q.google;if(d&&r)(porComodo.get(r.id)||porComodo.set(r.id,[]).get(r.id)).push(d);
  }
  for(const b of plano.bindings){if(!b.room)continue;let d=null;const nm=b.name||null;
    if(b.visual==='ac')d=ar(nm||'Ar · '+nomeComodo(b.room),b.room,b.pos);else if(b.visual==='tv')d=tv(nm||'TV · '+nomeComodo(b.room),b.room,b.pos);else d=luz(nm||'Luz · '+nomeComodo(b.room),b.room,b.pos[0],b.pos[1]);
    if(d){d.catalogId=b.catalogId;(porComodo.get(b.room.id)||porComodo.set(b.room.id,[]).get(b.room.id)).push(d);}}
  // Completa o básico de cada ambiente para exemplificar cenários (marcados como sugestão).
  for(const r of plano.rooms){
    const lista=porComodo.get(r.id)||[];porComodo.set(r.id,lista);const tem=k=>lista.some(d=>d.kind===k);
    let fan=null;
    if((r.func==='quarto'&&!tem('ar'))||(r.func==='varanda'&&r.area>5)){fan=ventilador('Ventilador · '+nomeComodo(r),r,r.center[0],r.center[1]);fan.sugestao=true;lista.push(fan);}
    if(!tem('luz')&&r.area>1.5){const d=luz('Luz · '+nomeComodo(r),r,r.center[0]+(fan?.9:0),r.center[1]);d.sugestao=true;lista.push(d);}
    if(['sala','quarto'].includes(r.func)&&!tem('cortina')){const j=janelas.filter(j=>!j.cortina&&plano.roomAt([j.mid[0]-j.uz*.5,j.mid[1]+j.ux*.5])===r||!j.cortina&&plano.roomAt([j.mid[0]+j.uz*.5,j.mid[1]-j.ux*.5])===r).sort((a,b)=>b.len-a.len)[0];if(j){j.cortina=true;const d=cortina('Cortina · '+nomeComodo(r),r,j);d.sugestao=true;lista.push(d);}}
    if(r.func==='sala'&&!tem('tv')){const l=tvLado.get(r.id);if(l){const c=encosta(r,l,0);const d=tv('TV · '+nomeComodo(r),r,[c.x,c.z]);if(d){d.sugestao=true;lista.push(d);}}}
  }
  // Posiciona TV da sala no centro do rack (lado escolhido).
  return {group,devices,clicaveis,porComodo,bounds:{min:bmin,max:bmax},update(t,dt){for(const d of devices){const alvo=d.state.on?(d.kind==='luz'?d.state.v/100:1):0;d.cur=lerp(d.cur,alvo,Math.min(1,dt*4));d.render?.(t,dt);}}};
}

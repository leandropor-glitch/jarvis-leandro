/** CASA_4D_GEOMETRIC_MAPPING v1.0 -> Three.js.
 * Paredes com espessura/altura do protocolo, vãos recortados por portas e janelas,
 * vidro nas janelas e marcadores dos pontos de automação na altura (z) informada.
 * Os pontos são propostas visuais: não representam aparelho conectado.
 */
export const PROTOCOL='CASA_4D_GEOMETRIC_MAPPING';
const fin=n=>typeof n==='number'&&Number.isFinite(n);
const pt=v=>Array.isArray(v)&&v.length>=2&&fin(v[0])&&fin(v[1]);

export function readGeometry(input){
  const g=input?.geometry;
  if(!g||g.protocolo!==PROTOCOL||!g.projeto)return null;
  const p=g.projeto,mpu=p.metadados?.metros_por_unidade;
  if(!fin(mpu)||mpu<=0||!Array.isArray(p.paredes))return null;
  return {mpu,paredes:p.paredes.filter(w=>pt(w?.inicio)&&pt(w?.fim)).slice(0,800),aberturas:(p.aberturas||[]).filter(o=>pt(o?.inicio)&&pt(o?.fim)).slice(0,400),pontos:(p.pontos_automacao||[]).filter(q=>Array.isArray(q?.coordenada)&&q.coordenada.length===3&&q.coordenada.every(fin)).slice(0,600)};
}

export const POINT_COLORS={interruptor:0xf2f2f2,tomada:0xf2f2f2,tomada_comandada:0xd6ff3d,luminaria:0xffd27a,pendente:0xffd27a,fita_led:0xffc46b,sensor_presenca:0x6ad7ff,camera:0xff5b5b,caixa_som:0xb48cff,antena_wifi:0x4da3ff,controle_automacao:0xd6ff3d,ar_condicionado:0x9fe7ff,tv:0x222222,cortina:0xe8d9c0,outro:0xbbbbbb};

/** toScene(metrosXY) -> [x,z] já centralizado na cena. */
export function addProtocolGeometry(T,geo,toScene,{group,cutaway,mesh,box,materials}){
  const {wall,oak,white}=materials;
  const glass=new T.MeshPhysicalMaterial({color:0xbfd8e6,roughness:.05,transmission:.85,transparent:true,opacity:.35,thickness:.02});
  const frame=new T.MeshStandardMaterial({color:0x2e3133,roughness:.4,metalness:.4});
  const door=new T.MeshStandardMaterial({color:0x9c8264,roughness:.6});
  let segments=0,cut=0;
  const piece=(a,b,y0,y1,thick,mat,parent=cutaway)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01||y1-y0<.01)return null;
    const m=box(len,y1-y0,thick,mat,(a[0]+b[0])/2,(y0+y1)/2,(a[1]+b[1])/2,parent);m.rotation.y=-Math.atan2(dz,dx);segments++;return m;
  };
  const openings=geo.aberturas.map(o=>({...o,a:toScene(o.inicio),b:toScene(o.fim)}));
  for(const w of geo.paredes){
    const a=toScene(w.inicio),b=toScene(w.fim),dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.02)continue;
    const H=fin(w.altura)&&w.altura>1&&w.altura<10?w.altura:2.7,th=fin(w.espessura)&&w.espessura>.03&&w.espessura<1?w.espessura:.15;
    const ux=dx/len,uz=dz/len,tol=Math.max(th,.3);
    const proj=p=>[(p[0]-a[0])*ux+(p[1]-a[1])*uz,Math.abs(-(p[0]-a[0])*uz+(p[1]-a[1])*ux)];
    const holes=[];
    for(const o of openings){
      const [t0,d0]=proj(o.a),[t1,d1]=proj(o.b);
      if(d0>tol||d1>tol)continue;
      const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(len,Math.max(t0,t1));if(hi-lo<.3)continue;
      holes.push({lo,hi,o});
    }
    holes.sort((p,q)=>p.lo-q.lo);
    const at=t=>[a[0]+ux*t,a[1]+uz*t];
    let cursor=0;
    for(const h of holes){
      if(h.lo<cursor)continue;
      piece(at(cursor),at(h.lo),0,H,th,wall);
      const isWin=h.o.tipo==='janela',sill=isWin?(fin(h.o.peitoril)?h.o.peitoril:1):0,top=Math.min(H-.05,sill+(fin(h.o.altura)?h.o.altura:(isWin?1.2:2.1)));
      if(sill>0)piece(at(h.lo),at(h.hi),0,sill,th,wall);
      piece(at(h.lo),at(h.hi),top,H,th,wall);
      if(isWin){
        const g=piece(at(h.lo),at(h.hi),sill,top,.02,glass,group);if(g)g.castShadow=false;
        piece(at(h.lo),at(h.hi),sill-.02,sill+.02,th+.02,frame,group);
      }else if(h.o.tipo==='porta'){
        // Folha entreaberta 30°, ancorada no batente inicial.
        const leaf=box(Math.max(.4,h.hi-h.lo-.04),top-.02,.04,door,0,0,0,group),hinge=at(h.lo),ang=-Math.atan2(dz,dx)+Math.PI/6;
        leaf.geometry.translate((h.hi-h.lo)/2,0,0);leaf.position.set(hinge[0],(top)/2,hinge[1]);leaf.rotation.y=ang;
      }
      cursor=h.hi;cut++;
    }
    piece(at(cursor),b,0,H,th,wall);
    // Rodapé contínuo
    const base=box(len,.065,th+.012,oak,(a[0]+b[0])/2,.033,(a[1]+b[1])/2,cutaway);base.rotation.y=-Math.atan2(dz,dx);
  }
  const points=new T.Group();points.name='Pontos de automação (propostas)';group.add(points);
  for(const q of geo.pontos){
    const [x,z]=toScene(q.coordenada),y=q.coordenada[2],color=POINT_COLORS[q.dispositivo]??POINT_COLORS.outro;
    const mat=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:q.origem==='planta'?.55:.25,roughness:.4,transparent:q.origem!=='planta',opacity:q.origem==='planta'?1:.6});
    const m=new T.Mesh(new T.SphereGeometry(.11,16,12),mat);m.position.set(x,Math.max(.05,y),z);m.userData={automationPoint:true,dispositivo:q.dispositivo,descricao:q.descricao,origem:q.origem,comodo:q.comodo,id_google_home:q.id_google_home||''};m.name=q.descricao||q.dispositivo;points.add(m);
  }
  return {wallSegments:segments,openingsCut:cut,automationPoints:geo.pontos.length,points};
}

/** Pavimentos salvos no projeto (nome do pavimento de cada cômodo), na ordem lida da planta. */
export function listFloors(project){
  const order=project?.geometry?.projeto?.pavimentos?.map(f=>f.nome)||[];
  const names=[...new Set((project?.rooms||[]).map(r=>r.floorName).filter(Boolean))];
  return names.sort((a,b)=>(order.indexOf(a)+1||99)-(order.indexOf(b)+1||99));
}
/** Recorta o projeto para um pavimento: cômodos, vínculos, móveis e geometria do protocolo. */
export function filterFloor(project,floor){
  if(!floor)return project;
  const rooms=project.rooms.filter(r=>r.floorName===floor),ids=new Set(rooms.map(r=>r.id));
  if(!rooms.length)return project;
  const out={...project,rooms,devices:project.devices.filter(d=>ids.has(d.roomId)),objects:(project.objects||[]).filter(o=>ids.has(o.roomId))};
  const p=project.geometry?.projeto;
  if(p){const on=x=>!x.pavimento||x.pavimento===floor;out.geometry={...project.geometry,projeto:{...p,paredes:p.paredes.filter(on),aberturas:(p.aberturas||[]).filter(on),comodos:p.comodos.filter(on),pontos_automacao:(p.pontos_automacao||[]).filter(on)}};}
  return out;
}

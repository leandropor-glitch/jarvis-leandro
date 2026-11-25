/** Original parametric architectural study. Metres, Y up. No connected devices. */
export function buildArchitecture(T) {
  const group=new T.Group(); group.name='Estudo arquitetônico • estar, jantar e cozinha';
  const ceiling=new T.Group(); ceiling.name='Forro'; const cutaway=new T.Group();cutaway.name='Paredes removíveis';group.add(cutaway);const lights=[];
  const texture=(kind,repeat=1)=>{
    const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
    let seed=781;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    if(kind==='wood'){
      x.fillStyle='#b5a18a';x.fillRect(0,0,512,512);
      for(let i=0;i<1600;i++){let y=rand()*512;x.strokeStyle=`rgba(${rand()>.5?'76,67,55':'229,218,198'},${.02+rand()*.12})`;x.lineWidth=.2+rand()*1.3;x.beginPath();for(let j=0;j<=512;j+=8){const yy=y+Math.sin(j/50+y)*2;x.lineTo(j,yy);}x.stroke();}
      // Continuous wood grain; cabinet/slat geometry supplies construction joints.
    }else if(kind==='fabric'){
      x.fillStyle='#e2dacb';x.fillRect(0,0,512,512);
      for(let i=0;i<44000;i++){const v=120+rand()*130;x.fillStyle=`rgba(${v},${v*.97},${v*.91},.3)`;x.beginPath();x.ellipse(rand()*512,rand()*512,.4+rand()*1.3,.6+rand()*1.7,rand()*3,0,Math.PI*2);x.fill();}
    }else if(kind==='stone'){
      x.fillStyle='#cfc9bc';x.fillRect(0,0,512,512);
      for(let i=0;i<22000;i++){x.fillStyle=`rgba(${rand()>.5?'255,255,250':'100,94,80'},.055)`;x.fillRect(rand()*512,rand()*512,rand()*12,rand()*3);}
      for(let i=0;i<18;i++){x.strokeStyle='rgba(115,109,95,.12)';x.lineWidth=rand()*1.5;x.beginPath();let yy=rand()*512;for(let j=0;j<512;j+=8)x.lineTo(j,yy+Math.sin(j/65+i)*15);x.stroke();}
    }else{
      x.fillStyle='#e8e2d7';x.fillRect(0,0,512,512);for(let i=0;i<26000;i++){x.fillStyle=`rgba(90,75,60,${rand()*.13})`;x.fillRect(rand()*512,rand()*512,1,1);}for(let i=0;i<512;i+=4){x.fillStyle='rgba(250,245,235,.2)';x.fillRect(i,0,1,512);}
    }
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeat,repeat);tex.anisotropy=4;return tex;
  };
  const oak=new T.MeshStandardMaterial({map:texture('wood'),roughness:.56,color:0xf3f0e8});
  const fabric=new T.MeshStandardMaterial({map:texture('fabric',3),roughness:.96,bumpMap:texture('fabric',3),bumpScale:.0035,color:0xf5f1e8});
  const stone=new T.MeshStandardMaterial({map:texture('stone'),roughness:.52,color:0xf1ece2});
  const rugmat=new T.MeshStandardMaterial({map:texture('linen',5),roughness:1,color:0xc5b7a3});
  const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const plaster=mat(0xeae5da,.88),cream=mat(0xd2c9b9,.45),dark=mat(0x242723,.33,.25),brass=mat(0xa99266,.3,.65),green=mat(0x65715b,.8),white=mat(0xf5f1e8,.6);
  const mesh=(geo,m,x=0,y=0,z=0,parent=group)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const box=(w,h,d,m,x,y,z,p=group)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p);
  const round=(w,h,d,r,m,x,y,z,p=group)=>{
    r=Math.min(r,w/3,h/3,d/3);const s=new T.Shape(),a=w/2-r,b=h/2-r;
    s.moveTo(-a,-b-r);s.lineTo(a,-b-r);s.quadraticCurveTo(a+r,-b-r,a+r,-b);s.lineTo(a+r,b);s.quadraticCurveTo(a+r,b+r,a,b+r);s.lineTo(-a,b+r);s.quadraticCurveTo(-a-r,b+r,-a-r,b);s.lineTo(-a-r,-b);s.quadraticCurveTo(-a-r,-b-r,-a,-b-r);
    const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:12,steps:1,bevelSize:r*.65,bevelThickness:r,curveSegments:24});g.translate(0,0,-(d-2*r)/2);g.computeVertexNormals();return mesh(g,m,x,y,z,p);
  };
  const cyl=(rt,rb,h,m,x,y,z,p=group,n=32)=>mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,p);
  const ball=(rx,ry,rz,m,x,y,z,p=group)=>{const o=mesh(new T.SphereGeometry(1,28,20),m,x,y,z,p);o.scale.set(rx,ry,rz);return o;};
  const soft=(rx,ry,rz,m,x,y,z,p=group,power=.65)=>{
    const g=new T.SphereGeometry(1,80,48),a=g.attributes.position;
    const f=v=>Math.sign(v)*Math.pow(Math.abs(v),power);
    for(let i=0;i<a.count;i++){a.setXYZ(i,rx*f(a.getX(i)),ry*f(a.getY(i)),rz*f(a.getZ(i)));}
    g.computeVertexNormals();return mesh(g,m,x,y,z,p);
  };
  const rod=(a,b,r,m,p=group)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),dir=bv.clone().sub(av);const o=cyl(r,r,dir.length(),m,0,0,0,p,12);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;};
  // Slab, large-format limestone floor and precise dark reveals.
  box(9.24,.22,7.24,mat(0xc3bcaf),0,-.15,0);
  for(let ix=0;ix<9;ix++)for(let iz=0;iz<7;iz++)box(.995,.035,.995,stone,ix-4,.0,iz-3);
  box(9.2,2.9,.16,plaster,0,1.45,-3.55);
  box(.16,2.9,7.15,plaster,4.55,1.45,0,cutaway);
  box(.18,.18,7.1,dark,-4.55,.06,0); // window sill
  // Curtain wall: slender bronze frames, true sheer folded fabric geometry.
  const glass=new T.MeshPhysicalMaterial({color:0xe4edf0,transparent:true,opacity:.12,roughness:.08,metalness:.1,depthWrite:false});
  for(let i=0;i<5;i++){
    box(.045,2.85,.045,dark,-4.5,1.43,-3.5+i*1.75);
    if(i<4)box(.012,2.65,1.69,glass,-4.5,1.44,-2.625+i*1.75);
  }
  box(.055,.06,7,dark,-4.5,2.85,0);
  const sheer=new T.MeshStandardMaterial({color:0xf2ede3,transparent:true,opacity:.55,side:T.DoubleSide,roughness:1,depthWrite:false});
  for(const [zc,width] of [[-2.85,1.15],[.1,1.15],[2.95,.95]]){
    const g=new T.PlaneGeometry(width,2.7,48,16),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*Math.PI*18)*.055);
    g.computeVertexNormals();const curtain=mesh(g,sheer,-4.36,1.4,zc);curtain.rotation.y=Math.PI/2;curtain.castShadow=false;
  }
  // Integrated slatted oak television wall and floating cabinetry.
  box(5.7,2.72,.06,oak,-1.5,1.38,-3.43);
  for(let i=0;i<93;i++)box(.036,2.72,.035,oak,-4.28+i*.06,1.38,-3.38);
  box(5.8,.42,.43,cream,-1.43,.43,-3.11);
  box(5.84,.028,.46,stone,-1.43,.657,-3.1);
  for(let i=0;i<8;i++)box(.012,.37,.008,mat(0xa79d8d),-4.27+i*.72,.43,-2.89);
  round(2.22,1.26,.055,.035,dark,-1.7,1.65,-3.27);
  const screen=new T.MeshPhysicalMaterial({color:0x101b20,roughness:.16,metalness:.35,clearcoat:1});
  box(2.16,1.2,.006,screen,-1.7,1.65,-3.235);
  // Rug and low sculptural sofa, layered upholstery with continuous rounded edges.
  round(3.8,.022,2.75,.03,rugmat,-1.5,.037,.3);
  const sofa=new T.Group();sofa.position.set(-1.45,0,.68);group.add(sofa);
  soft(1.49,.24,.7,fabric,0,.32,0,sofa,.65);
  soft(1.45,.135,.67,fabric,0,.52,-.015,sofa,.61);
  for(let i=-1;i<=1;i++){
    const o=soft(.47,.30,.20,fabric,i*.89,.80,.43,sofa,.6);o.rotation.x=-.08;
    // restrained seam follows the seat division
    // Tailored seat and back segments stay softly joined.
  }
  const pillowMat=mat(0xaaa38e,.96);
  const pillow=soft(.235,.235,.1,pillowMat,-1.02,.85,.1,sofa,.63);pillow.rotation.z=.16;pillow.rotation.x=-.15;
  // Nested stone coffee tables.
  cyl(.52,.48,.055,stone,-1.65,.43,-.68);cyl(.27,.3,.35,oak,-1.65,.23,-.68);
  cyl(.35,.34,.05,oak,-.93,.34,-.42);cyl(.045,.045,.29,dark,-.93,.17,-.42);
  // Reading chair: slim walnut shell, upholstered cushions, tapered legs.
  const chair=(x,z,angle=0,material=green,scale=1)=>{
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(scale);group.add(g);
    soft(.29,.06,.275,material,0,.48,0,g,.65);
    // Wraparound bentwood shell; upholstered inner surface follows the same arc.
    const shell=(radius,ybottom,ytop,m)=>{
      const verts=[],idx=[],segments=48;
      for(let j=0;j<=segments;j++){
        const a=-1.28+j/segments*2.56;
        const xx=Math.sin(a)*radius,zz=Math.cos(a)*radius-.035;
        const top=ytop-.06*Math.abs(Math.sin(a));
        verts.push(xx,ybottom,zz,xx,top,zz);
      }
      for(let j=0;j<segments;j++){let n=j*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
      const mm=m.clone();mm.side=T.DoubleSide;return mesh(geo,mm,0,0,0,g);
    };
    shell(.31,.49,.94,oak);shell(.298,.52,.91,material);
    for(const sign of [-1,1]){
      const a=sign*1.28;
      rod([Math.sin(a)*.3,.56,Math.cos(a)*.3-.035],[Math.sin(a)*.3,.84,Math.cos(a)*.3-.035],.012,oak,g);
    }
    for(const xx of [-.22,.22])for(const zz of [-.2,.2])rod([xx,.44,zz],[xx*1.15,.025,zz*1.2],.019,dark,g);
    return g;
  };
  chair(-3.5,-1.4,-.65,mat(0x46423a,.82),1.2);
  cyl(.25,.23,.04,oak,-3.2,.52,-.45);rod([-3.2,.5,-.45],[-3.2,.03,-.45],.025,brass);
  // Dining: green marble oval slab and six leather chairs.
  const marble=mat(0x526158,.28);marble.map=texture('stone');
  const table=round(2.2,.065,.98,.12,marble,1.45,.78,2.25);
  for(const xx of [.83,2.07])round(.16,.7,.58,.03,oak,xx,.39,2.25);
  const leather=mat(0x99836b,.72);
  for(const xx of [.8,1.5,2.2]){chair(xx,1.48,Math.PI,leather,.82);chair(xx,3.02,0,leather,.82);}
  // Bespoke kitchen, right wall. Reveal lines and integrated appliances.
  for(let i=0;i<6;i++){
    const z=-2.9+i*.64;box(.65,.84,.625,cream,4.13,.45,z);box(.014,.73,.008,mat(0x8e8678),3.799,.46,z+.308);
    box(.37,.81,.625,cream,4.28,2.27,z);
  }
  box(.73,.055,3.22,stone,4.1,.9,-.96);box(.012,.67,3.22,stone,4.48,1.27,-.96);
  // Tower with oven and microwave fronts, handles and inset glass.
  box(.7,2.7,.82,cream,4.1,1.35,2.35);
  for(const y of [.8,1.6]){
    box(.025,.55,.67,dark,3.735,y,2.35);box(.028,.37,.55,screen,3.716,y-.025,2.35);
    rod([3.69,y+.19,2.08],[3.69,y+.19,2.62],.012,brass);
  }
  // Island faces dining; stone top, drawers and inset induction.
  box(1.05,.83,2.1,oak,2.65,.45,-.52);box(1.25,.065,2.25,stone,2.6,.9,-.52);
  for(const z of [-1.2,-.52,.16])box(.015,.65,.008,mat(0x6a5140),2.116,.47,z);
  box(.55,.012,.7,dark,2.65,.94,-.8);
  for(const xx of [2.48,2.8])for(const zz of [-1,-.63]){const ring=mesh(new T.TorusGeometry(.105,.002,5,32),mat(0x81837c),xx,.948,zz);ring.rotation.x=Math.PI/2;}
  for(const z of [-1.25,-.4,.45]){
    cyl(.22,.22,.07,green,1.77,.66,z);
    for(const xx of [1.62,1.92])for(const zz of [z-.15,z+.15])rod([xx,.63,zz],[xx+(xx<1.77?-.04:.04),.04,zz],.019,oak);
    round(.065,.25,.42,.025,green,1.58,.81,z);
  }
  // Sink and arched faucet on perimeter counter.
  box(.5,.012,.7,dark,4.08,.934,-2.1);box(.4,.014,.58,mat(0x9eaaa6,.23,.7),4.07,.94,-2.1);
  const arc=new T.CatmullRomCurve3([new T.Vector3(4.35,.94,-2.1),new T.Vector3(4.35,1.3,-2.1),new T.Vector3(4.15,1.37,-2.1),new T.Vector3(4.05,1.18,-2.1)]);
  mesh(new T.TubeGeometry(arc,24,.015,10,false),brass);
  // Kitchen styling at human scale: ceramic place setting, glassware and worktop tools.
  round(.75,.022,.49,.025,oak,2.6,.95,.13);
  const ceramic=mat(0xe6dfd0,.28);
  for(const [xx,zz] of [[2.47,.13],[2.82,.13]]){
    cyl(.14,.12,.018,ceramic,xx,.974,zz);
    const rim=mesh(new T.TorusGeometry(.126,.009,12,48),ceramic,xx,.986,zz);rim.rotation.x=Math.PI/2;
    cyl(.092,.08,.012,white,xx,.994,zz);
  }
  const glassware=new T.MeshPhysicalMaterial({color:0xf1f2ed,transparent:true,opacity:.26,roughness:.04,metalness:.05,depthWrite:false,side:T.DoubleSide});
  for(const [xx,zz] of [[2.4,.47],[2.77,.47]]){
    cyl(.045,.047,.006,glassware,xx,.948,zz);
    cyl(.004,.005,.105,glassware,xx,1.002,zz);
    const shape=[[.005,0],[.035,.012],[.052,.055],[.048,.1],[.036,.135]].map(([r,y])=>new T.Vector2(r,y));
    mesh(new T.LatheGeometry(shape,40),glassware,xx,1.052,zz);
  }
  // A shallow bowl, with three naturally varied pears.
  const bowlPts=[[.02,0],[.09,.005],[.15,.04],[.17,.075],[.16,.08],[.14,.05],[.08,.016],[.02,.015]].map(([r,y])=>new T.Vector2(r,y));
  mesh(new T.LatheGeometry(bowlPts,40),ceramic,4.08,.93,-.42);
  for(let i=0;i<3;i++){
    const xx=4.02+(i%2)*.1,zz=-.46+Math.floor(i/2)*.09;
    ball(.047,.06,.045,mat([0xb5a460,0xa9ad69,0xc0b56d][i],.78),xx,1.008,zz);
    ball(.028,.035,.027,mat(0xb8ad69,.8),xx,1.06,zz);
    rod([xx,1.085,zz],[xx+.006,1.11,zz],.003,oak);
  }
  const board=round(.025,.40,.25,.025,oak,4.43,1.16,-1.23);board.rotation.z=-.06;
  const utensil=mat(0x9a8a74,.82);cyl(.065,.06,.16,utensil,4.2,1.01,-1.27);
  for(let i=0;i<4;i++){
    const xx=4.17+i*.021,zz=-1.29+(i%2)*.03;
    rod([xx,1.04,zz],[xx+(i-1.5)*.013,1.31,zz],.006,oak);
    ball(.018,.032,.006,oak,xx+(i-1.5)*.013,1.33,zz);
  }
  // Built-in stainless refrigerator below the right-wall tower's top joinery.
  // Placed in a spare rear bay so it does not collide with the oven tower.
  const steel=mat(0xadb0aa,.3,.7);
  box(.018,1.8,.61,steel,3.791,1.05,-2.88);
  box(.022,.008,.61,dark,3.776,.62,-2.88);
  rod([3.748,.84,-2.66],[3.748,1.75,-2.66],.012,steel);
  rod([3.748,.22,-2.66],[3.748,.51,-2.66],.012,steel);
  // Artwork: deliberately original abstract canvas, framed in fine oak.
  const art=document.createElement('canvas');art.width=512;art.height=256;const ax=art.getContext('2d');ax.fillStyle='#e7dfca';ax.fillRect(0,0,512,256);
  const colors=['#917347','#c6aa70','#4d625d','#cab9a0','#eee6d4'];
  for(let i=0;i<70;i++){ax.fillStyle=colors[i%5];ax.globalAlpha=.55;ax.beginPath();ax.ellipse((i*79)%512,(i*41)%256,10+(i%5)*7,20+(i%7)*9,i*.3,0,Math.PI*2);ax.fill();}
  const at=new T.CanvasTexture(art);at.colorSpace=T.SRGBColorSpace;
  box(1.95,1.07,.04,oak,2.8,1.9,-3.42);box(1.87,.99,.008,new T.MeshStandardMaterial({map:at,roughness:.9}),2.8,1.9,-3.393);
  // Greenery: grouped individual curved leaves, stems and ceramic vessels.
  const pot=(x,z,s=1)=>{
    const g=new T.Group();g.position.set(x,.025,z);g.scale.setScalar(s);group.add(g);
    cyl(.24,.18,.42,mat(0xb9aa91,.9),0,.21,0,g);cyl(.22,.22,.018,mat(0x40392d),0,.425,0,g);
    for(let i=0;i<20;i++){
      const a=i*2.3999,rad=.12+(i%4)*.055,h=.6+(i%7)*.12,tx=Math.cos(a)*rad,tz=Math.sin(a)*rad;
      rod([0,.42,0],[tx,h,tz],.006,green,g);
      const leaf=ball(.055,.2,.012,mat(i%2?0x526947:0x73805b,.85),tx,h,tz,g);leaf.rotation.set(Math.sin(a)*.7,a,Math.cos(a)*.7);
    }
  };
  pot(-4,-2.85,1.1);pot(-3.95,2.85,.9);
  const vase=(x,y,z,s=.2)=>{
    const pts=[[.05,0],[.14,.03],[.17,.22],[.1,.35],[.07,.38]].map(([a,b])=>new T.Vector2(a*s/.2,b*s/.2));
    mesh(new T.LatheGeometry(pts,32),mat(0x6f7765,.35),x,y,z);
  };
  vase(-3.7,.68,-3.03,.13);vase(-3.45,.68,-3.03,.08);vase(1.45,.82,2.25,.09);
  for(let i=0;i<4;i++){const b=box(.3,.027,.22,mat([0xa68f70,0xcac2ae,0x4e6159,0xddd7c8][i]),-1.6,.48+i*.028,-.65);b.rotation.y=.2+i*.08;}
  // Pendants, undercabinet strip, warm local lighting (toggleable by caller).
  const emit=new T.MeshStandardMaterial({color:0xffe0a3,emissive:0xffd99b,emissiveIntensity:2,roughness:.4});
  for(const [x,z] of [[.9,2.25],[1.45,2.25],[2,2.25],[2.6,-.9],[2.6,.1]]){
    rod([x,2.9,z],[x,2.12,z],.007,dark);
    cyl(.045,.055,.2,brass,x,2.02,z);ball(.05,.045,.05,emit,x,1.9,z);
    const l=new T.PointLight(0xffdfb0,5,2.5,2);l.position.set(x,1.88,z);group.add(l);lights.push(l);
  }
  box(.025,.018,3.8,emit,4.07,1.85,-1.3);
  const under=new T.PointLight(0xffd6a2,6,3,2);under.position.set(4,1.5,-1.3);group.add(under);lights.push(under);
  box(9.1,.12,7.1,plaster,0,2.99,0,ceiling);
  // Cassette AC and recessed downlights belong to actual ceiling, not floating icons.
  box(.8,.06,.8,white,-1.5,2.89,.1,ceiling);box(.58,.016,.58,mat(0x999b93),-1.5,2.849,.1,ceiling);
  for(let i=0;i<16;i++)box(.55,.008,.008,dark,-1.5,2.838,-.17+i*.034,ceiling);
  for(const x of [-3,-.2,2.5])for(const z of [-2,1.2]){box(.15,.018,.15,white,x,2.92,z,ceiling);box(.09,.01,.09,emit,x,2.904,z,ceiling);}
  group.add(ceiling);ceiling.visible=false;
  let meshes=0,triangles=0;group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  return {group,lights,ceiling,cutaway,stats:{meshes,triangles,area:63,units:'metres',connectedDevices:0},materials:{emit}};
}

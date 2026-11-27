/* Stage display adapter for the historical casa contract. No commands are sent here. */
(function(root){
  'use strict';
  function nome(item){const n=typeof item==='string'?item:item&&typeof item==='object'?(item.nome??item.name):null;return typeof n==='string'&&n.trim()?n:null;}
  function normalizar(data){
    const input=data&&typeof data==='object'?data:{};
    const aparelhos=(Array.isArray(input.aparelhos)?input.aparelhos:[]).map(item=>{const n=nome(item);return n?{...(typeof item==='object'?item:{}),nome:n}:null;}).filter(Boolean);
    const cenas=(Array.isArray(input.cenas)?input.cenas:[]).map(nome).filter(Boolean);
    return {...input,aparelhos,cenas};
  }
  function montarTiles(data,previous=[],isCO=()=>false){
    const house=normalizar(data),valid=(Array.isArray(previous)?previous:[]).filter(t=>t&&typeof t.n==='string'&&t.n.trim());
    const byCommand=new Map(valid.map(t=>[t.f,t])),byName=new Map(valid.map(t=>[t.n,t]));
    const make=(n,f,f2)=>{const old=byCommand.get(f)||byName.get(n)||{};return {...old,n,f,f2,s:old.s||'',fav:old.fav===true};};
    const devices=house.aparelhos.map(d=>make(d.nome,'ligar '+d.nome,'desligar '+d.nome));
    const scenes=house.cenas.filter(n=>!isCO(n)).map(n=>make(n,'ativar a cena '+n,''));
    return devices.concat(scenes);
  }
  const api={nome,normalizar,montarTiles};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.VinciCasaDisplay=api;
})(typeof window==='object'?window:null);

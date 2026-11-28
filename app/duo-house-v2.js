/* Duo house presentation/preferences. Never sends a home command. */
(function(root){
'use strict';
const LEGACY=['felyx.matrix.v2','felyx.matrix.on.v2','felyx.salas.v1','felyx.room.active','leda.casaGen','vinci.casaGoogle','felyx.casa'];
const OWNER='felyx.house.owner.v2', PREFIX='felyx.house.preferences.v2:';
const empty=()=>({version:2,edits:{},removed:{}});
const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
function category(t){
 if(t&&t.ctl || /^(?:abrir\s+(?:o\s+)?controle)\b/i.test(t&&t.f||''))return 'Controles';
 if(/\b(?:ativar|acionar)\s+(?:a\s+)?cena\b/i.test(t&&t.f||''))return 'Cenas';
 const kind=norm(t&&(t.houseKind||t.kind||t.type));
 if(['scene','cena','routine'].includes(kind))return 'Cenas';
 if(['control','controle','remote'].includes(kind))return 'Controles';
 return 'Dispositivos';
}
function key(t){
 const command=norm(t&&t.f).replace(/^(ativar|acionar)\s+(a\s+)?cena\s+/, 'cena ');
 return category(t)+':'+(command||norm(t&&t.ctl)||norm(t&&t.n));
}
function hash(v){let h=2166136261;for(const c of String(v||''))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16);}
function parse(s,fallback){try{return JSON.parse(s)||fallback;}catch(e){return fallback;}}
function account(session,storage){
 const profile=parse(storage.getItem('felyx.sessao'),{});
 const phone=profile.token===session?String(profile.telefone||'').replace(/\D/g,''):'';
 return phone?'phone-'+phone:session?'session-'+hash(session):'signed-out';
}
function syncOwner(session,storage){
 const next=account(session,storage),previous=storage.getItem(OWNER);
 const legacy=storage.getItem('felyx.matrix.owner.v1')||'';
 const legacyPhone=legacy.split('|').pop();
 const sameLegacy=legacy===String(session||'')+'|'+legacyPhone && next==='session-'+hash(session) || next==='phone-'+legacyPhone;
 if(previous&&previous!==next){
  const snapshot={};LEGACY.forEach(k=>snapshot[k]=storage.getItem(k));
  storage.setItem(PREFIX+previous+':snapshot',JSON.stringify(snapshot));
  const restored=parse(storage.getItem(PREFIX+next+':snapshot'),{});
  LEGACY.forEach(k=>restored[k]===null||restored[k]===undefined?storage.removeItem(k):storage.setItem(k,restored[k]));
 }else if(!previous&&legacy&&!sameLegacy){
  // Unknown former account must not leak into a different login. Preserve a backup.
  const snapshot={};LEGACY.forEach(k=>snapshot[k]=storage.getItem(k));
  storage.setItem(PREFIX+'legacy-'+hash(legacy)+':snapshot',JSON.stringify(snapshot));
  LEGACY.forEach(k=>storage.removeItem(k));
 }
 storage.setItem(OWNER,next);return previous!==next;
}
function loadTiles(raw){const list=parse(raw,[]);return Array.isArray(list)?list.filter(t=>t&&typeof t==='object').map(t=>({...t,n:String(t.n||''),f:String(t.f||''),f2:String(t.f2||''),s:String(t.s||''),fav:!!t.fav,rc:String(t.rc||'')})):[];}
function archived(tile){return {...tile,houseRemoved:true,s:'Sem ambiente',fav:false};}
function mergeImport(incoming,previous,prefs){
 prefs=prefs||empty();const old=new Map((previous||[]).filter(t=>t.n).map(t=>[key(t),t]));
 const seen=new Set(),result=[];
 (incoming||[]).forEach(t=>{if(!t||!t.n)return;const k=key(t);if(seen.has(k))return;seen.add(k);
  const prior=old.get(k),edit=(prefs.edits||{})[k];
  let value={...t,...(prior||{}),...(edit||{}),f:t.f,f2:t.f2,houseKind:t.houseKind||category(t)};
  if((prefs.removed||{})[k])value=archived({...value,...prefs.removed[k]});
  result.push(value);
 });
 (previous||[]).forEach(t=>{const k=key(t);if(t.n&&!seen.has(k)&&(t.ctl||category(t)==='Controles'||t.houseRemoved)){seen.add(k);result.push((prefs.removed||{})[k]?archived(prefs.removed[k]):{...t});}});
 Object.entries(prefs.removed||{}).forEach(([k,t])=>{if(!seen.has(k)){seen.add(k);result.push(archived(t));}});
 return result;
}
let storage,scope,prefs=empty(),bound,filter='Tudo',queued=false;
function init(s){storage=s||root.localStorage;scope=storage.getItem(OWNER)||'signed-out';prefs=parse(storage.getItem(PREFIX+scope),empty());prefs.edits=prefs.edits||{};prefs.removed=prefs.removed||{};}
function ensure(){if(!storage||scope!==storage.getItem(OWNER))init();}
function persist(){storage.setItem(PREFIX+scope,JSON.stringify(prefs));}
function prepareSave(list){
 ensure();
 const present=new Set();
 const result=(list||[]).map(t=>{if(!t.n)return t;const k=key(t);present.add(k);
  if(prefs.removed[k])return archived({...t,...prefs.removed[k]});
  const copy={...t};delete copy.houseRemoved;prefs.edits[k]=copy;return copy;
 });
 Object.entries(prefs.removed).forEach(([k,t])=>{if(!present.has(k))result.push(archived(t));});persist();return result;
}
function importTiles(incoming,previous){ensure();return mergeImport(incoming,previous,prefs);}
function acceptImport(incoming){
 if(!bound)return false;bound.setTiles(importTiles(incoming,bound.getTiles()));bound.save();bound.render();return true;
}
function remove(index){
 const list=bound.getTiles(),t=list[index];if(!t||!t.n)return;
 prefs.removed[key(t)]={...t,houseRemoved:false};persist();list[index]=archived(t);
 bound.setTiles(list);bound.save();bound.render();if(bound.closeEditor)bound.closeEditor();
}
function restore(index){
 const list=bound.getTiles(),t=list[index];if(!t)return;const k=key(t),original=prefs.removed[k];if(!original)return;
 delete prefs.removed[k];list[index]={...original,houseRemoved:false};persist();bound.setTiles(list);bound.save();bound.render();
}
function afterRender(){
 if(!bound)return;const list=bound.getTiles(),rooms=bound.getTab()==='rooms',active=bound.getRoom();
 const grid=root.document.getElementById('grid');if(!grid)return;
 grid.querySelectorAll('.tile[data-i]').forEach(el=>{
  const t=list[Number(el.dataset.i)];if(!t)return;
  const cat=category(t),removed=!!t.houseRemoved;
  el.dataset.cat=cat;el.dataset.houseRemoved=String(removed);
  const excluded=el.hidden||(rooms?filter!=='Tudo'&&filter!==cat:!t.fav)||removed&&(!rooms||active!=='Sem ambiente');
  el.dataset.houseFiltered=String(excluded);
  el.style.setProperty('display',excluded?'none':'flex','important');
  if(removed){el.title='Removido da sua seleção. Toque para restaurar.';el.setAttribute('aria-label',t.n+' — removido, restaurar');
   if(!el.querySelector('.house-restore')){const hint=root.document.createElement('small');hint.className='house-restore';hint.textContent='restaurar';el.appendChild(hint);}
  }
 });
 let bar=root.document.getElementById('catBar');
 if(!bar){bar=root.document.createElement('nav');bar.id='catBar';bar.className='catbar';bar.setAttribute('aria-label','Categorias');const rb=root.document.getElementById('roomBar');if(rb)rb.insertAdjacentElement('afterend',bar);}
 bar.hidden=!rooms;
 const html=['Tudo','Cenas','Dispositivos','Controles'].map(c=>'<button type="button" data-cat="'+c+'" aria-pressed="'+(filter===c)+'">'+c+'</button>').join('');
 if(bar.innerHTML!==html)bar.innerHTML=html;
}
function schedule(){if(queued)return;queued=true;root.requestAnimationFrame(()=>{queued=false;afterRender();});}
function bind(options){
 if(bound)return;bound=options;init();
 bound.setTiles(prepareSave(bound.getTiles()));
 // Keep the original source adapter, enrich its output and preserve user choices.
 const adapter=root.VinciCasaDisplay;
 if(adapter&&!adapter.houseV2){const original=adapter.montarTiles;
  adapter.montarTiles=function(data,previous,isCO){return importTiles(original(data,previous,isCO),previous);};adapter.houseV2=true;
 }
 root.document.addEventListener('click',e=>{
  const cat=e.target.closest('#catBar [data-cat]');if(cat){e.preventDefault();e.stopImmediatePropagation();filter=cat.dataset.cat;schedule();return;}
  const clear=e.target.closest('#edClear');if(clear){e.preventDefault();e.stopImmediatePropagation();remove(bound.getEditing());return;}
  const tile=e.target.closest('#grid .tile[data-i]');if(tile&&bound.getTiles()[Number(tile.dataset.i)]?.houseRemoved){e.preventDefault();e.stopImmediatePropagation();restore(Number(tile.dataset.i));}
 },true);
 const grid=root.document.getElementById('grid');if(grid)new root.MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
 const hud=root.document.getElementById('hud');if(hud)new root.MutationObserver(schedule).observe(hud,{attributes:true,attributeFilter:['data-tab']});
 bound.render();afterRender();
}
const api={category,key,account,syncOwner,loadTiles,mergeImport,prepareSave,importTiles,acceptImport,bind,afterRender,remove,restore};
if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.VinciHouseV2=api;
})(typeof window==='object'?window:null);

/* Voice tools for the user's house view. Local preferences only; no device/network commands. */
(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const text=v=>String(v||'').trim().slice(0,22);
const kinds={cena:'Cenas',cenas:'Cenas',dispositivo:'Dispositivos',dispositivos:'Dispositivos',aparelho:'Dispositivos',aparelhos:'Dispositivos',controle:'Controles',controles:'Controles',tudo:'Tudo',todos:'Tudo'};
function create(env){
 const category=t=>env.house.category(t);
 const state=()=>({ambientes:env.getRooms(),pavimentos:env.getSalas().pavimentos||[],itens:env.getTiles().filter(t=>t.n).map(t=>({nome:t.n,tipo:category(t),ambiente:t.s||env.roomFor(t),removido:!!t.houseRemoved}))});
 const fail=erro=>({ok:false,erro});
 const save=()=>{env.saveSalas();env.saveTiles();env.render();};
 const reveal=name=>{env.showRooms(name);env.filter('Tudo');};
 const room=n=>env.getRooms().find(r=>norm(r)===norm(n));
 function ensureRoom(name){const actual=room(name)||text(name);const s=env.getSalas();s.extras=s.extras||[];s.ocultas=(s.ocultas||[]).filter(n=>norm(n)!==norm(actual));if(!room(actual)&&!s.extras.includes(actual))s.extras.push(actual);return actual;}
 function find(args){
  const q=norm(args.nome),wanted=kinds[norm(args.tipo)];
  const matches=env.getTiles().map((t,i)=>({t,i})).filter(({t})=>t.n&&(!wanted||wanted==='Tudo'||category(t)===wanted)&&[t.n,String(t.f||'').replace(/^(?:ativar|acionar)\s+(?:a\s+)?cena\s+/i,'').replace(/^(?:ligar|desligar)\s+/i,'')].some(n=>norm(n)===q));
  if(!q)return {error:'Diga o nome exato do item.'};
  if(!matches.length)return {error:'Item não encontrado na sua seleção. Consulte listar antes de alterar.'};
  if(matches.length>1)return {error:'Há mais de um item com esse nome. Informe tipo: cena, dispositivo ou controle.',opcoes:matches.map(({t})=>({nome:t.n,tipo:category(t)}))};
  return matches[0];
 }
 async function execute(args={}){
  const op=norm(args.operacao);
  if(op==='listar')return {ok:true,...state()};
  if(op==='filtrar'){
   const cat=kinds[norm(args.tipo||args.categoria)];if(!cat)return fail('Use Tudo, Cenas, Dispositivos ou Controles.');
   env.showRooms();if(!env.filter(cat))return fail('A barra de filtros ainda não está disponível.');
   return {ok:true,mensagem:'Mostrando '+cat.toLowerCase()+' em Ambientes.',categoria:cat};
  }
  if(op==='criar_ambiente'){
   const n=text(args.ambiente||args.nome);if(!n)return fail('Diga o nome do ambiente.');
   const actual=ensureRoom(n);if(args.pavimento){const s=env.getSalas(),p=text(args.pavimento);s.pavimentos=s.pavimentos||[];s.pavDe=s.pavDe||{};const canonical=s.pavimentos.find(x=>norm(x)===norm(p))||p;if(!s.pavimentos.includes(canonical))s.pavimentos.push(canonical);s.pavDe[actual]=canonical;}
   save();reveal(actual);return {ok:true,mensagem:'Ambiente '+actual+' criado na sua organização.'};
  }
  if(op==='criar_pavimento'){
   const n=text(args.pavimento||args.nome);if(!n)return fail('Diga o nome do pavimento.');
   const destination=args.ambiente?room(args.ambiente):null;if(args.ambiente&&!destination)return fail('Ambiente não encontrado. Crie o ambiente primeiro.');
   const s=env.getSalas();s.pavimentos=s.pavimentos||[];s.pavDe=s.pavDe||{};const actual=s.pavimentos.find(p=>norm(p)===norm(n))||n;if(!s.pavimentos.includes(actual))s.pavimentos.push(actual);if(destination)s.pavDe[destination]=actual;
   save();reveal(destination);return {ok:true,mensagem:'Pavimento '+actual+' criado.',...(destination?{ambiente:destination}:{})};
  }
  if(['mover','remover','restaurar'].includes(op)){
   const found=find(args);if(found.error)return {ok:false,erro:found.error,...(found.opcoes?{opcoes:found.opcoes}:{})};
   const {t,i}=found;
   if(op==='remover'){if(!t.houseRemoved)env.house.remove(i);reveal('Sem ambiente');return {ok:true,mensagem:t.n+' removido apenas da sua seleção. Pode restaurar em Sem ambiente.'};}
   if(op==='restaurar'){if(!t.houseRemoved)return fail('Esse item já está na sua seleção.');env.house.restore(i);reveal();return {ok:true,mensagem:t.n+' restaurado na sua seleção.'};}
   if(t.houseRemoved)return fail('Esse item foi removido. Peça para restaurá-lo antes de mover.');
   if(!text(args.ambiente))return fail('Diga o ambiente de destino.');
   const destination=ensureRoom(args.ambiente);t.s=destination;save();reveal(destination);return {ok:true,mensagem:t.n+' movido para '+destination+'.'};
  }
  return fail('Operação inválida. Use listar, criar_ambiente, criar_pavimento, mover, remover, restaurar ou filtrar.');
 }
 return {execute,state};
}
const declaration={name:'organizar_casa',description:'Organiza somente a visualização pessoal da casa, sem acionar dispositivos nem apagar cenas da central. Use para criar ambiente ou pavimento, mover cena/dispositivo/controle, remover um item da seleção do usuário (recuperável em Sem ambiente), restaurar ou mostrar só cenas/dispositivos/controles. Para apagar uma cena da tela use remover, nunca automacoes/apagar. Use listar para identificar nomes e tipo; nomes ambíguos exigem tipo. Alterações são persistentes neste aparelho e conta. Depois confirme brevemente a alteração.',behavior:'BLOCKING',parameters:{type:'OBJECT',properties:{operacao:{type:'STRING',enum:['listar','criar_ambiente','criar_pavimento','mover','remover','restaurar','filtrar']},nome:{type:'STRING'},tipo:{type:'STRING',enum:['Tudo','Cenas','Dispositivos','Controles']},ambiente:{type:'STRING'},pavimento:{type:'STRING'}},required:['operacao']}};
function install(env,tools,schemas){const api=create(env);tools.organizar_casa=api.execute;const list=schemas[0].functionDeclarations;if(!list.some(d=>d.name===declaration.name))list.push(declaration);return api;}
const api={create,install,declaration};if(root)root.VinciHouseVoice=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null);

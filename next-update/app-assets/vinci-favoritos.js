/* VINCI — Favoritos, "+" e controle remoto próprio (22/11/2026, ordem do Leandro).
   Mesma lógica do Felyx para a Leda e o Léo, sem mexer em layout nem cor de cada uma: usa as variáveis de cor da página.
   - O bloco do Dashboard chama-se Favoritos; em Ambientes, Ambientes.
   - No modo editar aparece um cartão pontilhado "+": Cenas, Dispositivos ou Controle remoto.
   - Controle remoto é um item próprio: tocar só abre o controle, não aciona cena. Os botões são atrelados depois.
   - "Atualizar dispositivos e cenas" só roda quando a pessoa pede.
   - Pavimentos em Ambientes (se a página ainda não tiver os seus). */
(function(){'use strict';
if(window.vinciFavoritos) return; window.vinciFavoritos = true;
const $ = (id)=> document.getElementById(id);
const hud = $('hud'), grid = $('grid'), matrix = $('matrix');
if(!hud || !grid || !matrix || typeof tiles === 'undefined' || typeof renderMatrix !== 'function') return;
const E = (s)=> String(s == null ? '' : s).replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N = (s)=> String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const co = ()=> window.coRemote || window.felyxCO || null;
const naSala = ()=> hud.dataset.tab === 'rooms';
const editando = ()=> { try{ return !!editMode; }catch(e){ return matrix.dataset.edit === '1'; } };
const salaAtual = ()=> { try{ return (roomActive && roomActive !== 'Favoritos') ? roomActive : ''; }catch(e){ return ''; } };
const isCO = (n)=> { try{ return !!(window.VinciCO && VinciCO.isCO(n)); }catch(e){ return false; } };

/* ---------- estilo (herda as cores da página) ---------- */
const st = document.createElement('style');
st.textContent = `
#matrix .k b{font:inherit;color:inherit}
#hud[data-tab="rooms"] #matrix .lbDash,#hud:not([data-tab="rooms"]) #matrix .lbSala{display:none}
#hud[data-tab="dashboard"] .matrix[data-edit="1"] .tile{touch-action:pan-y}
.tile.addTile{border-style:dashed!important;border-color:rgba(var(--accent-rgb),.55)!important;color:var(--accent);font-size:1.6rem;font-weight:300;background:transparent}
.matrix[data-edit="1"] .tile.addTile::after{content:none}
.tile.ctl{border-style:dashed;border-color:rgba(var(--accent-rgb),.75);background:linear-gradient(180deg,rgba(var(--accent-rgb),.10),transparent)}
.tile.ctl .ctlTag{position:absolute;left:6px;top:4px;font-family:var(--mono,monospace);font-size:.42rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);opacity:.85}
#addSheet{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.62);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center}
#addSheet[hidden]{display:none}
#addSheet .box{width:100%;max-width:520px;max-height:86dvh;display:flex;flex-direction:column;gap:12px;background:var(--panel,#121417);border:1px solid rgba(var(--accent-rgb),.45);border-radius:26px 26px 0 0;padding:18px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;color:var(--text,#f3f3ef)}
#addSheet h3{margin:0;font-size:1.1rem;font-weight:600}
#addSheet p.q{margin:-6px 0 0;opacity:.65;font-size:.85rem}
#addSheet .tabs{display:flex;gap:6px}
#addSheet .tabs button{flex:1;padding:10px 6px;border-radius:999px;border:1px solid #ffffff2a;background:transparent;color:inherit;font:inherit;font-size:.82rem}
#addSheet .tabs button[aria-selected="true"]{background:var(--accent);color:var(--accent-ink,#111);border-color:var(--accent);font-weight:600}
#addSheet input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:14px;border:1px solid #ffffff26;background:#ffffff0d;color:inherit;font:inherit}
#addSheet .lista{overflow:auto;display:flex;flex-direction:column;gap:6px;min-height:120px;-webkit-overflow-scrolling:touch}
#addSheet .lista button[data-k]{display:flex;align-items:center;gap:10px;text-align:left;padding:12px 14px;border-radius:14px;border:1px solid #ffffff14;background:#ffffff08;color:inherit;font:inherit;font-size:.95rem}
#addSheet .lista .tag{margin-left:auto;font-family:var(--mono,monospace);font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
#addSheet .lista button.ja{opacity:.45}
#addSheet .rod{display:flex;gap:8px;justify-content:space-between;align-items:center}
#addSheet .rod button{padding:11px 16px;border-radius:999px;border:1px solid #ffffff33;background:transparent;color:inherit;font:inherit;font-size:.85rem}
#addSheet .novoCtl{display:flex;gap:8px}#addSheet .novoCtl input{flex:1}
#addSheet .novoCtl button{padding:0 16px;border-radius:14px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink,#111);font:inherit;font-weight:600;white-space:nowrap}
#addSheet .vazio{opacity:.6;font-size:.85rem;padding:8px 2px}
.vfPav{display:flex;gap:6px;overflow-x:auto;margin:0 10px 6px}.vfPav[hidden]{display:none}
.vfPav button{padding:6px 12px;border-radius:999px;border:1px solid #ffffff22;background:transparent;color:var(--muted,#999);font-family:var(--mono,monospace);font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap}
.vfPav button[aria-selected="true"]{border-color:var(--accent);color:var(--accent)}
.vfPav button.addPav{border-style:dashed}`;
document.head.appendChild(st);

/* ---------- título do bloco ---------- */
(function(){ const k = matrix.querySelector('.ph .k'); if(!k || k.querySelector('.lbDash')) return;
  const i = k.querySelector('i'); k.textContent = ''; if(i) k.appendChild(i);
  k.insertAdjacentHTML('beforeend', '<b class="lbDash">favoritos</b><b class="lbSala">ambientes</b>'); })();

/* ---------- controles: os da casa + os criados aqui ---------- */
const PROPRIOS = 'vinci.controles.proprios';
const proprios = ()=> { try{ return JSON.parse(localStorage.getItem(PROPRIOS) || '[]'); }catch(e){ return []; } };
function controles(){
  const base = ((co() && co().getControls && co().getControls()) || []).slice();
  proprios().forEach((p)=>{ if(!base.some((c)=> N(c.aparelho) === N(p.aparelho) && N(c.ambiente) === N(p.ambiente))) base.push({ aparelho:p.aparelho, ambiente:p.ambiente, botoes:[] }); });
  return base;
}
function abrirControle(chave){
  const c = co(); if(!c) return false;
  const [ap, amb] = String(chave).split(' · ');
  const lista = controles(); try{ c.setControls(lista); }catch(e){}
  const alvo = lista.find((x)=> N(x.aparelho) === N(ap) && N(x.ambiente) === N(amb));
  if(alvo) c.open(alvo); else c.showList();
  return true;
}
async function criarControle(nome){
  nome = String(nome || '').trim().slice(0, 30); if(!nome) return null;
  if(typeof window.felyxCOCriar === 'function'){ const r = await window.felyxCOCriar(nome).catch(()=>null); if(r) return r; }
  let salasConhecidas = []; try{ salasConhecidas = (typeof listaSalas === 'function' ? listaSalas() : []).filter((s)=> s && s !== 'Favoritos'); }catch(e){}
  const amb = salasConhecidas.slice().sort((a,b)=> b.length - a.length).find((r)=> N(nome).endsWith(' ' + N(r)) || N(nome) === N(r));
  const c = { aparelho: amb && N(nome) !== N(amb) ? nome.slice(0, nome.length - amb.length).trim() : nome, ambiente: amb || salaAtual() || 'Casa' };
  const l = proprios().filter((p)=> !(N(p.aparelho) === N(c.aparelho) && N(p.ambiente) === N(c.ambiente))); l.push(c);
  try{ localStorage.setItem(PROPRIOS, JSON.stringify(l)); }catch(e){}
  return c;
}

/* ---------- "+" ---------- */
document.body.insertAdjacentHTML('beforeend', '<div id="addSheet" hidden role="dialog" aria-modal="true" aria-label="Adicionar"><div class="box"><h3 id="addTitulo">Adicionar aos favoritos</h3><p class="q">O que você quer adicionar?</p><div class="tabs" role="tablist"><button type="button" data-k="cena" aria-selected="true">Cenas</button><button type="button" data-k="aparelho" aria-selected="false">Dispositivos</button><button type="button" data-k="controle" aria-selected="false">Controle remoto</button></div><input type="search" id="addBusca" placeholder="Buscar" aria-label="Buscar"><div class="lista" id="addLista" role="listbox"></div><div class="rod"><button type="button" id="addAtualizar">Atualizar dispositivos e cenas</button><button type="button" id="addFechar">Fechar</button></div></div></div>');
let addTipo = 'cena';
function itens(tipo){
  let g = { cenas:[], aparelhos:[] }; try{ g = casaGen || g; }catch(e){}
  if(tipo === 'cena') return (g.cenas || []).filter((n)=> !isCO(n)).map((n)=>({ nome:n, f:'ativar a cena ' + n }));
  if(tipo === 'aparelho') return (g.aparelhos || []).map((n)=>({ nome:n, f:'ligar ' + n, f2:'desligar ' + n }));
  return controles().map((c)=>({ nome: c.aparelho + ' · ' + c.ambiente, ctl: c.aparelho + ' · ' + c.ambiente }));
}
function desenharSheet(){
  $('addTitulo').textContent = naSala() ? ('Adicionar em ' + (salaAtual() || 'Ambientes')) : 'Adicionar aos favoritos';
  document.querySelectorAll('#addSheet .tabs button').forEach((b)=> b.setAttribute('aria-selected', b.dataset.k === addTipo ? 'true' : 'false'));
  $('addBusca').hidden = addTipo === 'controle';
  const q = N($('addBusca').value), lista = $('addLista');
  const l = itens(addTipo).filter((x)=> N(x.nome).includes(q)).sort((a,b)=> a.nome.localeCompare(b.nome));
  const ja = new Set(tiles.filter((t)=> t && t.n).map((t)=> t.ctl || t.f));
  const linhas = l.map((x,k)=> `<button type="button" data-k="${k}" class="${ja.has(x.ctl || x.f) ? 'ja' : ''}"><span>${E(x.nome)}</span><span class="tag">${addTipo === 'cena' ? 'cena' : (addTipo === 'aparelho' ? 'dispositivo' : 'controle')}</span></button>`).join('');
  if(addTipo === 'controle'){
    lista.innerHTML = '<div class="novoCtl"><input id="addNomeCtl" maxlength="30" placeholder="Nome do controle" aria-label="Nome do controle"><button type="button" id="addCriarCtl">Criar controle</button></div><div class="vazio">O controle não aciona cena nenhuma. Depois de criar, toque em cada botão dele e escolha a cena.</div>' + linhas;
    $('addCriarCtl').onclick = async ()=>{ const nome = $('addNomeCtl').value.trim(); if(!nome) return; const b = $('addCriarCtl'); b.disabled = true; b.textContent = 'Criando…';
      const c = await criarControle(nome); if(!c){ b.disabled = false; b.textContent = 'Não consegui criar'; return; }
      const k = c.aparelho + ' · ' + c.ambiente; adicionar({ nome: nome, ctl: k }); setTimeout(()=> abrirControle(k), 250); };
  } else {
    lista.innerHTML = linhas || '<div class="vazio">Nada encontrado. Toque em Atualizar dispositivos e cenas.</div>';
  }
  lista.querySelectorAll('button[data-k]').forEach((b)=> b.onclick = ()=> adicionar(l[Number(b.dataset.k)]));
}
function adicionar(x){
  const sala = naSala() ? salaAtual() : '';
  const novo = { n: x.nome.slice(0, 22), f: x.f || ('abrir o controle ' + x.nome), f2: x.f2 || '', s: sala, rc: x.ctl ? 'nao' : '', fav: !naSala() };
  if(x.ctl) novo.ctl = x.ctl;
  const i = tiles.findIndex((t)=> !t || !t.n); if(i < 0) tiles.push(novo); else tiles[i] = novo;
  try{ saveTiles(); }catch(e){} renderMatrix(); $('addSheet').hidden = true;
}
document.querySelectorAll('#addSheet .tabs button').forEach((b)=> b.addEventListener('click', ()=>{ addTipo = b.dataset.k; desenharSheet(); }));
$('addBusca').addEventListener('input', desenharSheet);
$('addFechar').addEventListener('click', ()=>{ $('addSheet').hidden = true; });
$('addSheet').addEventListener('click', (e)=>{ if(e.target.id === 'addSheet') $('addSheet').hidden = true; });
$('addAtualizar').addEventListener('click', async (e)=>{ const b = e.currentTarget; b.textContent = 'Atualizando…'; b.disabled = true; let ok = true;
  try{ if(typeof window.vinciAtualizar === 'function') await window.vinciAtualizar(); else if(typeof atualizarCenas === 'function') await atualizarCenas(); else if(co() && co().reload) await co().reload(true); }catch(err){ ok = false; }
  b.disabled = false; b.textContent = ok ? 'Atualizado' : 'Não consegui ler a central'; desenharSheet(); setTimeout(()=>{ b.textContent = 'Atualizar dispositivos e cenas'; }, 3000); });

/* ---------- pavimentos (só onde a página ainda não tem os seus) ---------- */
const temPavProprio = !!(document.querySelector('.pavbar') || $('pavEditor'));
let pavAtivo = '';
function pavimentos(){
  if(temPavProprio || typeof salas === 'undefined') return;
  let bar = $('vfPav'); if(!bar){ const rb = $('roomBar'); if(!rb) return; bar = document.createElement('nav'); bar.id = 'vfPav'; bar.className = 'vfPav'; bar.setAttribute('aria-label', 'Pavimentos'); rb.parentNode.insertBefore(bar, rb); }
  const pavs = salas.pavimentos || (salas.pavimentos = []); salas.pavDe = salas.pavDe || {};
  bar.hidden = !naSala() || (!pavs.length && !editando()); if(bar.hidden) return;
  if(pavAtivo && !pavs.includes(pavAtivo)) pavAtivo = '';
  const bts = [['', 'Todos'], ...pavs.map((p)=> [p, p])].map(([v, t])=>{ const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-selected', v === pavAtivo ? 'true' : 'false');
    b.onclick = ()=>{ if(editando() && v && v === pavAtivo){ editarPav(v); return; } pavAtivo = v; renderMatrix(); }; return b; });
  if(editando()){ const a = document.createElement('button'); a.type = 'button'; a.className = 'addPav'; a.textContent = '+ pavimento'; a.onclick = ()=> editarPav(''); bts.push(a);
    const s = salaAtual(); if(s && pavs.length){ const m = document.createElement('button'); m.type = 'button'; m.className = 'addPav'; m.textContent = s + ': ' + (salas.pavDe[s] || 'sem pavimento'); m.onclick = ()=>{ const ops = ['', ...pavs]; const i = ops.indexOf(salas.pavDe[s] || ''); const prox = ops[(i + 1) % ops.length]; if(prox) salas.pavDe[s] = prox; else delete salas.pavDe[s]; try{ saveSalas(); }catch(e){} renderMatrix(); }; bts.push(m); } }
  bar.replaceChildren(...bts);
  if(pavAtivo){ grid.querySelectorAll('.tile[data-room]').forEach((b)=>{ if(salas.pavDe[b.dataset.room] !== pavAtivo) b.hidden = true; });
    const rb = $('roomBar'); if(rb) rb.querySelectorAll('button[role="tab"]').forEach((b)=>{ const s = b.textContent; if(s !== 'Favoritos' && salas.pavDe[s] !== pavAtivo) b.hidden = true; }); }
}
function editarPav(nome){
  const novo = (prompt(nome ? 'Nome do pavimento (apague tudo para excluir):' : 'Nome do novo pavimento (ex.: Térreo, 1º andar):', nome) || '').trim().slice(0, 22);
  if(nome && !novo){ salas.pavimentos = salas.pavimentos.filter((p)=> p !== nome); Object.keys(salas.pavDe).forEach((k)=>{ if(salas.pavDe[k] === nome) delete salas.pavDe[k]; }); pavAtivo = ''; }
  else if(nome && novo && novo !== nome){ salas.pavimentos = salas.pavimentos.map((p)=> p === nome ? novo : p); Object.keys(salas.pavDe).forEach((k)=>{ if(salas.pavDe[k] === nome) salas.pavDe[k] = novo; }); pavAtivo = novo; }
  else if(!nome && novo && !salas.pavimentos.includes(novo)){ salas.pavimentos.push(novo); pavAtivo = novo; }
  try{ saveSalas(); }catch(e){} renderMatrix();
}

/* ---------- depois de cada desenho da grade ---------- */
function depois(){
  try{
    grid.querySelectorAll('.tile[data-i]').forEach((b)=>{ const t = tiles[Number(b.dataset.i)]; if(t && t.ctl && !b.classList.contains('ctl')){ b.classList.add('ctl'); b.insertAdjacentHTML('afterbegin', '<span class="ctlTag">controle</span>'); } });
    if(editando() && !grid.querySelector('.addTile')) grid.insertAdjacentHTML('beforeend', '<button class="tile addTile" type="button" data-add="1" aria-label="Adicionar">+</button>');
    pavimentos();
  }catch(e){}
}
const desenhar = renderMatrix;
renderMatrix = function(){ const r = desenhar.apply(this, arguments); depois(); return r; };
const eb = $('editBtn'); if(eb) eb.addEventListener('click', ()=> setTimeout(()=>{ try{ renderMatrix(); }catch(e){ depois(); } }, 0));
grid.addEventListener('click', (e)=>{
  const b = e.target.closest('.tile'); if(!b) return;
  if(b.dataset.add === '1'){ e.stopImmediatePropagation(); e.preventDefault(); addTipo = 'cena'; $('addBusca').value = ''; $('addSheet').hidden = false; desenharSheet(); return; }
  const t = tiles[Number(b.dataset.i)];
  if(t && t.ctl && !editando()){ e.stopImmediatePropagation(); e.preventDefault(); abrirControle(t.ctl); }
}, true);
grid.addEventListener('pointerdown', (e)=>{ const b = e.target.closest('.tile'); if(b && b.dataset.add === '1') e.stopImmediatePropagation(); }, true);
depois();
})();

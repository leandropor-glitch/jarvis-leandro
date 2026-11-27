const form = document.getElementById('central-login');
const controls = document.getElementById('paola-house-status');
const status = document.getElementById('central-status');
const sessionKey = 'paola.session.v1';
let token = sessionStorage.getItem(sessionKey) || '';

function showPanel() {
  form.hidden = true;
  controls.hidden = false;
  document.body.classList.remove('signed-out');
}

document.getElementById('paola-recovery').addEventListener('click', () => {
  window.paolaRecuperar({
    telefone: form.elements.telefone.value,
    aparelho: 'Paola Web',
    aoEntrar: () => {
      status.textContent = 'Senha VINCI salva. Entre com o telefone e a senha que você acabou de definir.';
      form.elements.senha.focus();
    },
  });
});

async function request(data) {
  const response = await fetch('https://ia.uservinci.com/api/felix/app', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok || result.ok === false || result.erro) {
    const error = new Error(result.mensagem || 'A central não confirmou a solicitação.');
    error.expired = result.erro === 'sessao' || response.status === 401;
    throw error;
  }
  return result;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);
  const submit = form.querySelector('button');
  submit.disabled = true;
  try {
    const digits = String(data.get('telefone')).replace(/\D/g, '');
    const telefone = /^(55)?0{10,11}$/.test(digits) ? '0000000000' : (digits.length === 11 || digits.length === 10 ? '55' + digits : digits);
    const result = await request({acao: 'entrar', telefone,
      senha: data.get('senha'), aparelho: 'Paola Web'});
    if (!result.token) throw new Error('A central não devolveu uma sessão.');
    token = result.token;
    sessionStorage.setItem(sessionKey, token);
    showPanel();
    location.hash = 'paola';
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    form.elements.senha.value = '';
    submit.disabled = false;
  }
});

const importButton = document.getElementById('paola-house-import');
const houseStatus = document.getElementById('paola-house-result');
const houseList = document.getElementById('paola-house-list');
importButton.addEventListener('click', async () => {
  importButton.disabled = true;
  houseStatus.textContent = 'Consultando a central VINCI…';
  houseList.replaceChildren();
  try {
    const result = await request({acao: 'casa', token});
    let count = 0;
    for (const [title, entries] of [['Dispositivos', result.aparelhos], ['Cenas', result.cenas]]) {
      const names = (Array.isArray(entries) ? entries : [])
        .map(entry => typeof entry === 'string' ? entry : entry?.nome || entry?.name)
        .filter(name => typeof name === 'string' && name.trim());
      if (!names.length) continue;
      count += names.length;
      const heading = document.createElement('h3');
      heading.textContent = title;
      const list = document.createElement('ul');
      for (const name of names) {
        const item = document.createElement('li');
        item.textContent = name;
        list.append(item);
      }
      houseList.append(heading, list);
    }
    houseStatus.textContent = count ? 'Casa encontrada na central VINCI.' : 'A central não retornou cenas ou dispositivos para esta conta.';
  } catch (error) {
    houseStatus.textContent = error.message;
    if (error.expired) {
      sessionStorage.removeItem(sessionKey);
      token = '';
      form.hidden = false;
      controls.hidden = true;
      document.body.classList.add('signed-out');
      status.textContent = 'Sua sessão expirou. Entre novamente.';
    }
  } finally {
    importButton.disabled = false;
  }
});

if (token) showPanel();

// Google Home desktop: OAuth próprio da Paola, sem catálogo de demonstração.
const googleButton=document.createElement('button');
googleButton.style.margin='8px';
googleButton.type='button'; googleButton.textContent='Conectar Google Home';
const googleResult=document.createElement('p'); googleResult.setAttribute('role','status');
importButton.before(googleButton,googleResult);
async function googleRequest(action){
 const response=await fetch('https://felyx-local.uservinci.com/webhook/paola-google/'+action,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
 const data=await response.json();if(!response.ok)throw new Error((data.detalhe==='At least one Home Premium Advanced subscription is required.'?'O Google exige uma assinatura Home Premium Advanced para liberar o acesso à sua casa por esta integração. Sua autorização foi preservada.':data.detalhe)||({sessao_expirada:'Entre na Paola antes de conectar sua casa.',google_oauth_nao_configurado:'A conexão Google está sendo configurada.',google_nao_conectado:'Conecte sua conta Google para buscar sua casa.'}[data.erro])||'O Google não confirmou acesso à casa.');return data;
}
googleButton.addEventListener('click',()=>{
 // Navegação principal permite o cookie OAuth seguro também no Safari.
 const redirectForm=document.createElement('form');redirectForm.method='POST';
 redirectForm.action='https://felyx-local.uservinci.com/webhook/paola-google/iniciar';
 const input=document.createElement('input');input.type='hidden';input.name='token';input.value=token;
 redirectForm.append(input);document.body.append(redirectForm);redirectForm.submit();
});
const googleHouses=document.createElement('button'); googleHouses.type='button';googleHouses.textContent='Ver casas conectadas no Google';googleButton.after(googleHouses);
googleHouses.addEventListener('click',async()=>{googleHouses.disabled=true;googleResult.textContent='Consultando suas casas no Google…';try{const data=await googleRequest('casas');googleResult.textContent=data.structures.map(h=>h.displayName||h.structureId).join(', ')||'O Google não retornou casas.';}catch(e){googleResult.textContent=e.message;}finally{googleHouses.disabled=false;}});

"use strict";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const configuredApi = params.get("api") || localStorage.getItem("janete-api") || "http://127.0.0.1:3471";
let API = configuredApi.replace(/\/$/, "");
const state = { token:sessionStorage.getItem("janete-session") || "", messages:[], filter:"janete", poll:null, busy:false, live:false, listening:false, speaking:false, recognition:null, known:new Set() };

function apiError(status) { if(status===401)return "Senha da Janete incorreta."; if(status===503)return "Ponte local offline. Confirme se o bot está ligado."; return `Ponte local indisponível (HTTP ${status}).`; }
async function api(path, options={}) {
  const headers = {Accept:"application/json",...(options.headers||{})};
  if(options.body) headers["Content-Type"] = "application/json";
  if(state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(API+path,{...options,headers,cache:"no-store"});
  if(!response.ok){const e=new Error(apiError(response.status));e.status=response.status;throw e;}
  return response.status===204?{}:response.json();
}
function setConnection(ok,detail="") { $("connection").className="connection "+(ok?"ok":"bad"); $("connection").innerHTML=`<i></i> ${ok?"Bot local conectado":"Bot local offline"}`; $("connection").title=detail; }
function notice(message) { $("notice").textContent=message||""; $("notice").hidden=!message; }
function setDictation(message,active=false) { $("dictation-status").textContent=message; $("dictation-status").classList.toggle("active",active); }
function formatTime(value) { const d=new Date(value); return Number.isNaN(d.getTime())?"":d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
function visible(m) { return state.filter==="all" || m.speaker==="assistant" || m.speaker==="janete"; }
function renderMessages() {
  const list=$("messages"),nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<140,shown=state.messages.filter(visible);
  list.replaceChildren();
  if(!shown.length){const e=document.createElement("div");e.className="empty";e.textContent="Abra uma conversa no Skynet Chat para começar o espelho.";list.append(e);return;}
  for(const m of shown){const row=document.createElement("article"),isJanete=m.speaker==="assistant"||m.speaker==="janete";row.className="message "+(isJanete?"janete":"leandro");const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=isJanete?"J":"L";const bubble=document.createElement("div"),meta=document.createElement("div"),who=document.createElement("b"),body=document.createElement("div");bubble.className="bubble";meta.className="meta";who.textContent=isJanete?"Janete":"Leandro";meta.append(who,document.createTextNode(formatTime(m.ts)));body.className="body";body.textContent=String(m.text||"");bubble.append(meta,body);row.append(avatar,bubble);list.append(row);}
  if(nearBottom)list.scrollTop=list.scrollHeight;
}
function updateLiveState(){const stage=document.querySelector(".stage");stage.classList.toggle("listening",state.listening);stage.classList.toggle("speaking",state.speaking);$("live-toggle").classList.toggle("active",state.live);$("live-toggle").textContent=state.live?"■ Encerrar live":"▶ Iniciar live";$("live-state").textContent=state.speaking?"Janete falando":state.listening?"Ouvindo você":state.live?"Live ligada · aguardando":"Live desligada";}
function stopListening(){if(state.recognition){const r=state.recognition;state.recognition=null;try{r.stop();}catch(_){}}state.listening=false;$("mic").classList.remove("active");updateLiveState();}
function speak(text){if(!state.live||!("speechSynthesis" in window)||!text)return;stopListening();speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="pt-BR";const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>v.lang.toLowerCase()==="pt-br")||null;u.onstart=()=>{state.speaking=true;updateLiveState();setDictation("Janete está respondendo ao vivo.",true);};const done=()=>{state.speaking=false;updateLiveState();if(state.live){setDictation("Pode falar. Estou ouvindo.",true);startListening(true);}};u.onend=done;u.onerror=done;speechSynthesis.speak(u);}
async function refresh(initial=false){if(!state.token||state.busy)return;try{const data=await api("/api/messages");if(!Array.isArray(data.messages))throw new Error("Resposta inválida da ponte.");const newReplies=[];for(const m of data.messages){const key=m.id||`${m.ts}|${m.speaker}|${m.text}`;if(state.live&&!state.known.has(key)&&(m.speaker==="assistant"||m.speaker==="janete"))newReplies.push(m);state.known.add(key);}state.messages=data.messages;renderMessages();unlockScreen();setConnection(true);notice("");$("last-sync").textContent="Atualizado às "+formatTime(new Date());if(!initial&&newReplies.length)speak(String(newReplies.at(-1).text||""));}catch(e){if(e.status===401){logout(true);return;}if(initial){state.token="";sessionStorage.removeItem("janete-session");lockScreen("Não foi possível conectar.");return;}setConnection(false,e.message);notice(e.message);}}
function lockScreen(message=""){$("site-app").hidden=true;$("gate").hidden=false;$("password").value="";$("login-error").textContent=message;$("logout").hidden=true;}
function unlockScreen(){$("gate").hidden=true;$("site-app").hidden=false;$("logout").hidden=false;}
async function login(password){$("password").disabled=true;$("login-error").textContent="";try{const data=await api("/api/login",{method:"POST",body:JSON.stringify({password})});if(!data.token)throw new Error("Não foi possível entrar.");state.token=data.token;sessionStorage.setItem("janete-session",state.token);$("password").value="";unlockScreen();setConnection(true);await refresh(true);clearInterval(state.poll);state.poll=setInterval(()=>refresh(false),2000);}catch(e){state.token="";sessionStorage.removeItem("janete-session");lockScreen(e.message||"Não foi possível entrar.");setConnection(false,e.message);}finally{$("password").disabled=false;}}
function logout(bad=false){state.live=false;stopListening();if("speechSynthesis" in window)speechSynthesis.cancel();clearInterval(state.poll);state.token="";state.messages=[];state.known.clear();sessionStorage.removeItem("janete-session");lockScreen(bad?"Senha ou conexão inválida.":"");setConnection(false);renderMessages();updateLiveState();}
async function sendMessage(text){const value=text.trim();if(!value||state.busy)return false;if(!state.token){notice("Entre para enviar mensagens.");return false;}state.busy=true;$("send").disabled=true;setDictation("Enviando ao Skynet pelo bot local…",true);try{await api("/api/send",{method:"POST",body:JSON.stringify({text:value})});$("draft").value="";setDictation("Enviado ao Skynet. Aguardando resposta…",true);return true;}catch(e){notice(e.message);setDictation("Não enviado. O texto continua na caixa.");return false;}finally{state.busy=false;$("send").disabled=false;if(state.live&&!state.speaking&&!state.listening)startListening(true);}}
function startListening(autoSend){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){notice("Este navegador não oferece transcrição de voz. Use o Chrome ou escreva na caixa.");return false;}if(state.recognition||state.speaking||state.busy)return true;const r=new Recognition();state.recognition=r;r.lang="pt-BR";r.continuous=false;r.interimResults=true;r.onstart=()=>{state.listening=true;$("mic").classList.add("active");updateLiveState();setDictation("Ouvindo você…",true);};r.onresult=(event)=>{let transcript="",final=false;for(let i=event.resultIndex;i<event.results.length;i++){transcript+=event.results[i][0].transcript;if(event.results[i].isFinal)final=true;}$("draft").value=transcript.trim();if(final&&autoSend&&state.live&&transcript.trim()){stopListening();sendMessage(transcript);}else if(final)setDictation("Transcrição pronta. Confira e envie.");};r.onerror=(event)=>{if(event.error==="not-allowed"||event.error==="service-not-allowed"){state.live=false;notice("Permita o microfone no navegador para usar a live.");}else if(event.error!=="no-speech"&&event.error!=="aborted")notice("Microfone: "+event.error);};r.onend=()=>{if(state.recognition===r)state.recognition=null;state.listening=false;$("mic").classList.remove("active");updateLiveState();if(state.live&&!state.speaking&&!state.busy)setTimeout(()=>startListening(true),400);};try{r.start();return true;}catch(_){state.recognition=null;notice("Não foi possível iniciar o microfone.");return false;}}

$("login-form").addEventListener("submit",e=>{e.preventDefault();login($("password").value);});
$("logout").addEventListener("click",()=>logout(false));
$("send-form").addEventListener("submit",e=>{e.preventDefault();sendMessage($("draft").value);});
$("draft").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage($("draft").value);}});
$("mic").addEventListener("click",()=>state.listening?stopListening():startListening(false));
$("live-toggle").addEventListener("click",()=>{if(!state.token){notice("Entre para iniciar a live.");return;}if(state.live){state.live=false;stopListening();speechSynthesis.cancel();state.speaking=false;setDictation("Live encerrada. Você pode continuar por texto.");}else{state.live=true;state.known=new Set(state.messages.map(m=>m.id||`${m.ts}|${m.speaker}|${m.text}`));if(!startListening(true))state.live=false;}updateLiveState();});
$("filter-janete").addEventListener("click",()=>{state.filter="janete";$("filter-janete").classList.add("active");$("filter-all").classList.remove("active");renderMessages();});
$("filter-all").addEventListener("click",()=>{state.filter="all";$("filter-all").classList.add("active");$("filter-janete").classList.remove("active");renderMessages();});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.token)refresh(false);});
renderMessages();updateLiveState();
if(state.token){refresh(true);state.poll=setInterval(()=>refresh(false),2000);}else{lockScreen();setConnection(false,"Acesso protegido.");}

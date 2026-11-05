"use strict";

// O Conselho já usa este webhook. A senha é fornecida pelo usuário no navegador.
const API = "https://vinciautomacao.app.n8n.cloud/webhook/felix/site-ler";
const $ = (id) => document.getElementById(id);
const names = {janete:"Janete",leandro:"Leandro",claude:"Claude",gpt:"GPT",gemini:"Gemini",felix:"Félix"};
const state = {
  password:"",
  messages:[],
  filter:"janete",
  poll:null,
  busy:false,
  live:false,
  listening:false,
  speaking:false,
  recognition:null,
  known:new Set(),
  connection:false
};

function setConnection(ok, detail) {
  state.connection = ok;
  $("connection").className = "connection " + (ok ? "ok" : "bad");
  $("connection").innerHTML = "<i></i> " + (ok ? "Conselho conectado" : "Conselho sem conexão");
  $("connection").title = detail || "";
}
function notice(message) {
  $("notice").textContent = message || "";
  $("notice").hidden = !message;
}
function setDictation(message, active) {
  $("dictation-status").textContent = message;
  $("dictation-status").classList.toggle("active", !!active);
}
function errorLabel(error) {
  if (error.message === "senha") return "Senha do Conselho incorreta.";
  if (error.message.startsWith("http-")) return "Conselho indisponível (HTTP " + error.message.slice(5) + ").";
  if (error.name === "AbortError") return "O Conselho demorou para responder.";
  return "Sem conexão com o Conselho. Tente novamente.";
}
async function requestBoard(quadro, texto) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(API, {
      method:"POST",
      headers:{"content-type":"text/plain"},
      body:JSON.stringify({senha:state.password,quadro,texto}),
      signal:controller.signal,
      cache:"no-store"
    });
    if (response.status === 401) throw new Error("senha");
    if (!response.ok) throw new Error("http-" + response.status);
    if (quadro === "enviar") return {ok:true};
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
function messageKey(message) {
  return String(message.id || message.em || "") + "|" + String(message.de || "") + "|" + String(message.texto || "");
}
function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"});
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",timeZone:"America/Sao_Paulo"});
}
function visible(message) {
  if (state.filter === "all") return true;
  const to = Array.isArray(message.para) ? message.para : [];
  return message.de === "janete" || to.includes("janete") || (message.de === "leandro" && to.length === 0);
}
function renderMessages() {
  const list = $("messages");
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 140;
  const shown = state.messages.filter(visible);
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Ainda não há mensagens neste canal.";
    list.append(empty);
    return;
  }
  let lastDate = "";
  for (const message of shown) {
    const date = formatDate(message.em);
    if (date && date !== lastDate) {
      const line = document.createElement("div");
      line.className = "date-line";
      line.textContent = date;
      list.append(line);
      lastDate = date;
    }
    const row = document.createElement("article");
    row.className = "message " + (message.de === "janete" ? "janete" : message.de === "leandro" ? "leandro" : "");
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = (names[message.de] || message.de || "?").charAt(0).toUpperCase();
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const meta = document.createElement("div");
    meta.className = "meta";
    const who = document.createElement("b");
    who.textContent = names[message.de] || message.de || "Alguém";
    meta.append(who,document.createTextNode(formatTime(message.em)));
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = String(message.texto || "");
    bubble.append(meta,body);
    row.append(avatar,bubble);
    list.append(row);
  }
  if (nearBottom) list.scrollTop = list.scrollHeight;
}
function updateLiveState() {
  const stage = document.querySelector(".stage");
  stage.classList.toggle("listening",state.listening);
  stage.classList.toggle("speaking",state.speaking);
  $("live-toggle").classList.toggle("active",state.live);
  $("live-toggle").textContent = state.live ? "■ Encerrar live" : "▶ Iniciar live";
  $("live-state").textContent = state.speaking ? "Janete falando" : state.listening ? "Ouvindo você" : state.live ? "Live ligada · aguardando" : "Live desligada";
}
function stopListening() {
  if (state.recognition) {
    const recognition = state.recognition;
    state.recognition = null;
    try { recognition.stop(); } catch (_) {}
  }
  state.listening = false;
  $("mic").classList.remove("active");
  updateLiveState();
}
function speak(text) {
  if (!state.live || !("speechSynthesis" in window) || !text) return;
  stopListening();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((v) => v.lang.toLowerCase() === "pt-br" && /female|mulher|maria|luciana|heloisa/i.test(v.name)) || voices.find((v) => v.lang.toLowerCase() === "pt-br") || null;
  utterance.onstart = () => { state.speaking = true; updateLiveState(); setDictation("Janete está respondendo ao vivo.",true); };
  const done = () => { state.speaking = false; updateLiveState(); if (state.live) { setDictation("Pode falar. Estou ouvindo.",true); startListening(true); } };
  utterance.onend = done;
  utterance.onerror = done;
  window.speechSynthesis.speak(utterance);
}
async function refresh(initial) {
  if (!state.password || state.busy) return;
  try {
    const data = await requestBoard("conselho");
    if (!data || !Array.isArray(data.mensagens)) throw new Error("formato");
    const incoming = data.mensagens;
    const newlySpoken = [];
    for (const message of incoming) {
      const key = messageKey(message);
      if (state.live && !state.known.has(key) && message.de === "janete") newlySpoken.push(message);
      state.known.add(key);
    }
    state.messages = incoming;
    renderMessages();
    setConnection(true);
    notice("");
    $("last-sync").textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    if (!initial && newlySpoken.length) speak(String(newlySpoken[newlySpoken.length - 1].texto || ""));
  } catch (error) {
    if (error.message === "senha") { logout(true); return; }
    setConnection(false,errorLabel(error));
    notice(errorLabel(error));
  }
}
async function login(password) {
  state.password = password.trim();
  $("login").disabled = true;
  $("login-error").textContent = "";
  try {
    const data = await requestBoard("conselho");
    if (!data || !Array.isArray(data.mensagens)) throw new Error("formato");
    state.messages = data.mensagens;
    state.known = new Set(state.messages.map(messageKey));
    sessionStorage.setItem("janete-session",state.password);
    sessionStorage.removeItem("janete-logout");
    $("gate").hidden = true;
    $("app").hidden = false;
    $("logout").hidden = false;
    $("password").value = "";
    setConnection(true);
    renderMessages();
    $("last-sync").textContent = "Atualizado agora";
    clearInterval(state.poll);
    state.poll = setInterval(() => refresh(false),5000);
  } catch (error) {
    state.password = "";
    $("login-error").textContent = errorLabel(error);
    setConnection(false,errorLabel(error));
  } finally {
    $("login").disabled = false;
  }
}
function logout(badPassword) {
  state.live = false;
  stopListening();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  clearInterval(state.poll);
  state.password = "";
  state.messages = [];
  state.known.clear();
  sessionStorage.removeItem("janete-session");
  sessionStorage.setItem("janete-logout","1");
  $("app").hidden = true;
  $("gate").hidden = false;
  $("logout").hidden = true;
  $("login-error").textContent = badPassword ? "A senha do Conselho deixou de funcionar. Entre novamente." : "";
  setConnection(false);
  updateLiveState();
}
async function sendMessage(text) {
  const value = text.trim();
  if (!value || state.busy) return false;
  state.busy = true;
  $("send").disabled = true;
  setDictation("Enviando ao Conselho…",true);
  let sent = false;
  try {
    await requestBoard("enviar",value);
    sent = true;
    $("draft").value = "";
    setDictation("Enviado. Aguardando a resposta da Janete…",true);
  } catch (error) {
    if (error.message === "senha") logout(true);
    else { notice(errorLabel(error)); setConnection(false,errorLabel(error)); }
    setDictation("Não foi possível enviar. O texto continua na caixa.",false);
  } finally {
    state.busy = false;
    $("send").disabled = false;
    if (sent) await refresh(false);
    if (state.live && !state.speaking && !state.listening) startListening(true);
  }
  return sent;
}
function startListening(autoSend) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { notice("Este navegador não oferece transcrição pelo microfone. Use o Chrome para a live ou escreva na caixa."); return false; }
  if (state.recognition || state.speaking || state.busy) return true;
  const recognition = new Recognition();
  state.recognition = recognition;
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => { state.listening = true; $("mic").classList.add("active"); updateLiveState(); setDictation("Ouvindo você…",true); };
  recognition.onresult = (event) => {
    let transcript = "";
    let final = false;
    for (let i=event.resultIndex;i<event.results.length;i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) final = true;
    }
    $("draft").value = transcript.trim();
    if (final && autoSend && state.live && transcript.trim()) {
      stopListening();
      sendMessage(transcript);
    } else if (final) setDictation("Transcrição pronta. Confira e envie.",false);
  };
  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      state.live = false;
      notice("Permita o microfone no Chrome para usar a live.");
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      notice("Microfone: " + event.error + ". Tente novamente.");
    }
  };
  recognition.onend = () => {
    if (state.recognition === recognition) state.recognition = null;
    state.listening = false;
    $("mic").classList.remove("active");
    updateLiveState();
    if (state.live && !state.speaking && !state.busy) setTimeout(() => startListening(true),400);
  };
  try { recognition.start(); return true; }
  catch (_) { state.recognition = null; notice("Não foi possível iniciar o microfone."); return false; }
}

$("login-form").addEventListener("submit",(event) => {
  event.preventDefault();
  login($("password").value);
});
$("logout").addEventListener("click",() => logout(false));
$("send-form").addEventListener("submit",(event) => {
  event.preventDefault();
  sendMessage($("draft").value);
});
$("draft").addEventListener("keydown",(event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage($("draft").value); }
});
$("mic").addEventListener("click",() => {
  if (state.listening) stopListening();
  else startListening(false);
});
$("live-toggle").addEventListener("click",() => {
  if (state.live) {
    state.live = false;
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    state.speaking = false;
    setDictation("Live encerrada. Você pode continuar por texto.",false);
  } else {
    state.live = true;
    state.known = new Set(state.messages.map(messageKey));
    if (!startListening(true)) state.live = false;
  }
  updateLiveState();
});
$("filter-janete").addEventListener("click",() => {
  state.filter = "janete";
  $("filter-janete").classList.add("active");
  $("filter-all").classList.remove("active");
  renderMessages();
});
$("filter-all").addEventListener("click",() => {
  state.filter = "all";
  $("filter-all").classList.add("active");
  $("filter-janete").classList.remove("active");
  renderMessages();
});
document.addEventListener("visibilitychange",() => {
  if (document.visibilityState === "visible" && state.password) refresh(false);
});
const saved = sessionStorage.getItem("janete-logout") ? "" : sessionStorage.getItem("janete-session") || localStorage.getItem("conselho-senha") || "";
if (saved) login(saved);
updateLiveState();

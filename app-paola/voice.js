(() => {
 'use strict';
 const button=document.querySelector('.voice-button'),status=document.getElementById('voice-status');
 const endpoint='https://felyx-local.uservinci.com/webhook/paola-voice/token';
 let current=null;
 function label(text){status.textContent=text;}
 function activeTab(){return !location.hash||location.hash==='#paola';}
 function stop(message='Toque no microfone para conversar com a Paola.'){
  const s=current;current=null;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Falar com a Paola');button.dataset.state='idle';
  if(s){s.closed=true;clearTimeout(s.timer);s.abort.abort();s.stream?.getTracks().forEach(t=>t.stop());s.worklet?.disconnect();s.source?.disconnect();s.sources.forEach(source=>{try{source.stop();}catch{}});s.socket?.close();s.audio?.close().catch(()=>{});}
  label(message);
 }
 function play(s,data,mime){
  const raw=atob(data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const count=Math.floor(bytes.length/2),view=new DataView(bytes.buffer),rate=Number(/rate=(\d+)/.exec(mime||'')?.[1])||24000;
  const buffer=s.audio.createBuffer(1,count,rate),channel=buffer.getChannelData(0);for(let i=0;i<count;i++)channel[i]=view.getInt16(i*2,true)/32768;
  const source=s.audio.createBufferSource();source.buffer=buffer;source.connect(s.audio.destination);s.sources.add(source);source.onended=()=>s.sources.delete(source);
  s.playhead=Math.max(s.audio.currentTime,s.playhead);source.start(s.playhead);s.playhead+=buffer.duration;
  button.dataset.audioChunks=String(Number(button.dataset.audioChunks||0)+1);label('Paola está falando…');
 }
 async function start(){
  const token=sessionStorage.getItem('paola.session.v1');if(!token){label('Entre na Paola para conversar.');return;}
  const s={closed:false,abort:new AbortController(),sources:new Set(),ready:false,playhead:0};current=s;button.dataset.state='connecting';button.dataset.setupComplete='false';button.dataset.audioChunks='0';button.dataset.sentAudio='0';button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Encerrar conversa com a Paola');label('Conectando a Paola…');
  try{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC||!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');
   s.audio=new AC();await s.audio.resume();
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(s.closed){stream.getTracks().forEach(t=>t.stop());return;}s.stream=stream;
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:s.abort.signal});
   if(!response.ok)throw new Error(response.status===401?'session':response.status===429?'limit':'service');
   const config=await response.json();if(s.closed)return;
   await s.audio.audioWorklet.addModule(new URL('voice-worklet.js',document.currentScript?.src||location.href).href);
   if(s.closed)return;
   s.worklet=new AudioWorkletNode(s.audio,'paola-capture');s.source=s.audio.createMediaStreamSource(stream);s.source.connect(s.worklet);
   const silent=s.audio.createGain();silent.gain.value=0;s.worklet.connect(silent);silent.connect(s.audio.destination);
   s.worklet.port.onmessage=({data})=>{if(s.closed||!s.ready||s.socket.readyState!==1)return;const n=data.length,pcm=new Int16Array(n);for(let i=0;i<n;i++){const v=Math.max(-1,Math.min(1,data[i]));pcm[i]=v<0?v*32768:v*32767;}const bytes=new Uint8Array(pcm.buffer);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);s.socket.send(JSON.stringify({realtimeInput:{audio:{data:btoa(binary),mimeType:'audio/pcm;rate=16000'}}}));button.dataset.sentAudio=String(Number(button.dataset.sentAudio||0)+1);};
   s.socket=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(config.token));
   s.timer=setTimeout(()=>{if(current===s&&!s.ready)stop('A voz demorou para conectar. Toque para tentar novamente.');},20000);
   s.socket.onopen=()=>{if(!s.closed)s.socket.send(JSON.stringify({setup:config.setup}));};
   s.socket.onmessage=async event=>{if(s.closed)return;try{const msg=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());if(s.closed)return;
    if(msg.setupComplete){s.ready=true;clearTimeout(s.timer);button.dataset.setupComplete='true';button.dataset.state='listening';label('Pode falar. Estou ouvindo.');s.socket.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'Apresente-se como Paola em uma frase curtinha e pergunte como pode ajudar.'}]}],turnComplete:true}}));}
    if(msg.error){stop('A voz ficou indisponível. Toque para tentar novamente.');return;}
    const content=msg.serverContent;if(content?.interrupted){s.sources.forEach(source=>{try{source.stop();}catch{}});s.sources.clear();s.playhead=s.audio.currentTime;}
    for(const part of content?.modelTurn?.parts||[])if(part.inlineData?.data)play(s,part.inlineData.data,part.inlineData.mimeType);
    if(content?.turnComplete)label('Pode falar. Estou ouvindo.');
   }catch{if(current===s)stop('Não consegui entender a resposta de voz. Tente novamente.');}};
   s.socket.onerror=()=>{if(current===s)stop('Não foi possível conectar a voz. Tente novamente.');};
   s.socket.onclose=()=>{if(current===s)stop('Conversa encerrada. Toque para falar novamente.');};
  }catch(error){if(current!==s)return;stop(error.name==='NotAllowedError'?'Permita o microfone no navegador para falar com a Paola.':error.message==='session'?'Sua sessão expirou. Entre novamente na Paola.':error.message==='limit'?'Aguarde um minuto antes de conectar novamente.':error.message==='unsupported'?'Este navegador não oferece o áudio necessário. Abra a Paola no Safari atualizado.':'A voz está indisponível agora. Toque para tentar novamente.');}
 }
 button.disabled=false;button.setAttribute('aria-pressed','false');label('Toque no microfone para conversar com a Paola.');
 button.addEventListener('click',()=>current?stop():start());
 window.addEventListener('hashchange',()=>{if(!activeTab())stop();});window.addEventListener('pagehide',()=>stop());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 new MutationObserver(()=>{if(document.body.classList.contains('signed-out'))stop();}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();

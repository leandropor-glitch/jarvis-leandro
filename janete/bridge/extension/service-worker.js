importScripts("config.js");

const API=globalThis.JANETE_LOCAL?.api||"http://127.0.0.1:3471";
const TOKEN=globalThis.JANETE_LOCAL?.extensionToken||"";
const headers={"Content-Type":"application/json","X-Janete-Extension":TOKEN};
let busy=false;

async function post(path,body){const r=await fetch(API+path,{method:"POST",headers,body:JSON.stringify(body)});if(!r.ok)throw new Error(`bridge_${r.status}`);return r.json();}
async function syncMessages(messages){if(!TOKEN||!messages?.length)return;try{await post("/api/extension/ingest",{messages});}catch(e){console.warn("Janete local bridge indisponível",e.message);}}
async function drainOutbox(){if(busy||!TOKEN)return;busy=true;try{const r=await fetch(API+"/api/extension/next",{headers:{"X-Janete-Extension":TOKEN},cache:"no-store"});if(!r.ok)return;const {item}=await r.json();if(!item)return;const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true,url:["https://skynetchat.net/*","https://www.skynetchat.net/*"]});let sent=false,error="Deixe ativa a guia autenticada da conversa no Skynet.";for(const tab of tabs){try{const result=await chrome.tabs.sendMessage(tab.id,{type:"JANETE_SEND",text:item.text});if(result?.ok){sent=true;error="";break;}error=result?.error||error;}catch(_){}}
    await post("/api/extension/ack",{id:item.id,ok:sent,error});
  }catch(e){console.warn("Janete outbox",e.message);}finally{busy=false;}}

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==="JANETE_INGEST"){if(sender.tab?.active)syncMessages(message.messages).then(()=>sendResponse({ok:true}));else sendResponse({ok:false,reason:"inactive_skynet_tab"});return true;}
});
chrome.alarms.create("janete-sync",{periodInMinutes:0.5});
chrome.alarms.onAlarm.addListener(()=>drainOutbox());
setInterval(drainOutbox,1200);

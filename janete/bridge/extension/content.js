(() => {
  "use strict";
  let observer=null,timer=0,lastSignature="";
  const textOf=(el)=>String(el?.innerText||el?.textContent||"").trim().replace(/\n{3,}/g,"\n\n");
  async function digest(value){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
  async function snapshot(){
    const list=document.querySelector("ul.chat-list");if(!list)return;
    const rows=Array.from(list.querySelectorAll(":scope > li"));if(!rows.length)return;
    const messages=[];
    for(const row of rows){
      const user=row.matches(".user-message-row");const content=user?row.querySelector(".user-message-bubble"):row.querySelector(".ai-message");const text=textOf(content);if(!text)continue;
      const speaker=user?"user":"assistant";const id=await digest(`${location.origin}|${speaker}|${text}`);
      messages.push({id,conversationId:"skynet-active",speaker,text,ts:new Date().toISOString()});
    }
    const signature=messages.map(m=>m.id).join("|");if(!signature||signature===lastSignature)return;lastSignature=signature;
    chrome.runtime.sendMessage({type:"JANETE_INGEST",messages},()=>void chrome.runtime.lastError);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(snapshot,500);}
  const attach=()=>{const list=document.querySelector("ul.chat-list");if(!list)return;if(observer)observer.disconnect();observer=new MutationObserver(schedule);observer.observe(list,{subtree:true,childList:true,characterData:true});schedule();};
  new MutationObserver(attach).observe(document.documentElement,{subtree:true,childList:true});attach();setInterval(attach,2500);

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type!=="JANETE_SEND")return;
    const form=Array.from(document.querySelectorAll("form")).find(f=>f.querySelector("textarea")&&f.querySelector("button[aria-label='Gravar áudio']"));
    const field=form?.querySelector("textarea");if(!field){sendResponse({ok:false,error:"A caixa do Skynet Chat não está disponível."});return;}
    const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set;setter?.call(field,message.text);field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));field.focus();
    if(typeof form.requestSubmit==="function")form.requestSubmit();else field.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true}));
    sendResponse({ok:true});schedule();
  });
})();

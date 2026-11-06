"use strict";

const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const HOST = "127.0.0.1";
const PORT = Number(process.env.JANETE_PORT || 3471);
const PASSWORD = process.env.JANETE_PASSWORD || "";
const EXTENSION_TOKEN = process.env.JANETE_EXTENSION_TOKEN || "";
const DATA_DIR = process.env.JANETE_DATA_DIR || path.join(os.homedir(), "Library", "Application Support", "Janete");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.jsonl");
const OUTBOX_FILE = path.join(DATA_DIR, "outbox.json");
const WEB_ORIGINS = new Set(["https://leandropor-glitch.github.io", "http://127.0.0.1:8765", "http://localhost:8765"]);
const sessions = new Map();
const loginAttempts = new Map();

if (PASSWORD.length < 12 || !EXTENSION_TOKEN) {
  console.error("Configure JANETE_PASSWORD (mínimo 12 caracteres) e JANETE_EXTENSION_TOKEN no .env local. Nenhum segredo deve ir ao GitHub.");
  process.exit(1);
}
fs.mkdirSync(DATA_DIR,{recursive:true,mode:0o700});
if(!fs.existsSync(MESSAGES_FILE))fs.writeFileSync(MESSAGES_FILE,"",{mode:0o600});
if(!fs.existsSync(OUTBOX_FILE))fs.writeFileSync(OUTBOX_FILE,"[]\n",{mode:0o600});

const passwordSalt=crypto.randomBytes(16);
const passwordHash=crypto.scryptSync(PASSWORD,passwordSalt,64);
function safeEqual(a,b){const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
function loginAllowed(address){const now=Date.now(),recent=(loginAttempts.get(address)||[]).filter(t=>now-t<60_000);if(recent.length>=10){loginAttempts.set(address,recent);return false;}recent.push(now);loginAttempts.set(address,recent);return true;}
function originAllowed(origin){return !origin||WEB_ORIGINS.has(origin)||/^chrome-extension:\/\/[a-p]{32}$/.test(origin);}
function send(res,status,data,origin){
  const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization,Content-Type,X-Janete-Extension"};
  if(origin)headers["Access-Control-Allow-Origin"]=origin;
  res.writeHead(status,headers);res.end(data===undefined?"":JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let raw="";req.on("data",c=>{raw+=c;if(raw.length>1_000_000){reject(new Error("payload grande"));req.destroy();}});req.on("end",()=>{try{resolve(raw?JSON.parse(raw):{});}catch(_){reject(new Error("JSON inválido"));}});req.on("error",reject);});}
function auth(req){const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");const expiry=sessions.get(token);if(!token||!expiry||expiry<Date.now()){sessions.delete(token);return false;}return true;}
function readMessages(){return fs.readFileSync(MESSAGES_FILE,"utf8").split("\n").filter(Boolean).flatMap(line=>{try{return[JSON.parse(line)];}catch(_){return[];}}).slice(-1500);}
function readOutbox(){try{return JSON.parse(fs.readFileSync(OUTBOX_FILE,"utf8"));}catch(_){return[];}}
function writeOutbox(items){fs.writeFileSync(OUTBOX_FILE,JSON.stringify(items,null,2)+"\n",{mode:0o600});}
function addMessage(message){
  const text=String(message.text||"").trim();if(!text)return null;
  const item={id:String(message.id||crypto.randomUUID()),conversationId:String(message.conversationId||"skynet-active"),speaker:message.speaker==="assistant"?"assistant":"user",text:text.slice(0,20000),ts:new Date(message.ts||Date.now()).toISOString()};
  const current=readMessages();if(current.some(m=>m.id===item.id))return null;
  fs.appendFileSync(MESSAGES_FILE,JSON.stringify(item)+"\n",{mode:0o600});return item;
}
function verifyPassword(guess){const candidate=crypto.scryptSync(String(guess||""),passwordSalt,64);return safeEqual(candidate,passwordHash);}

const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin||"";
  if(!originAllowed(origin)){send(res,403,{error:"origin_denied"});return;}
  if(req.method==="OPTIONS"){send(res,204,undefined,origin);return;}
  const url=new URL(req.url,`http://${HOST}:${PORT}`);
  try{
    if(req.method==="GET"&&url.pathname==="/health"){send(res,200,{ok:true,service:"janete-local-bridge"},origin);return;}
    if(req.method==="POST"&&url.pathname==="/api/login"){
      if(!loginAllowed(req.socket.remoteAddress||"unknown")){send(res,429,{error:"too_many_attempts"},origin);return;}
      const body=await readBody(req);if(!verifyPassword(body.password)){send(res,401,{error:"invalid_login"},origin);return;}
      const token=crypto.randomBytes(32).toString("base64url");sessions.set(token,Date.now()+12*60*60*1000);send(res,200,{token,expiresIn:43200},origin);return;
    }
    if(req.method==="GET"&&url.pathname==="/api/extension/next"){
      if(!safeEqual(req.headers["x-janete-extension"]||"",EXTENSION_TOKEN)){send(res,401,{error:"extension_auth"},origin);return;}
      const items=readOutbox(),next=items.find(x=>x.status==="pending");send(res,200,{item:next||null},origin);return;
    }
    if(req.method==="POST"&&url.pathname.startsWith("/api/extension/")){
      if(!safeEqual(req.headers["x-janete-extension"]||"",EXTENSION_TOKEN)){send(res,401,{error:"extension_auth"},origin);return;}
      const body=await readBody(req);
      if(url.pathname==="/api/extension/ingest"){
        const accepted=[];for(const item of Array.isArray(body.messages)?body.messages:[]){const added=addMessage(item);if(added)accepted.push(added.id);}send(res,200,{accepted:accepted.length},origin);return;
      }
      if(url.pathname==="/api/extension/ack"){
        const items=readOutbox(),item=items.find(x=>x.id===body.id);if(item){item.status=body.ok?"sent":"failed";item.error=body.error?String(body.error).slice(0,500):"";item.completedAt=new Date().toISOString();writeOutbox(items);}send(res,200,{ok:!!item},origin);return;
      }
    }
    if(!auth(req)){send(res,401,{error:"session_required"},origin);return;}
    if(req.method==="GET"&&url.pathname==="/api/messages"){send(res,200,{online:true,messages:readMessages()},origin);return;}
    if(req.method==="POST"&&url.pathname==="/api/send"){
      const body=await readBody(req),text=String(body.text||"").trim();if(!text||text.length>4000){send(res,400,{error:"invalid_message"},origin);return;}
      const item={id:crypto.randomUUID(),text,conversationId:"skynet-active",createdAt:new Date().toISOString(),status:"pending"};const queue=readOutbox();queue.push(item);writeOutbox(queue.slice(-200));send(res,202,{queued:true,id:item.id},origin);return;
    }
    send(res,404,{error:"not_found"},origin);
  }catch(error){console.error("bridge request failed:",error.message);send(res,400,{error:"bad_request"},origin);}
});
server.listen(PORT,HOST,()=>console.log(`Janete local bridge listening on http://${HOST}:${PORT}; data dir is local-only.`));
process.on("SIGINT",()=>server.close(()=>process.exit(0)));
process.on("SIGTERM",()=>server.close(()=>process.exit(0)));

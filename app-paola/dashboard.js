(() => {
  'use strict';
  const motorURL = 'https://script.google.com/macros/s/AKfycbyYzB4W_omCbBVCqUNGLqz4EGJps2PHoDbiOeRHqc-iKsU70lHAsLiFShNIRgCtxgen/exec';
  let motorRequest;
  function request(url){
    if(url===motorURL)return motorRequest ||= fetch(url,{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw new Error('http');return r.json();});
    return fetch(url,{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw new Error('http');return r.json();});
  }
  const weatherURL = 'https://api.open-meteo.com/v1/forecast?latitude=-22.97&longitude=-43.19&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo&forecast_days=1';
  const format = value => Number(value).toLocaleString('pt-BR', {maximumFractionDigits:2});
  const safeURL = value => {try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
  const paragraph = text => {const p=document.createElement('p');p.textContent=text;return p;};
  async function load(id,url,render) {
    const target=document.getElementById(id);
    try {
      const nodes=render(await request(url));
      if(!nodes.length)throw new Error('empty');
      target.replaceChildren(...nodes); target.dataset.loaded='true';
    } catch {
      if(target.dataset.loaded!=='true')target.textContent='Informações indisponíveis no momento.';
    }
  }
  let last=0;
  function refresh(){
    if(document.body.classList.contains('signed-out')||location.hash!=='#dashboard'||Date.now()-last<14*60000)return;
    last=Date.now();motorRequest=null;
    load('dashboard-weather',weatherURL,j=>{
      if(!Number.isFinite(j.current?.temperature_2m))return [];
      return [paragraph(format(j.current.temperature_2m)+' °C · sensação '+format(j.current.apparent_temperature)+' °C'),paragraph('Mínima '+format(j.daily.temperature_2m_min[0])+' °C · máxima '+format(j.daily.temperature_2m_max[0])+' °C')];
    });
    load('dashboard-market',motorURL,j=>{
      const c=j.cotacoes||{};
      const updated=Date.parse(j.atualizado);
      const stamp=paragraph(Number.isFinite(updated)?'Fonte central · atualização '+new Date(updated).toLocaleString('pt-BR'):'Fonte central · horário não informado');
      const values=[['Dólar / real',c.usd_brl?.valor??j.usdtbrl?.preco??j.cambio?.usdbrl,'R$'],['Euro / real',c.eur_brl?.valor??j.cambio?.eurbrl,'R$'],['Bitcoin / dólar',c.btc_usd?.valor??j.cripto?.bitcoin?.usdt??j.cripto?.bitcoin?.usd,'US$']];
      return [...values.filter(([,v])=>Number(v)>0).map(([name,value,unit])=>paragraph(name+': '+unit+' '+format(value))),stamp];
    });
    load('dashboard-news',motorURL,j=>{
      j=j.noticias||j;
      const seen=new Set();
      return [...(j.politica||[]),...(j.destaques||[]),...(j.tecnologia||[]),...(j.economia||[])].filter(n=>{const link=safeURL(n.link);if(!link||seen.has(link))return false;seen.add(link);return true;}).slice(0,12).map(n=>{
        const a=document.createElement('a');a.href=safeURL(n.link);a.target='_blank';a.rel='noopener noreferrer';
        const image=safeURL(n.foto||n.image||n.imagem);if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});a.append(img);}
        a.append(paragraph(n.title||n.titulo||'Notícia'));
        const source=document.createElement('small');source.textContent=n.source||n.fonte||'';a.append(source);return a;
      });
    });
  }
  window.addEventListener('hashchange',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  setInterval(refresh,60000);refresh();
})();

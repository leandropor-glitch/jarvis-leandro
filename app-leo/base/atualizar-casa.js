/* Botão "atualizar" (26/11/2026, ordem do Leandro: "Cria o botão atualizar dispositivos e cenas" / "Ele deve buscar no Google").
   Felyx, Leda e Leo: ao lado do "editar", relê a casa no Google (dispositivos por cômodo e rotinas) e recarrega a lista.
   Só leitura no Google: nada é acionado na casa. */
(function(){
  'use strict';
  function sessao(){
    try{ if(typeof SESSAO !== 'undefined' && SESSAO && !/^google/.test(SESSAO)) {
      const leo = /\/(app-)?leo\//.test(location.pathname);
      if(!leo) return SESSAO;
    } }catch(e){}
    try{ return localStorage.getItem('leo_sessao') || localStorage.getItem('leda_sessao') || ''; }catch(e){ return ''; }
  }
  function aviso(txt){
    let a = document.getElementById('atualizarAviso');
    if(!a){ a = document.createElement('div'); a.id = 'atualizarAviso'; a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite');
      a.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;max-width:min(92vw,420px);padding:10px 14px;border-radius:12px;background:rgba(8,9,11,.96);border:1px solid rgba(var(--accent-rgb,214,255,26),.5);color:#e9eae6;font:500 13px/1.35 var(--sans,system-ui);text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.5)';
      document.body.appendChild(a); }
    a.textContent = txt; a.hidden = false; clearTimeout(aviso._t); aviso._t = setTimeout(()=>{ a.hidden = true; }, 6000);
  }
  async function atualizar(btn){
    btn.disabled = true; const antes = btn.textContent; btn.textContent = 'atualizando…'; aviso('Buscando os dispositivos e as cenas no Google…');
    try{
      const r = await fetch('/api/vinci/casa-atualizar', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ token: sessao() }) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || !j.ok){ aviso(j.mensagem || (j.erro === 'sessao' ? 'Entre de novo para atualizar.' : j.erro === 'casa_de_outro' ? 'Esta casa não é da sua conta.' : 'O Google não respondeu agora. Tente de novo.')); return; }
      try{ localStorage.removeItem('leo.casa'); }catch(e){}
      // 26/11 (Leandro: "Deleta minhas cenas, dispositivos e controles pra eu puxar pelo Google e ver"):
      // os botões passam a ser só o que veio do Google: cada dispositivo no seu cômodo (liga e desliga) e cada rotina como cena.
      try{
        if(typeof MATRIX_KEY !== 'undefined'){
          const novos = [];
          (j.comodos || []).forEach(c => (c.aparelhos || []).forEach(a => novos.push({ n: a.nome.slice(0, 40), f: 'ligar ' + a.nome, f2: 'desligar ' + a.nome, s: c.nome, fav: true, rc: '' })));
          (j.cenas || []).forEach(r => novos.push({ n: r.nome.slice(0, 40), f: 'ativar a cena ' + r.nome, f2: '', s: '', fav: true, rc: '' }));
          localStorage.setItem(MATRIX_KEY, JSON.stringify(novos));
          if(typeof MATRIX_ON_KEY !== 'undefined') localStorage.removeItem(MATRIX_ON_KEY);
          localStorage.setItem('vinci.casaGoogle', JSON.stringify({ casa: j.casa, lido_em: j.lido_em }));
        }
      }catch(e){}
      if(typeof atualizarCenas === 'function'){
        let resultado;
        try{ resultado = await atualizarCenas(); }
        catch(e){ resultado = { ok:false, erro:'A lista foi recebida, mas a atualização complementar falhou. Tente novamente.' }; }
        if(!resultado || !resultado.ok){
          aviso(resultado && resultado.erro || 'A lista foi recebida, mas a sincronização não foi confirmada. Tente novamente.');
          setTimeout(()=>location.reload(), 6500);
          return;
        }
      }
      aviso('Pronto: ' + j.total_aparelhos + ' dispositivos e ' + j.total_cenas + ' cenas do Google (' + (j.casa || 'sua casa') + ').');
      setTimeout(()=>location.reload(), 1800);
    }catch(e){ aviso('Sem conexão. Tente de novo.'); }
    finally{ btn.disabled = false; btn.textContent = antes; }
  }
  function ligar(){
    const ed = document.getElementById('editBtn'); if(!ed || document.getElementById('atualizarBtn')) return;
    const b = document.createElement('button'); b.className = 'pb'; b.id = 'atualizarBtn'; b.type = 'button'; b.textContent = 'atualizar';
    b.title = 'Buscar no Google os dispositivos e as cenas'; b.style.marginLeft = 'auto'; b.style.marginRight = '6px';
    b.addEventListener('click', ()=>atualizar(b));
    ed.parentElement.insertBefore(b, ed);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();

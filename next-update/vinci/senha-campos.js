/* Campos de senha (Felyx, Leda, Leo e Palanteer) — 24/11/2026, Claude, pedido do Leandro.
   O teclado do celular não pode mexer na senha: sem maiúscula automática, sem autocorreção e sem sugestão.
   Cada campo ganha o botão "mostrar" para a pessoa conferir o que digitou. */
(function(){
  'use strict';
  const css = document.createElement('style');
  css.textContent = '.vsCaixa .vsMostrar{position:absolute!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;background:none!important;border:0!important;color:inherit!important;opacity:.6;font-size:13px!important;font-weight:400!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer;padding:6px 8px!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;box-shadow:none!important;border-radius:6px!important;line-height:1.2!important}'
    + '.vsCaixa .vsMostrar:hover{opacity:1}.vsCaixa{position:relative;display:block}';
  document.head.appendChild(css);
  function preparar(i){
    if(i.dataset.vsOk) return; i.dataset.vsOk = '1';
    i.setAttribute('autocapitalize', 'off'); i.setAttribute('autocorrect', 'off'); i.setAttribute('autocomplete', i.getAttribute('autocomplete') || 'current-password');
    i.spellcheck = false;
    // 24/11 (Leandro): o celular e o navegador oferecem "salvar senha" e preenchem sozinhos na próxima vez.
    try{ const raiz = i.closest('form, .cx, #felyxLogin, main, section') || i.parentElement; const tel = raiz && raiz.querySelector('input[type=tel], input[name=telefone], input[name=email]');
      if(tel && !tel.getAttribute('data-vs-user')){ tel.setAttribute('data-vs-user', '1'); tel.setAttribute('autocomplete', 'username'); if(!tel.name) tel.name = 'username'; }
      if(!i.name) i.name = 'password'; }catch(e){}
    if(!i.offsetParent && getComputedStyle(i).display === 'none') return;
    const caixa = document.createElement('span'); caixa.className = 'vsCaixa';
    const cs = getComputedStyle(i); caixa.style.width = '100%'; i.style.width = '100%'; i.style.boxSizing = 'border-box';
    caixa.style.marginTop = cs.marginTop; caixa.style.marginBottom = cs.marginBottom; i.style.marginTop = '0'; i.style.marginBottom = '0';
    i.parentNode.insertBefore(caixa, i); caixa.appendChild(i);
    i.style.paddingRight = '78px';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vsMostrar'; b.textContent = 'mostrar'; b.setAttribute('aria-label', 'Mostrar a senha');
    b.onclick = (e)=>{ e.preventDefault(); const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; b.textContent = ver ? 'ocultar' : 'mostrar'; b.setAttribute('aria-label', ver ? 'Ocultar a senha' : 'Mostrar a senha'); i.focus(); };
    caixa.appendChild(b);
  }
  function varrer(){ document.querySelectorAll('input[type=password]:not([data-vs-ok])').forEach(preparar); }
  function iniciar(){ varrer(); new MutationObserver(varrer).observe(document.body, { childList: true, subtree: true }); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

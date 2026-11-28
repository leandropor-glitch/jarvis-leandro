/* Presentation only: reuse existing controls and their handlers; never change house data. */
(() => {
  'use strict';
  const hud = document.getElementById('hud');
  if (!hud || hud.dataset.duoLayoutV2) return;
  hud.dataset.duoLayoutV2 = '1';
  const matrix = document.getElementById('matrix');
  const roomBar = document.getElementById('roomBar');
  if (!matrix || !roomBar) return;
  const floors = document.getElementById('pavBar');
  const connection = document.getElementById('ghome');
  const top = document.createElement('div'); top.className = 'duo-house-top';
  const navigation = document.createElement('div');
  navigation.className = 'duo-house-navigation';
  (floors || roomBar).before(top);
  top.append(navigation);
  if (floors) navigation.append(floors);
  navigation.append(roomBar);
  if(connection) top.append(connection);
  const categories = document.getElementById('catBar'); if(categories) top.after(categories);
  let queued = false;
  function syncUnassigned() {
    queued = false;
    const original = Array.from(roomBar.querySelectorAll('button')).find(b => /^sem ambiente$/i.test(b.textContent.trim()));
    let slot = document.getElementById('duoUnassigned');
    if (!original) { if (slot) slot.remove(); return; }
    if (!original.classList.contains('duo-unassigned-source')) original.classList.add('duo-unassigned-source');
    original.setAttribute('aria-hidden','true'); original.tabIndex = -1;
    if (!slot) {
      slot = document.createElement('nav'); slot.id = 'duoUnassigned'; slot.className = 'roombar';
      slot.setAttribute('aria-label','Itens sem ambiente');
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Sem ambiente';
      slot.appendChild(button);
      top.append(slot);
    }
    const proxy = slot.querySelector('button');
    const selected = original.getAttribute('aria-selected') === 'true';
    proxy.setAttribute('aria-pressed',String(selected));
    proxy.setAttribute('aria-selected',String(selected));
    proxy.onclick = () => original.click();
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(syncUnassigned); } }
  new MutationObserver(schedule).observe(roomBar,{childList:true,subtree:true,characterData:true});
  syncUnassigned();
})();

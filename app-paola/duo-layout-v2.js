/* Display adapter only. Do not clone interactive controls or invent house data. */
(() => {
  document.body.dataset.duoLayoutV2 = '1';
  const grid = document.querySelector('.dashboard-grid');
  const portrait = document.querySelector('#paola .paola-portrait');
  if (!grid || !portrait || grid.querySelector('.duo-dashboard-avatar')) return;
  const card = document.createElement('article');
  card.className = 'duo-dashboard-avatar';
  const image = document.createElement('img');
  image.src = portrait.src; image.alt = portrait.alt;
  image.width = 180; image.height = 180;
  card.appendChild(image); grid.prepend(card);
})();

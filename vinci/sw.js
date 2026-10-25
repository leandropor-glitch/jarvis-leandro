// Vinci — service worker simples: abre rápido com o que já está guardado e atualiza por trás.
// Só guarda arquivos do próprio site (GET). Login e comandos (n8n, /api/) nunca passam pelo cache.
const VERSAO = 'vinci-3';
const BASE = ['./', 'index.html', 'manifest.json', 'comodos.json', 'icone-192.png', 'icone-512.png', 'icone-180.png', 'logo.png', 'chevron.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // a página em si: rede primeiro (pega versão nova), guardada se estiver sem internet
  if (e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(VERSAO).then((c) => c.put('./', cp)); return r; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.open(VERSAO).then(async (c) => {
    const guardado = await c.match(e.request, { ignoreSearch: true });
    const rede = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => guardado);
    return guardado || rede;
  }));
});

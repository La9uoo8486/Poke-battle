// 서비스워커: 앱 파일·데이터는 "네트워크 우선"(온라인이면 항상 최신), 오프라인일 때만 캐시 사용
// 이미지(스프라이트)는 "캐시 우선"
const VERSION = 'v1';
const APP = 'app-' + VERSION, IMG = 'img-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/data.js', 'js/votes.js', 'config.js',
  'scripts/name-map.mjs', 'data/dex.json', 'data/types.json', 'data/formats.json', 'data/usage.json',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== APP && k !== IMG).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(APP).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
  } else if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/sprites/')) {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => new Response('', { status: 404 })));
  }
});

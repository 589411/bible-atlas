/* 聖經像素地圖 service worker — network-first(更新即時生效,離線回退快取) */
const CACHE = 'atlas-v3';
const SHELL = [
  "./",
  "./engine/index.html",
  "./manifest.webmanifest",
  "./data/manifest.json",
  "./data/book_eras.json",
  "./data/highlights.json",
  "./data/eras/acts.json",
  "./data/eras/creation.json",
  "./data/eras/conquest.json",
  "./data/eras/david.json",
  "./data/eras/divided.json",
  "./data/eras/exile.json",
  "./data/eras/exodus.json",
  "./data/eras/gospels.json",
  "./data/eras/judges.json",
  "./data/eras/north_fall.json",
  "./data/eras/patriarchs.json",
  "./data/eras/return.json",
  "./data/eras/saul.json",
  "./data/eras/solomon.json",
  "./data/eras/south_fall.json",
  "./data/eras/split.json",
  "./data/maps/canaan.json",
  "./data/maps/exodus.json",
  "./data/maps/mediterranean.json",
  "./data/maps/neareast.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // 外部 API(daily-bread 等)不攔截
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: url.pathname.endsWith('.html') || url.pathname.endsWith('/') }))
  );
});

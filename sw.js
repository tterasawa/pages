const CACHE_NAME = 'cyber-kanji-v1';
const urlsToCache = [
  './',
  './index.html',
  './handwriting.js',
  './bgm.mp3',
  './clear.mp3',
  './icon-192.png',
  './icon-512.png'
];

// インストール処理
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// リクエスト処理（キャッシュがあればそこから返す）
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        return response || fetch(event.request);
      })
  );
});

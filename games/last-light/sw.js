/* Bump VERSION for every published release. All resources are first-party. */
const BASE=new URL('./',self.location.href);
const PREFIX='last-light-'+encodeURIComponent(BASE.pathname)+'-';
const VERSION=PREFIX+'1.0.1';
const ASSETS=['./','./index.html','./style.css','./src/main.js','./src/core.js','./src/render.js','./src/audio.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(ASSETS.map(path=>new Request(new URL(path,BASE),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==VERSION).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  if(request.mode==='navigate'){event.respondWith((async()=>{const cache=await caches.open(VERSION);const shell=await cache.match(new URL('./index.html',BASE));if(shell)return shell;try{const response=await fetch(request);if(response.ok)return response;}catch{}return Response.error();})());return;}
  if(ASSETS.some(path=>new URL(path,BASE).pathname===url.pathname)){event.respondWith((async()=>{const cache=await caches.open(VERSION);const hit=await cache.match(url.pathname);if(hit)return hit;return fetch(request);})());}
});

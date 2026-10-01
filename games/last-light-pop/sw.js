/* Bump VERSION for every published release, including MP3/config replacements. */
const BASE=new URL('./',self.location.href);
const PREFIX='last-light-pop-'+encodeURIComponent(BASE.pathname)+'-';
const VERSION=PREFIX+'2.6.0';
const AUDIO_FETCH_TIMEOUT=30_000;
const ASSETS=['./','./index.html','./style.css','./src/main.js','./src/core.js','./src/render.js','./src/audio.js','./src/ending.js','./src/hype.js','./src/meta.js','./src/songs.js','./manifest.webmanifest','./assets/audio-config.json','./assets/voice/voices.json','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(ASSETS.map(path=>new Request(new URL(path,BASE),{cache:'reload'})));
  // Voices are listed in voices.json; caching them is best-effort so a missing line never blocks install.
  try{const voices=await(await cache.match(new URL('./assets/voice/voices.json',BASE))).json();await Promise.all((voices.lines||[]).map(async l=>{try{const url=new URL(l.file,BASE);if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),AUDIO_FETCH_TIMEOUT);try{const r=await fetch(new Request(url,{cache:'reload',signal:controller.signal}));if(r.ok)await cache.put(url,r);}finally{clearTimeout(timer);}}catch{}}));}catch{}
  // Optional music/effect files must never prevent installation or the synth fallback.
  try{
    const config=await(await cache.match(new URL('./assets/audio-config.json',BASE))).json();
    const paths=[config?.music,...Object.values(config?.effects||{})],urls=new Set();
    for(const path of paths){if(typeof path!=='string'||!path.trim())continue;try{const url=new URL(path,new URL('./assets/audio-config.json',BASE));if(url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname)&&!url.username&&!url.password)urls.add(url.href);}catch{}}
    await Promise.all([...urls].map(async url=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),AUDIO_FETCH_TIMEOUT);try{const response=await fetch(new Request(url,{cache:'reload',signal:controller.signal}));if(response.ok)await cache.put(url,response);}catch{}finally{clearTimeout(timer);}}));
  }catch{}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==VERSION).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{const cache=await caches.open(VERSION),shell=await cache.match(new URL('./index.html',BASE));if(shell)return shell;try{const response=await fetch(request);if(response.ok)return response;}catch{}return Response.error();})());return;
  }
  event.respondWith((async()=>{const cache=await caches.open(VERSION),hit=await cache.match(request);return hit||fetch(request);})());
});

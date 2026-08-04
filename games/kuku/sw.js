/*
 * Service Worker。オフラインでも遊べるようにする。
 *
 * このファイルはひな形。下の VERSION と CORE はビルド時に差し替わる（build/swPlugin.ts）。
 * 生成物は dist/sw.js。直接 public/ に置かないのは、先読みする一覧に
 * ハッシュ付きのファイル名（assets/index-XXXX.js）が入るため。
 *
 * 方針:
 * - 画面の骨組みと絵は先読みして、機内モードでも最初から遊べるようにする
 * - 音源（BGM・ボイス）は大きいので鳴らしたものだけためる（初回のインストールを重くしない）
 * - HTML はネットワーク優先。新しい版を出したときに古い画面に居座らせない
 * - 効果音の mp3 は未配置で 404 になる設計なので、失敗した応答はためない
 */
const VERSION = "326222746409";
/* 先読みする一覧。空配列ごとビルド時に差し替わる */
const CORE = [
  "assets/index-BNE8tMI-.css",
  "assets/index-CBCZw6Km.js",
  "audio/manifest.json",
  "favicon.ico",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "images/bg/battle.png",
  "images/bg/home.png",
  "images/bg/paper.png",
  "images/characters/buddy.png",
  "images/icons/dex.png",
  "images/icons/dojo.png",
  "images/icons/training.png",
  "images/monsters/dan1.png",
  "images/monsters/dan2.png",
  "images/monsters/dan3.png",
  "images/monsters/dan4.png",
  "images/monsters/dan5.png",
  "images/monsters/dan6.png",
  "images/monsters/dan7.png",
  "images/monsters/dan8.png",
  "images/monsters/dan9.png",
  "images/monsters/mob1.png",
  "images/monsters/mob2.png",
  "images/monsters/mob3.png",
  "index.html",
  "manifest.webmanifest"
];

const CORE_CACHE = `kuku-game-core-${VERSION}`;
/** 遊びながらためる置き場（ボイスなど）。版をまたいで持ち越す。 */
const RUNTIME_CACHE = "kuku-game-runtime";

/** このアプリが置かれている場所。同じドメインの別サイトには手を出さない。 */
const SCOPE_PATH = new URL("./", self.location.href).pathname;

/**
 * 先読みせず、鳴らしたものをためる音源の置き場。
 * ファイル名にハッシュが付かない（差し替えても名前が同じ）ので、
 * 出したものをすぐ返しつつ裏で新しいものに入れ替える。
 */
const MEDIA_DIRS = ["/audio/bgm/", "/audio/voice/"];

/**
 * キャッシュを探すときの条件。
 *
 * `ignoreVary` が要る。JS と CSS のタグには crossorigin が付いていて、ブラウザは
 * これを CORS 扱いで取りに行くため `Origin` ヘッダを送る。一方こちらが先読みしたときの
 * リクエストには `Origin` が無い。応答に `Vary: Origin`（や `Vary: Accept-Encoding`）が
 * 付いていると、この差だけで「別のリクエスト」と見なされて取り出せず、
 * オフラインで画面が真っ白になる。
 */
const MATCH_OPTIONS = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) =>
      // 1つでも落とせなければ install を失敗させる（半端なキャッシュで動かさない）
      cache.addAll(CORE.map((path) => new Request(path, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("kuku-game-") && name !== CORE_CACHE && name !== RUNTIME_CACHE,
          )
          .map((name) => caches.delete(name)),
      );
      // 1回目の訪問からオフラインで遊べるようにする（次の起動を待たない）
      await self.clients.claim();
    })(),
  );
});

/** 取ってきたものをためる。失敗した応答や他サイトの応答はためない。 */
async function store(cacheName, request, response) {
  if (!response.ok || response.type !== "basic") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

/** HTML 用。新しい版を優先し、つながらなければキャッシュの画面を出す。 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await store(RUNTIME_CACHE, request, response);
    return response;
  } catch (error) {
    const cached =
      (await caches.match(request, MATCH_OPTIONS)) ??
      (await caches.match("index.html", MATCH_OPTIONS));
    if (cached) return cached;
    throw error;
  }
}

/** 先読みしたもの用。あるものをそのまま出す。 */
async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await fetch(request);
  await store(RUNTIME_CACHE, request, response);
  return response;
}

/**
 * 音源用。ためたものをすぐ出し、裏で新しいものに入れ替える。
 * 作り直した BGM やボイスが古いまま残り続けるのを防ぎつつ、待たせない。
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, MATCH_OPTIONS);
  const fresh = fetch(request)
    .then(async (response) => {
      await store(RUNTIME_CACHE, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    // 裏の更新は待たない（待つと最初の再生が遅れる）
    void fresh;
    return cached;
  }
  const response = await fresh;
  if (response) return response;
  throw new Error(`取得できませんでした: ${request.url}`);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (MEDIA_DIRS.some((dir) => url.pathname.includes(dir))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

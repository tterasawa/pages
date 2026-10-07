// Stage bosses as animated cut-out rigs. Every heavy part (cape, gown, gumdrop body, crown...) is
// drawn once into a bitmap and then animated with transforms each frame; only small details (eyes,
// mouth, telegraph rings) are drawn live. Same flat ink-outlined pop style as the rest of the game:
// no glow, no additive blending.
//
// draw(c, kind, pose) draws at the origin = the boss's hitbox centre.
//   pose: { t, motion, white, look:[x,y], charge 0..1, roar 0..1, phase 1..3 }
//   white: draw only the flat white silhouette (used as a hit-flash overlay).
export const BOSS_INFO = Object.freeze({
  wilds: { title: '夜を統べる王', color: '#9b5de5', band: '#2b1466', accent: '#ffd23f' },
  frost: { title: '凍てつく湖の女王', color: '#4cc9f0', band: '#1d4f8f', accent: '#ffffff' },
  candy: { title: 'あまあま帝国の大王', color: '#ff8fc7', band: '#a3306f', accent: '#ffd23f' },
  bat: { title: '月をかくす翼', color: '#9b5de5', band: '#3a1a6e', accent: '#fff07a' },
  snowman: { title: '吹雪の進軍司令', color: '#4cc9f0', band: '#16467d', accent: '#ffffff' },
  donut: { title: 'あまいうずの魔神', color: '#f15bb5', band: '#8a2c6c', accent: '#ffd23f' }
});
// Eye positions (rig space, before hover) — used by the darkness overlay so the eyes shine through.
export const BOSS_EYES = Object.freeze({ wilds: [[-16, -58], [16, -58]], frost: [[-9, -78], [9, -78]], candy: [[-22, -30], [22, -30]], bat: [[-16, -48], [16, -48]], snowman: [[-11, -94], [11, -94]], donut: [[-26, -60], [26, -60]] });
export const BOSS_TOP = 150; // rig height above the hitbox centre (for the HP bar)
const RES = 2.8; // bitmap pixels per rig unit at the top level (sharp in the cut-in, where the rig is drawn large)

export function createBossArt(h) {
  const { P, TAU, path, ink, star, roundRect } = h;
  const circle = (c, x, y, r, fill, lw = 3) => { c.beginPath(); c.arc(x, y, r, 0, TAU); ink(c, fill, lw); };
  const oval = (c, x, y, rx, ry, fill, lw = 0, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); ink(c, fill, lw); };
  const shine = (c, x, y, rx, ry, rot = -.5) => oval(c, x, y, rx, ry, '#ffffffb8', 0, rot);
  const line = (c, pts, lw, col = P.ink) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineWidth = lw; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };

  // --- part cache -------------------------------------------------------------------------------
  // Each part is drawn once at RES and kept at six resolutions, so drawing it each frame is close
  // to a 1:1 copy whatever the zoom (down-scaling big bitmaps every frame is what costs).
  const parts = new Map(), LEVELS = [0, 1, 2, 3, 4, 5].map(i => RES / 1.35 ** i);
  const scaled = (src, w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = Math.max(1, h); const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, cv.width, cv.height); return cv; };
  function part(key, size, fn) {
    let p = parts.get(key); if (p) return p;
    const n = Math.ceil(size * RES), cv = document.createElement('canvas'); cv.width = cv.height = n;
    const c = cv.getContext('2d'); c.scale(RES, RES); c.translate(size / 2, size / 2); fn(c);
    // Find the used area on a small copy (cheap), then crop every level to it.
    const q = Math.ceil(n / 8), small = scaled(cv, q, q), data = small.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, q, q).data; let x0 = q, y0 = q, x1 = -1, y1 = -1;
    for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) if (data[(y * q + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
    const bx = Math.max(0, (x0 - 1) * 8), by = Math.max(0, (y0 - 1) * 8), bw = Math.min(n, (x1 + 2) * 8) - bx, bh = Math.min(n, (y1 + 2) * 8) - by;
    const crop = document.createElement('canvas'); crop.width = bw; crop.height = bh; crop.getContext('2d').drawImage(cv, bx, by, bw, bh, 0, 0, bw, bh);
    const levels = []; let prev = crop; // each level is scaled from the previous one (no aliasing from big single steps)
    for (const res of LEVELS) { const img = res === RES ? crop : scaled(prev, Math.round(bw * res / RES), Math.round(bh * res / RES)); levels.push({ res, img, white: null }); prev = img; }
    p = { levels, x: bx / RES - size / 2, y: by / RES - size / 2, w: bw / RES, h: bh / RES }; parts.set(key, p); return p;
  }
  function silhouette(l) { if (!l.white) { const cv = document.createElement('canvas'); cv.width = l.img.width; cv.height = l.img.height; const c = cv.getContext('2d'); c.drawImage(l.img, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = P.white; c.fillRect(0, 0, cv.width, cv.height); l.white = cv; } return l.white; }
  let white = false, zoom = 1;
  function pick(p, scale) { const need = zoom * scale; let l = p.levels[0]; for (const v of p.levels) if (v.res >= need * .9) l = v; return white ? silhouette(l) : l.img; }
  // Draw a cached part at (x, y) with rotation / scale around its own origin.
  function put(c, p, x = 0, y = 0, rot = 0, sx = 1, sy = sx) {
    const img = pick(p, Math.max(Math.abs(sx), Math.abs(sy)));
    if (!rot && sx === 1 && sy === 1) { c.drawImage(img, x + p.x, y + p.y, p.w, p.h); return; }
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(sx, sy); c.drawImage(img, p.x, p.y, p.w, p.h); c.restore();
  }
  // Live details are skipped in the white pass (the silhouette already covers them).
  function eye(c, x, y, r, look, { angry = 0, pupil = P.ink, lid = null, lash = false } = {}) {
    if (white) return;
    oval(c, x, y, r, r * 1.12, P.white, 3);
    const px = x + look[0] * r * .38, py = y + look[1] * r * .38;
    circle(c, px, py, r * .56, pupil, 0); circle(c, px - r * .2, py - r * .24, r * .2, P.white, 0);
    if (lid) { c.fillStyle = lid; c.beginPath(); c.ellipse(x, y, r, r * 1.12, 0, Math.PI * 1.08, Math.PI * 1.92); c.closePath(); c.fill(); line(c, [[x - r * .95, y - r * .45], [x + r * .95, y - r * .45]], 2.6); }
    if (lash) { const s = Math.sign(x) || 1; line(c, [[x + s * r * .7, y - r * .6], [x + s * r * 1.25, y - r * 1.05]], 2.6); line(c, [[x + s * r * .95, y - r * .15], [x + s * r * 1.45, y - r * .4]], 2.6); }
    if (angry) line(c, [[x - r * 1.25, y - r * 1.25 - angry * r * .45], [x + r * 1.15, y - r * 1.0 + angry * r * .4]], 4);
  }
  function orbit(c, n, rx, ry, cy, a0, back, fn) {
    for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n, s = Math.sin(a); if (back !== s < 0) continue; fn(Math.cos(a) * rx, cy + s * ry, .8 + (s + 1) * .15, a, i); }
  }
  function telegraph(c, x, y, r, col, t) { if (white) return; c.strokeStyle = col; c.lineWidth = 3; c.setLineDash([5, 6]); c.beginPath(); c.arc(x, y, r + Math.sin(t * 20) * 3, 0, TAU); c.stroke(); c.setLineDash([]); }
  // Billowing cloth: breathe in width / length around its top edge. Large parts only translate and
  // scale on the axes (rotating or skewing a big bitmap every frame is the expensive path).
  function billow(c, p, topY, k, sx = 1) { c.save(); c.translate(0, topY); c.scale(sx * (1 + k), 1 - k * .6); c.translate(0, -topY); put(c, p); c.restore(); }

  // --- 夜の主: a floating night king in a starry cape with crescent horns and detached claws ------
  const W = {
    aura: rage => part('w_aura' + rage, 280, c => { star(c, 0, 0, rage ? 128 : 112, rage ? 96 : 92, 16, 0); ink(c, rage ? '#5a1238aa' : '#2b1466aa', 0); }),
    moon: () => part('w_moon', 30, c => { c.beginPath(); c.arc(0, 0, 11, .6, TAU - .6); c.arc(6, -2, 9, TAU - .9, .9, true); c.closePath(); ink(c, P.lemon, 2.4); }),
    cape: () => part('w_cape', 260, c => {
      const hem = []; for (let i = 0; i <= 9; i++) hem.push([-92 + i / 9 * 184, 64 + (i % 2 ? -18 : 0)]);
      path(c, [[-46, -34], [-24, -44], [24, -44], [46, -34], ...hem.slice().reverse()]); ink(c, '#c93f92', 4);
      const inner = [[-40, -34], [0, -40], [40, -34], [78, 54], ...hem.slice(1, -1).reverse().map(([x, y]) => [x * .86, y - 2]), [-78, 54]];
      path(c, inner); ink(c, '#2b1466', 4);
      c.save(); path(c, inner); c.clip(); for (let i = 0; i < 9; i++) { const sx = ((i * 37) % 120) - 60, sy = -20 + ((i * 53) % 70); star(c, sx, sy, 4.5, 1.8, 4, 0); c.fillStyle = i % 3 ? P.lemon : P.white; c.fill(); } c.restore();
      for (const s of [-1, 1]) { path(c, [[s * 20, -44], [s * 70, -104], [s * 52, -64], [s * 40, -38]]); ink(c, '#c93f92', 3.5); path(c, [[s * 26, -46], [s * 60, -92], [s * 46, -60]]); ink(c, '#7b2cbf', 0); }
    }),
    head: () => part('w_head', 200, c => {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 26, -26); c.quadraticCurveTo(s * 70, -44, s * 76, -98); c.quadraticCurveTo(s * 54, -52, s * 12, -34); c.closePath(); ink(c, P.lemon, 3.5); }
      circle(c, 0, 0, 42, P.magenta, 4); c.save(); c.beginPath(); c.arc(0, 0, 42, 0, TAU); c.clip(); oval(c, 0, 34, 52, 22, '#c93f92'); c.restore(); circle(c, 0, 0, 42, null, 4);
      shine(c, -20, -22, 9, 4);
    }),
    crown: () => part('w_crown', 70, c => { path(c, [[-22, 8], [-26, -14], [-12, -4], [0, -22], [12, -4], [26, -14], [22, 8]]); ink(c, P.yellow, 3.5); circle(c, 0, -2, 5, P.coral, 2.4); circle(c, -15, 1, 3, P.sky, 2); circle(c, 15, 1, 3, P.mint, 2); }),
    claw: () => part('w_claw', 80, c => { for (const k of [-1, 0, 1]) { path(c, [[k * 8 - 4, -10], [k * 11, -30 - (k ? 0 : 6)], [k * 8 + 4, -10]]); ink(c, P.lemon, 2.6); } oval(c, 0, 0, 17, 15, '#7b2cbf', 3.5); oval(c, 0, 14, 13, 6, P.magenta, 3); shine(c, -6, -5, 5, 2.4); })
  };
  function wilds(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, hover = Math.sin(t * 2) * 7 * m, rage = phase >= 3;
    if (!white) { oval(c, 0, 66, 76 - hover, 18, '#12063488'); const k = 1 + roar * .15 + Math.sin(t * 3) * .04 * m; put(c, W.aura(rage), 0, 4, 0, k, k * (1 - Math.sin(t * 3) * .03 * m)); } // pulses on the axes (rotating a big bitmap is the slow path)
    c.translate(0, -hover - 8);
    const moon = W.moon();
    orbit(c, 3, 120, 34, -20, t * 1.3 * m, true, (x, y, s) => put(c, moon, x, y, 0, s));
    billow(c, W.cape(), -40, Math.sin(t * 3.2) * .035 * m + (roar ? Math.sin(t * 30) * .02 : 0), 1 + roar * .04);
    if (!white) for (let i = 0; i < 4; i++) { const tw = Math.sin(t * 4 * m + i * 1.7); if (tw > .6) { star(c, -50 + i * 33, (i * 23) % 40, 3 + tw * 4, 1.2, 4, 0); c.fillStyle = P.white; c.fill(); } }
    const hx = look[0] * 4 * m, hy = -48 + Math.sin(t * 2 + .6) * 2 * m;
    c.save(); c.translate(hx, 0);
    put(c, W.head(), 0, hy, 0, 1 + roar * .05);
    eye(c, -16, hy - 2, 11, look, { angry: 1.3 + roar * .4, pupil: rage ? P.tomato : P.ink }); eye(c, 16, hy - 2, 11, look, { angry: -1.3 - roar * .4, pupil: rage ? P.tomato : P.ink });
    if (!white) {
      const open = Math.max(roar, charge * .5);
      c.beginPath(); c.moveTo(-26, hy + 16); c.quadraticCurveTo(0, hy + 30 + open * 22, 26, hy + 16); c.quadraticCurveTo(0, hy + 22 + open * 6, -26, hy + 16); c.closePath(); ink(c, P.ink, 3);
      if (open > .2) oval(c, 0, hy + 26 + open * 8, 9, 5 + open * 4, P.coral);
      path(c, [[-20, hy + 17], [-15, hy + 25], [-10, hy + 19], [-4, hy + 27], [2, hy + 20], [8, hy + 27], [14, hy + 19], [20, hy + 17]]); ink(c, P.white, 0);
    }
    put(c, W.crown(), 0, hy - 64 + Math.sin(t * 2.6 + 1) * 4 * m - roar * 10, Math.sin(t * 1.7) * .12 * m - look[0] * .1);
    c.restore();
    const claw = W.claw();
    for (const s of [-1, 1]) {
      const lift = Math.max(charge, roar), x = s * (82 + lift * 18), y = 4 + Math.sin(t * 2.4 + s) * 9 * m - lift * 60;
      if (lift > .3) telegraph(c, x, y, 26, rage ? '#ff5a5f' : P.lemon, t);
      put(c, claw, x, y, s * (.3 - lift * .5), s, 1);
    }
    orbit(c, 3, 120, 34, -20, t * 1.3 * m, false, (x, y, s) => put(c, moon, x, y, 0, s));
  }

  // --- 氷の女王: a tall crystal queen with a fan collar, faceted gown and a snowflake sceptre -----
  const F = {
    shard: () => part('f_shard', 40, c => { path(c, [[0, -16], [8, 0], [0, 16], [-8, 0]]); ink(c, '#c9f3ff', 2.6); path(c, [[0, -16], [8, 0], [0, 0]]); ink(c, P.white, 0); }),
    lock: () => part('f_lock', 200, c => { c.beginPath(); c.moveTo(18, -84); c.quadraticCurveTo(52, -60, 44, -10); c.quadraticCurveTo(54, 14, 34, 24); c.quadraticCurveTo(30, -20, 6, -50); c.closePath(); ink(c, '#e8e4ff', 3.5); }),
    collar: () => part('f_collar', 200, c => { for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * .36, L = 62 + (k % 2 ? 0 : 12); c.save(); c.rotate(a + Math.PI / 2); path(c, [[-9, 0], [0, -L], [9, 0]]); ink(c, k % 2 ? '#c9f3ff' : P.white, 3); line(c, [[0, -4], [0, -L + 10]], 2, '#4cc9f0'); c.restore(); } }),
    gown: () => part('f_gown', 200, c => {
      const hemY = 60, pts = [[-22, -24], [22, -24]]; for (let i = 0; i <= 10; i++) pts.push([74 - i / 10 * 148, hemY + (i % 2 ? 16 : 0) + (i % 4 === 1 ? 8 : 0)]);
      path(c, pts); ink(c, P.sky, 4);
      c.save(); path(c, pts); c.clip(); for (const [x0, x1] of [[-74, -30], [-10, 26], [44, 80]]) { path(c, [[x0 * .3, -24], [x0, hemY + 20], [x1, hemY + 20]]); c.fillStyle = '#9be7ff'; c.fill(); } c.strokeStyle = '#ffffffaa'; c.lineWidth = 3; for (const x of [-46, 0, 46]) { c.beginPath(); c.moveTo(x * .25, -20); c.lineTo(x, hemY + 10); c.stroke(); } c.restore(); path(c, pts); ink(c, null, 4);
      roundRect(c, -20, -46, 40, 28, 10); ink(c, '#2a9fd0', 3.5); path(c, [[0, -44], [8, -32], [0, -20], [-8, -32]]); ink(c, P.magenta, 2.4);
    }),
    head: () => part('f_head', 90, c => {
      circle(c, 0, 0, 26, '#e3f6ff', 3.5);
      c.beginPath(); c.moveTo(-27, 2); c.quadraticCurveTo(-26, -32, 0, -30); c.quadraticCurveTo(26, -32, 27, 2); c.quadraticCurveTo(14, -18, 0, -14); c.quadraticCurveTo(-14, -18, -27, 2); c.closePath(); ink(c, '#e8e4ff', 3);
      oval(c, -15, 11, 4, 2.2, '#ffc4dd'); oval(c, 15, 11, 4, 2.2, '#ffc4dd');
    }),
    crown: () => part('f_crown', 120, c => { for (const [x, L] of [[-20, 22], [-10, 34], [0, 50], [10, 34], [20, 22]]) { path(c, [[x - 6, 0], [x, -L], [x + 6, 0]]); ink(c, x ? '#c9f3ff' : P.white, 3); } roundRect(c, -24, -4, 48, 9, 4); ink(c, P.white, 3); path(c, [[0, -12], [6, -4], [0, 4], [-6, -4]]); ink(c, P.magenta, 2.2); }),
    staff: () => part('f_staff', 130, c => { line(c, [[0, 40], [-2, -60]], 9); line(c, [[0, 40], [-2, -60]], 4, P.white); for (const k of [0, 1, 2]) line(c, [[-5, 20 - k * 22], [3, 14 - k * 22]], 3, P.sky); }),
    flake: () => part('f_flake', 70, c => { const R = 22; for (const [w1, w2, col] of [[7, 6, P.ink], [3, 2.6, P.white]]) for (let k = 0; k < 6; k++) { c.save(); c.rotate(k * TAU / 6); line(c, [[0, 0], [0, -R]], w1, col); line(c, [[0, -R * .55], [-7, -R * .8]], w2, col); line(c, [[0, -R * .55], [7, -R * .8]], w2, col); c.restore(); } circle(c, 0, 0, 6, P.sky, 2.6); })
  };
  function frost(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, hover = Math.sin(t * 1.6) * 8 * m, rage = phase >= 3;
    if (!white) { // frost sigil on the ground (live vector: cheaper than rotating a big bitmap)
      const k = 1 + roar * .15, spin = t * .35 * m; c.strokeStyle = rage ? '#ffffffcc' : '#ffffff88'; c.lineWidth = 3; c.setLineDash([16, 12]); c.lineDashOffset = -spin * 60; c.beginPath(); c.ellipse(0, 62, 120 * k, 38 * k, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = spin + i * TAU / 6, cs = Math.cos(a) * k, sn = Math.sin(a) * .32 * k; c.moveTo(cs * 40, 62 + sn * 40); c.lineTo(cs * 104, 62 + sn * 104); } c.stroke(); oval(c, 0, 64, 62 - hover * .6, 15, '#0d2a5488'); }
    c.translate(0, -hover - 10);
    const shard = F.shard();
    orbit(c, 6, 118, 30, -10, t * .9 * m, true, (x, y, s, a) => put(c, shard, x, y, a * 2, s));
    const lock = F.lock(); for (const s of [-1, 1]) put(c, lock, 0, Math.sin(t * 2.2 + s) * 3 * m, 0, s, 1);
    put(c, F.collar(), 0, -46, 0, 1 + roar * .2 + (rage ? .1 : 0));
    billow(c, F.gown(), -24, Math.sin(t * 2.6) * .025 * m);
    const hx = look[0] * 3 * m, hy = -70;
    c.save(); c.translate(hx, 0);
    put(c, F.head(), 0, hy);
    const lid = rage || roar > .3 ? null : '#bfe9ff';
    eye(c, -9, hy + 2, 6.5, look, { lid, lash: true, pupil: '#2a9fd0' }); eye(c, 9, hy + 2, 6.5, look, { lid, lash: true, pupil: '#2a9fd0' });
    if (!white) { if (roar > .2) oval(c, 0, hy + 15, 4, 3 + roar * 3, '#2a9fd0', 2); else line(c, [[-4, hy + 15], [0, hy + 17], [4, hy + 14]], 2.4, '#2a9fd0'); }
    put(c, F.crown(), 0, hy - 30, 0, 1, 1 + roar * .15);
    if (!white && m) { const tw = (t * .8) % 2; if (tw < .5) { const s = Math.sin(tw / .5 * Math.PI); star(c, 0, hy - 80 - roar * 8, 9 * s + .1, 2 * s + .1, 4, 0); c.fillStyle = P.white; c.fill(); } }
    c.restore();
    const lift = Math.max(charge, roar), sx = 64, sy = 30 - lift * 50;
    put(c, F.staff(), sx, sy);
    if (!white) oval(c, sx - 10, sy - 2, 10, 8, '#e3f6ff', 3);
    if (lift > .3) telegraph(c, sx - 2, sy - 74, 34, P.white, t);
    put(c, F.flake(), sx - 2, sy - 74, t * (1 + lift * 5) * m, 1 + lift * .35);
    if (!white) oval(c, -48, -8 - lift * 20 + Math.sin(t * 2.4) * 4 * m, 10, 9, '#e3f6ff', 3);
    orbit(c, 6, 118, 30, -10, t * .9 * m, false, (x, y, s, a) => put(c, shard, x, y, a * 2, s));
  }

  // --- キャンディ大王: a bouncing gumdrop king with a sash, licorice moustache and a giant lollipop
  const SWEETS = [P.mint, P.yellow, P.sky, P.purple, P.coral];
  const dome = c => { c.beginPath(); c.moveTo(-78, 46); c.bezierCurveTo(-90, -20, -60, -88, 0, -88); c.bezierCurveTo(60, -88, 90, -20, 78, 46); c.quadraticCurveTo(78, 62, 60, 62); c.lineTo(-60, 62); c.quadraticCurveTo(-78, 62, -78, 46); c.closePath(); };
  const C = {
    sweet: i => part('c_sweet' + i, 44, c => { const col = SWEETS[i]; path(c, [[-10, 0], [-17, -7], [-17, 7]]); ink(c, col, 2.2); path(c, [[10, 0], [17, -7], [17, 7]]); ink(c, col, 2.2); oval(c, 0, 0, 10, 8, col, 2.6); line(c, [[-4, -5], [4, 5]], 2.2, P.white); }),
    body: rage => part('c_body' + rage, 200, c => {
      const body = rage ? '#ff6b3d' : P.orange, shade = rage ? '#d9442a' : '#e07b00';
      dome(c); ink(c, body, 4);
      c.save(); dome(c); c.clip(); oval(c, 0, 66, 100, 34, shade); c.fillStyle = '#ffffffcc'; for (let i = 0; i < 18; i++) { const x = ((i * 47) % 140) - 70, y = -70 + ((i * 71) % 120); c.save(); c.translate(x, y); c.rotate(i); c.fillRect(-2, -2, 4, 4); c.restore(); }
      c.translate(0, 12); c.rotate(-.5); c.fillStyle = P.white; c.fillRect(-120, -13, 240, 26); c.fillStyle = P.coral; for (let x = -120; x < 120; x += 20) { c.beginPath(); c.moveTo(x, -13); c.lineTo(x + 10, -13); c.lineTo(x + 2, 13); c.lineTo(x - 8, 13); c.closePath(); c.fill(); } c.strokeStyle = P.ink; c.lineWidth = 3; c.strokeRect(-120, -13, 240, 26); c.restore();
      dome(c); ink(c, null, 4); shine(c, -44, -56, 14, 6, -.7);
    }),
    arm: rage => part('c_arm' + rage, 90, c => { line(c, [[0, 0], [24, 0]], 14); line(c, [[0, 0], [24, 0]], 8, rage ? '#ff6b3d' : P.orange); circle(c, 30, 0, 11, P.white, 3); }),
    crown: () => part('c_crown', 90, c => { path(c, [[-30, 8], [-34, -22], [-16, -8], [0, -30], [16, -8], [34, -22], [30, 8]]); ink(c, P.pink, 3.5); for (const [x, y, col] of [[-20, 0, P.mint], [-6, -2, P.yellow], [10, 2, P.sky], [22, -2, P.white], [-2, -16, P.coral]]) { c.fillStyle = col; c.save(); c.translate(x, y); c.rotate(x); c.fillRect(-4, -1.5, 8, 3); c.restore(); } for (const [x, y, col] of [[-34, -24, P.mint], [0, -32, P.yellow], [34, -24, P.sky]]) circle(c, x, y, 5, col, 2.4); }),
    stick: () => part('c_stick', 100, c => { line(c, [[0, 46], [0, -34]], 10); line(c, [[0, 46], [0, -34]], 5, P.white); }),
    pop: () => part('c_pop', 70, c => { const R = 26; circle(c, 0, 0, R, P.white, 3.5); c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip(); c.strokeStyle = P.magenta; c.lineWidth = 7; c.beginPath(); for (let a = 0; a < TAU * 3; a += .2) { const r = a / (TAU * 3) * R; a ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(0, 0); } c.stroke(); c.restore(); circle(c, 0, 0, R, null, 3.5); }),
    medal: () => part('c_medal', 40, c => { star(c, 0, 0, 13, 6); ink(c, P.yellow, 3); })
  };
  function candy(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, rage = phase >= 3;
    const u = (t * .62) % 1, air = m && u < .36 ? Math.sin(u / .36 * Math.PI) : 0, land = m && u >= .36 && u < .56 ? Math.sin((u - .36) / .2 * Math.PI) : 0;
    const jump = air * 30 + roar * 10, sq = land * .16 - air * .06 + (roar ? Math.sin(t * 40) * .04 : 0) + charge * .08;
    if (!white) oval(c, 0, 62, 80 - jump * .8, 18 - jump * .2, '#3a0f3188');
    orbit(c, 5, 128, 22, 30, t * 1.1 * m, true, (x, y, s, a, i) => put(c, C.sweet(i), x, y, a * 3, s));
    c.translate(0, -jump); c.save(); c.translate(0, 60); c.scale(1 + sq, 1 - sq); c.translate(0, -60);
    const arm = C.arm(rage);
    for (const s of [-1, 1]) { const raise = s > 0 ? Math.max(charge, roar) : roar * .7, wave = s < 0 ? Math.sin(t * 5) * .4 * m : 0; put(c, arm, s * 66, 4, s * (.4 - raise * 1.1) + wave, s, 1); }
    put(c, C.body(rage));
    put(c, C.medal(), 30, 26, Math.sin(t * 3) * .2 * m);
    const fx = look[0] * 5 * m, fy = look[1] * 3 * m;
    c.save(); c.translate(fx, fy);
    eye(c, -22, -32, 13, look, { angry: rage ? 1.3 : roar ? 1 : 0 }); eye(c, 22, -32, 13, look, { angry: rage ? -1.3 : roar ? -1 : 0 });
    if (!white) {
      oval(c, -42, -10, 8, 5, '#ff8fc7'); oval(c, 42, -10, 8, 5, '#ff8fc7');
      const open = Math.max(roar, charge * .6);
      c.beginPath(); c.moveTo(-18, -4); c.quadraticCurveTo(0, 14 + open * 18, 18, -4); c.closePath(); ink(c, P.ink, 3); oval(c, 0, 4 + open * 8, 8, 4 + open * 3, P.coral);
      c.lineWidth = 8; c.strokeStyle = '#3a1d2e'; c.lineCap = 'round';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(s * 16, -20, s * 28, -10); c.quadraticCurveTo(s * 36, -2, s * 30, 2 + Math.sin(t * 6) * 2 * m); c.stroke(); }
      circle(c, 0, -16, 8, P.pink, 3); shine(c, -2, -19, 3, 1.6);
    }
    c.restore();
    put(c, C.crown(), -6, -88 - roar * 8, -.15 + Math.sin(t * 3.1 - .6) * .1 * m + sq * .6);
    c.restore();
    const lift = Math.max(charge, roar), lx = 104, ly = 20 - lift * 44;
    put(c, C.stick(), lx, ly);
    if (lift > .3) telegraph(c, lx, ly - 58, 36, P.yellow, t);
    put(c, C.pop(), lx, ly - 58, -t * (1.5 + lift * 6) * m, 1 + lift * .22);
    orbit(c, 5, 128, 22, 30, t * 1.1 * m, false, (x, y, s, a, i) => put(c, C.sweet(i), x, y, a * 3, s));
  }

  // --- 月夜の大コウモリ: huge flapping wings, crescent-moon belly, folds its wings before a dive -----
  const B = {
    wing: () => part('b_wing', 260, c => {
      // Shoulder at the origin, membrane spreading to the right with a scalloped trailing edge.
      c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(60, -70, 118, -54); c.lineTo(112, -20); c.quadraticCurveTo(98, -4, 88, 14); c.quadraticCurveTo(74, 0, 62, 20); c.quadraticCurveTo(48, 6, 34, 24); c.quadraticCurveTo(20, 10, 4, 18); c.closePath(); ink(c, '#3a2370', 4);
      c.save(); c.clip(); oval(c, 70, 30, 80, 34, '#2b1466'); c.restore();
      line(c, [[4, 0], [114, -50]], 3, '#9b5de5'); line(c, [[6, 4], [88, 10]], 3, '#9b5de5'); line(c, [[6, 6], [62, 18]], 3, '#9b5de5'); line(c, [[6, 8], [34, 22]], 3, '#9b5de5');
      c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(60, -70, 118, -54); c.lineTo(112, -20); c.quadraticCurveTo(98, -4, 88, 14); c.quadraticCurveTo(74, 0, 62, 20); c.quadraticCurveTo(48, 6, 34, 24); c.quadraticCurveTo(20, 10, 4, 18); c.closePath(); ink(c, null, 4);
      path(c, [[114, -56], [126, -66], [120, -50]]); ink(c, P.lemon, 2.4);
    }),
    body: () => part('b_body', 180, c => {
      for (const s of [-1, 1]) { path(c, [[s * 14, -40], [s * 40, -86], [s * 38, -34]]); ink(c, '#5a2d9c', 3.5); path(c, [[s * 20, -42], [s * 36, -74], [s * 34, -40]]); ink(c, P.pink, 0); }
      oval(c, 0, -10, 46, 44, '#5a2d9c', 4); c.save(); c.beginPath(); c.ellipse(0, -10, 46, 44, 0, 0, TAU); c.clip(); oval(c, 0, 26, 56, 22, '#3a1a6e'); c.restore(); oval(c, 0, -10, 46, 44, null, 4);
      oval(c, 0, 10, 24, 20, '#c9b6f2', 3); c.beginPath(); c.arc(-2, 10, 11, .6, TAU - .6); c.arc(4, 8, 9, TAU - .9, .9, true); c.closePath(); ink(c, P.lemon, 2.4);
      for (const s of [-1, 1]) { path(c, [[s * 14, 30], [s * 10, 42], [s * 18, 38], [s * 22, 44], [s * 24, 30]]); ink(c, P.lemon, 2.4); }
      shine(c, -20, -34, 9, 4);
    }),
    mini: () => part('b_mini', 40, c => { path(c, [[0, -2], [-14, -8], [-10, 2], [-4, 0], [0, 6], [4, 0], [10, 2], [14, -8]]); ink(c, '#3a2370', 2.2); circle(c, -2, -1, 1.2, P.lemon, 0); circle(c, 2, -1, 1.2, P.lemon, 0); })
  };
  function bat(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, rage = phase >= 3, dive = !!q.dive;
    const flap = Math.sin(t * (dive ? 0 : rage ? 9 : 6.5)) * m, hover = -24 + Math.sin(t * 3) * 8 * m;
    c.scale(1.12, 1.12); // the bat is all wings: a touch bigger so it reads as a boss
    if (!white) oval(c, 0, 66, 66 + hover * .3, 16, '#12063477');
    const mini = B.mini();
    orbit(c, 4, 130, 30, -30, -t * 1.6 * m, true, (x, y, s, a) => put(c, mini, x, y + Math.sin(t * 12 + a * 3) * 3, 0, s));
    c.translate(0, hover);
    const wing = B.wing(), fold = dive ? .45 : 1 - charge * .35, lift = charge * .3 + roar * .2;
    for (const s of [-1, 1]) put(c, wing, s * 26, -18, 0, s * fold * (1 + roar * .08), 1 - flap * .38 + lift);
    put(c, B.body(), 0, 0, dive ? (look[0] >= 0 ? .25 : -.25) : 0, 1 + roar * .05);
    const hx = look[0] * 3 * m;
    eye(c, -16 + hx, -24, 11, look, { angry: 1.4 + roar * .4, pupil: rage ? P.tomato : '#5a1238' }); eye(c, 16 + hx, -24, 11, look, { angry: -1.4 - roar * .4, pupil: rage ? P.tomato : '#5a1238' });
    if (!white) {
      const open = Math.max(roar, charge * .6);
      oval(c, hx, -4 + open * 3, 12, 4 + open * 8, P.ink, 3); if (open > .2) oval(c, hx, 0 + open * 5, 6, 2 + open * 3, P.coral);
      for (const s of [-1, 1]) { path(c, [[hx + s * 8, -6], [hx + s * 5, 4], [hx + s * 2, -6]]); ink(c, P.white, 2); }
    }
    orbit(c, 4, 130, 30, -30, -t * 1.6 * m, false, (x, y, s, a) => put(c, mini, x, y + Math.sin(t * 12 + a * 3) * 3, 0, s));
  }

  // --- 雪だるま将軍: three stacked snowballs in a general's bicorne, icicle sabre and a snowball to throw
  const S = {
    ball: r => part('s_ball' + r, r * 2 + 12, c => { circle(c, 0, 0, r, P.white, 4); c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); oval(c, r * .15, r * .75, r * 1.2, r * .5, '#cfe8ff'); c.restore(); circle(c, 0, 0, r, null, 4); shine(c, -r * .45, -r * .45, r * .22, r * .12); }),
    coat: () => part('s_coat', 120, c => {
      for (const s of [-1, 1]) { roundRect(c, s * 34 - 13, -36, 26, 12, 6); ink(c, P.yellow, 3); for (let k = 0; k < 4; k++) line(c, [[s * 34 - 10 + k * 7, -24], [s * 34 - 10 + k * 7, -16]], 3, P.yellow); }
      c.save(); c.rotate(-.55); c.fillStyle = P.tomato; c.fillRect(-48, -7, 96, 14); c.strokeStyle = P.ink; c.lineWidth = 3; c.strokeRect(-48, -7, 96, 14); c.restore();
      for (const y of [-14, 4, 22]) circle(c, 2, y, 4, P.ink, 0);
      star(c, -16, 2, 8, 3.6); ink(c, P.yellow, 2.4);
    }),
    hat: () => part('s_hat', 120, c => { c.beginPath(); c.moveTo(-50, 6); c.quadraticCurveTo(0, -46, 50, 6); c.quadraticCurveTo(0, -8, -50, 6); c.closePath(); ink(c, '#1d3b7a', 3.5); line(c, [[-44, 2], [0, -8], [44, 2]], 3, P.yellow); circle(c, 0, -18, 7, P.tomato, 2.6); circle(c, 0, -18, 3, P.white, 0); }),
    arm: () => part('s_arm', 90, c => { line(c, [[0, 0], [34, -4]], 6, '#7a4a2a'); line(c, [[24, -3], [32, -14]], 4, '#7a4a2a'); line(c, [[28, -4], [40, 2]], 4, '#7a4a2a'); }),
    sabre: () => part('s_sabre', 120, c => { path(c, [[0, -4], [70, -12], [78, -8], [70, -4], [0, 4]]); ink(c, '#c9f3ff', 3); line(c, [[6, -2], [66, -9]], 2, P.white); roundRect(c, -10, -9, 12, 18, 4); ink(c, P.yellow, 2.6); }),
    flake: () => part('s_flake', 30, c => { for (let k = 0; k < 3; k++) { c.save(); c.rotate(k * Math.PI / 3); line(c, [[-9, 0], [9, 0]], 3.4); line(c, [[-9, 0], [9, 0]], 1.6, P.white); c.restore(); } })
  };
  function snowman(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, rage = phase >= 3;
    const step = Math.sin(t * 4) * m, stomp = Math.max(roar, q.stomp || 0);
    if (!white) oval(c, 0, 68, 72, 16, '#0d2a5488');
    const flake = S.flake();
    orbit(c, 5, 120, 26, 10, t * .8 * m, true, (x, y, s, a) => put(c, flake, x, y, a, s));
    c.translate(0, -stomp * 10); c.save(); c.translate(0, 70); c.scale(1 + stomp * .08, 1 - stomp * .08); c.translate(0, -70);
    put(c, S.ball(52), step * 2, 26); 
    const throwing = charge, ax = 44, ay = -40;
    put(c, S.arm(), -ax + 4, ay + 6 + step * 2, Math.PI + (.4 - roar * .6), 1, -1);
    put(c, S.sabre(), -ax - 26, ay - 6 + step * 2, Math.PI + .5 - roar * .9 - stomp * .3);
    put(c, S.ball(38), -step * 2, -34 + Math.abs(step) * 2);
    put(c, S.coat(), -step * 2, -34 + Math.abs(step) * 2);
    // Throwing arm winds back with a snowball while a volley is coming.
    const wind = -.5 - throwing * 1.6;
    put(c, S.arm(), ax - 4, ay + 6, wind);
    if (!white || true) { const hx = ax - 4 + Math.cos(wind) * 36, hy = ay + 6 + Math.sin(wind) * 36; if (!white) circle(c, hx, hy, 10 + throwing * 4, P.white, 3); }
    const hb = -88 + Math.abs(step) * 3 - roar * 4;
    put(c, S.ball(30), step * 1.5, hb);
    c.save(); c.translate(step * 1.5 + look[0] * 3 * m, hb);
    eye(c, -11, -6, 6.5, look, { angry: 1.5 + roar * .5, pupil: rage ? P.tomato : P.ink });
    eye(c, 11, -6, 6.5, look, { angry: -1.5 - roar * .5, pupil: rage ? P.tomato : P.ink });
    if (!white) {
      const dir = look[0] >= 0 ? 1 : -1; path(c, [[0, 0], [dir * 30, 4], [0, 8]]); ink(c, P.orange, 2.6);
      if (roar > .2) oval(c, 0, 18, 9, 4 + roar * 4, P.ink, 0); else for (let k = -2; k <= 2; k++) circle(c, k * 5, 17 - Math.abs(k) * 1.4, 2.2, P.ink, 0);
    }
    c.restore();
    put(c, S.hat(), step * 1.5, hb - 26 - roar * 6, Math.sin(t * 2.2) * .06 * m);
    c.restore();
    orbit(c, 5, 120, 26, 10, t * .8 * m, false, (x, y, s, a) => put(c, flake, x, y, a, s));
  }

  // --- ドーナツ魔神: a frosted donut genie with a soft-serve tail and a spinning sprinkle halo -------
  const SPR = [P.mint, P.yellow, P.sky, P.white, P.coral, P.purple];
  const D = {
    ring: rage => part('d_ring' + rage, 170, c => {
      const R = 64, r = 20, ring = () => { c.beginPath(); c.arc(0, 0, R, 0, TAU); c.arc(0, 0, r, 0, TAU, true); };
      ring(); ink(c, '#f2c48d', 4);
      c.save(); ring(); c.clip(); oval(c, 0, 52, 80, 26, '#d99a5b');
      // Frosting: the top of the ring, ending in a wavy drip line.
      const drip = x => 10 + Math.sin(x * .13) * 6 + Math.max(0, Math.sin(x * .07 + 1)) * 12;
      c.beginPath(); c.moveTo(-R - 6, -R - 6); c.lineTo(R + 6, -R - 6); for (let x = R + 6; x >= -R - 6; x -= 4) c.lineTo(x, drip(x)); c.closePath(); c.fillStyle = rage ? '#ff5f8a' : P.pink; c.fill();
      c.beginPath(); for (let x = R + 6; x >= -R - 6; x -= 4) x === R + 6 ? c.moveTo(x, drip(x)) : c.lineTo(x, drip(x)); c.lineWidth = 3; c.strokeStyle = P.ink; c.stroke();
      for (let i = 0; i < 24; i++) { const a = Math.PI * 1.05 + (i * 0.37) % (Math.PI * .9), d = 32 + (i * 11) % 26, x = Math.cos(a) * d, y = Math.sin(a) * d; if (y > drip(x) - 6) continue; c.save(); c.translate(x, y); c.rotate(i * 1.7); c.fillStyle = SPR[i % SPR.length]; c.fillRect(-4.5, -1.6, 9, 3.2); c.restore(); }
      c.restore();
      ring(); ink(c, null, 4); circle(c, 0, 0, r, null, 3);
      shine(c, -32, -40, 11, 4, -.8);
    }),
    tail: () => part('d_tail', 140, c => {
      c.beginPath(); c.moveTo(-34, -10); c.quadraticCurveTo(-30, 30, -4, 54); c.quadraticCurveTo(10, 66, 22, 56); c.quadraticCurveTo(30, 46, 18, 42); c.quadraticCurveTo(28, 20, 34, -10); c.closePath(); ink(c, P.white, 4);
      for (const [y, w] of [[2, 30], [20, 24], [36, 16]]) line(c, [[-w, y], [w * .8, y + 6]], 3, '#ffc4dd');
    }),
    arm: () => part('d_arm', 80, c => { line(c, [[0, 0], [26, 6]], 13); line(c, [[0, 0], [26, 6]], 7, '#f2c48d'); circle(c, 32, 8, 10, P.white, 3); }),
    cherry: () => part('d_cherry', 50, c => { line(c, [[0, -6], [8, -20]], 3, '#2d7a3a'); circle(c, 0, 0, 9, P.tomato, 3); shine(c, -3, -3, 3, 1.6); })
  };
  function donut(c, q) {
    const { t, look, charge, roar, phase } = q, m = q.motion ? 1 : 0, rage = phase >= 3, spin = charge > .5;
    const hover = Math.sin(t * 2.2) * 8 * m - 30;
    if (!white) { oval(c, 0, 66, 60 - hover * .2, 15, '#3a0f3188'); }
    c.translate(0, hover);
    put(c, D.tail(), Math.sin(t * 3) * 4 * m, 58, Math.sin(t * 2.5) * .08 * m);
    for (const s of [-1, 1]) put(c, D.arm(), s * 56, -2, s * (spin ? -.6 - Math.sin(t * 14) * .2 : .3 + Math.sin(t * 3 + s) * .2 * m) - (s > 0 ? 0 : Math.PI) * 0, s, 1);
    // Sprinkle halo: spins fast while it is firing the spiral.
    if (!white) { const n = 12, sp = t * (spin ? 7 : 1.2) * m * (rage && Math.floor(t / 4) % 2 ? -1 : 1); for (let i = 0; i < n; i++) { const a = sp + i * TAU / n, x = Math.cos(a) * 88, y = Math.sin(a) * 30 - 6; c.save(); c.translate(x, y); c.rotate(a * 2); c.fillStyle = SPR[i % SPR.length]; c.fillRect(-6, -2.2, 12, 4.4); c.lineWidth = 1.6; c.strokeStyle = P.ink; c.strokeRect(-6, -2.2, 12, 4.4); c.restore(); } }
    put(c, D.ring(rage), 0, 0, 0, 1 + roar * .06 + (spin ? Math.sin(t * 20) * .015 : 0));
    const hx = look[0] * 4 * m;
    eye(c, -26 + hx, -30, 10, look, { angry: rage ? 1.3 : roar ? .9 : 0 }); eye(c, 26 + hx, -30, 10, look, { angry: rage ? -1.3 : roar ? -.9 : 0 });
    if (!white) {
      const open = Math.max(roar, spin ? .5 : 0);
      c.beginPath(); c.moveTo(-22 + hx, 34); c.quadraticCurveTo(hx, 48 + open * 14, 22 + hx, 34); c.closePath(); ink(c, P.ink, 3); oval(c, hx, 40 + open * 6, 7, 3 + open * 3, P.coral);
      oval(c, -40 + hx, -8, 7, 4, '#ff8fc7'); oval(c, 40 + hx, -8, 7, 4, '#ff8fc7');
    }
    put(c, D.cherry(), 4, -66 + Math.sin(t * 3.4) * 3 * m - roar * 8, Math.sin(t * 2.6) * .15 * m);
  }

  const RIGS = { wilds, frost, candy, bat, snowman, donut };
  return {
    draw(c, kind, pose) {
      const q = { t: 0, motion: true, white: false, look: [0, .3], charge: 0, roar: 0, phase: 1, ...pose };
      const m = c.getTransform(); zoom = Math.hypot(m.a, m.b);
      white = !!q.white; c.save(); (RIGS[kind] || wilds)(c, q); c.restore(); white = false;
    },
    // Build every part up front (at load) so the first boss frame does not hitch.
    warm() { const c = document.createElement('canvas').getContext('2d'); for (const w of [false, true]) { white = w; for (const k of Object.keys(RIGS)) for (const phase of [1, 3]) RIGS[k](c, { t: 0, motion: false, look: [0, 0], charge: 0, roar: 0, phase }); } white = false; }
  };
}

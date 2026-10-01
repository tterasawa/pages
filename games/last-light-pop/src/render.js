// Pop-style renderer. Every sprite, prop and effect is drawn procedurally here at load time.
import { orbitRadius, frostRadius } from './core.js';

const TAU = Math.PI * 2;
export const PALETTE = Object.freeze({
  ink: '#22114a', inkSoft: '#3a2370', cream: '#fff6e3', white: '#ffffff',
  ground: '#3a2a7c', groundAlt: '#41308a', groundDot: '#5440a6',
  coral: '#ff5f8a', tomato: '#ff5a5f', orange: '#ff9f1c', yellow: '#ffd23f', lemon: '#fff07a',
  mint: '#3ee0a0', teal: '#2ec4b6', sky: '#4cc9f0', blue: '#4361ee', purple: '#9b5de5', magenta: '#f15bb5', pink: '#ff8fc7'
});
const P = PALETTE;
const CONFETTI = [P.coral, P.yellow, P.mint, P.sky, P.purple, P.orange, P.pink, P.white];
const ENEMY_COLORS = [P.tomato, P.orange, P.teal, P.purple, P.magenta, P.orange, P.mint, P.mint, P.sky, P.pink, P.purple, P.orange];
const ENEMY_SIZES = [64, 62, 84, 62, 132, 74, 70, 40, 78, 62, 62, 124];
// Per-stage palettes: [ground, alt checker, dots, sparkle, boss body, boss shade]
const STAGE_LOOK = { wilds: ['#3a2a7c', '#41308a', '#5440a6', '#6d58c4', '#f15bb5', '#c93f92'], frost: ['#2c4f86', '#335a96', '#5b86c4', '#cfe8ff', '#4cc9f0', '#2a9fd0'], candy: ['#7a2f6e', '#863879', '#b14f99', '#ffb3d9', '#ff9f1c', '#e07b00'] };
const COMIC_WORDS = ['POP!', 'BAM!', 'POW!', 'ZAP!', 'BOOM!', 'WHAM!'];
const FONT = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Arial Rounded MT Bold","Nunito","Segoe UI",system-ui,sans-serif';

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

// --- drawing helpers for outlined, flat "sticker" shapes -------------------------------------
function path(c, points) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
function ink(c, fill, lw = 3, stroke = P.ink) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); } }
function circle(c, x, y, r, fill, lw = 3, stroke) { c.beginPath(); c.arc(x, y, r, 0, TAU); ink(c, fill, lw, stroke); }
function oval(c, x, y, rx, ry, fill, lw = 0, stroke, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); ink(c, fill, lw, stroke); }
function star(c, x, y, outer, inner, points = 5, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < points * 2; i++) { const r = i % 2 ? inner : outer, a = rot + i * Math.PI / points; i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function shine(c, x, y, rx, ry, rot = -0.5) { oval(c, x, y, rx, ry, '#ffffffb8', 0, null, rot); }
function eye(c, x, y, r, look = [0, 0], angry = 0) {
  oval(c, x, y, r, r * 1.15, P.white, 2);
  circle(c, x + look[0] * r * .35, y + look[1] * r * .35, r * .55, P.ink, 0);
  circle(c, x + look[0] * r * .35 - r * .2, y + look[1] * r * .35 - r * .22, r * .2, P.white, 0);
  if (angry) { c.beginPath(); c.moveTo(x - r * 1.2, y - r * 1.25 - angry * r * .5); c.lineTo(x + r * 1.1, y - r * 1.05 + angry * r * .4); c.lineWidth = 3; c.strokeStyle = P.ink; c.lineCap = 'round'; c.stroke(); }
}
function shadow(c, y, rx, ry = rx * .32) { oval(c, 0, y, rx, ry, '#120634', 0); }

function sprite(fn, size = 96) {
  const out = canvas(size * 2), c = out.getContext('2d'); c.scale(2, 2); c.translate(size / 2, size / 2); fn(c);
  const data = c.getImageData(0, 0, out.width, out.height).data; let x0 = out.width, y0 = out.height, x1 = 0, y1 = 0;
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) if (data[(y * out.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (x1 < x0) { x0 = y0 = 0; x1 = y1 = 1; }
  const trimmed = canvas(x1 - x0 + 1, y1 - y0 + 1); trimmed.getContext('2d').drawImage(out, x0, y0, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return { image: trimmed, x: x0 / 2, y: y0 / 2, sourceSize: size };
}
function tinted(s, color) { const img = canvas(s.image.width, s.image.height), c = img.getContext('2d'); c.drawImage(s.image, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = color; c.fillRect(0, 0, img.width, img.height); return { ...s, image: img }; }

function makeSprites() {
  const S = {};
  const hero = (hood, dark, hat) => sprite(c => {
    shadow(c, 21, 18);
    oval(c, -7, 19, 5, 4, P.ink, 0); oval(c, 7, 19, 5, 4, P.ink, 0);
    c.beginPath(); c.moveTo(-12, -2); c.quadraticCurveTo(-19, 14, -15, 19); c.lineTo(15, 19); c.quadraticCurveTo(19, 14, 12, -2); c.closePath(); ink(c, hood, 3);
    c.beginPath(); c.moveTo(-15, 15); c.lineTo(15, 15); c.lineTo(15, 19); c.lineTo(-15, 19); c.closePath(); ink(c, dark, 0);
    c.beginPath(); c.moveTo(-15, 19); c.lineTo(15, 19); c.lineWidth = 3; c.strokeStyle = P.ink; c.stroke();
    circle(c, 0, -10, 17, hood, 3);
    if (hat === 'star') { c.beginPath(); c.moveTo(-4, -26); c.quadraticCurveTo(2, -36, 10, -33); c.lineWidth = 3; c.strokeStyle = P.ink; c.stroke(); star(c, 11, -34, 6, 2.8); ink(c, P.yellow, 2.4); }
    if (hat === 'wind') { path(c, [[-14, -20], [-30, -26], [-24, -16]]); ink(c, P.white, 2.4); path(c, [[-12, -14], [-26, -14], [-20, -8]]); ink(c, P.white, 2.4); c.fillStyle = P.yellow; c.fillRect(-16, -20, 32, 5); c.strokeStyle = P.ink; c.lineWidth = 2.4; c.strokeRect(-16, -20, 32, 5); }
    if (hat === 'horn') { for (const k of [-1, 1]) { path(c, [[k * 9, -24], [k * 18, -38], [k * 15, -21]]); ink(c, P.cream, 2.6); } c.fillStyle = '#c7c2d9'; c.beginPath(); c.arc(0, -10, 17, Math.PI * 1.08, Math.PI * 1.92); c.lineTo(0, -10); c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = P.ink; c.beginPath(); c.arc(0, -10, 17, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
    if (hat === 'witch') { path(c, [[-20, -20], [20, -20], [6, -26], [10, -46], [-6, -27]]); ink(c, P.purple, 3); c.fillStyle = P.yellow; c.fillRect(-9, -25, 16, 4); star(c, 9, -46, 5, 2.2); ink(c, P.yellow, 2); }
    circle(c, 0, -7, 11.5, P.cream, 2.5);
    oval(c, -4.5, -7, 2.4, 3.3, P.ink); oval(c, 4.5, -7, 2.4, 3.3, P.ink);
    circle(c, -5.3, -8.3, .9, P.white, 0); circle(c, 3.7, -8.3, .9, P.white, 0);
    oval(c, -8, -2.5, 2.6, 1.6, '#ff9fb5'); oval(c, 8, -2.5, 2.6, 1.6, '#ff9fb5');
    c.beginPath(); c.arc(0, -3.2, 2.2, .2, Math.PI - .2); c.lineWidth = 1.8; c.strokeStyle = P.ink; c.stroke();
    shine(c, -8, -19, 4.5, 2.4);
    c.beginPath(); c.moveTo(20, -1); c.quadraticCurveTo(20, -7, 25, -7); c.quadraticCurveTo(30, -7, 30, -1); c.lineWidth = 2.5; c.strokeStyle = P.ink; c.stroke();
    roundRect(c, 18, -1, 14, 16, 4); ink(c, P.yellow, 3);
    roundRect(c, 21, 2, 8, 10, 3); ink(c, P.lemon, 0); oval(c, 25, 8, 2, 3, P.orange);
    oval(c, 13, 5, 4, 4, hood, 2.5);
  });
  S.__hero = hero; S.player = S.player_keeper = hero(P.coral, '#e0406f', 'star'); S.player_runner = hero(P.sky, '#2a9fd0', 'wind'); S.player_knight = hero(P.purple, '#7b2cbf', 'horn'); S.player_witch = hero(P.mint, '#22b884', 'witch');

  S.enemy0 = sprite(c => {
    shadow(c, 19, 16);
    c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 17 + Math.sin(a * 7) * 2.6; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); ink(c, P.tomato, 3);
    c.save(); c.clip(); oval(c, 0, 14, 22, 10, '#d93e4c'); c.restore();
    c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 17 + Math.sin(a * 7) * 2.6; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); ink(c, null, 3);
    eye(c, -6, -2, 4.6, [.4, .5], 1); eye(c, 6, -2, 4.6, [-.4, .5], -1);
    path(c, [[-5, 7], [-3, 10], [-1, 7], [1, 10], [3, 7], [5, 10], [6, 6], [-6, 6]]); ink(c, P.white, 1.8);
    shine(c, -8, -11, 4, 2.2);
  }, 72);
  S.enemy1 = sprite(c => {
    shadow(c, 17, 18);
    for (const s of [-1, 1]) {
      oval(c, s * 15, -5, 13, 11, P.orange, 3, P.ink, s * .5); oval(c, s * 13, 9, 8, 7, '#ffbe4d', 3, P.ink, -s * .4);
      circle(c, s * 17, -7, 3.5, P.yellow, 0); circle(c, s * 11, -1, 2, P.yellow, 0); circle(c, s * 13, 10, 2.4, P.white, 0);
    }
    oval(c, 0, 2, 6.5, 13, P.inkSoft, 3);
    c.beginPath(); c.moveTo(-2, -10); c.quadraticCurveTo(-6, -20, -10, -20); c.moveTo(2, -10); c.quadraticCurveTo(6, -20, 10, -20); c.lineWidth = 2.4; c.strokeStyle = P.ink; c.stroke();
    circle(c, -10, -20, 2.6, P.yellow, 2); circle(c, 10, -20, 2.6, P.yellow, 2);
    eye(c, -2.6, -4, 2.6, [0, .3]); eye(c, 2.6, -4, 2.6, [0, .3]);
  }, 72);
  S.enemy2 = sprite(c => {
    shadow(c, 24, 24);
    c.lineWidth = 5; c.strokeStyle = P.ink; c.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(s * 16, i * 9 + 3); c.lineTo(s * 26, i * 11 + 9); c.stroke(); }
    circle(c, 0, 15, 10, P.inkSoft, 3);
    eye(c, -4.5, 16, 3, [0, .5], 1); eye(c, 4.5, 16, 3, [0, .5], -1);
    oval(c, 0, -1, 22, 21, P.teal, 3);
    c.save(); c.beginPath(); c.ellipse(0, -1, 22, 21, 0, 0, TAU); c.clip(); oval(c, 0, 16, 26, 10, '#1f9e93'); c.restore();
    oval(c, 0, -1, 22, 21, null, 3);
    c.beginPath(); c.moveTo(0, -21); c.lineTo(0, 19); c.lineWidth = 3; c.strokeStyle = P.ink; c.stroke();
    for (const [x, y, r] of [[-10, -9, 4], [9, -6, 5], [-11, 6, 3.4], [11, 8, 3]]) circle(c, x, y, r, P.mint, 2.2);
    shine(c, -9, -15, 5, 2.4);
  }, 88);
  S.enemy3 = sprite(c => {
    shadow(c, 21, 14);
    for (const s of [-1, 1]) { path(c, [[s * 12, -4], [s * 28, -14], [s * 25, -4], [s * 30, 2], [s * 22, 4], [s * 23, 10], [s * 12, 6]]); ink(c, '#7d3fc9', 2.6); }
    circle(c, 0, 0, 16, P.purple, 3);
    circle(c, 0, 1, 11, P.white, 2.4);
    circle(c, 1, 2, 6.5, P.sky, 2); circle(c, 1, 2, 3.4, P.ink, 0); circle(c, -1, 0, 1.6, P.white, 0);
    c.beginPath(); c.arc(0, 1, 11.5, Math.PI * 1.08, Math.PI * 1.92); c.lineWidth = 3.5; c.strokeStyle = P.ink; c.stroke();
    path(c, [[-6, 15], [-3, 21], [0, 15], [3, 21], [6, 15]]); ink(c, P.purple, 2.4);
    shine(c, -8, -9, 3.6, 2);
  }, 72);
  const bossOf = (body, shade, crown) => sprite(c => {
    shadow(c, 42, 40);
    path(c, [[-30, 0], [-46, 22], [-30, 40], [30, 40], [46, 22], [30, 0]]); ink(c, '#7b2cbf', 3.5);
    for (const s of [-1, 1]) { path(c, [[s * 20, -26], [s * 34, -48], [s * 32, -20]]); ink(c, P.cream, 3.5); }
    circle(c, 0, 4, 36, body, 4);
    c.save(); c.beginPath(); c.arc(0, 4, 36, 0, TAU); c.clip(); oval(c, 0, 34, 44, 18, shade); c.restore(); circle(c, 0, 4, 36, null, 4);
    path(c, [[-24, -26], [-26, -48], [-13, -36], [0, -54], [13, -36], [26, -48], [24, -26]]); ink(c, crown, 3.5);
    circle(c, 0, -38, 4, P.coral, 2.4); circle(c, -17, -33, 2.8, P.sky, 2); circle(c, 17, -33, 2.8, P.mint, 2);
    eye(c, -13, -4, 8.5, [.2, .45], 1.2); eye(c, 13, -4, 8.5, [-.2, .45], -1.2);
    c.beginPath(); c.moveTo(-18, 14); c.quadraticCurveTo(0, 30, 18, 14); c.closePath(); ink(c, P.ink, 3);
    path(c, [[-14, 15], [-10, 21], [-6, 17], [-2, 23], [2, 17], [6, 23], [10, 17], [14, 15]]); ink(c, P.white, 0);
    shine(c, -18, -14, 7, 3.4);
  }, 140);
  S.enemy4 = S.enemy4_wilds = bossOf(P.magenta, '#c93f92', P.yellow); S.enemy4_frost = bossOf(P.sky, '#2a9fd0', P.white); S.enemy4_candy = bossOf(P.orange, '#e07b00', P.pink);
  S.enemy5 = sprite(c => { shadow(c, 18, 20); oval(c, 0, 2, 20, 14, P.orange, 3); oval(c, 0, 9, 16, 6, '#e07b00'); oval(c, 0, 2, 20, 14, null, 3); path(c, [[14, -4], [24, -10], [20, 2]]); ink(c, P.cream, 2.4); path(c, [[-6, -12], [-2, -20], [3, -12]]); ink(c, '#e07b00', 2.4); eye(c, 9, -3, 3.4, [.6, .2], 1); oval(c, 18, 4, 4, 3, '#ffbe4d', 2); for (const x of [-12, -4, 4, 12]) { c.fillStyle = P.ink; c.fillRect(x - 2, 13, 4, 7); } shine(c, -8, -6, 5, 2.2); }, 72);
  S.enemy6 = sprite(c => { shadow(c, 18, 18); c.beginPath(); c.moveTo(-19, 14); c.quadraticCurveTo(-22, -18, 0, -18); c.quadraticCurveTo(22, -18, 19, 14); c.closePath(); ink(c, P.mint, 3); oval(c, 0, 10, 16, 5, '#22b884'); eye(c, -6, -2, 4, [0, .4]); eye(c, 6, -2, 4, [0, .4]); c.beginPath(); c.arc(0, 6, 3, 0, Math.PI); c.lineWidth = 2; c.strokeStyle = P.ink; c.stroke(); shine(c, -9, -10, 4, 2.4); }, 64);
  S.enemy7 = sprite(c => { shadow(c, 9, 10); c.beginPath(); c.moveTo(-10, 8); c.quadraticCurveTo(-12, -10, 0, -10); c.quadraticCurveTo(12, -10, 10, 8); c.closePath(); ink(c, '#7af5c4', 2.4); eye(c, -3, -1, 2.2, [0, .4]); eye(c, 3, -1, 2.2, [0, .4]); }, 36);
  S.enemy8 = sprite(c => { shadow(c, 18, 20); for (const x of [-14, 14]) oval(c, x, 12, 5, 4, '#2a9fd0', 2.4); oval(c, -20, -2, 6, 5, '#7bd8f5', 2.4); oval(c, 0, 0, 18, 14, P.sky, 3); for (const [x, y] of [[-7, -4], [6, -4], [0, 5]]) { path(c, [[x - 5, y], [x, y - 4], [x + 5, y], [x, y + 4]]); ink(c, '#2a9fd0', 1.8); } eye(c, -21, -3, 2.2, [-.5, 0]); shine(c, -6, -9, 5, 2); }, 72);
  S.shield = sprite(c => { c.beginPath(); c.arc(0, 0, 26, -1.1, 1.1); c.lineWidth = 6; c.strokeStyle = P.ink; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = P.white; c.stroke(); }, 64);
  S.enemy9 = sprite(c => { shadow(c, 16, 14); oval(c, 0, 6, 12, 11, P.white, 3); c.fillStyle = P.coral; c.fillRect(-2, 0, 4, 12); c.fillRect(-6, 4, 12, 4); circle(c, 0, -9, 10, P.pink, 3); roundRect(c, -8, -21, 16, 7, 3); ink(c, P.white, 2.4); c.fillStyle = P.coral; c.fillRect(-1.5, -20, 3, 5); c.fillRect(-3.5, -18.5, 7, 2); eye(c, -3.5, -9, 2.2, [0, .3]); eye(c, 3.5, -9, 2.2, [0, .3]); }, 60);
  S.enemy10 = sprite(c => { shadow(c, 16, 14); oval(c, 0, 4, 12, 13, P.purple, 3); circle(c, 0, -10, 9, '#7d3fc9', 3); roundRect(c, -9, -14, 18, 6, 3); ink(c, P.ink, 0); circle(c, 4, -11, 2.4, P.coral, 0); roundRect(c, 6, -2, 20, 5, 2); ink(c, P.ink, 0); }, 60);
  S.altar = sprite(c => { shadow(c, 26, 26, 7); path(c, [[-24, 26], [-18, 6], [18, 6], [24, 26]]); ink(c, '#5b4a8a', 3); roundRect(c, -20, 0, 40, 9, 3); ink(c, '#7a68ad', 3); star(c, 0, -18, 15, 6.5); ink(c, P.purple, 3); star(c, 0, -18, 7, 3); ink(c, P.pink, 0); for (const x of [-14, 14]) { c.fillStyle = P.ink; c.fillRect(x - 2, -10, 4, 12); oval(c, x, -14, 3, 5, P.orange, 1.6); } }, 72);
  S.relicOrb = sprite(c => { circle(c, 0, 0, 14, P.purple, 3); star(c, 0, 0, 8, 3.5); ink(c, P.lemon, 2); }, 40);
  const prop = (fn, size) => sprite(fn, size);
  S.snowman = prop(c => { shadow(c, 22, 16, 5); circle(c, 0, 10, 13, P.white, 3); circle(c, 0, -8, 9, P.white, 3); path(c, [[0, -8], [10, -6], [0, -5]]); ink(c, P.orange, 1.6); circle(c, -3, -10, 1.4, P.ink, 0); circle(c, 3, -10, 1.4, P.ink, 0); c.fillStyle = P.coral; c.fillRect(-9, -2, 18, 4); }, 56);
  S.iceShard = prop(c => { shadow(c, 14, 18, 5); for (const [x, h, w, col] of [[-8, 18, 6, '#bfe9ff'], [8, 14, 5, '#e8fbff'], [0, 26, 7, '#9be7ff']]) { path(c, [[x - w, 13], [x, 13 - h], [x + w, 13]]); ink(c, col, 2.6); } }, 56);
  S.snowPine = prop(c => { shadow(c, 26, 20, 6); c.fillStyle = P.ink; c.fillRect(-3, 10, 6, 14); for (const [y, w] of [[12, 22], [0, 17], [-12, 12]]) { path(c, [[-w, y], [0, y - 20], [w, y]]); ink(c, '#2ec4b6', 3); path(c, [[-w * .5, y - 8], [0, y - 20], [w * .5, y - 8]]); ink(c, P.white, 0); } }, 72);
  S.lollipop = prop(c => { shadow(c, 26, 10, 4); c.fillStyle = P.cream; c.fillRect(-2, -4, 4, 30); c.strokeStyle = P.ink; c.lineWidth = 2; c.strokeRect(-2, -4, 4, 30); circle(c, 0, -14, 13, P.pink, 3); c.strokeStyle = P.white; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 12; a += .3) c.lineTo(Math.cos(a) * a * .9, -14 + Math.sin(a) * a * .9); c.stroke(); }, 64);
  S.cupcake = prop(c => { shadow(c, 16, 16, 5); path(c, [[-13, 2], [13, 2], [9, 16], [-9, 16]]); ink(c, P.sky, 2.6); circle(c, 0, -2, 12, P.cream, 2.6); circle(c, 0, -10, 8, P.pink, 2.4); circle(c, 0, -18, 3.5, P.tomato, 2); }, 48);
  S.gumdrop = prop(c => { shadow(c, 12, 14, 4); c.beginPath(); c.moveTo(-13, 12); c.quadraticCurveTo(-12, -12, 0, -12); c.quadraticCurveTo(12, -12, 13, 12); c.closePath(); ink(c, P.yellow, 2.6); for (const [x, y] of [[-4, -2], [5, 3], [0, 7]]) circle(c, x, y, 1.6, P.white, 0); }, 40);
  S.gem = sprite(c => { path(c, [[0, -9], [7, -1], [0, 9], [-7, -1]]); ink(c, P.mint, 2.4); path(c, [[0, -9], [0, 9], [-7, -1]]); ink(c, '#22b884', 0); path(c, [[-7, -1], [7, -1], [0, 9], [-7, -1]]); ink(c, null, 2.4); oval(c, -2.2, -3.5, 1.6, 2.6, P.white, 0, null, .5); }, 26);
  S.gemBig = sprite(c => { star(c, 0, 0, 11, 5.4); ink(c, P.yellow, 2.6); star(c, 0, 1.3, 6, 3); ink(c, P.lemon, 0); oval(c, -3, -3.5, 1.8, 2.8, P.white, 0, null, .6); }, 30);
  S.gemMid = sprite(c => { path(c, [[0, -10], [8, -2], [0, 10], [-8, -2]]); ink(c, P.sky, 2.4); path(c, [[0, -10], [0, 10], [-8, -2]]); ink(c, '#2a9fd0', 0); path(c, [[-8, -2], [8, -2], [0, 10]]); ink(c, null, 2.4); oval(c, -2.5, -4, 1.7, 2.8, P.white, 0, null, .5); }, 28);
  S.heal = sprite(c => { c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(-16, 0, -10, -14, 0, -6); c.bezierCurveTo(10, -14, 16, 0, 0, 10); ink(c, P.coral, 2.8); oval(c, -5, -5, 2.6, 1.6, P.white, 0, null, -.6); }, 32);
  S.drone = sprite(c => {
    oval(c, -8, -9, 7, 5, '#ffffffd0', 2.2, P.ink, -.5); oval(c, 8, -9, 7, 5, '#ffffffd0', 2.2, P.ink, .5);
    oval(c, 0, 0, 10, 9, P.yellow, 3);
    c.save(); c.beginPath(); c.ellipse(0, 0, 10, 9, 0, 0, TAU); c.clip(); c.fillStyle = P.ink; c.fillRect(-3, -10, 3, 20); c.fillRect(4, -10, 3, 20); c.restore(); oval(c, 0, 0, 10, 9, null, 3);
    circle(c, -6, -1, 2.4, P.white, 1.6); circle(c, -6, -1, 1.1, P.ink, 0);
  }, 40);
  for (const [name, col] of [['shotY', P.yellow], ['shotP', P.pink]]) S[name] = sprite(c => {
    c.fillStyle = col + '66'; c.beginPath(); c.moveTo(-26, 0); c.lineTo(-4, -4); c.lineTo(-4, 4); c.closePath(); c.fill();
    oval(c, 0, 0, 10, 6, P.ink); oval(c, 0, 0, 8, 4, col); oval(c, 2, -1, 3.5, 1.6, P.white);
  }, 64);
  for (const [name, col] of [['foeA', P.tomato], ['foeB', P.orange]]) S[name] = sprite(c => { circle(c, 0, 0, 10, P.ink, 0); circle(c, 0, 0, 7.5, col, 0); circle(c, -2.2, -2.2, 2.6, P.white, 0); }, 24);
  for (const [name, body, trim] of [['chest', P.coral, P.yellow], ['chestBig', P.purple, P.yellow]]) S[name] = sprite(c => {
    shadow(c, 16, 20, 5);
    roundRect(c, -18, -2, 36, 18, 4); ink(c, body, 3);
    c.beginPath(); c.moveTo(-18, -2); c.quadraticCurveTo(-18, -18, 0, -18); c.quadraticCurveTo(18, -18, 18, -2); c.closePath(); ink(c, body, 3);
    c.fillStyle = trim; c.fillRect(-4, -18, 8, 34); c.fillRect(-18, -4, 36, 5); c.strokeStyle = P.ink; c.lineWidth = 2.4; c.strokeRect(-4, -18, 8, 34); c.strokeRect(-18, -4, 36, 5);
    roundRect(c, -5, -3, 10, 10, 3); ink(c, P.lemon, 2.4); circle(c, 0, 2, 1.8, P.ink, 0);
    oval(c, -10, -12, 4, 2, '#ffffffaa', 0, null, -.4);
  }, 48);
  S.boomerS = sprite(c => { star(c, 0, 0, 15, 6.5); ink(c, P.yellow, 3); star(c, 0, 0, 7, 3); ink(c, P.orange, 0); circle(c, 0, 0, 2.4, P.ink, 0); }, 40);
  S.mine = sprite(c => { shadow(c, 9, 12, 4); circle(c, 0, 0, 10, P.coral, 3); c.fillStyle = P.white; c.fillRect(-10, -2, 20, 4); c.strokeStyle = P.ink; c.lineWidth = 2; c.strokeRect(-10, -2, 20, 4); roundRect(c, -3, -15, 6, 6, 2); ink(c, P.ink, 0); oval(c, -4, -5, 2.6, 1.6, '#ffffffaa'); }, 34);
  S.mineLit = tinted(S.mine, P.yellow);
  S.fallStar = sprite(c => { c.fillStyle = '#ffd23f66'; c.beginPath(); c.moveTo(-6, -30); c.lineTo(6, -30); c.lineTo(3, 0); c.lineTo(-3, 0); c.closePath(); c.fill(); star(c, 0, 0, 11, 5); ink(c, P.lemon, 2.6); }, 72);
  for (const [name, col, draw] of [
    ['sp1', P.coral, c => { c.lineWidth = 6; c.strokeStyle = P.ink; c.beginPath(); c.arc(0, 0, 7, Math.PI, 0, true); c.stroke(); c.lineWidth = 3.4; c.strokeStyle = P.white; c.stroke(); c.fillStyle = P.white; c.fillRect(-8.5, -4, 3.5, 4); c.fillRect(5, -4, 3.5, 4); }],
    ['sp2', P.ink, c => { circle(c, 0, 2, 7.5, '#3a2370', 2); c.strokeStyle = P.orange; c.lineWidth = 2.4; c.beginPath(); c.moveTo(3, -5); c.quadraticCurveTo(6, -10, 9, -8); c.stroke(); circle(c, 9, -8, 2, P.yellow, 0); }],
    ['sp3', P.sky, c => { c.strokeStyle = P.white; c.lineWidth = 2.6; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * -8, Math.sin(a) * -8); c.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); c.stroke(); } }],
    ['sp4', P.yellow, c => { star(c, 0, 0, 9, 4); ink(c, P.white, 2); }]]) S[name] = sprite(c => { shadow(c, 16, 12, 4); circle(c, 0, 0, 14, col, 3); draw(c); oval(c, -6, -7, 3.6, 2, '#ffffffaa', 0, null, -.5); }, 40);
  S.crown = sprite(c => { path(c, [[-10, 6], [-12, -6], [-5, 0], [0, -9], [5, 0], [12, -6], [10, 6]]); ink(c, P.yellow, 2.4); circle(c, 0, -9, 2, P.coral, 1.6); }, 32);
  S.blade = sprite(c => { star(c, 0, 0, 15, 5, 4, 0); ink(c, P.sky, 2.8); star(c, 0, 0, 8, 3, 4, Math.PI / 4); ink(c, P.white, 0); circle(c, 0, 0, 2.6, P.ink, 0); }, 40);
  S.bush = sprite(c => { shadow(c, 13, 26, 7); for (const [x, y, r] of [[-14, 4, 11], [14, 4, 11], [0, -4, 15], [-6, 7, 10], [7, 7, 10]]) circle(c, x, y, r, '#5cc98a', 3); for (const [x, y, r] of [[-14, 4, 11], [14, 4, 11], [0, -4, 15]]) circle(c, x, y - 1, r - 4, '#76dba0', 0); circle(c, -4, -9, 3, P.white + 'aa', 0); circle(c, 8, 3, 2.2, P.coral, 1.6); circle(c, -12, 1, 2, P.yellow, 1.4); }, 72);
  S.mushroom = sprite(c => { shadow(c, 13, 14, 5); roundRect(c, -5, -2, 10, 15, 4); ink(c, P.cream, 2.6); c.beginPath(); c.arc(0, -2, 15, Math.PI, 0); c.quadraticCurveTo(0, 3, -15, -2); ink(c, P.tomato, 2.8); circle(c, -7, -7, 2.8, P.white, 0); circle(c, 4, -11, 3.2, P.white, 0); circle(c, 9, -4, 2, P.white, 0); }, 48);
  S.lamp = sprite(c => { shadow(c, 30, 12, 4); c.fillStyle = P.ink; c.fillRect(-2.5, -14, 5, 44); roundRect(c, -7, 26, 14, 6, 3); ink(c, P.inkSoft, 2); star(c, 0, -22, 13, 6); ink(c, P.yellow, 3); star(c, 0, -21, 7, 3.4); ink(c, P.lemon, 0); }, 80);
  S.crystal = sprite(c => { shadow(c, 15, 18, 5); for (const [x, h, w, col] of [[-9, 20, 7, P.pink], [9, 16, 6, P.sky], [0, 28, 8, P.purple]]) { path(c, [[x - w, 14], [x - w, 14 - h + w], [x, 14 - h], [x + w, 14 - h + w], [x + w, 14]]); ink(c, col, 2.6); path(c, [[x - w + 2, 12], [x - w + 2, 14 - h + w + 1], [x - 1, 16 - h]]); ink(c, '#ffffff66', 0); } }, 56);
  S.tower = sprite(c => {
    oval(c, 0, 52, 50, 13, '#120634', 0);
    path(c, [[-24, 50], [-17, -26], [17, -26], [24, 50]]); ink(c, P.cream, 4);
    c.save(); path(c, [[-24, 50], [-17, -26], [17, -26], [24, 50]]); c.clip(); c.fillStyle = P.coral; for (let y = -16; y < 50; y += 26) c.fillRect(-30, y, 60, 13); c.restore(); path(c, [[-24, 50], [-17, -26], [17, -26], [24, 50]]); ink(c, null, 4);
    roundRect(c, -6, 30, 12, 20, 6); ink(c, P.inkSoft, 3);
    roundRect(c, -22, -32, 44, 8, 3); ink(c, P.purple, 3.5);
    roundRect(c, -13, -54, 26, 22, 6); ink(c, P.lemon, 3.5); star(c, 0, -43, 7, 3.2); ink(c, P.orange, 0);
    path(c, [[-16, -54], [0, -70], [16, -54]]); ink(c, P.coral, 3.5); circle(c, 0, -72, 3.6, P.yellow, 2.6);
  }, 160);
  return S;
}

function makeTerrain(look = STAGE_LOOK.wilds) {
  const t = canvas(256), c = t.getContext('2d'), rng = seeded(41);
  c.fillStyle = look[0]; c.fillRect(0, 0, 256, 256);
  c.fillStyle = look[1]; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) c.fillRect(x * 64, y * 64, 64, 64);
  c.fillStyle = look[2]; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.beginPath(); c.arc(x * 64 + 32, y * 64 + 32, 3.2, 0, TAU); c.fill(); }
  for (let i = 0; i < 22; i++) { c.fillStyle = rng() > .5 ? '#6d58c455' : '#2e206455'; const x = rng() * 256, y = rng() * 256, r = 1 + rng() * 1.6; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  return t;
}
function radial(size, stops) { const cv = canvas(size), c = cv.getContext('2d'), g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); for (const [o, col] of stops) g.addColorStop(o, col); c.fillStyle = g; c.fillRect(0, 0, size, size); return cv; }

export class Renderer {
  constructor(el) {
    this.canvas = el; this.ctx = el.getContext('2d', { alpha: false }); this.sprites = makeSprites();
    this.white = {}; this.ghost = {};
    this.sprites.enemy11 = this.sprites.enemy4_candy;
    for (let i = 0; i < 12; i++) this.white['enemy' + i] = tinted(this.sprites['enemy' + i], P.white);
    for (const st of ['wilds', 'frost', 'candy']) this.white['enemy4_' + st] = tinted(this.sprites['enemy4_' + st], P.white);
    this.ghost.player = tinted(this.sprites.player, P.sky);
    this.width = 1; this.height = 1; this.scale = 1; this.camera = { x: 0, y: 0 }; this.quality = 'auto'; this.autoLow = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; this.frame = 0; this.clock = 0; this.drawnEnemies = 0;
    this.densityW = 1; this.density = new Uint8Array(1); this.endSnapshot = null; this.endSequence = null; this.endPaintedAge = null;
    this.beat = { phase: 0, count: 0, bar: 0, energy: .5 }; this.lastBeat = -1; this.tiles = [];
    this.fx = []; this.fxPool = []; this.numbers = 0; this.kick = 0; this.zoomKick = 0; this.flashColor = null; this.flashTime = 0; this.flashMax = 1;
    this.opts = { shake: 1, flash: true, numbers: true }; this.comicCooldown = 0; this.hurtTime = 0; this.combo = 0; this.lastHome = null;
    const rand = seeded(911); this.endBits = Array.from({ length: 120 }, () => ({ angle: rand() * TAU, speed: .25 + rand() * .75, size: 4 + rand() * 7, spin: rand() * TAU, drift: rand() - .5, color: CONFETTI[Math.floor(rand() * CONFETTI.length)], x: rand(), delay: rand() * .4 }));
    this.terrains = Object.fromEntries(Object.entries(STAGE_LOOK).map(([k, v]) => [k, makeTerrain(v)])); this.terrain = this.terrains.wilds; this.pattern = this.ctx.createPattern(this.terrain, 'repeat');
    this.lantern = radial(256, [[0, '#ffe9a066'], [.35, '#ffd27a2a'], [1, '#ffd27a00']]);
    this.resize();
  }
  setQuality(q) { this.quality = q; this.autoLow = false; this.resize(); }
  get low() { return this.quality === 'low' || this.autoLow; }
  resize() {
    this.endSnapshot = null; this.endSequence = null; this.endPaintedAge = null; this.blits = new Map();
    const r = this.canvas.parentElement.getBoundingClientRect(); this.width = Math.max(1, r.width); this.height = Math.max(1, r.height);
    this.densityW = Math.ceil(this.width / 18) + 2; this.density = new Uint8Array(this.densityW * (Math.ceil(this.height / 18) + 2));
    const dpr = Math.min(window.devicePixelRatio || 1, this.low ? 1 : this.quality === 'high' ? 2 : 1.5); this.dpr = dpr;
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.imageSmoothingEnabled = true;
    this.scale = this.width < 760 ? 0.86 : 1.1;
  }
  // Character + skin sprite, built lazily and cached.
  hero(character = 'keeper', skin = 'classic') {
    const HATS = { keeper: ['star', P.coral, '#e0406f'], runner: ['wind', P.sky, '#2a9fd0'], knight: ['horn', P.purple, '#7b2cbf'], witch: ['witch', P.mint, '#22b884'] };
    const RAINBOW = [[P.coral, '#e0406f'], [P.orange, '#e07b00'], [P.yellow, '#e0a800'], [P.mint, '#22b884'], [P.sky, '#2a9fd0'], [P.purple, '#7b2cbf']];
    const def = HATS[character] || HATS.keeper, colors = skin === 'rainbow' ? RAINBOW[Math.floor(this.clock * 6) % 6] : this.skinColors?.[skin] || [def[1], def[2]];
    const key = `hero_${character}_${colors[0]}`; if (!this.sprites[key]) this.sprites[key] = this.sprites.__hero(colors[0], colors[1], def[0]); return key;
  }
  sprite(name, x, y, size, rotation = 0, alpha = 1, sx = 1, sy = 1, set = this.sprites) {
    const c = this.ctx, s = set[name]; if (!s) return;
    if (alpha !== 1) c.globalAlpha = alpha;
    const flip = sx < 0; if (flip) sx = -sx;
    const f = size / s.sourceSize, ox = (-size / 2 + s.x * f) * sx, oy = (-size / 2 + s.y * f) * sy, w = s.image.width / 2 * f * sx, h = s.image.height / 2 * f * sy;
    if (rotation || flip) { c.save(); c.translate(x, y); if (rotation) c.rotate(rotation); if (flip) c.scale(-1, 1); c.drawImage(s.image, ox, oy, w, h); c.restore(); }
    else c.drawImage(s.image, x + ox, y + oy, w, h);
    if (alpha !== 1) c.globalAlpha = 1;
  }
  // Crowd fast path: sprites pre-scaled to device pixels and copied 1:1 (no per-frame resampling).
  blit(name, set, flip, sx, sy, size) {
    const key = (set === this.white ? 'w' : 'n') + (flip ? 'f' : '') + name + size; let b = this.blits.get(key);
    if (!b) {
      const s = set[name], px = this.scale * this.dpr, f = size / s.sourceSize * px, w = Math.max(1, Math.ceil(s.image.width / 2 * f)), h = Math.max(1, Math.ceil(s.image.height / 2 * f));
      const img = canvas(w, h), c = img.getContext('2d'); c.imageSmoothingQuality = 'high'; if (flip) { c.translate(w, 0); c.scale(-1, 1); } c.drawImage(s.image, 0, 0, w, h);
      const ox = (-size / 2 + s.x * size / s.sourceSize) * px; b = { img, ox: flip ? -ox - w : ox, oy: (-size / 2 + s.y * size / s.sourceSize) * px }; this.blits.set(key, b);
    }
    this.ctx.drawImage(b.img, Math.round(sx + b.ox), Math.round(sy + b.oy));
  }
  // --- presentation particles ---------------------------------------------------------------
  spawn(type, x, y, o = {}) {
    const cap = this.low || this.reduced ? 320 : this.crowd ? 600 : 1300; if (this.fx.length >= cap) return null;
    const q = this.fxPool.pop() || {};
    q.type = type; q.x = x; q.y = y; q.vx = o.vx || 0; q.vy = o.vy || 0; q.life = q.max = o.life || .5; q.size = o.size || 6; q.rot = o.rot || 0; q.vr = o.vr || 0;
    q.color = o.color || P.white; q.g = o.g || 0; q.drag = o.drag ?? 3; q.text = o.text || ''; q.alt = o.alt || P.ink; q.grow = o.grow || 0;
    this.fx.push(q); return q;
  }
  burst(x, y, n, colors, speed = 220, o = {}) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = speed * (.35 + Math.random() * .75); this.spawn(o.type || 'dot', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 0), life: (o.life || .45) * (.6 + Math.random() * .6), size: (o.size || 5) * (.6 + Math.random() * .7), color: colors[i % colors.length], rot: Math.random() * TAU, vr: (Math.random() - .5) * 14, g: o.g || 0, drag: o.drag ?? 4 }); }
  }
  confetti(x, y, n, speed = 420) { this.burst(x, y, n, CONFETTI, speed, { type: 'confetti', life: 1.4, size: 8, g: 520, drag: 2.2, lift: 160 }); }
  comic(x, y, text, color = P.yellow, size = 1) { if (this.reduced) return; this.spawn('comic', x, y, { life: .62, size: 34 * size, color, text, rot: (Math.random() - .5) * .5, vy: -30 }); }
  flash(color, time = .18) { if (this.reduced || !this.opts.flash) return; this.flashColor = color; this.flashTime = this.flashMax = time; }
  ingest(game, home) {
    const fx = game.fx; if (!fx || !fx.length) return;
    const effects = !this.reduced, heavy = !this.low;
    let numbers = 0;
    for (const e of fx) {
      switch (e.k) {
        case 'hit':
          if (effects && this.opts.numbers && numbers < 6 && this.numbers < (heavy ? 46 : 18) && (e.b >= 10 || Math.random() < (e.a >= 20 ? 1 : .55))) {
            numbers++; this.numbers++; const crit = e.b >= 10, big = e.a >= 40 || crit;
            this.spawn('num', e.x + (Math.random() - .5) * 34, e.y - 14 - Math.random() * 18, { vx: (Math.random() - .5) * 120, vy: -170 - Math.random() * 60, g: 360, drag: 1.5, life: .7, size: crit ? 28 : big ? 24 : 16 + Math.min(6, e.a / 8), text: String(Math.round(e.a)) + (crit ? '!' : ''), color: crit ? P.coral : big ? P.yellow : P.white });
          }
          if (effects && heavy && Math.random() < .35) this.spawn('spark', e.x, e.y, { vx: (Math.random() - .5) * 360, vy: (Math.random() - .5) * 360, life: .16, size: 9, color: P.white, drag: 6 });
          break;
        case 'kill': {
          const col = ENEMY_COLORS[e.a] || P.coral, boss = e.a === 4;
          if (effects) {
            this.burst(e.x, e.y, heavy ? (boss ? 40 : e.a === 2 ? 12 : 8) : 3, [col, P.white, col, P.yellow], boss ? 520 : 260, { size: boss ? 10 : 6, life: .5 });
            this.spawn('ring', e.x, e.y, { life: .3, size: e.b * 2.2, color: P.white, grow: 1 });
            if (heavy) this.spawn('puff', e.x, e.y, { life: .28, size: e.b * 1.3, color: col });
            if ((e.a === 2 || e.a === 3) && this.comicCooldown <= 0) { this.comic(e.x, e.y - 24, COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)], e.a === 2 ? P.mint : P.pink, .8); this.comicCooldown = .35; }
          }
          break;
        }
        case 'pick': if (effects && heavy) this.spawn('twinkle', e.x, e.y, { life: .3, size: e.a ? 22 : 10, color: e.a ? P.coral : P.lemon, vr: 6 }); if (e.a && effects) this.comic(e.x, e.y - 26, '+HP', P.coral, .6); break;
        case 'hurt': this.hurtTime = .35; this.kick = Math.max(this.kick, .5); if (effects) { this.burst(e.x, e.y, 10, [P.coral, P.white], 240, { size: 6 }); this.spawn('ring', e.x, e.y, { life: .3, size: 60, color: P.coral, grow: 1 }); } break;
        case 'dash': if (effects) for (let i = 0; i < 10; i++) this.spawn('line', e.x, e.y, { vx: -e.a * (240 + Math.random() * 260) + (Math.random() - .5) * 120, vy: -e.b * (240 + Math.random() * 260) + (Math.random() - .5) * 120, life: .25, size: 14, color: i % 2 ? P.sky : P.white, drag: 5 }); break;
        case 'pulse':
          this.kick = Math.max(this.kick, .7); this.zoomKick = .06; this.flash('#ffffff', .14);
          if (effects) { this.spawn('ring', e.x, e.y, { life: .55, size: e.a * 1.05, color: P.yellow, grow: 1 }); this.spawn('ring', e.x, e.y, { life: .42, size: e.a * .8, color: P.white, grow: 1 }); this.burst(e.x, e.y, heavy ? 28 : 10, [P.yellow, P.white, P.sky], 520, { type: 'star', size: 9, life: .6 }); this.comic(e.x, e.y - 110, 'PULSE!', P.yellow, 1.1); }
          break;
        case 'nova':
          this.kick = Math.max(this.kick, .32);
          if (effects) { this.spawn('blast', e.x, e.y, { life: .34, size: e.a, color: P.orange }); this.spawn('ring', e.x, e.y, { life: .4, size: e.a * 1.15, color: P.yellow, grow: 1 }); if (heavy) this.burst(e.x, e.y, 14, [P.orange, P.yellow, P.white], 380, { size: 7 }); if (this.comicCooldown <= 0) { this.comic(e.x, e.y - e.a * .6, 'BOOM!', P.orange, 1); this.comicCooldown = .3; } }
          break;
        case 'bossDown':
          this.kick = 1.2; this.zoomKick = .12; this.flash('#fff7d6', .45);
          if (effects) { this.confetti(e.x, e.y, heavy ? 120 : 30, 640); for (let i = 0; i < 4; i++) this.spawn('ring', e.x, e.y, { life: .5 + i * .15, size: 140 + i * 90, color: CONFETTI[i], grow: 1 }); this.comic(e.x, e.y - 70, 'K.O.!', P.yellow, 2); }
          break;
        case 'firework': if (effects) { if (heavy) this.burst(e.x, e.y, this.crowd ? 8 : 22, CONFETTI, 420, { type: this.crowd ? 'dot' : 'star', size: 8, life: .6 }); this.spawn('ring', e.x, e.y, { life: .4, size: e.a, color: P.pink, grow: 1 }); } this.kick = Math.max(this.kick, .25); break;
        case 'star': if (effects) { this.spawn('blast', e.x, e.y, { life: .26, size: e.a, color: P.yellow }); if (heavy) this.burst(e.x, e.y, 6, [P.lemon, P.white], 260, { type: 'star', size: 6, life: .4 }); } break;
        case 'slam': this.kick = Math.max(this.kick, .45); if (effects) { this.spawn('ring', e.x, e.y, { life: .35, size: e.a * 1.2, color: P.tomato, grow: 1 }); this.spawn('puff', e.x, e.y, { life: .3, size: e.a, color: '#ff5a5f' }); } break;
        case 'special': { const words = ['MAGNET!', 'BOMB!!', 'FREEZE!', 'STAR POWER!'], cols = [P.coral, P.orange, P.sky, P.yellow]; this.flash(e.a === 1 ? '#ffffff' : e.a === 2 ? '#c9f3ff' : '#fff7d6', e.a === 1 ? .5 : .25); this.kick = Math.max(this.kick, e.a === 1 ? 1.1 : .4); this.zoomKick = .07;
          if (effects) { this.spawn('ring', e.x, e.y, { life: .6, size: e.a === 1 ? 700 : 260, color: cols[e.a], grow: 1 }); this.confetti(e.x, e.y, heavy ? 60 : 18, 520); this.comic(e.x, e.y - 100, words[e.a], cols[e.a], 1.4); } break; }
        case 'bossPhase': this.flash('#ff5a5f', .3); this.kick = Math.max(this.kick, .9); if (effects) { this.spawn('ring', e.x, e.y, { life: .5, size: 220, color: P.magenta, grow: 1 }); this.comic(e.x, e.y - 90, e.a >= 3 ? 'RAGE!!' : 'ANGRY!', P.tomato, 1.5); } break;
        case 'heal': if (effects) { this.spawn('ring', e.x, e.y, { life: .45, size: e.a, color: P.pink, grow: 1 }); for (let k = 0; k < 6; k++) this.spawn('twinkle', e.x + (Math.random() - .5) * e.a, e.y + (Math.random() - .5) * e.a, { life: .5, size: 9, color: P.mint, vy: -40 }); } break;
        case 'shieldBreak': if (effects) { this.burst(e.x, e.y, 10, [P.white, P.sky], 300, { type: 'spark', size: 10, life: .3 }); this.comic(e.x, e.y - 30, 'BREAK!', P.sky, .7); } break;
        case 'relic': this.flash('#e5d4ff', .3); this.zoomKick = .08; if (effects) { for (let k = 0; k < 3; k++) this.spawn('ring', e.x, e.y, { life: .5 + k * .15, size: 120 + k * 80, color: [P.purple, P.pink, P.lemon][k], grow: 1 }); this.confetti(e.x, e.y, heavy ? 60 : 18, 480); this.comic(e.x, e.y - 100, 'RELIC!', P.purple, 1.3); } break;
        case 'fusion': this.flash('#ffffff', .45); this.kick = 1.2; this.zoomKick = .14; if (effects) { for (let k = 0; k < 5; k++) this.spawn('ring', e.x, e.y, { life: .5 + k * .12, size: 120 + k * 90, color: CONFETTI[k], grow: 1 }); this.confetti(e.x, e.y, heavy ? 140 : 40, 700); this.comic(e.x, e.y - 120, 'FUSION!!', P.yellow, 1.8); } break;
        case 'decoy': if (effects) { this.spawn('puff', e.x, e.y, { life: .6, size: 120, color: P.pink }); this.comic(e.x, e.y - 90, 'どれが本物？', P.pink, 1.1); } break;
        case 'iceZone': if (effects) this.spawn('ring', e.x, e.y, { life: .45, size: e.a, color: P.white, grow: 1 }); break;
        case 'eliteDown':
          this.kick = Math.max(this.kick, .6); this.flash('#fff2b0', .15);
          if (effects) { this.confetti(e.x, e.y, heavy ? 50 : 16, 520); this.spawn('ring', e.x, e.y, { life: .45, size: 150, color: P.yellow, grow: 1 }); this.comic(e.x, e.y - 50, 'GREAT!', P.yellow, 1.2); }
          break;
        case 'revive':
          this.kick = 1; this.zoomKick = .1; this.flash('#ffffff', .4);
          if (effects) { for (let i = 0; i < 3; i++) this.spawn('ring', e.x, e.y, { life: .5 + i * .15, size: 160 + i * 90, color: [P.lemon, P.mint, P.white][i], grow: 1 }); this.confetti(e.x, e.y, heavy ? 90 : 25, 560); this.comic(e.x, e.y - 100, 'REVIVE!!', P.mint, 1.5); }
          break;
        case 'level':
          this.zoomKick = .05; this.flash(P.lemon, .2);
          if (effects && !home) { this.confetti(e.x, e.y, heavy ? 70 : 20, 520); this.spawn('ring', e.x, e.y, { life: .5, size: 160, color: P.yellow, grow: 1 }); this.comic(e.x, e.y - 100, 'LEVEL UP!', P.lemon, 1.25); }
          break;
      }
    }
    fx.length = 0;
  }
  celebrate(kind, game) {
    // Called by the UI for moments that are not simulation events (combo milestones, evolutions).
    const p = game.player;
    if (kind === 'evolve') { this.flash('#ffffff', .3); this.kick = Math.max(this.kick, .8); this.zoomKick = .1; if (!this.reduced) { this.confetti(p.x, p.y, this.low ? 30 : 110, 640); for (let i = 0; i < 3; i++) this.spawn('ring', p.x, p.y, { life: .5 + i * .14, size: 120 + i * 80, color: [P.yellow, P.pink, P.sky][i], grow: 1 }); this.comic(p.x, p.y - 110, 'EVOLVE!!', P.yellow, 1.6); } }
    else if (kind === 'combo') { this.zoomKick = Math.max(this.zoomKick, .035); if (!this.reduced) { this.burst(p.x, p.y, this.low ? 8 : 24, CONFETTI, 400, { type: 'star', size: 8, life: .6 }); } }
    else if (kind === 'boss') { this.kick = Math.max(this.kick, 1); this.flash('#ff5a5f', .3); }
    else if (kind === 'start') { this.zoomKick = .08; if (!this.reduced) { this.confetti(p.x, p.y, this.low ? 20 : 60, 480); this.spawn('ring', p.x, p.y, { life: .6, size: 220, color: P.yellow, grow: 1 }); } }
  }
  updateFx(dt) {
    this.numbers = 0;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const q = this.fx[i]; q.life -= dt;
      if (q.life <= 0) { this.fxPool.push(q); this.fx[i] = this.fx[this.fx.length - 1]; this.fx.pop(); continue; }
      const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy = q.vy * k + q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.type === 'num') this.numbers++;
    }
  }
  drawFx(x0, y0, x1, y1) {
    const c = this.ctx;
    for (const q of this.fx) {
      if (q.x < x0 - 200 || q.x > x1 + 200 || q.y < y0 - 200 || q.y > y1 + 200) continue;
      const t = q.life / q.max, u = 1 - t;
      switch (q.type) {
        case 'dot': c.fillStyle = q.color; c.beginPath(); c.arc(q.x, q.y, q.size * (.4 + t * .6), 0, TAU); c.fill(); break;
        case 'spark': { const s = q.size * t; c.strokeStyle = q.color; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x - q.vx * .03, q.y - q.vy * .03); c.lineTo(q.x, q.y); c.stroke(); c.fillStyle = q.color; c.fillRect(q.x - s / 4, q.y - s / 4, s / 2, s / 2); break; }
        case 'line': c.strokeStyle = q.color; c.globalAlpha = t; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .06, q.y - q.vy * .06); c.stroke(); c.globalAlpha = 1; break;
        case 'confetti': { const w = q.size, h = q.size * .55 * Math.abs(Math.cos(q.rot * 1.7)); c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.globalAlpha = Math.min(1, t * 2.5); c.fillStyle = q.color; c.fillRect(-w / 2, -h / 2, w, Math.max(1, h)); c.restore(); c.globalAlpha = 1; break; }
        case 'star': c.save(); c.translate(q.x, q.y); c.rotate(q.rot); star(c, 0, 0, q.size * (.5 + t * .5), q.size * .45 * (.5 + t * .5)); c.globalAlpha = Math.min(1, t * 2); ink(c, q.color, 2); c.restore(); c.globalAlpha = 1; break;
        case 'twinkle': c.save(); c.translate(q.x, q.y); c.rotate(q.rot); star(c, 0, 0, q.size * Math.sin(t * Math.PI), q.size * .22 * Math.sin(t * Math.PI), 4, 0); c.fillStyle = q.color; c.fill(); c.restore(); break;
        case 'ring': { const r = q.size * (q.grow ? (1 - t * t) : 1); c.strokeStyle = q.color; c.globalAlpha = t; c.lineWidth = 3 + t * 9; c.beginPath(); c.arc(q.x, q.y, Math.max(1, r), 0, TAU); c.stroke(); c.globalAlpha = 1; break; }
        case 'puff': c.fillStyle = q.color; c.globalAlpha = t * .9; c.beginPath(); c.arc(q.x, q.y, q.size * (.6 + u * .7), 0, TAU); c.fill(); c.globalAlpha = 1; break;
        case 'blast': { const r = q.size * (.4 + u * .7); c.globalAlpha = Math.min(1, t * 1.6); c.fillStyle = u < .25 ? P.white : q.color; c.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, rr = r * (i % 2 ? .78 : 1); i ? c.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr) : c.moveTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.fillStyle = P.yellow; c.beginPath(); c.arc(q.x, q.y, r * .5 * t, 0, TAU); c.fill(); c.globalAlpha = 1; break; }
        case 'num': { const pop = u < .12 ? .6 + u / .12 * .55 : 1.15 - Math.min(.15, (u - .12)); c.font = `900 ${Math.round(q.size * pop)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = Math.min(1, t * 3); c.lineWidth = 5; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.strokeText(q.text, q.x, q.y); c.fillStyle = q.color; c.fillText(q.text, q.x, q.y); c.globalAlpha = 1; break; }
        case 'comic': {
          const pop = u < .18 ? .4 + u / .18 * .8 : 1.2 - Math.min(.2, (u - .18) * .6), s = q.size * pop;
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.globalAlpha = Math.min(1, t * 3);
          c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = (i % 2 ? .62 : 1) * s * (1.25 + q.text.length * .12); const rx = r * 1.15; i ? c.lineTo(Math.cos(a) * rx, Math.sin(a) * r * .75) : c.moveTo(Math.cos(a) * rx, Math.sin(a) * r * .75); } c.closePath(); ink(c, q.color, 4);
          c.font = `900 ${Math.round(s)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.strokeText(q.text, 0, 2); c.fillStyle = P.white; c.fillText(q.text, 0, 2);
          c.restore(); c.globalAlpha = 1; break;
        }
      }
    }
  }
  // --- main frame -----------------------------------------------------------------------------
  draw(game, dt = 1 / 60, home = false, ending = null) {
    if (ending) {
      if (this.endSequence !== ending || !this.endSnapshot) { this.draw(game, 0, false); this.endSnapshot = canvas(this.canvas.width, this.canvas.height); this.endSnapshot.getContext('2d').drawImage(this.canvas, 0, 0); this.endSequence = ending; }
      if (this.endPaintedAge !== ending.age) { this.drawEnding(game, ending); this.endPaintedAge = ending.age; }
      return;
    }
    this.endSnapshot = null; this.endSequence = null; this.endPaintedAge = null;
    if (this.lastHome !== home) { this.fx.length = 0; this.lastHome = home; }
    if (this.quality === 'auto' && !this.autoLow && game.enemies.length > 650) { this.autoLow = true; this.resize(); }
    this.frame++; this.clock += dt; this.drawnEnemies = 0; this.density.fill(0);
    this.crowd = game.enemies.length > 400; this.ingest(game, home); this.updateFx(dt);
    this.comicCooldown -= dt; this.kick = Math.max(0, this.kick - dt * 2.4); this.zoomKick = Math.max(0, this.zoomKick - dt * .35); this.flashTime = Math.max(0, this.flashTime - dt); this.hurtTime = Math.max(0, this.hurtTime - dt);
    const c = this.ctx, w = this.width, h = this.height, p = game.player, beat = this.beat, motion = !this.reduced;
    if (beat.count !== this.lastBeat) { this.lastBeat = beat.count; this.onBeat(game); }
    const pump = motion ? Math.pow(1 - beat.phase, 3) : 0;
    const s = this.scale * (1 + (motion ? this.zoomKick + pump * .006 * beat.energy : 0));
    game.viewRadius = Math.min(800, Math.hypot(w / this.scale, h / this.scale) / 2); game.effects = !this.low && !this.reduced;
    const tx = p.x - (home && w > 900 ? w / s * .02 : 0), ty = p.y + (home ? h / s * (w > 900 ? .02 : .12) : 0), lerp = home ? .05 : Math.min(1, dt * 8);
    this.camera.x += (tx - this.camera.x) * lerp; this.camera.y += (ty - this.camera.y) * lerp;
    const stage = game.stage || 'wilds', look = STAGE_LOOK[stage] || STAGE_LOOK.wilds; this.terrain = this.terrains[stage] || this.terrains.wilds; this.look = look; this.stage = stage;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = look[0]; c.fillRect(0, 0, w, h);
    let sx = 0, sy = 0; const shake = motion ? (game.shake * 14 + this.kick * 9) * this.opts.shake : 0;
    if (shake > 0) { sx = (Math.random() - .5) * shake * 2; sy = (Math.random() - .5) * shake * 2; }
    c.translate(w / 2 + sx, h / 2 + sy); c.scale(s, s); c.translate(-this.camera.x, -this.camera.y);
    const hw = w / s / 2 + 90, hh = h / s / 2 + 90, x0 = this.camera.x - hw, y0 = this.camera.y - hh, x1 = this.camera.x + hw, y1 = this.camera.y + hh;
    for (let ty0 = Math.floor(y0 / 256) * 256; ty0 < y1; ty0 += 256) for (let tx0 = Math.floor(x0 / 256) * 256; tx0 < x1; tx0 += 256) c.drawImage(this.terrain, tx0, ty0, 256.5, 256.5);
    if (!this.low && game.enemies.length < 400) this.drawTiles(game, dt);
    for (const q of game.puddles || []) { if (q.x + q.r < x0 || q.x - q.r > x1 || q.y + q.r < y0 || q.y - q.r > y1) continue; c.fillStyle = '#ff8fc788'; c.beginPath(); c.ellipse(q.x, q.y, q.r, q.r * .7, 0, 0, TAU); c.fill(); c.fillStyle = '#ffffff44'; c.beginPath(); c.ellipse(q.x - q.r * .3, q.y - q.r * .2, q.r * .3, q.r * .12, -.3, 0, TAU); c.fill(); }
    if (stage === 'frost' && !this.low) { c.strokeStyle = '#ffffff1c'; c.lineWidth = 3; for (let gx = Math.floor(x0 / 200); gx <= x1 / 200; gx++) { const bx = gx * 200; c.beginPath(); c.moveTo(bx, y0); c.lineTo(bx + 120, y1); c.stroke(); } }
    this.drawGround(x0, y0, x1, y1, game);
    for (const f of game.fires || []) { const a = Math.min(1, f.t); c.fillStyle = `rgba(255,159,28,${.55 * a})`; c.beginPath(); c.arc(f.x, f.y + Math.sin(this.clock * 20 + f.x) * 2, 16 + Math.sin(this.clock * 30 + f.y) * 3, 0, TAU); c.fill(); c.fillStyle = `rgba(255,240,122,${.7 * a})`; c.beginPath(); c.arc(f.x, f.y, 7, 0, TAU); c.fill(); }
    // Night-to-dawn tint as the run progresses.
    const progress = home ? 0 : Math.min(1, game.time / game.duration);
    if (progress > .55) { c.fillStyle = `rgba(255,140,170,${(progress - .55) * .16})`; c.fillRect(x0, y0, hw * 2, hh * 2); }
    const lr = 230 + pump * 18 * beat.energy; c.drawImage(this.lantern, p.x - lr, p.y - lr, lr * 2, lr * 2);
    this.drawArena(x0, y0, x1, y1, game);
    const l = game.levels;
    if (l.frost) this.drawFrost(p, l.frost, game.time);
    for (const z of game.iceZones || []) { const a = Math.min(1, z.t / 1.5); c.fillStyle = `rgba(201,243,255,${.35 * a})`; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.strokeStyle = `rgba(255,255,255,${.7 * a})`; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke(); c.setLineDash([]); for (let k = 0; k < 6; k++) { const ang = k / 6 * TAU + z.t * .3; c.fillStyle = '#ffffffaa'; star(c, z.x + Math.cos(ang) * z.r * .6, z.y + Math.sin(ang) * z.r * .6, 7, 2.5, 6, 0); c.fill(); } }
    for (const h of game.hazards || []) { const t = 1 - h.t / h.max; c.fillStyle = `rgba(255,90,95,${.12 + t * .25})`; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill(); c.fillStyle = `rgba(255,90,95,${.35})`; c.beginPath(); c.arc(h.x, h.y, h.r * t, 0, TAU); c.fill(); c.save(); c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.clip(); c.strokeStyle = '#ffffff55'; c.lineWidth = 4; c.beginPath(); for (let k = -h.r * 2; k < h.r * 2; k += 16) { c.moveTo(h.x + k, h.y - h.r); c.lineTo(h.x + k + h.r * 2, h.y + h.r); } c.stroke(); c.restore(); c.strokeStyle = P.tomato; c.lineWidth = 4; c.setLineDash([12, 8]); c.lineDashOffset = -this.clock * 50; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke(); c.setLineDash([]); if (t > .7 && this.frame % 6 < 3) { c.strokeStyle = P.white; c.lineWidth = 3; c.beginPath(); c.arc(h.x, h.y, h.r - 4, 0, TAU); c.stroke(); } }
    for (const m of game.mines || []) this.sprite(m.arm <= 0 && this.frame % 20 < 10 ? 'mineLit' : 'mine', m.x, m.y, 30);
    for (const st of game.strikes || []) { const t = Math.max(0, st.t / st.max); c.strokeStyle = '#fff07aaa'; c.lineWidth = 3; c.beginPath(); c.arc(st.x, st.y, st.r * (1 - t * .5), 0, TAU); c.stroke(); this.sprite('fallStar', st.x + t * 60, st.y - t * 240, 60, .25); }
    for (const g of game.gems) { if (g.kind === 'altar' && g.x >= x0 && g.x <= x1 && g.y >= y0 && g.y <= y1) { c.fillStyle = '#9b5de533'; c.beginPath(); c.ellipse(g.x, g.y + 18, 46, 16, 0, 0, TAU); c.fill(); this.sprite('altar', g.x, g.y + (motion ? Math.sin(this.clock * 3) * 2 : 0), 78); if (motion && this.frame % 8 === 0) this.spawn('twinkle', g.x + (Math.random() - .5) * 60, g.y - Math.random() * 50, { life: .6, size: 10, color: P.pink, vr: 4 }); continue; } if (g.kind !== 'special' || g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue; const bob = motion ? Math.sin(this.clock * 5 + g.phase) * 4 : 0; c.strokeStyle = CONFETTI[(this.frame >> 3) & 7]; c.lineWidth = 3; c.beginPath(); c.arc(g.x, g.y + bob, 20 + Math.sin(this.clock * 8) * 2, 0, TAU); c.stroke(); this.sprite('sp' + g.value, g.x, g.y + bob, 38); }
    this.nearestChest = null; let chestDist = Infinity;
    for (const g of game.gems) {
      if (g.kind !== 'chest') continue; const d = Math.hypot(g.x - p.x, g.y - p.y); if (d < chestDist) { chestDist = d; this.nearestChest = g; }
      if (g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      const big = g.value >= 2, bob = motion ? Math.sin(this.clock * 4 + g.phase) * 3 : 0, glow = .5 + Math.sin(this.clock * 6) * .2;
      c.fillStyle = `rgba(255,210,63,${glow * .35})`; c.fillRect(g.x - 9, g.y - 150, 18, 150); c.fillStyle = `rgba(255,255,255,${glow * .3})`; c.fillRect(g.x - 3, g.y - 150, 6, 150);
      c.fillStyle = '#ffd23f33'; c.beginPath(); c.ellipse(g.x, g.y + 12, 34, 12, 0, 0, TAU); c.fill();
      this.sprite(big ? 'chestBig' : 'chest', g.x, g.y - 6 + bob, big ? 62 : 48, motion ? Math.sin(this.clock * 9) * .06 : 0);
      if (motion && this.frame % 10 === 0) this.spawn('twinkle', g.x + (Math.random() - .5) * 50, g.y - 10 - Math.random() * 40, { life: .5, size: 10, color: P.lemon, vr: 5 });
    }
    const gemFast = this.low || game.gems.length > 150 || game.enemies.length > 220;
    if (gemFast) {
      // Crowd fast path: pre-scaled gem bitmaps copied 1:1 in device pixels.
      const t = c.getTransform(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      for (const g of game.gems) {
        if (g.kind === 'chest' || g.kind === 'special' || g.kind === 'altar' || g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
        const bob = motion ? Math.sin(game.time * 4 + g.phase) * 2 : 0, name = g.kind === 'heal' ? 'heal' : g.value > 24 ? 'gemBig' : g.value > 6 ? 'gemMid' : 'gem';
        this.blit(name, this.sprites, false, t.e + g.x * t.a, t.f + (g.y + bob) * t.d, name === 'heal' ? 30 : name === 'gemBig' ? 28 : name === 'gemMid' ? 22 : 17);
      }
      c.setTransform(t); c.imageSmoothingEnabled = true;
    } else for (const g of game.gems) {
      if (g.kind === 'chest' || g.kind === 'special' || g.kind === 'altar' || g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      const bob = motion ? Math.sin(game.time * 4 + g.phase) * 2 : 0;
      if (g.kind === 'heal') this.sprite('heal', g.x, g.y + bob, 30 * (1 + pump * .12));
      else this.sprite(g.value > 24 ? 'gemBig' : g.value > 6 ? 'gemMid' : 'gem', g.x, g.y + bob, g.value > 24 ? 28 : g.value > 6 ? 22 : 17, motion ? Math.sin(game.time * 2 + g.phase) * .25 : 0);
    }
    this.drawCoreParticles(game, x0, y0, x1, y1, 'under');
    const crowd = game.enemies.length > 400, fast = this.low || game.enemies.length > 220, ox = (w / 2 + sx) * this.dpr, oy = (h / 2 + sy) * this.dpr, k = s * this.dpr;
    if (fast) { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; }
    for (const e of game.enemies) {
      if (!e.alive || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      if (e.type !== 4 && crowd) { const gx = Math.floor(((e.x - this.camera.x) * s + w / 2) / 18) + 1, gy = Math.floor(((e.y - this.camera.y) * s + h / 2) / 18) + 1, i = gx + gy * this.densityW; if (gx >= 0 && gx < this.densityW && i >= 0 && i < this.density.length) { if (this.density[i] >= 3) continue; this.density[i]++; } }
      this.drawnEnemies++;
      const size = ENEMY_SIZES[e.type], speed = e.type === 1 ? 14 : 7, wob = motion ? Math.sin(game.time * speed + e.phase) : 0;
      const hitPop = e.hit > 0 ? 1 + e.hit * 2.2 : 1, sqx = (1 + wob * .06) * hitPop, sqy = (1 - wob * .06) / Math.sqrt(hitPop) * (e.hit > 0 ? 1.05 : 1);
      const flip = e.x > p.x && e.type !== 3 && e.type !== 4, set = e.hit > .03 ? this.white : this.sprites, lift = Math.abs(wob) * (e.type === 1 ? 4 : 2);
      const tele = (e.type === 5 || e.type === 10) && e.ai === 1;
      if (fast && e.type !== 4 && e.type !== 11 && !e.elite && !tele && !(e.type === 8 && e.shield > 0)) { this.blit('enemy' + e.type, set, flip, ox + (e.x - this.camera.x) * k, oy + (e.y - lift - this.camera.y) * k, size); continue; }
      if (fast) { c.setTransform(k, 0, 0, k, ox - this.camera.x * k, oy - this.camera.y * k); c.imageSmoothingEnabled = true; }
      if (e.elite) { c.strokeStyle = P.yellow; c.lineWidth = 4; c.setLineDash([10, 8]); c.lineDashOffset = -this.clock * 40; c.beginPath(); c.ellipse(e.x, e.y + e.r * .6, e.r * 1.25, e.r * .5, 0, 0, TAU); c.stroke(); c.setLineDash([]); }
      if (tele) { const len = e.type === 5 ? 420 : 640, a = 1 - e.aiT / (e.type === 5 ? .75 : .8); c.strokeStyle = e.type === 5 ? `rgba(255,159,28,${.4 + a * .5})` : `rgba(255,90,95,${.3 + a * .6})`; c.lineWidth = e.type === 5 ? 26 * (1 - a * .5) : 3 + a * 3; c.setLineDash(e.type === 5 ? [16, 10] : [6, 6]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.cx * len, e.y + e.cy * len); c.stroke(); c.setLineDash([]); }
      this.sprite(e.type === 4 || e.type === 11 ? 'enemy4_' + (this.stage || 'wilds') : 'enemy' + e.type, e.x, e.y - lift, e.elite ? size * 1.45 : size, e.type === 1 ? wob * .12 : 0, 1, flip ? -sqx : sqx, sqy, set);
      if (e.type === 8 && e.shield > 0) this.sprite('shield', e.x, e.y - lift, 64, Math.atan2(p.y - e.y, p.x - e.x), .5 + e.shield * .17);
      if (e.elite) { this.sprite('crown', e.x, e.y - e.r * 1.35 - lift + (motion ? Math.sin(this.clock * 5) * 2 : 0), 34); if (e.hp < e.maxHP) { const bw = 56, by = e.y - e.r * 1.7; roundRect(c, e.x - bw / 2 - 2, by - 2, bw + 4, 9, 4); c.fillStyle = P.ink; c.fill(); roundRect(c, e.x - bw / 2, by, Math.max(4, bw * e.hp / e.maxHP), 5, 2.5); c.fillStyle = P.yellow; c.fill(); } }
      if (e.slow > 0) { c.fillStyle = '#9be7ff55'; c.beginPath(); c.ellipse(e.x, e.y + e.r * .7, e.r + 4, 6, 0, 0, TAU); c.fill(); }
      if (e.type === 4) this.bossBar(e);
      if (fast) { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; }
    }
    if (fast) { c.setTransform(k, 0, 0, k, ox - this.camera.x * k, oy - this.camera.y * k); c.imageSmoothingEnabled = true; }
    for (const b of game.bullets) {
      if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue;
      if (b.hostile) { const sz = (b.r + 3) * 2.4; this.sprite(this.frame % 8 < 4 ? 'foeA' : 'foeB', b.x, b.y, sz); continue; }
      if (b.boomer) { this.sprite('boomerS', b.x, b.y, b.r * 3.6, this.clock * 18); continue; }
      const sp = Math.hypot(b.vx, b.vy) || 1, cs = b.vx / sp, sn = b.vy / sp, img = this.sprites[b.color === 'purple' ? 'shotP' : 'shotY'];
      c.setTransform(cs * k, sn * k, -sn * k, cs * k, ox + (b.x - this.camera.x) * k, oy + (b.y - this.camera.y) * k);
      c.drawImage(img.image, -32 + img.x, -32 + img.y, img.image.width / 2, img.image.height / 2);
    }
    c.setTransform(k, 0, 0, k, ox - this.camera.x * k, oy - this.camera.y * k);
    this.drawCoreParticles(game, x0, y0, x1, y1, 'over');
    if (l.orbit) {
      const count = (l.orbit === 5 ? 5 : l.orbit + 1) + (game.levels.fx_galaxy ? 3 : 0), r = orbitRadius(l.orbit), spin = l.orbit >= 4 ? 2.9 : 2.2;
      c.strokeStyle = '#ffffff22'; c.lineWidth = 2; c.setLineDash([6, 10]); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < count; i++) {
        const a = game.time * spin + i * TAU / count;
        if (motion) { c.strokeStyle = game.levels.fx_galaxy ? CONFETTI[(i + (this.frame >> 3)) & 7] + 'aa' : l.orbit === 5 ? '#ffd23f88' : '#4cc9f088'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.arc(p.x, p.y, r, a - .55, a - .05); c.stroke(); }
        this.sprite('blade', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, l.orbit === 5 ? 40 : 34, game.time * 9);
      }
    }
    if (l.drone) { const count = l.drone === 5 ? 4 : l.drone >= 4 ? 3 : l.drone >= 2 ? 2 : 1; for (let i = 0; i < count; i++) { const a = -game.time * 1.3 + i * TAU / count; this.sprite('drone', p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 50 + (motion ? Math.sin(game.time * 9 + i) * 3 : 0), 32, Math.sin(game.time * 3 + i) * .15); } }
    if (p.invincible > 0 && motion && p.invincible < 100) { c.strokeStyle = '#ffffff99'; c.lineWidth = 3; c.setLineDash([8, 8]); c.lineDashOffset = -this.clock * 40; c.beginPath(); c.arc(p.x, p.y, 30, 0, TAU); c.stroke(); c.setLineDash([]); }
    const moving = Math.hypot(p.dx, p.dy) > 0, step = motion ? Math.sin(game.time * 14) : 0, bounce = 1 + (motion ? pump * .05 * beat.energy : 0);
    const facing = p.dx < -.1 ? -1 : 1;
    if (game.starPower > 0 && motion) { c.strokeStyle = CONFETTI[this.frame >> 2 & 7]; c.lineWidth = 6; c.beginPath(); c.arc(p.x, p.y - 4, 34 + Math.sin(this.clock * 20) * 3, 0, TAU); c.stroke(); if (this.frame % 3 === 0) this.spawn('star', p.x + (Math.random() - .5) * 40, p.y + (Math.random() - .5) * 40, { life: .5, size: 7, color: CONFETTI[this.frame & 7], vy: -40 }); }
    this.sprite(this.hero(game.character, this.skin), p.x, p.y - Math.abs(step) * (moving ? 2.5 : .6), 84, 0, p.invincible > .3 && p.invincible < 100 && this.frame % 6 < 2 ? .55 : 1, facing * (1 + step * .03) * bounce, (1 - step * .03) * bounce);
    this.drawFx(x0, y0, x1, y1);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!home && !['won', 'dead'].includes(game.state) && game.boss?.alive) this.bossIndicator(game.boss, s);
    if (!home && this.nearestChest && game.state === 'running') this.bossIndicator(this.nearestChest, s, P.yellow);
    if (game.darkness > .02) { const px = w / 2 + (p.x - this.camera.x) * s + sx, py = h / 2 + (p.y - this.camera.y) * s + sy, R = 260 * s, g2 = c.createRadialGradient(px, py, R * .35, px, py, R); g2.addColorStop(0, 'rgba(14,4,36,0)'); g2.addColorStop(1, `rgba(14,4,36,${.86 * game.darkness})`); c.fillStyle = g2; c.fillRect(0, 0, w, h); if (game.boss?.alive) { const bx = w / 2 + (game.boss.x - this.camera.x) * s + sx, by = h / 2 + (game.boss.y - this.camera.y) * s + sy; c.fillStyle = `rgba(255,90,95,${game.darkness * (.6 + Math.sin(this.clock * 6) * .3)})`; for (const ox of [-14, 14]) { c.beginPath(); c.ellipse(bx + ox * s, by - 6 * s, 6 * s, 4 * s, 0, 0, TAU); c.fill(); } } }
    if (game.freeze > 0) { c.fillStyle = `rgba(155,231,255,${Math.min(.28, game.freeze * .08)})`; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8fbffcc'; c.lineWidth = 14; c.strokeRect(0, 0, w, h); }
    if (this.hurtTime > 0 && motion && this.opts.flash) { const a = this.hurtTime / .35; c.strokeStyle = `rgba(255,70,110,${a * .55})`; c.lineWidth = 28; c.strokeRect(0, 0, w, h); }
    if (p.hp < p.maxHP * .3 && !home && game.state === 'running' && motion) { const a = (.18 + Math.sin(this.clock * 7) * .1); c.strokeStyle = `rgba(255,70,110,${a})`; c.lineWidth = 18; c.strokeRect(0, 0, w, h); }
    if (this.flashTime > 0 && this.flashColor) { c.globalAlpha = this.flashTime / this.flashMax * .55; c.fillStyle = this.flashColor; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
  }
  onBeat(game) {
    if (this.reduced) return;
    const rng = Math.random, n = this.low ? 2 : 5 + Math.round(this.beat.energy * 5), p = game.player;
    for (let i = 0; i < n; i++) { const gx = Math.floor(p.x / 64 + (rng() - .5) * 18), gy = Math.floor(p.y / 64 + (rng() - .5) * 12); this.tiles.push({ gx, gy, t: 1, color: CONFETTI[(gx * 7 + gy * 3 + this.beat.count) & 7] }); }
    if (this.tiles.length > 80) this.tiles.splice(0, this.tiles.length - 80);
  }
  drawTiles(game, dt) {
    const c = this.ctx;
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const t = this.tiles[i]; t.t -= dt * 1.8; if (t.t <= 0) { this.tiles.splice(i, 1); continue; }
      c.globalAlpha = t.t * .2 * (.5 + this.beat.energy); c.fillStyle = t.color; c.fillRect(t.gx * 64 + 3, t.gy * 64 + 3, 58, 58);
    }
    c.globalAlpha = 1;
  }
  drawFrost(p, level, time) {
    const c = this.ctx, r = frostRadius(level);
    c.fillStyle = '#9be7ff1f'; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
    c.strokeStyle = '#c9f3ffaa'; c.lineWidth = 3; c.setLineDash([14, 10]); c.lineDashOffset = time * 30; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke(); c.setLineDash([]);
    if (!this.reduced) for (let i = 0; i < 10; i++) { const a = time * .6 + i * TAU / 10, rr = r * (.45 + (i % 3) * .18); c.save(); c.translate(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); c.rotate(time + i); star(c, 0, 0, 6, 2, 6, 0); c.fillStyle = '#e8fbff'; c.fill(); c.restore(); }
  }
  drawArena(x0, y0, x1, y1, game) {
    const c = this.ctx, R = 1280; if (x0 > -R + 40 && x1 < R - 40 && y0 > -R + 40 && y1 < R - 40) return;
    c.lineWidth = 16; c.strokeStyle = P.ink; c.strokeRect(-R, -R, R * 2, R * 2);
    c.lineWidth = 10; c.strokeStyle = P.coral; c.setLineDash([26, 26]); c.lineDashOffset = -game.time * 30; c.strokeRect(-R, -R, R * 2, R * 2);
    c.strokeStyle = P.white; c.lineDashOffset = -game.time * 30 + 26; c.strokeRect(-R, -R, R * 2, R * 2); c.setLineDash([]);
  }
  prop(name, x, y, size) {
    const c = this.ctx, t = c.getTransform(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    this.blit(name, this.sprites, false, t.e + x * t.a, t.f + y * t.d, size); c.setTransform(t); c.imageSmoothingEnabled = true;
  }
  drawGround(x0, y0, x1, y1, game) {
    const cell = 170;
    for (let gy = Math.floor(y0 / cell); gy <= Math.ceil(y1 / cell); gy++) for (let gx = Math.floor(x0 / cell); gx <= Math.ceil(x1 / cell); gx++) {
      const rng = seeded((gx * 73856093 ^ gy * 19349663) >>> 0); const x = gx * cell + 20 + rng() * 130, y = gy * cell + 20 + rng() * 130, kind = rng();
      if (Math.hypot(x, y + 200) < 150) continue;
      const set = this.stage === 'frost' ? ['snowPine', 'snowman', 'iceShard'] : this.stage === 'candy' ? ['lollipop', 'cupcake', 'gumdrop'] : ['bush', 'mushroom', 'crystal'];
      if (kind < .14) this.prop(set[0], x, y, 70 + Math.round(rng() * 3) * 9);
      else if (kind < .25) this.prop(set[1], x, y, 40 + Math.round(rng() * 2) * 8);
      else if (kind < .32) this.prop(set[2], x, y, 50 + Math.round(rng() * 2) * 7);
      else if (kind < .36) this.sprite('lamp', x, y, 76, 0, 1, 1, 1 + (this.reduced ? 0 : Math.pow(1 - this.beat.phase, 4) * .05));
      else if (kind < .6) { const c = this.ctx; c.fillStyle = this.look[3]; star(c, x, y, 3.5, 1.4, 4, 0); c.fill(); }
    }
    if (x0 < 170 && x1 > -170 && y0 < -60 && y1 > -380) {
      const c = this.ctx; c.fillStyle = '#ffd23f22'; c.beginPath(); c.ellipse(0, -170, 120, 50, 0, 0, TAU); c.fill();
      c.strokeStyle = '#ffd23f55'; c.lineWidth = 3; c.setLineDash([10, 12]); c.lineDashOffset = -game.time * 12; c.beginPath(); c.ellipse(0, -170, 140, 60, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      this.sprite('tower', 0, -230, 170); const deco = this.stage === 'frost' ? ['snowPine', 'snowman'] : this.stage === 'candy' ? ['lollipop', 'cupcake'] : ['bush', 'mushroom']; this.sprite(deco[0], -90, -180, 70); this.sprite(deco[1], 80, -170, 44);
    }
  }
  drawCoreParticles(game, x0, y0, x1, y1, layer) {
    const c = this.ctx;
    for (const q of game.particles) {
      if (q.x + q.size < x0 || q.x - q.size > x1 || q.y + q.size < y0 || q.y - q.size > y1) continue;
      const life = q.ttl / q.maxTTL;
      if (layer === 'under') {
        if (q.type === 'trail') this.sprite('player', q.x, q.y, 84, 0, life * .45, 1, 1, this.ghost);
        else if (q.type === 'warning') { c.strokeStyle = P.tomato; c.globalAlpha = .4 + life * .5; c.lineWidth = 5; c.setLineDash([10, 8]); c.beginPath(); c.arc(q.x, q.y, q.size * (1.4 - life * .4), 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
        continue;
      }
      if (q.type === 'beam') { c.globalAlpha = Math.min(1, life * 1.6); c.lineCap = 'round'; const prism = game.levels.fx_prism > 0; for (const [lw, col] of [[q.size * 2 + 8, P.ink], [q.size * 2, prism ? CONFETTI[this.frame >> 2 & 7] : P.sky], [q.size * .8, P.white]]) { c.lineWidth = lw * (.6 + life * .4); c.strokeStyle = col; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x2, q.y2); c.stroke(); } c.globalAlpha = 1; continue; }
      if (q.type === 'arc') {
        const segs = 6, pts = [[q.x, q.y]]; for (let i = 1; i < segs; i++) { const t = i / segs; pts.push([q.x + (q.x2 - q.x) * t + (Math.random() - .5) * 22, q.y + (q.y2 - q.y) * t + (Math.random() - .5) * 22]); } pts.push([q.x2, q.y2]);
        c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha = Math.min(1, life * 2);
        for (const [lw, col] of [[9, P.ink], [5, P.yellow], [2, P.white]]) { c.lineWidth = lw; c.strokeStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
        c.globalAlpha = 1; star(c, q.x2, q.y2, 12 * life + 4, 4, 4, Math.random()); c.fillStyle = P.lemon; c.fill();
      }
    }
  }
  bossBar(e) {
    if (e.hp >= e.maxHP) return; const c = this.ctx, w = 96, y = e.y - 78;
    roundRect(c, e.x - w / 2 - 3, y - 3, w + 6, 12, 6); c.fillStyle = P.ink; c.fill();
    roundRect(c, e.x - w / 2, y, Math.max(6, w * e.hp / e.maxHP), 6, 3); c.fillStyle = P.magenta; c.fill();
  }
  bossIndicator(boss, s, color = P.magenta) {
    const dx = (boss.x - this.camera.x) * s, dy = (boss.y - this.camera.y) * s, w = this.width, h = this.height; if (Math.abs(dx) < w / 2 - 45 && Math.abs(dy) < h / 2 - 65) return;
    const angle = Math.atan2(dy, dx), extent = Math.min((w / 2 - 44) / (Math.abs(Math.cos(angle)) || 1), (h / 2 - 96) / (Math.abs(Math.sin(angle)) || 1));
    const x = w / 2 + Math.cos(angle) * extent, y = h / 2 + Math.sin(angle) * extent, c = this.ctx, pulse = 1 + Math.sin(this.clock * 10) * .12;
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(pulse, pulse); path(c, [[16, 0], [-8, -12], [-3, 0], [-8, 12]]); ink(c, color, 3.5); c.restore();
  }
  drawEnding(game, ending) {
    const c = this.ctx, w = this.width, h = this.height, p = ending.progress, ease = p * p * (3 - 2 * p), won = ending.kind === 'won';
    const cx = w / 2 + (game.player.x - this.camera.x) * this.scale, cy = h / 2 + (game.player.y - this.camera.y) * this.scale;
    const diagonal = Math.hypot(w, h), count = this.low ? 40 : 120, motion = !ending.reducedMotion;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.save(); c.globalAlpha = 1;
    const zoom = motion ? (won ? 1 + ease * .06 : 1 + ease * .04) : 1;
    c.save(); c.translate(cx, cy); c.scale(zoom, zoom); if (!won && motion) c.rotate(ease * -.03); c.drawImage(this.endSnapshot, -cx, -cy, w, h); c.restore();
    if (won) {
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, `rgba(255,143,199,${ease * .55})`); sky.addColorStop(.6, `rgba(255,190,120,${ease * .55})`); sky.addColorStop(1, `rgba(255,230,140,${ease * .7})`); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      if (motion) {
        c.save(); c.translate(cx, cy); c.rotate(p * .9);
        for (let i = 0; i < 16; i++) { const a = i * TAU / 16; c.fillStyle = i % 2 ? `rgba(255,255,255,${ease * .32})` : `rgba(255,210,63,${ease * .32})`; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - .1) * diagonal, Math.sin(a - .1) * diagonal); c.lineTo(Math.cos(a + .1) * diagonal, Math.sin(a + .1) * diagonal); c.closePath(); c.fill(); }
        c.restore();
        for (let k = 0; k < 3; k++) { const q = Math.max(0, p * 1.4 - k * .18); if (q <= 0 || q >= 1) continue; c.strokeStyle = CONFETTI[k]; c.globalAlpha = 1 - q; c.lineWidth = 14 * (1 - q) + 2; c.beginPath(); c.arc(cx, cy, diagonal * q * .7, 0, TAU); c.stroke(); }
        c.globalAlpha = 1;
        for (let i = 0; i < count; i++) {
          const b = this.endBits[i], u = Math.max(0, (p - b.delay * .5) / (1 - b.delay * .5)); if (u <= 0) continue;
          const x = b.x * w + Math.sin(u * 6 + b.spin) * 30, y = -20 + u * (h + 60) * (.7 + b.speed * .5), sz = b.size * 1.4;
          c.save(); c.translate(x, y); c.rotate(b.spin + u * 8); c.fillStyle = b.color; c.fillRect(-sz / 2, -sz * .3 * Math.abs(Math.cos(u * 12 + b.spin)), sz, Math.max(1, sz * .6 * Math.abs(Math.cos(u * 12 + b.spin)))); c.restore();
        }
      }
      if (p < .12 && motion) { c.fillStyle = `rgba(255,255,255,${(1 - p / .12) * .9})`; c.fillRect(0, 0, w, h); }
    } else {
      c.fillStyle = `rgba(26,11,66,${.15 + ease * .7})`; c.fillRect(0, 0, w, h);
      if (motion) {
        const shatter = Math.min(1, p * 1.6);
        for (let i = 0; i < Math.min(40, count); i++) { const b = this.endBits[i], r = (20 + shatter * 160) * b.speed, x = cx + Math.cos(b.angle) * r, y = cy + Math.sin(b.angle) * r + shatter * shatter * 80; c.save(); c.translate(x, y); c.rotate(b.spin + shatter * 5); c.globalAlpha = 1 - shatter; star(c, 0, 0, b.size * .9, b.size * .4, 4, 0); c.fillStyle = i % 2 ? P.coral : P.yellow; c.fill(); c.restore(); }
        c.globalAlpha = 1;
        const flame = 1 - Math.min(1, p * 1.4); if (flame > 0) { c.drawImage(this.lantern, cx - 140 * flame, cy - 140 * flame, 280 * flame, 280 * flame); }
        if (p < .5) for (let i = 0; i < 6; i++) { const y = Math.random() * h, hh = 4 + Math.random() * 18; c.drawImage(this.canvas, 0, y * this.dpr, this.canvas.width, hh * this.dpr, (Math.random() - .5) * 40 * (1 - p * 2), y, w, hh); }
      }
      const vg = c.createRadialGradient(cx, cy, Math.min(w, h) * .1, cx, cy, diagonal * .6); vg.addColorStop(0, 'rgba(20,6,50,0)'); vg.addColorStop(1, `rgba(20,6,50,${ease * .7})`); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    }
    c.restore();
  }
}

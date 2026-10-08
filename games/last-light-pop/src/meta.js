// Persistent progression: the workshop (permanent upgrades), achievements, star rewards,
// heat unlocks and the daily challenge. Pure functions over a plain profile object.
import { MODES, HEATS, MUTATORS, META_DEFAULT, META_CURVES, CHARACTERS, STAGES, ENEMY_TYPES, UPGRADES, RELICS, BOSSES } from './core.js';
import { sanitizeCampaign, totalStars } from './campaign.js';
import { emptyGear, sanitizeGear, MAX_RARITY } from './gear.js';

export const SHOP = Object.freeze([
  { id: 'hp', name: 'がんじょう', icon: 'heart', color: 'var(--coral)', max: 5, base: 72, step: 54, effect: r => `最大HP +${META_CURVES.hp[r]}` },
  { id: 'power', name: 'パワー', icon: 'power', color: 'var(--purple)', max: 5, base: 90, step: 72, effect: r => `与ダメージ +${Math.round(META_CURVES.power[r] * 100)}%` },
  { id: 'speed', name: 'すばやさ', icon: 'dash', color: 'var(--mint)', max: 5, base: 72, step: 54, effect: r => `移動速度 +${Math.round(META_CURVES.speed[r] * 100)}%` },
  { id: 'growth', name: 'まなび', icon: 'leaf', color: 'var(--yellow)', max: 5, base: 90, step: 72, effect: r => `獲得経験値 +${Math.round(META_CURVES.growth[r] * 100)}%` },
  { id: 'magnet', name: 'ひきよせ', icon: 'magnet', color: 'var(--teal)', max: 3, base: 54, step: 54, effect: r => `回収範囲 +${r * 15}%` },
  { id: 'regen', name: 'いやし', icon: 'heart', color: 'var(--pink)', max: 3, base: 108, step: 90, effect: r => `毎秒HP +${(r * .15).toFixed(2)}` },
  { id: 'reroll', name: 'ひきなおし', icon: 'reroll', color: 'var(--sky)', max: 3, base: 144, step: 108, effect: r => `リロール ${1 + r}回 / 出撃` },
  { id: 'banish', name: 'さよなら', icon: 'banish', color: 'var(--orange)', max: 3, base: 144, step: 108, effect: r => `除外 ${1 + r}回 / 出撃` },
  { id: 'luck', name: 'ラッキー', icon: 'chest', color: 'var(--yellow)', max: 3, base: 126, step: 108, effect: r => `宝箱の大当たり率 +${r * 5}%` },
  { id: 'revive', name: 'もういっかい', icon: 'revive', color: 'var(--lemon)', max: 1, base: 540, step: 0, effect: r => r ? 'HP0で一度だけ復活' : '一度だけ復活できる' }
]);
export function shopCost(item, rank) { return rank >= item.max ? Infinity : item.base + item.step * rank; }
export const SHOP_TOTAL = SHOP.reduce((sum, item) => { let s = 0; for (let r = 0; r < item.max; r++) s += shopCost(item, r); return sum + s; }, 0);

// Achievements are checked against a finished-run summary and the lifetime profile.
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first-run', name: 'はじめての夜', desc: '初めて出撃する', reward: 20, test: (r) => true },
  { id: 'first-clear', name: '夜明けを見た', desc: 'いずれかの作戦をクリア', reward: 60, test: (r) => r.won },
  { id: 'clear-patrol', name: '巡回マスター', desc: '夜間巡回をクリア', reward: 40, test: (r) => r.won && r.mode === 'patrol' },
  { id: 'clear-guard', name: '防衛マスター', desc: '灯火防衛をクリア', reward: 80, test: (r) => r.won && r.mode === 'guard' },
  { id: 'clear-eclipse', name: '極夜マスター', desc: '極夜作戦をクリア', reward: 150, test: (r) => r.won && r.mode === 'eclipse' },
  { id: 'heat-3', name: '辛口デビュー', desc: 'ヒート3以上でクリア', reward: 120, test: (r) => r.won && r.heat >= 3 },
  { id: 'heat-6', name: '激辛チャレンジャー', desc: 'ヒート6以上でクリア', reward: 250, test: (r) => r.won && r.heat >= 6 },
  { id: 'heat-8', name: '獄炎の覇者', desc: 'ヒート8でクリア', reward: 500, test: (r) => r.won && r.heat >= 8 },
  { id: 'kills-500', name: 'おそうじ屋', desc: '1回の出撃で500体撃破', reward: 40, test: (r) => r.kills >= 500 },
  { id: 'kills-2000', name: '大掃除', desc: '1回の出撃で2,000体撃破', reward: 100, test: (r) => r.kills >= 2000 },
  { id: 'combo-100', name: 'コンボの芽', desc: '100コンボ達成', reward: 40, test: (r) => r.combo >= 100 },
  { id: 'combo-400', name: 'コンボ職人', desc: '400コンボ達成', reward: 120, test: (r) => r.combo >= 400 },
  { id: 'evolve-1', name: 'はじめての進化', desc: '武器を進化させる', reward: 40, test: (r) => r.evolves >= 1 },
  { id: 'evolve-3', name: 'フル進化', desc: '1回の出撃で3つの武器を進化', reward: 150, test: (r) => r.evolves >= 3 },
  { id: 'jackpot', name: '大当たり！', desc: '宝箱で5個当てる', reward: 80, test: (r) => r.jackpots >= 1 },
  { id: 'elite-5', name: 'エリートハンター', desc: '1回の出撃でエリートを5体撃破', reward: 80, test: (r) => r.elites >= 5 },
  { id: 'untouchable', name: 'ノーダメージ討伐', desc: '夜の主との戦闘中に一度も被弾せず撃破', reward: 150, test: (r) => r.bossKills >= 1 && r.bossHits === 0 },
  { id: 'level-30', name: 'レベル30', desc: '1回の出撃でLv.30に到達', reward: 60, test: (r) => r.level >= 30 },
  { id: 'daily', name: '今日のチャレンジャー', desc: 'デイリーチャレンジをクリア', reward: 100, test: (r) => r.won && r.daily },
  { id: 'streak-3', name: '三日坊主じゃない', desc: 'デイリーを3日連続でプレイ', reward: 120, test: (r, p) => p.dailyStreak >= 3 },
  { id: 'veteran', name: 'ベテラン', desc: '通算10,000体撃破', reward: 150, test: (r, p) => p.stats.kills >= 10000 },
  { id: 'endless-10', name: '終わらない夜', desc: 'エンドレスで10分生き残る', reward: 150, test: (r) => r.mode === 'endless' && r.time >= 600 },
  { id: 'endless-20', name: '夜の住人', desc: 'エンドレスで20分生き残る', reward: 300, test: (r) => r.mode === 'endless' && r.time >= 1200 },
  { id: 'specials-5', name: 'おたからハンター', desc: '1回の出撃で特殊アイテムを5個拾う', reward: 60, test: (r) => r.specials >= 5 },
  { id: 'all-chars', name: 'みんなで夜明け', desc: '4人すべてのキャラクターでクリア', reward: 300, test: (r, p) => Object.keys(CHARACTERS).every(id => p.charClears[id]) },
  { id: 'stage-wilds', name: '荒野の夜明け', desc: '夜の荒野でクリア', reward: 60, test: (r) => r.won && r.stage === 'wilds' && r.mode !== 'endless' },
  { id: 'stage-frost', name: '氷上の舞', desc: '氷の湖でクリア', reward: 120, test: (r) => r.won && r.stage === 'frost' },
  { id: 'stage-candy', name: 'あまい夜明け', desc: 'キャンディの森でクリア', reward: 180, test: (r) => r.won && r.stage === 'candy' },
  { id: 'relic-3', name: 'コレクター', desc: '1回の出撃でレリックを3つ集める', reward: 80, test: (r) => r.relics >= 3 },
  { id: 'cursed', name: '呪いをはねのけて', desc: '呪いを受けたままクリア', reward: 120, test: (r) => r.won && r.curses >= 1 },
  { id: 'fusion', name: 'がったい！', desc: '武器を合体させる', reward: 100, test: (r) => r.fusions >= 1 },
  { id: 'camp-10', name: '荒野の章', desc: 'キャンペーン第10章をクリア', reward: 150, test: (r, p) => !!p.campaign?.stars?.[10]?.[1] },
  { id: 'camp-20', name: '湖の章', desc: 'キャンペーン第20章をクリア', reward: 250, test: (r, p) => !!p.campaign?.stars?.[20]?.[1] },
  { id: 'camp-30', name: '最後の夜明け', desc: 'キャンペーン第30章をクリア', reward: 400, test: (r, p) => !!p.campaign?.stars?.[30]?.[1] },
  { id: 'camp-45s', name: '★あつめ', desc: 'キャンペーンの★を45個集める', reward: 200, test: (r, p) => totalStars(p) >= 45 },
  { id: 'camp-90s', name: '★コンプリート', desc: 'キャンペーンの★を90個すべて集める', reward: 600, test: (r, p) => totalStars(p) >= 90 },
  { id: 'merge-1', name: 'はじめての合成', desc: '装備を合成する', reward: 40, test: (r, p) => p.stats.merges >= 1 },
  { id: 'gear-ultra', name: 'ウルトラ装備', desc: 'ウルトラ以上の装備を手に入れる', reward: 150, test: (r, p) => p.gear.items.some(i => i.r >= MAX_RARITY - 1) },
  { id: 'gear-legend', name: '伝説の装備', desc: 'レジェンド装備を作る', reward: 400, test: (r, p) => p.gear.items.some(i => i.r >= MAX_RARITY) },
  { id: 'codex-50', name: '図鑑はんぶん', desc: '図鑑を50%うめる', reward: 120, test: (r, p) => codexProgress(p).ratio >= .5 },
  { id: 'codex-100', name: '図鑑コンプリート', desc: '図鑑を100%うめる', reward: 500, test: (r, p) => codexProgress(p).ratio >= 1 },
  { id: 'workshop', name: '工房マスター', desc: '工房の強化をすべて最大にする', reward: 300, test: (r, p) => SHOP.every(i => (p.meta[i.id] || 0) >= i.max) }
]);

// New weapons and characters unlock through achievements.
export const UNLOCKS = Object.freeze([
  { kind: 'weapon', id: 'boomer', achievement: 'first-clear', label: 'ブーメラン星' },
  { kind: 'weapon', id: 'laser', achievement: 'evolve-1', label: 'プリズム光線' },
  { kind: 'weapon', id: 'mine', achievement: 'kills-500', label: '花火地雷' },
  { kind: 'weapon', id: 'rain', achievement: 'clear-guard', label: '星降りの夜' },
  { kind: 'character', id: 'runner', achievement: 'clear-patrol', label: 'ソラ' },
  { kind: 'character', id: 'knight', achievement: 'elite-5', label: 'ガンテツ' },
  { kind: 'character', id: 'witch', achievement: 'combo-100', label: 'ミント' },
  { kind: 'stage', id: 'frost', achievement: 'stage-wilds', label: '氷の湖' },
  { kind: 'stage', id: 'candy', achievement: 'stage-frost', label: 'キャンディの森' }
]);
export const isUnlocked = (profile, u) => !!profile.achievements[u.achievement];
export function lockedWeapons(profile) { return UNLOCKS.filter(u => u.kind === 'weapon' && !isUnlocked(profile, u)).map(u => u.id); }
export function stageUnlocked(profile, id) { const u = UNLOCKS.find(x => x.kind === 'stage' && x.id === id); return !u || isUnlocked(profile, u); }
export function characterUnlocked(profile, id) { const u = UNLOCKS.find(x => x.kind === 'character' && x.id === id); return !u || isUnlocked(profile, u); }
// Codex: every monster (including elites and each stage boss), upgrade, fusion and relic.
export const CODEX = Object.freeze([
  ...ENEMY_TYPES.map((e, i) => i === 4 ? null : { id: String(i), group: 'monster', name: e.name }).filter(Boolean),
  { id: 'elite', group: 'monster', name: '王冠のエリート' },
  ...Object.entries(BOSSES).map(([id, b]) => ({ id: 'boss_' + id, group: 'boss', name: b.name })),
  ...UPGRADES.map(u => ({ id: u.id, group: u.tag === 'FUSION' ? 'fusion' : u.tag === 'WEAPON' ? 'weapon' : 'support', name: u.name })),
  ...Object.entries(RELICS).map(([id, r]) => ({ id: 'relic_' + id, group: 'relic', name: r.name }))
]);
export function codexProgress(p) { const found = CODEX.filter(c => p.codex[c.id]).length; return { found, total: CODEX.length, ratio: found / CODEX.length }; }
// Cosmetic hood colours. No gameplay effect.
export const SKINS = Object.freeze({
  classic: { name: 'いつもの', colors: null },
  sunset: { name: 'サンセット', colors: ['#ff9f1c', '#e07b00'], achievement: 'stage-candy' },
  ocean: { name: 'オーシャン', colors: ['#4361ee', '#2f45c4'], achievement: 'codex-50' },
  sakura: { name: 'サクラ', colors: ['#ff8fc7', '#e85fa3'], achievement: 'streak-3' },
  midnight: { name: 'ミッドナイト', colors: ['#3a2370', '#22114a'], achievement: 'all-chars' },
  gold: { name: 'ゴールド', colors: ['#ffd23f', '#e0a800'], achievement: 'heat-8' },
  rainbow: { name: 'レインボー', colors: 'rainbow', achievement: 'codex-100' },
  aurora: { name: 'オーロラ', colors: ['#2ec4b6', '#9b5de5'], achievement: 'camp-45s' },
  dawn: { name: 'ドーン', colors: ['#ff7eb6', '#ffd23f'], achievement: 'camp-90s' }
});
export const skinUnlocked = (p, id) => !!SKINS[id] && (!SKINS[id].achievement || !!p.achievements[SKINS[id].achievement]);
export function emptyProfile() { return { stars: 0, earned: 0, meta: { ...META_DEFAULT }, achievements: {}, heatUnlocked: 0, stats: { runs: 0, wins: 0, kills: 0, chests: 0, evolves: 0, merges: 0 }, daily: {}, dailyStreak: 0, lastDaily: '', charClears: {}, endlessBest: 0, character: 'keeper', stage: 'wilds', tips: {}, seen: {}, codex: {}, skin: 'classic', campaign: { stars: {} }, gear: emptyGear() }; }
const int = (v, min = 0, max = 1e9) => Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : min;
export function sanitizeProfile(raw) {
  const p = emptyProfile(); if (!raw || typeof raw !== 'object') return p;
  p.stars = int(raw.stars); p.earned = int(raw.earned); p.heatUnlocked = int(raw.heatUnlocked, 0, HEATS.length - 1); p.dailyStreak = int(raw.dailyStreak, 0, 1e5); p.lastDaily = typeof raw.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDaily) ? raw.lastDaily : '';
  for (const item of SHOP) p.meta[item.id] = int(raw.meta?.[item.id], 0, item.max);
  for (const a of ACHIEVEMENTS) if (Number.isFinite(raw.achievements?.[a.id])) p.achievements[a.id] = raw.achievements[a.id];
  for (const k of Object.keys(p.stats)) p.stats[k] = int(raw.stats?.[k]);
  for (const id of Object.keys(CHARACTERS)) if (raw.charClears?.[id] === true) p.charClears[id] = true;
  p.endlessBest = Number.isFinite(raw.endlessBest) ? Math.max(0, raw.endlessBest) : 0; p.character = CHARACTERS[raw.character] ? raw.character : 'keeper'; p.stage = STAGES[raw.stage] ? raw.stage : 'wilds';
  if (raw.codex && typeof raw.codex === 'object') for (const c of CODEX) if (raw.codex[c.id] === true) p.codex[c.id] = true; p.skin = SKINS[raw.skin] ? raw.skin : 'classic';
  for (const k of ['tips', 'seen']) if (raw[k] && typeof raw[k] === 'object') for (const [id, v] of Object.entries(raw[k]).slice(0, 100)) if (v === true && /^[\w-]{1,32}$/.test(id)) p[k][id] = true;
  if (raw.daily && typeof raw.daily === 'object') for (const [d, v] of Object.entries(raw.daily).slice(-60)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v && typeof v === 'object') p.daily[d] = { best: Number.isFinite(v.best) ? Math.max(0, v.best) : 0, won: v.won === true, kills: int(v.kills) };
  p.campaign = sanitizeCampaign(raw.campaign); p.gear = sanitizeGear(raw.gear);
  return p;
}
export function buy(profile, id) {
  const item = SHOP.find(i => i.id === id); if (!item) return false; const rank = profile.meta[id] || 0, cost = shopCost(item, rank);
  if (profile.stars < cost) return false; profile.stars -= cost; profile.meta[id] = rank + 1; return true;
}
export function refundAll(profile) { let back = 0; for (const item of SHOP) { for (let r = 0; r < (profile.meta[item.id] || 0); r++) back += shopCost(item, r); profile.meta[item.id] = 0; } profile.stars += back; return back; }
export function heatMultiplier(heat) { return 1 + heat * .25; }
// Stars earned by a run, itemised for the result screen.
export function starsForRun(r) {
  const minutes = r.time / 60, lines = [
    ['生存', Math.round(minutes * 8)], ['撃破', Math.round(r.kills / 25)], ['レベル', r.level * 2], ['エリート', r.elites * 6], ['ボス', r.bossKills * 25], ['宝箱', r.chests * 4],
    ['クリア', r.won ? { patrol: 40, guard: 80, eclipse: 120, campaign: 70 }[r.mode] || 60 : 0], ['デイリー', r.daily && r.won ? 50 : 0], ['耐久', r.mode === 'endless' ? Math.round(Math.max(0, minutes - 6) * 6) : 0], ['特殊', (r.specials || 0) * 3]
  ].filter(([, v]) => v > 0);
  const base = lines.reduce((s, [, v]) => s + v, 0), mult = heatMultiplier(r.heat || 0), total = Math.round(base * mult);
  return { lines, base, mult, total };
}
// Apply a finished run to the profile. Returns what changed for the result screen.
export function recordRun(profile, r, today = localDate()) {
  const stars = starsForRun(r); profile.stars += stars.total; profile.earned += stars.total;
  profile.stats.runs++; if (r.won) profile.stats.wins++; profile.stats.kills += r.kills; profile.stats.chests += r.chests; profile.stats.evolves += r.evolves;
  if (r.won && r.character) profile.charClears[r.character] = true; if (r.mode === 'endless') profile.endlessBest = Math.max(profile.endlessBest, r.time);
  for (const id of r.codex || []) if (CODEX.some(c => c.id === id)) profile.codex[id] = true;
  const before = new Set(Object.keys(profile.achievements));
  let heatUnlocked = null; if (r.won && !r.daily && r.mode !== 'campaign' && r.heat >= profile.heatUnlocked && profile.heatUnlocked < HEATS.length - 1) { profile.heatUnlocked = r.heat + 1; heatUnlocked = profile.heatUnlocked; }
  if (r.daily) {
    const prev = profile.daily[today] || { best: 0, won: false, kills: 0 }; profile.daily[today] = { best: Math.max(prev.best, r.time), won: prev.won || r.won, kills: Math.max(prev.kills, r.kills) };
    if (profile.lastDaily !== today) { profile.dailyStreak = profile.lastDaily === shiftDate(today, -1) ? profile.dailyStreak + 1 : 1; profile.lastDaily = today; }
  }
  const unlocked = [];
  for (const a of ACHIEVEMENTS) if (!profile.achievements[a.id] && a.test(r, profile)) { profile.achievements[a.id] = Date.now(); profile.stars += a.reward; profile.earned += a.reward; unlocked.push(a); }
  // Buying can complete the workshop achievement later; checkProfileAchievements handles that path.
  const newlyUnlocked = UNLOCKS.filter(u => !before.has(u.achievement) && profile.achievements[u.achievement]);
  return { stars, unlocked, heatUnlocked, newlyUnlocked };
}
// Achievements that depend only on the profile, checked outside of a run (workshop, equipment).
export const GEAR_ACHIEVEMENTS = ['merge-1', 'gear-ultra', 'gear-legend'];
export function checkProfileAchievements(profile, ids = ['workshop', 'veteran']) { const unlocked = []; for (const a of ACHIEVEMENTS) if (!profile.achievements[a.id] && ids.includes(a.id) && a.test({}, profile)) { profile.achievements[a.id] = Date.now(); profile.stars += a.reward; unlocked.push(a); } return unlocked; }

// --- daily challenge -----------------------------------------------------------------------------
export function localDate(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function shiftDate(day, delta) { const [y, m, d] = day.split('-').map(Number), t = new Date(y, m - 1, d + delta); return localDate(t); }
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Everyone playing on the same date gets the same seed, mode, heat and two mutators.
export function dailyConfig(day = localDate()) {
  const h = hash('last-light-pop/' + day), ids = Object.keys(MUTATORS), modes = ['patrol', 'guard', 'guard', 'eclipse'];
  const a = ids[h % ids.length], rest = ids.filter(id => id !== a), b = rest[(h >>> 8) % rest.length];
  return { day, seed: h || 1, mode: modes[(h >>> 16) % modes.length], heat: (h >>> 20) % 3, mutators: [a, b] };
}
export function describeDaily(cfg) { return { mode: MODES[cfg.mode].name, heat: HEATS[cfg.heat], mutators: cfg.mutators.map(id => ({ id, ...MUTATORS[id] })) }; }

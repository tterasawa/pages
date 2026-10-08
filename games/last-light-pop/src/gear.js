// Equipment: four slots, eight items, five rarities. Runs drop items; three items of the same slot
// and rarity merge into one of the next rarity (the chosen base keeps its identity). Pure rules +
// data so the UI, the simulation and the tests share them.
export const GEAR_SLOTS = Object.freeze({
  lamp: { name: 'ランプ', icon: 'lamp' },
  hood: { name: 'フード', icon: 'hood' },
  boots: { name: 'ブーツ', icon: 'boot' },
  charm: { name: 'お守り', icon: 'charm' }
});
export const RARITIES = Object.freeze([
  { name: 'ノーマル', short: 'N', color: '#e9e4f5' },
  { name: 'レア', short: 'R', color: '#3ee0a0' },
  { name: 'スーパー', short: 'S', color: '#4cc9f0' },
  { name: 'ウルトラ', short: 'U', color: '#9b5de5' },
  { name: 'レジェンド', short: 'L', color: '#ffd23f' }
]);
export const MAX_RARITY = RARITIES.length - 1;
const pct = v => `${Math.round(v * 100)}%`;
// stats: rarity → modifier values. perk: extra effect at レジェンド only.
export const GEAR_ITEMS = Object.freeze({
  starLamp: { slot: 'lamp', name: '星のランプ', color: '#ffd23f', stats: r => ({ damage: [.015, .03, .045, .065, .09][r] }), text: s => `威力 +${pct(s.damage)}`, perk: { startLevel: 1 }, perkText: '初期武器が Lv2 から始まる' },
  moonLamp: { slot: 'lamp', name: '月のランプ', color: '#c9b6f2', stats: r => ({ damage: [.01, .015, .025, .04, .05][r], xp: [.02, .04, .06, .09, .12][r] }), text: s => `威力 +${pct(s.damage)}・経験値 +${pct(s.xp)}`, perk: { rerolls: 2 }, perkText: 'リロール +2回' },
  woolHood: { slot: 'hood', name: 'ふわふわフード', color: '#ff8fc7', stats: r => ({ hp: [4, 8, 12, 17, 22][r] }), text: s => `最大HP +${s.hp}`, perk: { guard: .04 }, perkText: '受けるダメージ −4%' },
  iceHood: { slot: 'hood', name: '氷晶のフード', color: '#4cc9f0', stats: r => ({ guard: [.015, .03, .045, .06, .08][r] }), text: s => `受けるダメージ −${pct(s.guard)}`, perk: { pulseCD: .25 }, perkText: 'パルスの再使用 −25%' },
  windBoots: { slot: 'boots', name: '風のブーツ', color: '#3ee0a0', stats: r => ({ speed: [.01, .015, .025, .04, .05][r] }), text: s => `移動速度 +${pct(s.speed)}`, perk: { magnet: .5 }, perkText: '回収範囲 +50%' },
  dashBoots: { slot: 'boots', name: '流星のブーツ', color: '#ff9f1c', stats: r => ({ dash: [.03, .05, .08, .11, .15][r], speed: [0, .01, .01, .02, .03][r] }), text: s => `ダッシュ間隔 −${pct(s.dash)}・移動 +${pct(s.speed)}`, perk: { speed: .03 }, perkText: '移動速度 さらに +3%' },
  cloverCharm: { slot: 'charm', name: '四つ葉のお守り', color: '#3ee0a0', stats: r => ({ luck: [1, 1, 2, 2, 3][r], magnet: [.05, .1, .15, .22, .3][r] }), text: s => `宝箱の運 +${s.luck}・回収範囲 +${pct(s.magnet)}`, perk: { banishes: 2 }, perkText: '除外 +2回' },
  heartCharm: { slot: 'charm', name: 'ハートのお守り', color: '#ff5f8a', stats: r => ({ regen: [.02, .04, .07, .1, .14][r] }), text: s => `毎秒 HP +${s.regen.toFixed(2)}`, perk: { heal: .5 }, perkText: '回復アイテムの効果 +50%' }
});
export const GEAR_IDS = Object.keys(GEAR_ITEMS);
export const INVENTORY_CAP = 200;
export const itemText = (id, r) => GEAR_ITEMS[id].text(GEAR_ITEMS[id].stats(r));

export function emptyGear() { return { items: [], equipped: { lamp: null, hood: null, boots: null, charm: null }, nextId: 1 }; }
export function sanitizeGear(raw) {
  const g = emptyGear(); if (!raw || typeof raw !== 'object') return g;
  const seen = new Set();
  for (const it of Array.isArray(raw.items) ? raw.items.slice(0, INVENTORY_CAP) : []) {
    const uid = Math.floor(Number(it?.uid)), r = Math.floor(Number(it?.r));
    if (!GEAR_ITEMS[it?.id] || !(uid > 0) || seen.has(uid) || !(r >= 0 && r <= MAX_RARITY)) continue; seen.add(uid); g.items.push({ uid, id: it.id, r });
  }
  g.nextId = Math.max(Math.floor(Number(raw.nextId)) || 1, ...g.items.map(i => i.uid + 1), 1);
  for (const slot of Object.keys(GEAR_SLOTS)) { const uid = raw.equipped?.[slot], it = g.items.find(i => i.uid === uid); g.equipped[slot] = it && GEAR_ITEMS[it.id].slot === slot ? uid : null; }
  return g;
}
export const findItem = (gear, uid) => gear.items.find(i => i.uid === uid) || null;
export const isEquipped = (gear, uid) => Object.values(gear.equipped).includes(uid);
export function equip(gear, uid) { const it = findItem(gear, uid); if (!it) return false; gear.equipped[GEAR_ITEMS[it.id].slot] = uid; return true; }
export function unequip(gear, slot) { if (!(slot in gear.equipped)) return false; gear.equipped[slot] = null; return true; }

// Two other unequipped items of the same slot and rarity; identical items are used first.
export function mergeFodder(gear, uid) {
  const base = findItem(gear, uid); if (!base || base.r >= MAX_RARITY) return null;
  const slot = GEAR_ITEMS[base.id].slot;
  const pool = gear.items.filter(i => i.uid !== uid && i.r === base.r && GEAR_ITEMS[i.id].slot === slot && !isEquipped(gear, i.uid)).sort((a, b) => (b.id === base.id) - (a.id === base.id) || a.uid - b.uid);
  return pool.length >= 2 ? pool.slice(0, 2) : null;
}
export function merge(gear, uid) {
  const fodder = mergeFodder(gear, uid); if (!fodder) return null;
  const base = findItem(gear, uid), gone = new Set(fodder.map(i => i.uid));
  gear.items = gear.items.filter(i => !gone.has(i.uid)); base.r++;
  return { item: { ...base }, consumed: fodder };
}
// Merge everything possible, lowest rarity first. The base is the equipped item when it is in the
// group, otherwise the most common item of the group (so its identity is the one that survives).
export function mergeAll(gear) {
  const out = []; let again = true;
  while (again) {
    again = false;
    for (let r = 0; r < MAX_RARITY && !again; r++) for (const slot of Object.keys(GEAR_SLOTS)) {
      const group = gear.items.filter(i => i.r === r && GEAR_ITEMS[i.id].slot === slot);
      if (group.length < 3 || group.filter(i => !isEquipped(gear, i.uid)).length < 2) continue;
      const count = id => group.filter(i => i.id === id).length;
      const base = group.find(i => isEquipped(gear, i.uid)) || [...group].sort((a, b) => count(b.id) - count(a.id) || a.uid - b.uid)[0];
      const res = merge(gear, base.uid); if (res) { out.push(res); again = true; break; }
    }
  }
  return out;
}
export function mergeableCount(gear) { const copy = JSON.parse(JSON.stringify(gear)); return mergeAll(copy).length; }

// Modifiers from the equipped items, consumed by runModifiers in core.js.
export function gearModifiers(gear) {
  const m = { damage: 0, xp: 0, hp: 0, guard: 0, speed: 0, dash: 0, luck: 0, magnet: 0, regen: 0, startLevel: 0, rerolls: 0, revives: 0, pulseCD: 0, banishes: 0, heal: 0 };
  if (!gear) return m;
  for (const uid of Object.values(gear.equipped || {})) {
    const it = gear.items?.find(i => i.uid === uid); if (!it || !GEAR_ITEMS[it.id]) continue;
    const def = GEAR_ITEMS[it.id]; for (const [k, v] of Object.entries(def.stats(it.r))) m[k] += v;
    if (it.r === MAX_RARITY) for (const [k, v] of Object.entries(def.perk)) m[k] += v;
  }
  return m;
}

// Loot at the end of a run. Short runs drop nothing; clears, bosses and harder nights drop more and better.
export function rollLoot(r, rng = Math.random) {
  if (r.daily || r.time < 60) return [];
  const n = Math.min(5, 1 + (r.won ? 1 : 0) + Math.min(2, r.bossKills || 0) + (r.chapter && r.won ? 1 : 0));
  const tier = Math.min(1, r.chapter ? r.chapter / 30 : (r.heat || 0) / 8 + (r.mode === 'eclipse' ? .3 : 0));
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = rng(), rar = x < .004 + .02 * tier ? 3 : x < .03 + .07 * tier ? 2 : x < .2 + .14 * tier ? 1 : 0;
    out.push({ id: GEAR_IDS[Math.floor(rng() * GEAR_IDS.length)], r: rar });
  }
  return out;
}
// Adds items; when the bag is full the lowest unequipped items become workshop stars instead.
export function addItems(gear, items) {
  const added = []; let refund = 0;
  for (const it of items) { const item = { uid: gear.nextId++, id: it.id, r: it.r }; gear.items.push(item); added.push(item); }
  while (gear.items.length > INVENTORY_CAP) {
    const low = gear.items.filter(i => !isEquipped(gear, i.uid)).sort((a, b) => a.r - b.r || a.uid - b.uid)[0]; if (!low) break;
    gear.items = gear.items.filter(i => i !== low); refund += 3 * 3 ** low.r;
  }
  return { added, refund };
}

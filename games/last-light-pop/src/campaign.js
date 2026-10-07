// Campaign: 30 chapters across the three stages. Each chapter has ★1 (survive half the night),
// ★2 (clear) and a skill-based ★3. Pure data + rules so the simulation, the UI and the bot share it.
import { BOSSES, STAGES } from './core.js';

// ★3 conditions. value is the threshold; check(run) gets the run summary below.
export const STAR_RULES = Object.freeze({
  hits: { label: v => `被弾${v}回以内でクリア`, check: (r, v) => r.hits <= v, progress: (r, v) => `被弾 ${r.hits}/${v}`, failed: (r, v) => r.hits > v },
  hp: { label: v => `HPが一度も${v}%を下回らずにクリア`, check: (r, v) => r.lowHp * 100 >= v, progress: (r, v) => `最低HP ${Math.round(r.lowHp * 100)}% / ${v}%`, failed: (r, v) => r.lowHp * 100 < v },
  boss: { label: v => `どのボスも出現から${v}秒以内に撃破`, check: (r, v) => r.bossSlowest <= v, progress: (r, v) => `ボス撃破 ${v}秒以内`, failed: (r, v) => r.bossSlowest > v },
  nodash: { label: () => 'ダッシュを使わずにクリア', check: r => r.dashes === 0, progress: r => `ダッシュ ${r.dashes}回`, failed: r => r.dashes > 0 },
  nopulse: { label: () => 'パルスを使わずにクリア', check: r => r.pulses === 0, progress: r => `パルス ${r.pulses}回`, failed: r => r.pulses > 0 }
});

// [name, stage, seconds, difficulty, heat, mid boss, final boss(es), ★3 rule, ★3 value, mutators]
const T = [
  ['はじまりの灯', 'wilds', 180, 0.72, 0, 'wilds', 'wilds', 'hits', 4],
  ['森のざわめき', 'wilds', 200, 0.742, 0, 'wilds', 'wilds', 'hp', 60],
  ['月夜の羽音', 'wilds', 220, 0.764, 0, 'bat', 'wilds', 'boss', 15],
  ['突進注意報', 'wilds', 240, 0.786, 0, 'wilds', 'bat', 'hits', 6],
  ['大コウモリの巣', 'wilds', 270, 0.808, 0, 'bat', 'bat', 'nopulse', 0],
  ['荒野の嵐', 'wilds', 300, 0.83, 0, 'wilds', 'wilds', 'hp', 65, ['horde']],
  ['ふたつの影', 'wilds', 300, 0.852, 0, 'bat', 'wilds', 'boss', 10],
  ['闇夜の行進', 'wilds', 330, 0.874, 1, 'wilds', 'bat', 'hits', 35],
  ['羽ばたく王', 'wilds', 330, 0.896, 1, 'bat', 'bat', 'nodash', 0],
  ['決戦・夜の荒野', 'wilds', 360, 0.96, 1, 'bat', ['wilds', 'bat'], 'hp', 60],
  ['凍る湖へ', 'frost', 300, 0.79, 1, 'frost', 'frost', 'hits', 20],
  ['雪だるま行軍', 'frost', 300, 0.832, 1, 'snowman', 'frost', 'boss', 15],
  ['すべる足元', 'frost', 300, 0.844, 1, 'frost', 'snowman', 'hp', 55],
  ['将軍の号令', 'frost', 330, 0.856, 1, 'snowman', 'snowman', 'hits', 50],
  ['吹雪の夜', 'frost', 330, 0.868, 1, 'frost', 'frost', 'nopulse', 0],
  ['氷柱の回廊', 'frost', 330, 0.88, 2, 'snowman', 'frost', 'boss', 10],
  ['凍てつく行進', 'frost', 360, 0.892, 2, 'frost', 'snowman', 'hits', 45],
  ['白銀の包囲', 'frost', 360, 0.904, 2, 'snowman', 'frost', 'hp', 40, ['horde']],
  ['氷の玉座', 'frost', 360, 0.916, 2, 'snowman', 'snowman', 'nodash', 0],
  ['決戦・氷の湖', 'frost', 360, 0.928, 2, 'snowman', ['frost', 'snowman'], 'hits', 50],
  ['あまい森の入口', 'candy', 330, 0.88, 2, 'candy', 'candy', 'hp', 55],
  ['ドーナツの輪', 'candy', 330, 0.89, 2, 'donut', 'candy', 'boss', 15],
  ['シロップの沼', 'candy', 330, 0.9, 2, 'candy', 'donut', 'hits', 55],
  ['魔神のうず', 'candy', 360, 0.91, 2, 'donut', 'donut', 'nopulse', 0],
  ['分身パーティー', 'candy', 360, 0.92, 2, 'candy', 'candy', 'boss', 15],
  ['甘い罠', 'candy', 360, 0.93, 2, 'donut', 'candy', 'hp', 60],
  ['キャンディ嵐', 'candy', 360, 0.94, 2, 'candy', 'donut', 'hits', 60, ['horde']],
  ['大王の晩餐', 'candy', 360, 0.95, 3, 'donut', 'candy', 'nodash', 0],
  ['夜明け前', 'candy', 360, 0.96, 3, 'candy', 'donut', 'boss', 15],
  ['決戦・最後の夜', 'candy', 360, 0.97, 3, 'donut', ['candy', 'donut'], 'hits', 55]
];
export const CHAPTERS = Object.freeze(T.map(([name, stage, duration, difficulty, heat, mid, final, rule, value, mutators = []], i) => Object.freeze({
  id: i + 1, name, stage, duration, difficulty, heat, mutators, bosses: { mid, final: [].concat(final) }, star3: { rule, value },
  // Short early chapters ramp over a longer window so the first nights stay gentle.
  config: { duration, difficulty, ramp: Math.max(duration, 300), bossHP: 1 + i / 29 * .4 } // later bosses last longer
})));
export const CAMPAIGN_STARS = CHAPTERS.length * 3;
export const chapter = id => CHAPTERS[Math.max(1, Math.min(CHAPTERS.length, Math.floor(id) || 1)) - 1];
export const star3Label = ch => STAR_RULES[ch.star3.rule].label(ch.star3.value);
export const starLabels = ch => [`夜の半分（${Math.floor(ch.duration / 2 / 60)}:${String(ch.duration / 2 % 60).padStart(2, '0')}）まで生き残る`, '夜明けまで守り抜く（クリア）', star3Label(ch)];
export const bossNames = ch => [...new Set([ch.bosses.mid, ...ch.bosses.final])].map(k => BOSSES[k].name);
export const stageName = ch => STAGES[ch.stage].name;

// Game options for a chapter (merged with the player's character / workshop by the caller).
export function chapterOptions(ch) { return { stage: ch.stage, heat: ch.heat, mutators: ch.mutators, bosses: ch.bosses, config: ch.config, chapter: ch.id }; }

// Run summary needed for the stars: { won, time, hits, lowHp, bossSlowest, dashes, pulses }.
export function runStars(ch, r) {
  const out = [r.time >= ch.duration / 2 || r.won, !!r.won, false];
  out[2] = out[1] && STAR_RULES[ch.star3.rule].check(r, ch.star3.value);
  return out;
}
// Live ★3 tracker text for the HUD; failed = the condition can no longer be met this run.
export function star3Status(ch, r) { const rule = STAR_RULES[ch.star3.rule]; return { text: rule.progress(r, ch.star3.value), failed: rule.failed(r, ch.star3.value) }; }

// Rewards: workshop stars for each ★ the first time it is earned, plus milestones on the total.
export const starReward = (ch, i) => [8, 14, 20][i] + ch.id * [1, 2, 3][i];
export const MILESTONES = Object.freeze([
  { stars: 15, reward: 100 }, { stars: 30, reward: 150 }, { stars: 45, reward: 200, skin: 'aurora' },
  { stars: 60, reward: 250 }, { stars: 75, reward: 300 }, { stars: 90, reward: 400, skin: 'dawn' }
]);
export const totalStars = profile => Object.values(profile.campaign?.stars || {}).reduce((s, v) => s + v.filter(Boolean).length, 0);
export const chapterUnlocked = (profile, id) => id <= 1 || !!profile.campaign?.stars?.[id - 1]?.[1];
export const nextChapter = profile => { for (const ch of CHAPTERS) if (!profile.campaign?.stars?.[ch.id]?.[1]) return ch.id; return CHAPTERS.length; };

// Records a campaign run: new stars, first-earn rewards, milestones and the next chapter unlock.
export function recordChapter(profile, id, r) {
  const ch = chapter(id); profile.campaign ||= { stars: {} };
  const before = profile.campaign.stars[ch.id] || [false, false, false], got = runStars(ch, r), merged = before.map((v, i) => v || got[i]);
  const totalBefore = totalStars(profile); profile.campaign.stars[ch.id] = merged;
  const fresh = merged.map((v, i) => v && !before[i]), reward = fresh.reduce((s, v, i) => s + (v ? starReward(ch, i) : 0), 0);
  const totalAfter = totalStars(profile), milestones = MILESTONES.filter(m => totalBefore < m.stars && totalAfter >= m.stars);
  const bonus = milestones.reduce((s, m) => s + m.reward, 0);
  profile.stars += reward + bonus; profile.earned += reward + bonus;
  const unlockedNext = !before[1] && merged[1] && ch.id < CHAPTERS.length ? ch.id + 1 : null;
  return { chapter: ch.id, got, stars: merged, fresh, reward, milestones, bonus, total: totalAfter, unlockedNext };
}
export function sanitizeCampaign(raw) {
  const out = { stars: {} }; if (!raw || typeof raw !== 'object' || !raw.stars || typeof raw.stars !== 'object') return out;
  for (const ch of CHAPTERS) { const v = raw.stars[ch.id]; if (Array.isArray(v) && v.length === 3) out.stars[ch.id] = v.map(x => x === true); }
  return out;
}

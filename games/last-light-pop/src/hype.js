// Presentation-only scoring helpers: combo streaks, result ranks and music intensity.
// None of these values feed back into the simulation, so game balance stays unchanged.
export const COMBO_WINDOW = 2.4;
export const COMBO_TIERS = Object.freeze([
  { count: 10, label: 'NICE!' }, { count: 25, label: 'GREAT!' }, { count: 50, label: 'AWESOME!' }, { count: 100, label: 'FANTASTIC!' },
  { count: 200, label: 'INCREDIBLE!!' }, { count: 400, label: 'GODLIKE!!' }, { count: 800, label: 'LEGENDARY!!!' }
]);
export class ComboMeter {
  constructor(window = COMBO_WINDOW) { this.window = window; this.reset(); this.best = 0; }
  reset() { this.count = 0; this.timer = 0; this.tier = -1; this.best = 0; }
  get left() { return this.count ? Math.max(0, this.timer / this.window) : 0; }
  // Returns the newly reached tier, if any.
  update(kills, dt) {
    if (!Number.isFinite(kills) || kills < 0) kills = 0; if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (kills > 0) { this.count += Math.floor(kills); this.timer = this.window; this.best = Math.max(this.best, this.count); }
    else if (this.count) { this.timer -= dt; if (this.timer <= 0) { this.count = 0; this.timer = 0; this.tier = -1; } }
    let reached = null;
    while (this.tier + 1 < COMBO_TIERS.length && this.count >= COMBO_TIERS[this.tier + 1].count) { this.tier++; reached = { ...COMBO_TIERS[this.tier], index: this.tier }; }
    return reached;
  }
  finish() { this.timer = 0; }
}
export function rankFor({ won, time, duration, kills, combo, mode }) {
  const survival = Math.min(1, time / Math.max(1, duration)), hard = mode === 'eclipse' ? 1.2 : mode === 'patrol' ? .85 : 1;
  const score = (survival * 55 + (won ? 25 : 0) + Math.min(12, kills / 120) + Math.min(8, combo / 40)) * hard;
  return score >= 92 ? 'S' : score >= 75 ? 'A' : score >= 50 ? 'B' : 'C';
}
// 0 groove, 1 claps, 2 gated chords, 3 full lead; boss handled separately.
export function musicIntensity(game) {
  const progress = game.time / Math.max(1, game.duration), crowd = game.enemies.length;
  let level = progress < .12 ? 0 : progress < .35 ? 1 : progress < .7 ? 2 : 3;
  if (crowd > 160) level = Math.max(level, 2); if (crowd > 380) level = 3;
  return level;
}

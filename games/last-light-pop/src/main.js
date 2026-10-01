import { Game, MODES, UPGRADES, HEATS, MUTATORS, EVOLVE_PAIRS, SLOT_LIMIT, CHARACTERS, EVENTS, formatTime } from './core.js';
import { SHOP, shopCost, ACHIEVEMENTS, sanitizeProfile, buy, refundAll, recordRun, checkProfileAchievements, UNLOCKS, lockedWeapons, characterUnlocked, dailyConfig, describeDaily, heatMultiplier, localDate } from './meta.js';
import { Renderer } from './render.js';
import { AudioEngine, MUSIC_BPM } from './audio.js';
import { EndingSequence } from './ending.js';
import { ComboMeter, rankFor, musicIntensity } from './hype.js';

const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const SETTINGS_KEY = 'lastlight-pop-settings-v1', RECORDS_KEY = 'lastlight-pop-records-v1', PROFILE_KEY = 'lastlight-pop-profile-v1';
const DEFAULT_SETTINGS = { sound: true, music: 0.42, sfx: 0.6, quality: 'auto', vibration: true, heat: 0 };
const EMPTY_RECORDS = { runs: 0, wins: 0, totalKills: 0, bestKills: 0, bestTime: 0, bestCombo: 0, modes: {} };
export const POP_COLORS = Object.freeze({ boomer: 'var(--yellow)', laser: 'var(--sky)', mine: 'var(--coral)', rain: 'var(--purple)', crit: 'var(--mint)', tempo: 'var(--orange)', pulse: 'var(--lemon)', bomb: 'var(--ink-soft)', other: '#cfc6ea', bolt: 'var(--yellow)', orbit: 'var(--sky)', arc: 'var(--orange)', frost: '#9be7ff', drone: 'var(--pink)', nova: 'var(--coral)', power: 'var(--purple)', haste: 'var(--mint)', magnet: 'var(--teal)', vital: 'var(--pink)', regen: 'var(--mint)' });
function read(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } }
function number(v, fallback, min, max) { return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback; }
const rawSettings = read(SETTINGS_KEY, {}), settings = { ...DEFAULT_SETTINGS };
if (rawSettings && typeof rawSettings === 'object') { settings.sound = rawSettings.sound !== false; settings.music = number(rawSettings.music, DEFAULT_SETTINGS.music, 0, 1); settings.sfx = number(rawSettings.sfx, DEFAULT_SETTINGS.sfx, 0, 1); settings.quality = ['auto', 'low', 'high'].includes(rawSettings.quality) ? rawSettings.quality : 'auto'; settings.vibration = rawSettings.vibration !== false; settings.heat = Math.floor(number(rawSettings.heat, 0, 0, 8)); }
const profile = sanitizeProfile(read(PROFILE_KEY, null)); settings.heat = Math.min(settings.heat, profile.heatUnlocked);
function saveProfile() { if (!save(PROFILE_KEY, profile)) toast('この環境では進行状況を保存できません。'); }
const rawRecords = read(RECORDS_KEY, {}), records = { ...EMPTY_RECORDS, modes: {} };
if (rawRecords && typeof rawRecords === 'object') { for (const k of ['runs', 'wins', 'totalKills', 'bestKills', 'bestTime', 'bestCombo']) records[k] = Math.floor(number(rawRecords[k], 0, 0, 1e9)); for (const id of Object.keys(MODES)) { const r = rawRecords.modes?.[id]; if (r && typeof r === 'object') records.modes[id] = { time: number(r.time, 0, 0, 1e6), kills: Math.floor(number(r.kills, 0, 0, 1e9)), won: r.won === true }; } }

const renderer = new Renderer($('#game-canvas')), audio = new AudioEngine(), combo = new ComboMeter();
renderer.setQuality(settings.quality); audio.musicVolume = settings.music; audio.sfxVolume = settings.sfx; audio.enabled = settings.sound;
let mode = 'guard', game = null, ending = null, endingResultShown = false, demo = makeDemo(), prevState = 'home', previous = performance.now(), accumulator = 0, hudTimer = 0;
let frameTime = 0, elapsedTime = 0, frameCount = 0, fps = 60, resultSaved = false, toastTimer = 0, announceTimer = 0, warnTimer = 0, dialogReturn = null, installPrompt = null, waitingSW = null, pendingReload = false;
let heartbeatAt = 0, slowmo = 0, lastKills = 0, lastLevel = 1, lastArsenal = '', choosing = false, cooldownReady = { dash: true, pulse: true }, audioPrimed = false;
let runInfo = { daily: false, heat: 0, mutators: [], day: '' }, runResult = null, banishMode = false, chestTimers = [], chestDone = true;
const STEP = 1 / 60, keys = new Set(), movement = { x: 0, y: 0 }, stick = { id: null, x: 0, y: 0 };

function makeDemo() { const g = new Game('guard', 32489); g.start(); g.levels.orbit = 3; g.levels.frost = 1; g.levels.drone = 2; g.levels.arc = 1; g.player.invincible = 9999; g.viewRadius = 400; g.time = 12; for (let i = 0; i < 40; i++) { const e = g.spawnEnemy(i % 7 === 0 ? 2 : i % 5 === 0 ? 3 : i % 3 === 0 ? 1 : 0); const a = g.rng() * Math.PI * 2, r = 150 + g.rng() * 370; e.x = Math.cos(a) * r; e.y = Math.sin(a) * r; } return g; }
function clearInput() { keys.clear(); movement.x = movement.y = 0; stick.id = null; $('#joystick').hidden = true; }
function syncSound() { for (const b of $$('.sound-toggle')) { b.classList.toggle('muted', !settings.sound); b.setAttribute('aria-pressed', String(settings.sound)); } for (const s of $$('.sound-label')) s.textContent = settings.sound ? 'SOUND ON' : 'SOUND OFF'; }
function setSound(v) { settings.sound = v; audio.setEnabled(v); save(SETTINGS_KEY, settings); syncSound(); if (v) audio.effect('choose'); }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function announce(message, kind = '') { const el = $('#announcement'); el.textContent = message; el.className = 'announcement ' + kind; el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(announceTimer); announceTimer = setTimeout(() => el.hidden = true, 2600); }
function warning(text) { const el = $('#warning-banner'); $('#warning-text').textContent = text; el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(warnTimer); warnTimer = setTimeout(() => el.hidden = true, 3000); }
function hideScreens() { $$('#home-screen,#hud,#upgrade-screen,#chest-screen,#pause-screen,#ending-screen,#result-screen').forEach(x => x.hidden = true); }
function primeAudio() { if (audioPrimed || !settings.sound) return; audioPrimed = true; audio.setScene(game ? 'play' : 'home'); void audio.unlock(); }

function start(opts = {}) {
  const daily = !!opts.daily;
  if (daily) { const cfg = dailyConfig(); runInfo = { daily: true, heat: cfg.heat, mutators: cfg.mutators, day: cfg.day }; game = new Game(cfg.mode, cfg.seed, { heat: cfg.heat, mutators: cfg.mutators }); }
  else { runInfo = { daily: false, heat: settings.heat, mutators: [], day: '' }; game = new Game(mode, Date.now(), { heat: settings.heat, meta: profile.meta, character: characterUnlocked(profile, profile.character) ? profile.character : 'keeper', locked: lockedWeapons(profile) }); }
  ending = null; endingResultShown = false; runResult = null; clearInput(); game.start(); combo.reset(); resultSaved = false; lastArsenal = ''; lastKills = 0; lastLevel = 1; slowmo = 0; choosing = false;
  prevState = ''; accumulator = 0; document.body.classList.add('playing'); renderer.camera.x = game.player.x; renderer.camera.y = game.player.y; renderer.resize();
  audioPrimed = true; audio.setScene('play'); void audio.unlock(); audio.setActive(true);
  $('#mission-label').textContent = MODES[game.mode].name;
  $('#hud-chips').innerHTML = (runInfo.daily ? `<span class="daily">DAILY ${runInfo.day.slice(5).replace('-', '/')}</span>` : '') + (runInfo.heat ? `<span>ヒート${runInfo.heat}</span>` : '') + runInfo.mutators.map(id => `<span class="daily">${MUTATORS[id].name}</span>`).join(''); $('#time-target').textContent = '/ ' + formatTime(game.duration); $('#movement-hint').hidden = false; $('#announcement').hidden = true; $('#warning-banner').hidden = true; $('#combo').hidden = true;
  transition(); updateHUD(); renderer.celebrate('start', game); announce('READY… GO!!'); $('#stage').focus({ preventScroll: true });
}
function home() {
  if (game && ['running', 'paused', 'upgrade', 'chest'].includes(game.state)) finalizeRun(false);
  game = null; ending = null; endingResultShown = false; audio.setScene('home'); clearInput(); prevState = 'home'; hideScreens(); $('#home-screen').hidden = false;
  document.body.classList.remove('playing'); $('#announcement').hidden = true; $('#warning-banner').hidden = true; $('#boss-panel').hidden = true; renderer.resize(); demo = makeDemo(); updateBest(); updateHome(); $('#start-button').focus({ preventScroll: true });
}
function transition() {
  if (!game || game.state === prevState) return; prevState = game.state; clearInput(); hideScreens(); $('#hud').hidden = false;
  if (game.state === 'upgrade') { choosing = false; renderUpgrades(); $('#upgrade-screen').hidden = false; $('#upgrade-cards button')?.focus({ preventScroll: true }); }
  else if (game.state === 'chest') { $('#chest-screen').hidden = false; playChest(); }
  else if (game.state === 'paused') { $('#pause-screen').hidden = false; $('#resume-button').focus({ preventScroll: true }); }
  else if (game.state === 'dead' || game.state === 'won') beginEnding();
}
function beginEnding() {
  ending = new EndingSequence(game.state, { reducedMotion: renderer.reduced }); endingResultShown = false; combo.finish();
  audio.setScene('ending'); renderResult(); $('#hud').hidden = true; $('#announcement').hidden = true; $('#warning-banner').hidden = true; clearTimeout(announceTimer);
  const won = ending.kind === 'won', screen = $('#ending-screen'); screen.dataset.outcome = ending.kind; screen.style.setProperty('--ending-text', ending.reducedMotion ? 1 : 0); screen.hidden = false;
  $('#ending-kicker').textContent = won ? 'MISSION CLEAR!!' : 'GAME OVER'; $('#ending-title').textContent = won ? '夜明けだ！' : 'やられた〜！';
  $('#ending-copy').textContent = won ? '最後の灯火を、守り抜いた！' : 'でも灯火は、まだ消えてない。';
  $('#ending-skip').focus({ preventScroll: true });
}
function finishEnding() { if (!ending || !ending.done || endingResultShown) return; endingResultShown = true; $('#ending-screen').hidden = true; $('#result-screen').hidden = false; countUp(); $('#retry-button').focus({ preventScroll: true }); }
function skipEnding() { if (ending && !endingResultShown) { ending.skip(); finishEnding(); } }
function hasUnfinishedRun() { return !!game && (['running', 'paused', 'upgrade', 'chest'].includes(game.state) || !!ending && !endingResultShown); }

function evolveHint(u) {
  const lv = game.levels[u.id];
  if (u.tag === 'WEAPON' && lv >= 2 && lv <= 4) { const partner = UPGRADES.find(x => x.id === EVOLVE_PAIRS[u.id]); return game.levels[partner.id] > 0 ? `<span class="evolve-hint ok">✓ 進化OK（${partner.name}）</span>` : `<span class="evolve-hint need">進化には「${partner.name}」が必要</span>`; }
  if (u.tag === 'SUPPORT') { const needs = UPGRADES.filter(w => w.tag === 'WEAPON' && EVOLVE_PAIRS[w.id] === u.id && game.levels[w.id] > 0 && game.levels[u.id] === 0); if (needs.length) return `<span class="evolve-hint key">★ ${needs.map(w => w.name).join('・')}の進化に必要</span>`; }
  return '';
}
function renderUpgrades(flip = false) {
  const cards = $('#upgrade-cards'); cards.classList.toggle('banishing', banishMode); cards.classList.remove('rerolled'); if (flip) { void cards.offsetWidth; cards.classList.add('rerolled'); }
  cards.innerHTML = game.choices.map((u, i) => {
    const lv = game.levels[u.id], evolved = lv === 4 && u.tag === 'WEAPON', desc = lv > 0 && u.effect ? u.effect[lv - 1] : u.description;
    const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : k === lv ? 'next' : ''}"></i>`).join('');
    return `<button class="upgrade-card ${evolved ? 'evolve' : ''}" data-upgrade="${u.id}" style="--c:${POP_COLORS[u.id] || 'var(--yellow)'}" aria-label="${u.name}を${banishMode ? '除外' : '選択'}"><div class="upgrade-top"><span>${evolved ? '★ EVOLUTION ★' : lv === 0 ? 'NEW ' + u.tag : u.tag}</span><kbd>${i + 1}</kbd></div><div class="upgrade-icon">${icon(u.icon)}</div><h3>${u.name}${evolved ? '・極' : ''}</h3><p>${desc}</p>${evolveHint(u)}<span class="upgrade-level">${lv === 0 ? 'GET!' : `LV. ${lv} → ${lv + 1}`}<span class="pips">${pips}</span></span></button>`;
  }).join('');
  $('#reroll-count').textContent = game.rerolls; $('#banish-count').textContent = game.banishes; $('#reroll-button').disabled = game.rerolls <= 0; $('#banish-button').disabled = game.banishes <= 0 && !banishMode;
  $('#banish-button').setAttribute('aria-pressed', String(banishMode)); $('#upgrade-footnote').textContent = banishMode ? '除外するカードを選んでください（この出撃では二度と出ません）・ X でキャンセル' : `武器 ${game.owned('WEAPON')}/${SLOT_LIMIT.WEAPON} ・ 支援 ${game.owned('SUPPORT')}/${SLOT_LIMIT.SUPPORT} ・ 数字キー 1 / 2 / 3 でも選べます`;
}
function choose(id) {
  if (!game || game.state !== 'upgrade' || choosing || !game.choices.some(c => c.id === id)) return;
  if (banishMode) { banishCard(id); return; }
  choosing = true; const card = $(`[data-upgrade="${id}"]`); audio.effect('choose');
  const apply = () => { if (game?.chooseUpgrade(id)) { accumulator = 0; prevState = ''; transition(); updateHUD(); } choosing = false; };
  if (card && !renderer.reduced) { card.classList.add('picked'); setTimeout(apply, 170); } else apply();
}
function banishCard(id) {
  choosing = true; const card = $(`[data-upgrade="${id}"]`); banishMode = false;
  const apply = () => { choosing = false; if (!game?.banish(id)) { renderUpgrades(); return; } if (game.state === 'upgrade') renderUpgrades(true); else { prevState = ''; transition(); } };
  if (card && !renderer.reduced) { card.classList.add('banished'); setTimeout(apply, 260); } else apply();
}
function reroll() { if (game?.state === 'upgrade' && !choosing && game.reroll()) { banishMode = false; renderUpgrades(true); $('#upgrade-cards button')?.focus({ preventScroll: true }); } }
function toggleBanish() { if (game?.state !== 'upgrade' || choosing || game.banishes <= 0 && !banishMode) return; banishMode = !banishMode; audio.effect('ui'); renderUpgrades(); }
function skipUpgrade() { if (game?.state === 'upgrade' && !choosing && game.skip()) { banishMode = false; prevState = ''; transition(); } }
// --- treasure chest presentation -------------------------------------------------------------
function rewardView(r) {
  if (r.id === 'heal') return { name: 'HP回復', label: '+30 HP', icon: 'heart', color: 'var(--coral)', evolved: false };
  const u = UPGRADES.find(x => x.id === r.id); return { name: u.name + (r.evolved ? '・極' : ''), label: r.evolved ? '★ EVOLUTION' : 'Lv. ' + r.level, icon: u.icon, color: POP_COLORS[u.id], evolved: r.evolved };
}
function reelHTML(r, spinning) { const v = rewardView(r); return `<div class="reel ${spinning ? 'spinning' : 'stopped'} ${!spinning && v.evolved ? 'evolved' : ''}" style="--c:${v.color}"><div class="reel-top">${spinning ? '? ? ?' : v.evolved ? 'EVOLVE!' : 'GET!'}</div><div class="reel-icon">${icon(v.icon)}</div><strong>${spinning ? '…' : v.name}</strong><small>${spinning ? '&nbsp;' : v.label}</small></div>`; }
function clearChestTimers() { for (const t of chestTimers) { clearTimeout(t); clearInterval(t); } chestTimers = []; }
function playChest() {
  const ch = game.chest, screen = $('#chest-screen'), art = $('#chest-art'), reels = $('#chest-reels'); clearChestTimers(); chestDone = false;
  screen.dataset.tier = ch.tier; screen.classList.remove('jackpot'); $('#chest-claim').hidden = true; reels.innerHTML = '';
  $('#chest-eyebrow').textContent = ch.tier >= 2 ? 'BOSS TREASURE!' : 'TREASURE!'; $('#chest-title').textContent = ch.tier >= 2 ? 'ボスの宝箱だ！' : '宝箱をゲット！';
  if (renderer.reduced) { finishChest(); return; }
  art.className = 'chest-art shake';
  chestTimers.push(setTimeout(() => {
    art.className = 'chest-art open'; audio.effect('chest'); reels.innerHTML = ch.rewards.map(r => reelHTML(r, true)).join('');
    const pool = UPGRADES.map(u => u.icon); let step = 0;
    chestTimers.push(setInterval(() => { step++; for (const el of reels.querySelectorAll('.reel.spinning use')) el.setAttribute('href', '#i-' + pool[(step + Math.floor(Math.random() * pool.length)) % pool.length]); audio.effect('tick', { step: step % 12 }); }, 75));
    ch.rewards.forEach((r, i) => chestTimers.push(setTimeout(() => stopReel(i), 900 + i * 430)));
    chestTimers.push(setTimeout(finishChest, 900 + ch.rewards.length * 430 + 150));
  }, 650));
}
function stopReel(i) { const el = $('#chest-reels').children[i]; if (!el || !game?.chest) return; el.outerHTML = reelHTML(game.chest.rewards[i], false); audio.effect(game.chest.rewards[i].evolved ? 'evolve' : 'choose'); }
function finishChest() {
  if (chestDone || !game?.chest) return; clearChestTimers(); chestDone = true; const ch = game.chest;
  $('#chest-art').className = 'chest-art open'; $('#chest-reels').innerHTML = ch.rewards.map(r => reelHTML(r, false)).join('');
  if (ch.count >= 5) { $('#chest-screen').classList.add('jackpot'); $('#chest-eyebrow').textContent = '★ JACKPOT ★'; $('#chest-title').textContent = '大当たり！！5連ゲット！'; audio.effect('jackpot'); renderer.celebrate('evolve', game); }
  else if (ch.count >= 3) { $('#chest-title').textContent = 'やった！3連ゲット！'; audio.effect('level'); }
  $('#chest-claim').hidden = false; $('#chest-claim').focus({ preventScroll: true });
}
function claimChest() { if (!chestDone || game?.state !== 'chest') return; game.claimChest(); accumulator = 0; prevState = ''; transition(); updateHUD(); }
function runSummary(won) { const st = game.stats; return { mode: game.mode, won, time: game.time, kills: game.kills, level: game.level, heat: runInfo.heat, combo: combo.best, evolves: st.evolves, jackpots: st.jackpots, elites: st.elites, bossKills: st.bossKills, bossHits: st.bossHits, chests: st.chests, daily: runInfo.daily, specials: st.specials, character: game.character }; }
function finalizeRun(won) { if (!game || resultSaved) return runResult; const best = storeResult(won); runResult = { best, ...recordRun(profile, runSummary(won), runInfo.day || localDate()) }; saveProfile(); updateStars(true); return runResult; }
function storeResult(won) {
  if (!game || resultSaved) return false; resultSaved = true;
  const best = game.time > records.bestTime || game.kills > records.bestKills || combo.best > records.bestCombo;
  records.runs++; if (won) records.wins++; records.totalKills += game.kills; records.bestTime = Math.max(records.bestTime, game.time); records.bestKills = Math.max(records.bestKills, game.kills); records.bestCombo = Math.max(records.bestCombo, combo.best);
  const old = records.modes[game.mode] || { time: 0, kills: 0, won: false }; records.modes[game.mode] = { time: Math.max(old.time, game.time), kills: Math.max(old.kills, game.kills), won: old.won || won };
  if (!save(RECORDS_KEY, records)) toast('この環境では記録を保存できません。プレイは続けられます。'); return best;
}
function renderResult() {
  const won = game.state === 'won', res = finalizeRun(won), best = res.best, rank = rankFor({ won, time: game.time, duration: game.duration, kills: game.kills, combo: combo.best, mode: game.mode });
  $('#result-screen').dataset.outcome = game.state; $('#result-eyebrow').textContent = won ? 'YOU KEPT THE LIGHT!' : 'NEXT NIGHT'; $('#result-title').textContent = won ? '夜明けが来た！' : '次の夜へ！';
  $('#result-copy').textContent = won ? 'あなたの灯火が、荒野に朝を連れてきた。' : 'その灯火は、まだあなたの中に。';
  const stamp = $('#result-rank'); stamp.textContent = rank; stamp.dataset.rank = rank;
  $('#result-time').textContent = formatTime(game.time); $('#result-kills').textContent = '0'; $('#result-level').textContent = game.level; $('#result-combo').textContent = '0';
  $('#result-kills').dataset.target = game.kills; $('#result-combo').dataset.target = combo.best;
  $('#new-record').hidden = !best;
  $('#star-total').dataset.target = res.stars.total; $('#star-total').textContent = '0'; $('#star-mult').textContent = res.stars.mult > 1 ? `ヒート ×${res.stars.mult.toFixed(2)}` : '';
  $('#star-lines').innerHTML = res.stars.lines.map(([k, v]) => `<li>${k} <b>+${v}</b></li>`).join('');
  const names = { pulse: 'パルス', bomb: '爆弾', other: 'その他' }, totalDmg = Object.values(game.damageBy).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(game.damageBy).filter(([k, v]) => v > 0 && k !== 'other').sort((a, b) => b[1] - a[1]).slice(0, 6);
  $('#damage-board').innerHTML = rows.length ? `<h4><span>ダメージ内訳</span><span>DPS ${Math.round(totalDmg / Math.max(1, game.time)).toLocaleString()}</span></h4>` + rows.map(([id, v]) => { const u = UPGRADES.find(x => x.id === id); return `<div class="dmg-row" style="--c:${POP_COLORS[id] || 'var(--lemon)'}">${icon(u ? u.icon : id === 'pulse' ? 'nova' : id === 'bomb' ? 'mine' : 'light')}<span>${u ? u.name : names[id] || id}</span><div class="dmg-bar"><i data-w="${(v / rows[0][1] * 100).toFixed(1)}"></i></div><b>${Math.round(v / totalDmg * 100)}%<small> · ${(game.killsBy[id] || 0).toLocaleString()}体</small></b></div>`; }).join('') : '';
  setTimeout(() => $$('.dmg-bar i').forEach(i => i.style.width = i.dataset.w + '%'), 600);
  if (game.endless) { $('#result-title').textContent = `${formatTime(game.time)} 生き残った！`; $('#result-eyebrow').textContent = 'ENDLESS NIGHT'; $('#result-copy').textContent = `自己ベスト ${formatTime(profile.endlessBest)}`; }
  $('#result-unlocks').innerHTML = res.newlyUnlocked.map(u => `<div class="unlock new">${icon(u.kind === 'weapon' ? UPGRADES.find(x => x.id === u.id).icon : 'user')}${u.kind === 'weapon' ? '新しい武器' : '新キャラクター'}「${u.label}」が解放された！<small>NEW!</small></div>`).join('') + (res.heatUnlocked ? `<div class="unlock heat">${icon('flame')}ヒート${res.heatUnlocked}「${HEATS[res.heatUnlocked].name}」が解放された！<small>★×${heatMultiplier(res.heatUnlocked).toFixed(2)}</small></div>` : '') + res.unlocked.map(a => `<div class="unlock">${icon('medal')}実績「${a.name}」達成！<small>★ +${a.reward}</small></div>`).join('');
  if (res.unlocked.length) setTimeout(() => audio.effect('achieve'), 1400); if (res.newlyUnlocked.length) setTimeout(() => audio.effect('unlock'), 2000);
  $('#result-build').innerHTML = UPGRADES.filter(u => u.tag === 'WEAPON' && game.levels[u.id] > 0).map(u => `<span style="--c:${POP_COLORS[u.id]}" title="${u.name}">${icon(u.icon)} ${game.levels[u.id] === 5 ? '★MAX' : 'Lv' + game.levels[u.id]}</span>`).join('');
}
function countUp() {
  const els = [$('#result-kills'), $('#result-combo'), $('#star-total')], begin = performance.now(), dur = renderer.reduced ? 1 : 900;
  function tick(now) { const t = Math.min(1, (now - begin) / dur), e = 1 - Math.pow(1 - t, 3); for (const el of els) el.textContent = Math.round(Number(el.dataset.target || 0) * e).toLocaleString(); if (t < 1) requestAnimationFrame(tick); else audio.effect('xp'); }
  requestAnimationFrame(tick);
}
function updateStars(gain = false) { $('#star-count').textContent = profile.stars.toLocaleString(); if (gain) { const c = $('.star-chip'); c.classList.remove('gain'); void c.offsetWidth; c.classList.add('gain'); } }
function updateHome() {
  updateStars(); const h = Math.min(settings.heat, profile.heatUnlocked), def = HEATS[h], row = $('.heat-row'); settings.heat = h;
  row.dataset.heat = h; row.dataset.hot = h >= 6 ? 2 : h >= 3 ? 1 : 0; $('#heat-level').textContent = h; $('#heat-name').textContent = `ヒート${h}・${def.name}`;
  $('#heat-rule').textContent = h ? HEATS.slice(1, h + 1).map(x => x.rule).join(' / ') : profile.heatUnlocked ? 'いつもの夜（＋でヒートを上げられます）' : 'クリアするとヒート1が解放されます';
  $('#heat-mult').textContent = `★×${heatMultiplier(h).toFixed(2)}`; $('#heat-down').disabled = h <= 0; $('#heat-up').disabled = h >= profile.heatUnlocked;
  $('#heat-up').title = h >= profile.heatUnlocked ? (h < HEATS.length - 1 ? `ヒート${h}でクリアすると解放` : '最高ヒートです') : 'ヒートを上げる';
  const cfg = dailyConfig(), d = describeDaily(cfg), rec = profile.daily[cfg.day];
  $('#daily-summary').textContent = `${d.mode}・${d.mutators.map(m => m.name).join('＋')}${cfg.heat ? `・ヒート${cfg.heat}` : ''}`;
  const badge = $('#daily-badge'); badge.textContent = rec?.won ? 'CLEAR' : rec ? formatTime(rec.best) : 'NEW'; badge.className = rec?.won ? 'done' : '';
  $('#achieve-count').textContent = `${Object.keys(profile.achievements).length}/${ACHIEVEMENTS.length}`;
  updateCharacter();
  $('#shop-badge').hidden = !SHOP.some(i => profile.stars >= shopCost(i, profile.meta[i.id] || 0));
}
function charImage(id) { try { return renderer.sprites['player_' + id].image.toDataURL(); } catch { return ''; } }
function updateCharacter() { const id = characterUnlocked(profile, profile.character) ? profile.character : 'keeper', c = CHARACTERS[id]; $('#char-img').src = charImage(id); $('#char-name').textContent = `${c.name}・${c.title}`; $('#char-perk').textContent = c.perk; }
function setHeat(delta) { const next = Math.max(0, Math.min(profile.heatUnlocked, settings.heat + delta)); if (next === settings.heat) return; settings.heat = next; save(SETTINGS_KEY, settings); audio.effect(delta > 0 ? 'elite' : 'ui'); updateHome(); }
function achievementToast(list) { list.forEach((a, i) => setTimeout(() => { const el = document.createElement('div'); el.className = 'ach-toast'; el.innerHTML = `${icon('medal')}<div>実績「${a.name}」達成！<small>★ +${a.reward}</small></div>`; document.body.append(el); audio.effect('achieve'); setTimeout(() => el.remove(), 3300); }, i * 900)); }
function updateBest() { $('#home-best').textContent = records.bestTime ? formatTime(records.bestTime) : '--:--'; $('#home-combo').textContent = records.bestCombo.toLocaleString(); }

function updateHUD() {
  if (!game) return; const p = game.player;
  $('#hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHP}`; $('#hp-bar').style.width = `${p.hp / p.maxHP * 100}%`; $('.health-track').classList.toggle('danger', p.hp < p.maxHP * .3);
  $('#level-text').textContent = `LV. ${String(game.level).padStart(2, '0')}`; if (game.level !== lastLevel) { lastLevel = game.level; const b = $('#level-text'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  $('#xp-bar').style.width = `${Math.min(100, game.xp / game.xpNext * 100)}%`; $('#time-text').textContent = formatTime(game.time);
  const overtime = !game.endless && game.time >= game.duration && !game.finalKilled; $('#time-target').textContent = game.endless ? `∞ BEST ${formatTime(profile.endlessBest)}` : overtime ? '夜の主をたおせ！' : '/ ' + formatTime(game.duration);
  $('#status-chips').innerHTML = (game.freeze > 0 ? `<span class="freeze">FREEZE ${Math.ceil(game.freeze)}</span>` : '') + (game.starPower > 0 ? `<span class="star">★ STAR ${Math.ceil(game.starPower)}</span>` : '') + (game.eventKind === 'meteor' && game.eventTimer > 0 ? `<span class="event">流星群 ${Math.ceil(game.eventTimer)}</span>` : ''); $('#time-target').classList.toggle('alert', overtime);
  $('#kills-text').textContent = game.kills.toLocaleString(); $('#movement-hint').hidden = game.time > 7;
  for (const [key, cd, max] of [['dash', p.dashCD, 3 * (1 - game.levels.haste * .08)], ['pulse', p.pulseCD, 18]]) {
    const btn = $(`#${key}-button`), label = $(`#${key}-cooldown`), ready = cd <= 0;
    label.textContent = ready ? '' : Math.ceil(cd); label.style.setProperty('--cd', Math.max(0, Math.min(1, cd / max))); btn.disabled = !ready || game.state !== 'running';
    if (ready && !cooldownReady[key]) { btn.classList.remove('ready'); void btn.offsetWidth; btn.classList.add('ready'); } cooldownReady[key] = ready;
  }
  const signature = UPGRADES.map(u => game.levels[u.id]).join(',');
  if (signature !== lastArsenal) {
    const before = lastArsenal.split(','); lastArsenal = signature; const equipped = UPGRADES.filter(u => u.tag === 'WEAPON' && game.levels[u.id] > 0), weapons = UPGRADES;
    $('#arsenal-slots').innerHTML = equipped.map(u => { const i = weapons.indexOf(u), fresh = before.length > 1 && Number(before[i]) !== game.levels[u.id]; return `<div class="weapon-slot ${game.levels[u.id] === 5 ? 'evolved' : ''} ${fresh ? 'fresh' : ''}" style="--c:${POP_COLORS[u.id]}" title="${u.name} Lv.${game.levels[u.id]}">${icon(u.icon)}<small>${game.levels[u.id] === 5 ? 'MAX' : 'Lv' + game.levels[u.id]}</small></div>`; }).join('') + '<div class="weapon-slot empty"></div>'.repeat(Math.max(0, SLOT_LIMIT.WEAPON - equipped.length));
    const supports = UPGRADES.filter(u => u.tag === 'SUPPORT' && game.levels[u.id] > 0); $('#support-slots').innerHTML = supports.map(u => `<div class="weapon-slot" style="--c:${POP_COLORS[u.id]}" title="${u.name} Lv.${game.levels[u.id]}">${icon(u.icon)}<small>${game.levels[u.id]}</small></div>`).join('') + '<div class="weapon-slot empty"></div>'.repeat(Math.max(0, SLOT_LIMIT.SUPPORT - supports.length));
  }
  const boss = game.boss; $('#boss-panel').hidden = !boss?.alive;
  if (boss?.alive) { $('#boss-name').textContent = boss.final ? '夜の主 — 終夜' : '夜の主 — 先触れ'; $('#boss-hp').textContent = `${Math.ceil(boss.hp).toLocaleString()} / ${Math.ceil(boss.maxHP).toLocaleString()}`; $('#boss-bar').style.width = `${boss.hp / boss.maxHP * 100}%`; }
}
function updateCombo(dt) {
  if (!game) return; const gained = game.kills - lastKills; lastKills = game.kills;
  const tier = combo.update(gained, game.state === 'running' ? dt : 0), el = $('#combo');
  if (gained > 0) audio.effect('kill', { combo: combo.count });
  if (combo.count >= 5) {
    if (el.hidden) el.hidden = false;
    if (gained > 0) { $('#combo-count').textContent = combo.count.toLocaleString(); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    $('#combo-timer').style.setProperty('--left', combo.left);
  } else if (!el.hidden) { el.hidden = true; $('#combo-tier').textContent = ''; }
  if (tier) { $('#combo-tier').textContent = tier.label; el.classList.remove('tier'); void el.offsetWidth; el.classList.add('tier'); announce(`${tier.count} COMBO — ${tier.label}`, 'combo-call'); audio.effect('combo', { tier: tier.index }); renderer.celebrate('combo', game); }
}
function processEvents(g, muted = false) {
  const terminal = g.events.some(e => e.type === 'won' || e.type === 'dead'); if (terminal && !muted) audio.setScene('ending');
  for (const e of g.events) {
    if (muted || terminal && !['won', 'dead'].includes(e.type)) continue;
    if (e.type !== 'kill' && e.type !== 'chest') audio.effect(e.type, e);
    if (e.type === 'elite') announce('エリート出現！宝箱を持ってるぞ！', 'combo-call');
    if (e.type === 'event') { warning({ siege: 'モンスターに包囲された！', stampede: '大暴走が迫ってくる！', meteor: '流星群が降ってくる！赤い円を避けろ！' }[e.kind]); $('#warning-banner strong').textContent = EVENTS[e.kind].length > 2 ? EVENTS[e.kind] + '!!' : EVENTS[e.kind] + '！！'; }
    if (e.type === 'boss') $('#warning-banner strong').textContent = 'WARNING!!';
    if (e.type === 'bossPhase') announce(e.phase >= 3 ? '夜の主が本気になった！赤い円に注意！' : '夜の主が怒った！手下を呼んだぞ！', 'danger');
    if (e.type === 'special') announce({ magnet: 'ぜんぶ吸い寄せ！', bomb: 'ドカーン！画面の敵を一掃！', freeze: '時間よ止まれ！', star: 'スターパワー！無敵＆パワーアップ！' }[e.kind], 'evolve');
    if (e.type === 'revive') { announce('もういっかい！復活！！', 'evolve'); slowmo = renderer.reduced ? 0 : .8; }
    if (e.type === 'boss') { warning(e.final ? '夜の主が現れた — 最後の灯火を守れ！' : '夜の主が接近中！'); renderer.celebrate('boss', g); }
    if (e.type === 'bossDown') { announce('夜の主をたおした！', 'evolve'); slowmo = renderer.reduced ? 0 : .9; }
    if (e.type === 'evolve') { announce('武器が進化した！！', 'evolve'); renderer.celebrate('evolve', g); slowmo = renderer.reduced ? 0 : .45; }
    if (e.type === 'hurt' && settings.vibration && navigator.vibrate) navigator.vibrate(22);
  }
  g.events.length = 0;
}
function input() { let x = movement.x, y = movement.y; if (keys.has('KeyA') || keys.has('ArrowLeft')) x--; if (keys.has('KeyD') || keys.has('ArrowRight')) x++; if (keys.has('KeyW') || keys.has('ArrowUp')) y--; if (keys.has('KeyS') || keys.has('ArrowDown')) y++; return { x, y }; }
function syncBeat(now) {
  const info = audio.beatInfo();
  if (info) renderer.beat = info;
  else { const beat = now / 1000 * MUSIC_BPM / 60; renderer.beat = { count: Math.floor(beat), phase: beat % 1, bar: Math.floor(beat / 4), energy: game ? .55 : .4 }; }
  if (game && game.state === 'running') audio.setIntensity(musicIntensity(game), !!game.boss?.alive);
  audio.setMuffle(!!game && ['paused', 'upgrade', 'chest'].includes(game.state) || $('#app-dialog').open);
  if (game && game.state === 'running' && game.player.hp < game.player.maxHP * .3 && now - heartbeatAt > 820) { heartbeatAt = now; audio.effect('heartbeat'); }
}
function frame(now) {
  const presentationElapsed = Math.max(0, (now - previous) / 1000), elapsed = Math.min(presentationElapsed, .1), frameEnding = ending; previous = now;
  const begin = performance.now(), active = !document.hidden && !$('#app-dialog').open; syncBeat(now);
  const scale = slowmo > 0 ? .3 : 1; slowmo = Math.max(0, slowmo - elapsed); accumulator = Math.min(.1, accumulator + elapsed * scale);
  if (game) {
    if (active && game.state === 'running') { const v = input(); while (accumulator >= STEP) { game.update(STEP, v); accumulator -= STEP; if (game.state !== 'running') break; } } else accumulator = 0;
    processEvents(game); updateCombo(elapsed); transition();
    if (ending) { ending.advance(ending === frameEnding ? Math.min(presentationElapsed, .25) : 0, active); $('#ending-screen').style.setProperty('--ending-text', ending.reducedMotion ? 1 : Math.max(0, Math.min(1, (ending.age - .1) / .5))); if (ending.done) finishEnding(); }
    renderer.draw(game, active && game.state === 'running' ? elapsed * scale : elapsed * (game.state === 'running' ? 0 : 1), false, ending);
    hudTimer += elapsed; if (hudTimer > .08) { updateHUD(); hudTimer = 0; }
  } else {
    if (active && !renderer.reduced) { while (accumulator >= STEP) { if (demo.state === 'upgrade') demo.chooseUpgrade(demo.choices[0].id); demo.player.invincible = 9999; demo.update(STEP, { x: Math.cos(demo.time * .4) * .35, y: Math.sin(demo.time * .55) * .3 }); accumulator -= STEP; } if (demo.time > 70) demo = makeDemo(); }
    processEvents(demo, true); renderer.draw(demo, elapsed, true);
  }
  frameTime += performance.now() - begin; elapsedTime += elapsed; frameCount++;
  if (frameCount >= 90) { const ms = frameTime / frameCount; fps = Math.round(frameCount / Math.max(elapsedTime, .001)); $('#performance').textContent = game ? `${Math.min(120, fps)} FPS · ${game.enemies.length} MONSTERS` : 'CANVAS 2D / 100% HANDMADE'; if (renderer.quality === 'auto' && (ms > 15 || fps < 42) && !renderer.autoLow) { renderer.autoLow = true; renderer.resize(); } frameTime = 0; elapsedTime = 0; frameCount = 0; }
  requestAnimationFrame(frame);
}

$('#stage').tabIndex = -1;
$('#ending-skip').addEventListener('click', skipEnding);
$('#start-button').addEventListener('click', () => start());
$('#heat-down').addEventListener('click', () => setHeat(-1)); $('#heat-up').addEventListener('click', () => setHeat(1));
$('#daily-button').addEventListener('click', () => openDialog('daily')); $('#char-button').addEventListener('click', () => openDialog('characters'));
$('#reroll-button').addEventListener('click', reroll); $('#banish-button').addEventListener('click', toggleBanish); $('#skip-button').addEventListener('click', skipUpgrade);
$('#chest-claim').addEventListener('click', e => { e.stopPropagation(); claimChest(); }); $('#chest-screen').addEventListener('click', () => { if (!chestDone) finishChest(); }); $('#retry-button').addEventListener('click', () => start({ daily: runInfo.daily })); $('#result-home').addEventListener('click', home);
$('#resume-button').addEventListener('click', () => { game?.resume(); accumulator = 0; transition(); });
$('#pause-button').addEventListener('click', () => { game?.pause(); transition(); });
$('#quit-button').addEventListener('click', () => { if (game) { game.state = 'dead'; game.emit('dead'); transition(); } });
$('#nav-home').addEventListener('click', () => { if (game?.state === 'running') { game.pause(); transition(); } else if (game && ['paused', 'upgrade'].includes(game.state)) toast('作戦を終了するには、一時停止画面から終了してください。'); else if (game && hasUnfinishedRun()) skipEnding(); else home(); });
for (const [id, fn] of [['#dash-button', () => game?.dash()], ['#pulse-button', () => game?.pulse()]]) { $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); }); $(id).addEventListener('click', fn); }
$('#upgrade-cards').addEventListener('click', e => { const b = e.target.closest('[data-upgrade]'); if (b) choose(b.dataset.upgrade); });
$$('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; $$('[data-mode]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); }); $('#mode-title').textContent = MODES[mode].name; $('#mode-description').textContent = MODES[mode].description; audio.effect('choose'); }));
$$('.sound-toggle').forEach(b => b.addEventListener('click', () => setSound(!settings.sound)));
document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' && e.target.closest?.('button:not(:disabled)') && !e.target.closest('.ability')) audio.effect('ui'); });
window.addEventListener('pointerdown', primeAudio, { capture: true }); window.addEventListener('keydown', primeAudio, { capture: true });
window.addEventListener('keydown', e => {
  if ($('#app-dialog').open) return;
  if (ending && !endingResultShown) { if (['Enter', 'Space', 'Escape'].includes(e.code)) { e.preventDefault(); if (!e.repeat) skipEnding(); } return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (e.repeat) return;
  if (game?.state === 'chest') { if (['Enter', 'Space'].includes(e.code)) { e.preventDefault(); if (!e.repeat) chestDone ? claimChest() : finishChest(); } return; }
  if (game?.state === 'upgrade' && e.code === 'KeyR') { reroll(); return; } if (game?.state === 'upgrade' && e.code === 'KeyX') { toggleBanish(); return; } if (game?.state === 'upgrade' && e.code === 'KeyS') { skipUpgrade(); return; }
  if (game?.state === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { const u = game.choices[Number(e.code.at(-1)) - 1]; if (u) choose(u.id); return; }
  if (['Escape', 'KeyP'].includes(e.code) && game) { if (game.state === 'running') game.pause(); else if (game.state === 'paused') game.resume(); transition(); accumulator = 0; return; }
  if (game?.state !== 'running') return; keys.add(e.code); if (e.code === 'Space') game.dash(); if (e.code === 'KeyQ') game.pulse();
});
window.addEventListener('keyup', e => keys.delete(e.code));
const touchArea = $('#game-canvas');
touchArea.addEventListener('pointerdown', e => { if (game?.state !== 'running' || stick.id !== null || $('#app-dialog').open) return; e.preventDefault(); const r = $('#stage').getBoundingClientRect(); stick.id = e.pointerId; stick.x = e.clientX - r.left; stick.y = e.clientY - r.top; touchArea.setPointerCapture(e.pointerId); const joy = $('#joystick'); joy.style.left = stick.x + 'px'; joy.style.top = stick.y + 'px'; joy.hidden = false; $('#joystick-knob').style.transform = 'translate(-50%,-50%)'; });
touchArea.addEventListener('pointermove', e => { if (e.pointerId !== stick.id) return; const r = $('#stage').getBoundingClientRect(), dx = e.clientX - r.left - stick.x, dy = e.clientY - r.top - stick.y, d = Math.hypot(dx, dy), max = 42, s = d > max ? max / d : 1; movement.x = dx * s / max; movement.y = dy * s / max; $('#joystick-knob').style.transform = `translate(calc(-50% + ${dx * s}px),calc(-50% + ${dy * s}px))`; });
function release(e) { if (e.pointerId === stick.id) { stick.id = null; movement.x = movement.y = 0; $('#joystick').hidden = true; } }
touchArea.addEventListener('pointerup', release); touchArea.addEventListener('pointercancel', release); touchArea.addEventListener('lostpointercapture', release);
function autoPause() { clearInput(); if (game?.state === 'running') { game.pause(); transition(); } audio.setActive(false); }
window.addEventListener('blur', autoPause); document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); else { previous = performance.now(); accumulator = 0; audio.setActive(true); } }); window.addEventListener('focus', () => audio.setActive(true));
let resizeQueued = false; new ResizeObserver(() => { if (resizeQueued) return; resizeQueued = true; requestAnimationFrame(() => { renderer.resize(); if (stick.id !== null) { stick.id = null; movement.x = movement.y = 0; $('#joystick').hidden = true; } resizeQueued = false; }); }).observe($('#stage'));

function renderShop(bought = '') {
  const content = $('#dialog-content'), scroll = $('#app-dialog').scrollTop;
  content.innerHTML = `<div class="shop-head"><h2 id="dialog-title">工房 — ずっと続く強化</h2><span class="shop-wallet">★ ${profile.stars.toLocaleString()}</span></div><p>出撃でためたスターで、灯火そのものを強くしよう。効果はすべての通常出撃に反映されます（デイリーは対象外）。</p><div class="shop-grid">${SHOP.map(i => { const r = profile.meta[i.id] || 0, cost = shopCost(i, r), max = r >= i.max; return `<div class="shop-item ${bought === i.id ? 'bought' : ''}" style="--c:${i.color}"><span class="shop-icon">${icon(i.icon)}</span><strong>${i.name}</strong><p>${max ? i.effect(r) : r ? `${i.effect(r)} → ${i.effect(r + 1)}` : i.effect(1)}</p><span class="pips">${Array.from({ length: i.max }, (_, k) => `<i class="${k < r ? 'on' : ''}"></i>`).join('')}</span><button class="shop-buy ${max ? 'max' : ''}" data-buy="${i.id}" ${max || profile.stars < cost ? 'disabled' : ''}>${max ? 'MAX!' : `★ ${cost.toLocaleString()} で強化`}</button></div>`; }).join('')}</div><button class="text-button refund" id="refund-button">すべて払い戻す（ふり直し）</button>`;
  $('#app-dialog').scrollTop = scroll;
  content.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => { if (!buy(profile, b.dataset.buy)) return; audio.effect('buy'); const got = checkProfileAchievements(profile); saveProfile(); updateStars(true); updateHome(); renderShop(b.dataset.buy); if (got.length) achievementToast(got); }));
  $('#refund-button').addEventListener('click', e => { if (e.target.dataset.confirm !== '1') { e.target.dataset.confirm = '1'; e.target.textContent = 'もう一度押すと払い戻します'; return; } const back = refundAll(profile); saveProfile(); updateStars(true); updateHome(); renderShop(); if (back) toast(`★ ${back.toLocaleString()} を払い戻しました`); });
}
function openDialog(type) {
  dialogReturn = document.activeElement; if (game?.state === 'running') { game.pause(); transition(); } clearInput(); const content = $('#dialog-content');
  if (type === 'help') {
    $('#dialog-kicker').textContent = 'HOW TO PLAY';
    content.innerHTML = `<h2 id="dialog-title">灯火を守って、夜をこえろ！</h2><p>攻撃はぜんぶ自動。モンスターをかわしながらキラキラを集めてレベルアップ、武器を育てよう。制限時間を生きのびて、最後に現れる「夜の主」をたおせば作戦成功！</p><div class="control-row"><span>移動</span><span><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd></span></div><div class="control-row"><span>スマートフォン</span><span>画面をドラッグ</span></div><div class="control-row"><span>ダッシュ（一瞬むてき）</span><span><kbd>SPACE</kbd> / 右下ボタン</span></div><div class="control-row"><span>パルス（周りを攻撃・キラキラ回収）</span><span><kbd>Q</kbd> / 右下ボタン</span></div><div class="control-row"><span>一時停止</span><span><kbd>P</kbd> / <kbd>ESC</kbd></span></div><div class="control-row"><span>強化をえらぶ</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> / タップ</span></div><h3>アイテムと敵の弾</h3><div class="legend"><span style="--c:var(--mint)"><i></i>キラキラ＝経験値</span><span style="--c:var(--yellow)"><i></i>星＝大きな経験値</span><span style="--c:var(--coral)"><i></i>ハート＝回復</span><span style="--c:var(--tomato)"><i></i>赤い玉＝敵の弾</span></div><h3>武器は4つ、支援も4つまで</h3><p>持てる武器・支援はそれぞれ4つまで。何を育てるかが勝負の分かれ目。実績を達成すると新しい武器やキャラクターが解放されます。光る泡は特殊アイテム（全部吸い寄せ・画面一掃の爆弾・時間停止・無敵のスター）。赤い円は攻撃の予告なのですぐに離れて！</p><h3>宝箱・工房・ヒート</h3><p>王冠をかぶったエリートや夜の主をたおすと宝箱が出現。開けると1〜5個の強化が当たります。出撃するとスターがたまり、工房で恒久強化を買えます。クリアするとヒート（難易度）が解放され、高ヒートほどスター倍率がアップ。毎日変わる「今日のチャレンジ」もあります。</p><h3>進化とカードの操作</h3><p>武器はLv.5で進化しますが、相棒の支援強化が必要です（カードに表示）。強化カードはリロール（R）・除外（X）・スキップ（S）できます。</p><h3>コンボでアガれ！</h3><p>途切れずにたおし続けるとコンボが伸びて、効果音もどんどん高くなります。武器はLv.5で進化。パルスはピンチの切り札！</p><h3>アプリとして遊ぶ</h3><p>対応ブラウザではインストールできます。iPhone / iPadはSafariの共有メニューから「ホーム画面に追加」。初回読み込み後はオフラインでも遊べます。</p>`;
  } else if (type === 'settings') {
    $('#dialog-kicker').textContent = 'SETTINGS';
    content.innerHTML = `<h2 id="dialog-title">せってい</h2><div class="settings-row"><div><label for="setting-sound">サウンド</label><small>BGMと効果音</small></div><input id="setting-sound" type="checkbox" ${settings.sound ? 'checked' : ''}></div><div class="settings-row"><label for="setting-music">音楽</label><input id="setting-music" type="range" min="0" max="100" value="${Math.round(settings.music * 100)}"></div><div class="settings-row"><label for="setting-sfx">効果音</label><input id="setting-sfx" type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}"></div><div class="settings-row"><div><label for="setting-quality">描画品質</label><small>低品質は電池と処理負荷をおさえます</small></div><select id="setting-quality"><option value="auto">自動</option><option value="high">高品質</option><option value="low">低品質</option></select></div><div class="settings-row"><div><label for="setting-vibration">ダメージ時の振動</label><small>対応する端末のみ</small></div><input id="setting-vibration" type="checkbox" ${settings.vibration ? 'checked' : ''}></div><p class="settings-note">設定はこの端末に保存されます。画面を離れると自動で一時停止します。端末の「視差効果を減らす」を有効にすると、画面の揺れやフラッシュを抑えます。</p>`;
    $('#setting-quality').value = settings.quality;
    $('#setting-sound').addEventListener('change', e => setSound(e.target.checked));
    $('#setting-music').addEventListener('input', e => { settings.music = e.target.value / 100; audio.musicVolume = settings.music; audio.applyVolumes(); save(SETTINGS_KEY, settings); });
    $('#setting-sfx').addEventListener('input', e => { settings.sfx = e.target.value / 100; audio.sfxVolume = settings.sfx; audio.applyVolumes(); save(SETTINGS_KEY, settings); });
    $('#setting-quality').addEventListener('change', e => { settings.quality = e.target.value; renderer.setQuality(settings.quality); save(SETTINGS_KEY, settings); });
    $('#setting-vibration').addEventListener('change', e => { settings.vibration = e.target.checked; save(SETTINGS_KEY, settings); });
  } else if (type === 'shop') {
    $('#dialog-kicker').textContent = 'WORKSHOP'; renderShop();
  } else if (type === 'achievements') {
    $('#dialog-kicker').textContent = 'ACHIEVEMENTS'; const done = Object.keys(profile.achievements).length;
    content.innerHTML = `<h2 id="dialog-title">実績 ${done} / ${ACHIEVEMENTS.length}</h2><div class="achieve-progress"><i style="width:${done / ACHIEVEMENTS.length * 100}%"></i></div><div class="achievement-list">${ACHIEVEMENTS.map(a => `<div class="achievement ${profile.achievements[a.id] ? 'done' : ''}">${icon('medal')}<div><strong>${a.name}</strong><span>${a.desc}</span></div><em>${profile.achievements[a.id] ? '達成！' : '★ ' + a.reward}</em></div>`).join('')}</div><p class="record-note">達成するとスターがもらえます。スターは工房で使えます。</p>`;
  } else if (type === 'characters') {
    $('#dialog-kicker').textContent = 'CHARACTERS';
    content.innerHTML = `<h2 id="dialog-title">だれで出撃する？</h2><div class="char-grid">${Object.entries(CHARACTERS).map(([id, c]) => { const open = characterUnlocked(profile, id), u = UNLOCKS.find(x => x.id === id), a = u && ACHIEVEMENTS.find(x => x.id === u.achievement); const start = UPGRADES.find(x => x.id === c.start); return `<button class="char-card ${profile.character === id ? 'selected' : ''}" data-char="${id}" ${open ? '' : 'disabled'}><img src="${charImage(id)}" alt=""><strong>${c.name}</strong><small>${c.title}</small><p>${c.perk.split('・')[0]}<br>初期武器：${start.name}</p>${open ? (profile.charClears[id] ? '<span class="clear">★ CLEAR</span>' : '') : `<span class="lock">実績「${a.name}」で解放</span>`}</button>`; }).join('')}</div><p class="record-note">新しい武器も実績で解放されます：${UNLOCKS.filter(u => u.kind === 'weapon').map(u => `${u.label}${characterUnlocked(profile, 'keeper') && profile.achievements[u.achievement] ? '✓' : '（' + ACHIEVEMENTS.find(a => a.id === u.achievement).name + '）'}`).join('・')}</p>`;
    content.querySelectorAll('[data-char]').forEach(b => b.addEventListener('click', () => { profile.character = b.dataset.char; saveProfile(); audio.effect('choose'); updateHome(); $('#app-dialog').close(); }));
  } else if (type === 'daily') {
    const cfg = dailyConfig(), d = describeDaily(cfg), rec = profile.daily[cfg.day]; $('#dialog-kicker').textContent = 'DAILY CHALLENGE';
    content.innerHTML = `<h2 id="dialog-title">今日のチャレンジ（${cfg.day.replace(/-/g, '/')}）</h2><p>今日だけの特別ルール。同じ日なら誰でも同じ夜になります。工房の強化は無効、腕だけが頼り！クリアでスター +50 のボーナス。</p><div class="daily-detail"><div><span>作戦</span><strong>${d.mode}</strong></div><div><span>ヒート</span><strong>${cfg.heat}・${d.heat.name}</strong></div>${d.mutators.map(m => `<div class="mutator"><strong>${m.name}</strong><small>${m.rule}</small></div>`).join('')}<div><span>今日のベスト</span><strong>${rec ? formatTime(rec.best) + (rec.won ? ' ★CLEAR' : '') : '--:--'}</strong></div><div><span>連続プレイ</span><strong>${profile.dailyStreak} 日</strong></div></div><button class="primary-button" id="daily-start">チャレンジ開始 <svg><use href="#i-arrow"/></svg></button>`;
    $('#daily-start').addEventListener('click', () => { $('#app-dialog').close(); start({ daily: true }); });
  } else {
    $('#dialog-kicker').textContent = 'RECORDS';
    content.innerHTML = `<h2 id="dialog-title">これまでの記録</h2><div class="record-grid"><div class="record-tile"><small>最長生存</small><strong>${formatTime(records.bestTime)}</strong></div><div class="record-tile"><small>最多撃破</small><strong>${records.bestKills.toLocaleString()}</strong></div><div class="record-tile"><small>最大コンボ</small><strong>${records.bestCombo.toLocaleString()}</strong></div><div class="record-tile"><small>エンドレス最長</small><strong>${formatTime(profile.endlessBest)}</strong></div><div class="record-tile"><small>獲得スター累計</small><strong>${profile.earned.toLocaleString()}</strong></div><div class="record-tile"><small>出撃 / 成功</small><strong>${records.runs} / ${records.wins}</strong></div></div><div class="record-list">${Object.entries(MODES).map(([id, m]) => `<div><span>${m.name} ${records.modes[id]?.won ? '★' : ''}</span><span>${records.modes[id] ? formatTime(records.modes[id].time) : '--:--'}</span></div>`).join('')}</div><p class="record-note">記録はこのブラウザに保存されます。端末間の同期はありません。</p>`;
  }
  $('#app-dialog').showModal();
}
$$('[data-dialog]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.dialog)));
$('#dialog-close').addEventListener('click', () => $('#app-dialog').close());
$('#app-dialog').addEventListener('click', e => { if (e.target === $('#app-dialog')) { const r = $('#app-dialog').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('#app-dialog').close(); } });
$('#app-dialog').addEventListener('close', () => { clearInput(); dialogReturn?.focus({ preventScroll: true }); previous = performance.now(); accumulator = 0; });
function connection() { $('#connection span').textContent = navigator.onLine ? 'LOCAL / READY' : 'OFFLINE / READY'; }
window.addEventListener('online', connection); window.addEventListener('offline', connection);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#install-button').hidden = false; });
$('#install-button').addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); const result = await installPrompt.userChoice; if (result.outcome === 'accepted') $('#install-button').hidden = true; installPrompt = null; });
window.addEventListener('appinstalled', () => { $('#install-button').hidden = true; toast('ホーム画面に追加しました！'); });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      function ready(worker) { waitingSW = worker; $('#pwa-update').hidden = false; }
      if (registration.waiting) ready(registration.waiting);
      registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) ready(worker); }); });
      let reloading = false, hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController) { hadController = true; return; } if (reloading) return; if (hasUnfinishedRun()) { pendingReload = true; $('#pwa-update').hidden = false; toast('更新は作戦終了後に適用できます。'); return; } reloading = true; location.reload(); });
    } catch { toast('オフライン保存を利用できません。オンラインではプレイできます。'); }
  });
}
$('#update-button').addEventListener('click', () => { if (hasUnfinishedRun()) { game.pause(); transition(); toast('結果画面で更新してください。'); return; } if (pendingReload) location.reload(); else waitingSW?.postMessage({ type: 'SKIP_WAITING' }); });
syncSound(); updateBest(); updateHome(); connection(); requestAnimationFrame(frame);
// Live module bindings are available to development tools without global hooks.
export { game, renderer, audio, settings, records, combo, profile };

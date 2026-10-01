import { Game, MODES, UPGRADES, formatTime } from './core.js';
import { Renderer } from './render.js';
import { AudioEngine, MUSIC_BPM } from './audio.js';
import { EndingSequence } from './ending.js';
import { ComboMeter, rankFor, musicIntensity } from './hype.js';

const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const SETTINGS_KEY = 'lastlight-pop-settings-v1', RECORDS_KEY = 'lastlight-pop-records-v1';
const DEFAULT_SETTINGS = { sound: true, music: 0.42, sfx: 0.6, quality: 'auto', vibration: true };
const EMPTY_RECORDS = { runs: 0, wins: 0, totalKills: 0, bestKills: 0, bestTime: 0, bestCombo: 0, modes: {} };
export const POP_COLORS = Object.freeze({ bolt: 'var(--yellow)', orbit: 'var(--sky)', arc: 'var(--orange)', frost: '#9be7ff', drone: 'var(--pink)', nova: 'var(--coral)', power: 'var(--purple)', haste: 'var(--mint)', magnet: 'var(--teal)', vital: 'var(--pink)', regen: 'var(--mint)' });
function read(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } }
function number(v, fallback, min, max) { return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback; }
const rawSettings = read(SETTINGS_KEY, {}), settings = { ...DEFAULT_SETTINGS };
if (rawSettings && typeof rawSettings === 'object') { settings.sound = rawSettings.sound !== false; settings.music = number(rawSettings.music, DEFAULT_SETTINGS.music, 0, 1); settings.sfx = number(rawSettings.sfx, DEFAULT_SETTINGS.sfx, 0, 1); settings.quality = ['auto', 'low', 'high'].includes(rawSettings.quality) ? rawSettings.quality : 'auto'; settings.vibration = rawSettings.vibration !== false; }
const rawRecords = read(RECORDS_KEY, {}), records = { ...EMPTY_RECORDS, modes: {} };
if (rawRecords && typeof rawRecords === 'object') { for (const k of ['runs', 'wins', 'totalKills', 'bestKills', 'bestTime', 'bestCombo']) records[k] = Math.floor(number(rawRecords[k], 0, 0, 1e9)); for (const id of Object.keys(MODES)) { const r = rawRecords.modes?.[id]; if (r && typeof r === 'object') records.modes[id] = { time: number(r.time, 0, 0, 1e6), kills: Math.floor(number(r.kills, 0, 0, 1e9)), won: r.won === true }; } }

const renderer = new Renderer($('#game-canvas')), audio = new AudioEngine(), combo = new ComboMeter();
renderer.setQuality(settings.quality); audio.musicVolume = settings.music; audio.sfxVolume = settings.sfx; audio.enabled = settings.sound;
let mode = 'guard', game = null, ending = null, endingResultShown = false, demo = makeDemo(), prevState = 'home', previous = performance.now(), accumulator = 0, hudTimer = 0;
let frameTime = 0, elapsedTime = 0, frameCount = 0, fps = 60, resultSaved = false, toastTimer = 0, announceTimer = 0, warnTimer = 0, dialogReturn = null, installPrompt = null, waitingSW = null, pendingReload = false;
let heartbeatAt = 0, slowmo = 0, lastKills = 0, lastLevel = 1, lastArsenal = '', choosing = false, cooldownReady = { dash: true, pulse: true }, audioPrimed = false;
const STEP = 1 / 60, keys = new Set(), movement = { x: 0, y: 0 }, stick = { id: null, x: 0, y: 0 };

function makeDemo() { const g = new Game('guard', 32489); g.start(); g.levels.orbit = 3; g.levels.frost = 1; g.levels.drone = 2; g.levels.arc = 1; g.player.invincible = 9999; g.viewRadius = 400; g.time = 12; for (let i = 0; i < 40; i++) { const e = g.spawnEnemy(i % 7 === 0 ? 2 : i % 5 === 0 ? 3 : i % 3 === 0 ? 1 : 0); const a = g.rng() * Math.PI * 2, r = 150 + g.rng() * 370; e.x = Math.cos(a) * r; e.y = Math.sin(a) * r; } return g; }
function clearInput() { keys.clear(); movement.x = movement.y = 0; stick.id = null; $('#joystick').hidden = true; }
function syncSound() { for (const b of $$('.sound-toggle')) { b.classList.toggle('muted', !settings.sound); b.setAttribute('aria-pressed', String(settings.sound)); } for (const s of $$('.sound-label')) s.textContent = settings.sound ? 'SOUND ON' : 'SOUND OFF'; }
function setSound(v) { settings.sound = v; audio.setEnabled(v); save(SETTINGS_KEY, settings); syncSound(); if (v) audio.effect('choose'); }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function announce(message, kind = '') { const el = $('#announcement'); el.textContent = message; el.className = 'announcement ' + kind; el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(announceTimer); announceTimer = setTimeout(() => el.hidden = true, 2600); }
function warning(text) { const el = $('#warning-banner'); $('#warning-text').textContent = text; el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(warnTimer); warnTimer = setTimeout(() => el.hidden = true, 3000); }
function hideScreens() { $$('#home-screen,#hud,#upgrade-screen,#pause-screen,#ending-screen,#result-screen').forEach(x => x.hidden = true); }
function primeAudio() { if (audioPrimed || !settings.sound) return; audioPrimed = true; audio.setScene(game ? 'play' : 'home'); void audio.unlock(); }

function start() {
  ending = null; endingResultShown = false; clearInput(); game = new Game(mode); game.start(); combo.reset(); resultSaved = false; lastArsenal = ''; lastKills = 0; lastLevel = 1; slowmo = 0; choosing = false;
  prevState = ''; accumulator = 0; document.body.classList.add('playing'); renderer.camera.x = game.player.x; renderer.camera.y = game.player.y; renderer.resize();
  audioPrimed = true; audio.setScene('play'); void audio.unlock(); audio.setActive(true);
  $('#mission-label').textContent = MODES[mode].name; $('#time-target').textContent = '/ ' + formatTime(game.duration); $('#movement-hint').hidden = false; $('#announcement').hidden = true; $('#warning-banner').hidden = true; $('#combo').hidden = true;
  transition(); updateHUD(); renderer.celebrate('start', game); announce('READY… GO!!'); $('#stage').focus({ preventScroll: true });
}
function home() {
  if (game && ['running', 'paused', 'upgrade'].includes(game.state)) storeResult(false);
  game = null; ending = null; endingResultShown = false; audio.setScene('home'); clearInput(); prevState = 'home'; hideScreens(); $('#home-screen').hidden = false;
  document.body.classList.remove('playing'); $('#announcement').hidden = true; $('#warning-banner').hidden = true; $('#boss-panel').hidden = true; renderer.resize(); demo = makeDemo(); updateBest(); $('#start-button').focus({ preventScroll: true });
}
function transition() {
  if (!game || game.state === prevState) return; prevState = game.state; clearInput(); hideScreens(); $('#hud').hidden = false;
  if (game.state === 'upgrade') { choosing = false; renderUpgrades(); $('#upgrade-screen').hidden = false; $('#upgrade-cards button')?.focus({ preventScroll: true }); }
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
function hasUnfinishedRun() { return !!game && (['running', 'paused', 'upgrade'].includes(game.state) || !!ending && !endingResultShown); }

function renderUpgrades() {
  $('#upgrade-cards').innerHTML = game.choices.map((u, i) => {
    const lv = game.levels[u.id], evolved = lv === 4 && u.tag === 'WEAPON', desc = lv > 0 && u.effect ? u.effect[lv - 1] : u.description;
    const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : k === lv ? 'next' : ''}"></i>`).join('');
    return `<button class="upgrade-card ${evolved ? 'evolve' : ''}" data-upgrade="${u.id}" style="--c:${POP_COLORS[u.id] || 'var(--yellow)'}" aria-label="${u.name}を選択"><div class="upgrade-top"><span>${evolved ? '★ EVOLUTION ★' : lv === 0 ? 'NEW ' + u.tag : u.tag}</span><kbd>${i + 1}</kbd></div><div class="upgrade-icon">${icon(u.icon)}</div><h3>${u.name}${evolved ? '・極' : ''}</h3><p>${desc}</p><span class="upgrade-level">${lv === 0 ? 'GET!' : `LV. ${lv} → ${lv + 1}`}<span class="pips">${pips}</span></span></button>`;
  }).join('');
}
function choose(id) {
  if (!game || game.state !== 'upgrade' || choosing || !game.choices.some(c => c.id === id)) return;
  choosing = true; const card = $(`[data-upgrade="${id}"]`); audio.effect('choose');
  const apply = () => { if (game?.chooseUpgrade(id)) { accumulator = 0; prevState = ''; transition(); updateHUD(); } choosing = false; };
  if (card && !renderer.reduced) { card.classList.add('picked'); setTimeout(apply, 170); } else apply();
}
function storeResult(won) {
  if (!game || resultSaved) return false; resultSaved = true;
  const best = game.time > records.bestTime || game.kills > records.bestKills || combo.best > records.bestCombo;
  records.runs++; if (won) records.wins++; records.totalKills += game.kills; records.bestTime = Math.max(records.bestTime, game.time); records.bestKills = Math.max(records.bestKills, game.kills); records.bestCombo = Math.max(records.bestCombo, combo.best);
  const old = records.modes[game.mode] || { time: 0, kills: 0, won: false }; records.modes[game.mode] = { time: Math.max(old.time, game.time), kills: Math.max(old.kills, game.kills), won: old.won || won };
  if (!save(RECORDS_KEY, records)) toast('この環境では記録を保存できません。プレイは続けられます。'); return best;
}
function renderResult() {
  const won = game.state === 'won', best = storeResult(won), rank = rankFor({ won, time: game.time, duration: game.duration, kills: game.kills, combo: combo.best, mode: game.mode });
  $('#result-screen').dataset.outcome = game.state; $('#result-eyebrow').textContent = won ? 'YOU KEPT THE LIGHT!' : 'NEXT NIGHT'; $('#result-title').textContent = won ? '夜明けが来た！' : '次の夜へ！';
  $('#result-copy').textContent = won ? 'あなたの灯火が、荒野に朝を連れてきた。' : 'その灯火は、まだあなたの中に。';
  const stamp = $('#result-rank'); stamp.textContent = rank; stamp.dataset.rank = rank;
  $('#result-time').textContent = formatTime(game.time); $('#result-kills').textContent = '0'; $('#result-level').textContent = game.level; $('#result-combo').textContent = '0';
  $('#result-kills').dataset.target = game.kills; $('#result-combo').dataset.target = combo.best;
  $('#new-record').hidden = !best;
  $('#result-build').innerHTML = UPGRADES.filter(u => u.tag === 'WEAPON' && game.levels[u.id] > 0).map(u => `<span style="--c:${POP_COLORS[u.id]}" title="${u.name}">${icon(u.icon)} ${game.levels[u.id] === 5 ? '★MAX' : 'Lv' + game.levels[u.id]}</span>`).join('');
}
function countUp() {
  const els = [$('#result-kills'), $('#result-combo')], begin = performance.now(), dur = renderer.reduced ? 1 : 900;
  function tick(now) { const t = Math.min(1, (now - begin) / dur), e = 1 - Math.pow(1 - t, 3); for (const el of els) el.textContent = Math.round(Number(el.dataset.target || 0) * e).toLocaleString(); if (t < 1) requestAnimationFrame(tick); else audio.effect('xp'); }
  requestAnimationFrame(tick);
}
function updateBest() { $('#home-best').textContent = records.bestTime ? formatTime(records.bestTime) : '--:--'; $('#home-combo').textContent = records.bestCombo.toLocaleString(); }

function updateHUD() {
  if (!game) return; const p = game.player;
  $('#hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHP}`; $('#hp-bar').style.width = `${p.hp / p.maxHP * 100}%`; $('.health-track').classList.toggle('danger', p.hp < p.maxHP * .3);
  $('#level-text').textContent = `LV. ${String(game.level).padStart(2, '0')}`; if (game.level !== lastLevel) { lastLevel = game.level; const b = $('#level-text'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  $('#xp-bar').style.width = `${Math.min(100, game.xp / game.xpNext * 100)}%`; $('#time-text').textContent = formatTime(game.time);
  const overtime = game.time >= game.duration && !game.finalKilled; $('#time-target').textContent = overtime ? '夜の主をたおせ！' : '/ ' + formatTime(game.duration); $('#time-target').classList.toggle('alert', overtime);
  $('#kills-text').textContent = game.kills.toLocaleString(); $('#movement-hint').hidden = game.time > 7;
  for (const [key, cd, max] of [['dash', p.dashCD, 3 * (1 - game.levels.haste * .08)], ['pulse', p.pulseCD, 18]]) {
    const btn = $(`#${key}-button`), label = $(`#${key}-cooldown`), ready = cd <= 0;
    label.textContent = ready ? '' : Math.ceil(cd); label.style.setProperty('--cd', Math.max(0, Math.min(1, cd / max))); btn.disabled = !ready || game.state !== 'running';
    if (ready && !cooldownReady[key]) { btn.classList.remove('ready'); void btn.offsetWidth; btn.classList.add('ready'); } cooldownReady[key] = ready;
  }
  const signature = UPGRADES.filter(u => u.tag === 'WEAPON').map(u => game.levels[u.id]).join(',');
  if (signature !== lastArsenal) {
    const before = lastArsenal.split(','); lastArsenal = signature; const equipped = UPGRADES.filter(u => u.tag === 'WEAPON' && game.levels[u.id] > 0), weapons = UPGRADES.filter(u => u.tag === 'WEAPON');
    $('#arsenal-slots').innerHTML = equipped.map(u => { const i = weapons.indexOf(u), fresh = before.length > 1 && Number(before[i]) !== game.levels[u.id]; return `<div class="weapon-slot ${game.levels[u.id] === 5 ? 'evolved' : ''} ${fresh ? 'fresh' : ''}" style="--c:${POP_COLORS[u.id]}" title="${u.name} Lv.${game.levels[u.id]}">${icon(u.icon)}<small>${game.levels[u.id] === 5 ? 'MAX' : 'Lv' + game.levels[u.id]}</small></div>`; }).join('') + '<div class="weapon-slot empty"></div>'.repeat(6 - equipped.length);
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
    if (e.type !== 'kill') audio.effect(e.type);
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
  audio.setMuffle(!!game && ['paused', 'upgrade'].includes(game.state) || $('#app-dialog').open);
  if (game && game.state === 'running' && game.player.hp < game.player.maxHP * .3 && now - heartbeatAt > 820) { heartbeatAt = now; audio.effect('heartbeat'); }
}
function frame(now) {
  const presentationElapsed = Math.max(0, (now - previous) / 1000), elapsed = Math.min(presentationElapsed, .1), frameEnding = ending; previous = now;
  const begin = performance.now(), active = !document.hidden && !$('#app-dialog').open; syncBeat(now);
  const scale = slowmo > 0 ? .3 : 1; slowmo = Math.max(0, slowmo - elapsed); accumulator = Math.min(.1, accumulator + elapsed * scale);
  if (game) {
    if (active && game.state === 'running') { const v = input(); while (accumulator >= STEP) { game.update(STEP, v); accumulator -= STEP; if (game.state !== 'running') break; } } else accumulator = 0;
    processEvents(game); updateCombo(elapsed); transition();
    if (ending) { ending.advance(ending === frameEnding ? presentationElapsed : 0, active); $('#ending-screen').style.setProperty('--ending-text', ending.reducedMotion ? 1 : Math.max(0, Math.min(1, (ending.age - .1) / .5))); if (ending.done) finishEnding(); }
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
$('#start-button').addEventListener('click', start); $('#retry-button').addEventListener('click', start); $('#result-home').addEventListener('click', home);
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

function openDialog(type) {
  dialogReturn = document.activeElement; if (game?.state === 'running') { game.pause(); transition(); } clearInput(); const content = $('#dialog-content');
  if (type === 'help') {
    $('#dialog-kicker').textContent = 'HOW TO PLAY';
    content.innerHTML = `<h2 id="dialog-title">灯火を守って、夜をこえろ！</h2><p>攻撃はぜんぶ自動。モンスターをかわしながらキラキラを集めてレベルアップ、武器を育てよう。制限時間を生きのびて、最後に現れる「夜の主」をたおせば作戦成功！</p><div class="control-row"><span>移動</span><span><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd></span></div><div class="control-row"><span>スマートフォン</span><span>画面をドラッグ</span></div><div class="control-row"><span>ダッシュ（一瞬むてき）</span><span><kbd>SPACE</kbd> / 右下ボタン</span></div><div class="control-row"><span>パルス（周りを攻撃・キラキラ回収）</span><span><kbd>Q</kbd> / 右下ボタン</span></div><div class="control-row"><span>一時停止</span><span><kbd>P</kbd> / <kbd>ESC</kbd></span></div><div class="control-row"><span>強化をえらぶ</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> / タップ</span></div><h3>アイテムと敵の弾</h3><div class="legend"><span style="--c:var(--mint)"><i></i>キラキラ＝経験値</span><span style="--c:var(--yellow)"><i></i>星＝大きな経験値</span><span style="--c:var(--coral)"><i></i>ハート＝回復</span><span style="--c:var(--tomato)"><i></i>赤い玉＝敵の弾</span></div><h3>コンボでアガれ！</h3><p>途切れずにたおし続けるとコンボが伸びて、効果音もどんどん高くなります。武器はLv.5で進化。パルスはピンチの切り札！</p><h3>アプリとして遊ぶ</h3><p>対応ブラウザではインストールできます。iPhone / iPadはSafariの共有メニューから「ホーム画面に追加」。初回読み込み後はオフラインでも遊べます。</p>`;
  } else if (type === 'settings') {
    $('#dialog-kicker').textContent = 'SETTINGS';
    content.innerHTML = `<h2 id="dialog-title">せってい</h2><div class="settings-row"><div><label for="setting-sound">サウンド</label><small>BGMと効果音</small></div><input id="setting-sound" type="checkbox" ${settings.sound ? 'checked' : ''}></div><div class="settings-row"><label for="setting-music">音楽</label><input id="setting-music" type="range" min="0" max="100" value="${Math.round(settings.music * 100)}"></div><div class="settings-row"><label for="setting-sfx">効果音</label><input id="setting-sfx" type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}"></div><div class="settings-row"><div><label for="setting-quality">描画品質</label><small>低品質は電池と処理負荷をおさえます</small></div><select id="setting-quality"><option value="auto">自動</option><option value="high">高品質</option><option value="low">低品質</option></select></div><div class="settings-row"><div><label for="setting-vibration">ダメージ時の振動</label><small>対応する端末のみ</small></div><input id="setting-vibration" type="checkbox" ${settings.vibration ? 'checked' : ''}></div><p class="settings-note">設定はこの端末に保存されます。画面を離れると自動で一時停止します。端末の「視差効果を減らす」を有効にすると、画面の揺れやフラッシュを抑えます。</p>`;
    $('#setting-quality').value = settings.quality;
    $('#setting-sound').addEventListener('change', e => setSound(e.target.checked));
    $('#setting-music').addEventListener('input', e => { settings.music = e.target.value / 100; audio.musicVolume = settings.music; audio.applyVolumes(); save(SETTINGS_KEY, settings); });
    $('#setting-sfx').addEventListener('input', e => { settings.sfx = e.target.value / 100; audio.sfxVolume = settings.sfx; audio.applyVolumes(); save(SETTINGS_KEY, settings); });
    $('#setting-quality').addEventListener('change', e => { settings.quality = e.target.value; renderer.setQuality(settings.quality); save(SETTINGS_KEY, settings); });
    $('#setting-vibration').addEventListener('change', e => { settings.vibration = e.target.checked; save(SETTINGS_KEY, settings); });
  } else {
    $('#dialog-kicker').textContent = 'RECORDS';
    content.innerHTML = `<h2 id="dialog-title">これまでの記録</h2><div class="record-grid"><div class="record-tile"><small>最長生存</small><strong>${formatTime(records.bestTime)}</strong></div><div class="record-tile"><small>最多撃破</small><strong>${records.bestKills.toLocaleString()}</strong></div><div class="record-tile"><small>最大コンボ</small><strong>${records.bestCombo.toLocaleString()}</strong></div><div class="record-tile"><small>出撃 / 成功</small><strong>${records.runs} / ${records.wins}</strong></div></div><div class="record-list">${Object.entries(MODES).map(([id, m]) => `<div><span>${m.name} ${records.modes[id]?.won ? '★' : ''}</span><span>${records.modes[id] ? formatTime(records.modes[id].time) : '--:--'}</span></div>`).join('')}</div><p class="record-note">記録はこのブラウザに保存されます。端末間の同期はありません。</p>`;
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
syncSound(); updateBest(); connection(); requestAnimationFrame(frame);
// Live module bindings are available to development tools without global hooks.
export { game, renderer, audio, settings, records, combo };

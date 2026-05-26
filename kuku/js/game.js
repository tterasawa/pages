const ally = {
  name: "エンバーミュウ",
  hp: 84,
  power: 14,
  img: "./assets/embermew.png"
};

const areas = [
  { number: 1, theme: "草原", bgName: "grassland", name: "草原・一灯の門", enemy: "キャンドルスライム", note: "花咲く草原に立つ、塔の入口を照らす小さな火の番人。" },
  { number: 2, theme: "森", bgName: "forest", name: "森・双牙の回廊", enemy: "ツインファングバット", note: "古樹の影を飛び回り、二枚羽で闇を切る夜の斥候。" },
  { number: 3, theme: "湖", bgName: "lake", name: "湖・三蔓の岸辺", enemy: "ソーン・トリスケリオン", note: "湖畔のルーン石を三本蔓で守る森の獣。" },
  { number: 4, theme: "砂漠", bgName: "desert", name: "砂漠・四角甲の遺跡", enemy: "スクエアシェルゴーレム", note: "砂漠遺跡で四隅の宝石を光らせる石甲の門番。" },
  { number: 5, theme: "雪山", bgName: "snow-mountain", name: "雪山・五芒粉の峠", enemy: "ペンタクルモス", note: "雪山の冷気に五つ星の鱗粉を混ぜ、計算を惑わす魔蛾。" },
  { number: 6, theme: "火山", bgName: "volcano", name: "火山・六晶角の溶岩原", enemy: "ヘックスホーンボア", note: "火山の玄武岩に六本角で数式を刻む突進獣。" },
  { number: 7, theme: "霧の遺跡", bgName: "ruins", name: "遺跡・七鈴の霧橋", enemy: "セブンベルレイス", note: "霧の古代遺跡で七つの鈴を鳴らし、詠唱の拍子を乱す霊。" },
  { number: 8, theme: "水晶洞窟", bgName: "crystal-cave", name: "水晶洞・八脚宝箱の間", enemy: "オクトルーンミミック", note: "青い水晶洞窟で八本脚を伸ばし、答えを隠す宝箱の怪物。" },
  { number: 9, theme: "魔王城", bgName: "demon-castle", name: "魔王城・九冠竜の頂", enemy: "ナインクラウンドレイク", note: "魔王城の中庭で九冠を掲げる幼竜の王。" }
].map((area) => ({
  ...area,
  maxHp: 10,
  power: 7 + area.number,
  img: `./assets/enemies/area-${area.number}-enemy.png`,
  defeatedImg: `./assets/enemies/area-${area.number}-enemy-defeated.png`,
  bg: `./assets/map/area-${area.number}-${area.bgName}.png`
}));

const AUDIO_STORAGE_KEY = "kukuRuneTowerAudioSettings";
const bgm = {
  area: new Audio("./assets/sounds/小さな冒険譚.mp3"),
  battle: new Audio("./assets/sounds/COLORS_2.mp3")
};
const sfx = {
  punch: "./assets/sounds/小パンチ.mp3"
};

Object.values(bgm).forEach((track) => {
  track.loop = true;
  track.preload = "auto";
});

const state = {
  currentArea: null,
  playerHp: ally.hp,
  enemyHp: 0,
  turn: 1,
  combo: 0,
  cleared: new Set(),
  question: null,
  locked: false,
  finished: false
};

const titleView = document.querySelector("#titleView");
const areaView = document.querySelector("#areaView");
const battleView = document.querySelector("#battleView");
const battlefield = document.querySelector(".battlefield");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsCloseButton = document.querySelector("#settingsCloseButton");
const settingsMuteToggle = document.querySelector("#settingsMuteToggle");
const titleMuteToggle = document.querySelector("#titleMuteToggle");
const volumeSlider = document.querySelector("#volumeSlider");
const volumeValue = document.querySelector("#volumeValue");
const startButton = document.querySelector("#startButton");
const titleButton = document.querySelector("#titleButton");
const areaBackButton = document.querySelector("#areaBackButton");
const areaSelectButton = document.querySelector("#areaSelectButton");
const nextAreaButton = document.querySelector("#nextAreaButton");
const areaGrid = document.querySelector("#areaGrid");
const areaName = document.querySelector("#areaName");
const areaNumber = document.querySelector("#areaNumber");
const enemyName = document.querySelector("#enemyName");
const enemyPlateName = document.querySelector("#enemyPlateName");
const enemyLevel = document.querySelector("#enemyLevel");
const enemySprite = document.querySelector("#enemySprite");
const playerSprite = document.querySelector("#playerSprite");
const playerHpBar = document.querySelector("#playerHpBar");
const enemyHpBar = document.querySelector("#enemyHpBar");
const turnBadge = document.querySelector("#turnBadge");
const comboBadge = document.querySelector("#comboBadge");
const battleText = document.querySelector("#battleText");
const questionText = document.querySelector("#question");
const choiceButtons = document.querySelector("#choiceButtons");
const resultActions = document.querySelector("#resultActions");

const audioState = {
  volume: 0.2,
  muted: false,
  current: null
};

function showView(view) {
  [titleView, areaView, battleView].forEach((target) => {
    target.classList.toggle("is-hidden", target !== view);
  });
}

function loadAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY) || "{}");
    if (typeof saved.volume === "number") {
      audioState.volume = clamp(saved.volume, 0, 1);
    }
    if (typeof saved.muted === "boolean") {
      audioState.muted = saved.muted;
    }
  } catch {
    audioState.volume = 0.2;
    audioState.muted = false;
  }
}

function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({
      volume: audioState.volume,
      muted: audioState.muted
    }));
  } catch {
    // Audio settings are non-critical; ignore storage failures.
  }
}

function applyAudioSettings() {
  Object.values(bgm).forEach((track) => {
    track.volume = audioState.volume;
    track.muted = audioState.muted;
  });
}

function syncAudioControls() {
  const volumePercent = Math.round(audioState.volume * 100);
  titleMuteToggle.checked = audioState.muted;
  settingsMuteToggle.checked = audioState.muted;
  volumeSlider.value = String(volumePercent);
  volumeValue.textContent = `${volumePercent}%`;
}

function pauseAllBgm() {
  Object.values(bgm).forEach((track) => {
    track.pause();
  });
  audioState.current = null;
}

function playBgm(trackName) {
  audioState.current = trackName;
  applyAudioSettings();

  Object.entries(bgm).forEach(([name, track]) => {
    if (name !== trackName) {
      track.pause();
      track.currentTime = 0;
    }
  });

  if (audioState.muted) return;

  bgm[trackName].play().catch(() => {
    // Browsers can still block playback in edge cases; the next user action will retry.
  });
}

function playSfx(name) {
  if (audioState.muted) return;

  const sound = new Audio(sfx[name]);
  sound.volume = clamp(audioState.volume * 1.05, 0, 1);
  sound.play().catch(() => {
    // Short effects are non-critical if a browser blocks playback.
  });
}

function setMuted(muted) {
  audioState.muted = muted;
  applyAudioSettings();
  saveAudioSettings();
  syncAudioControls();

  if (muted) {
    Object.values(bgm).forEach((track) => track.pause());
  } else if (audioState.current) {
    playBgm(audioState.current);
  }
}

function setVolume(percentValue) {
  audioState.volume = clamp(Number(percentValue) / 100, 0, 1);
  applyAudioSettings();
  saveAudioSettings();
  syncAudioControls();
}

function setSettingsOpen(open) {
  settingsPanel.classList.toggle("is-hidden", !open);
  settingsButton.setAttribute("aria-expanded", String(open));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function renderAreas() {
  areaGrid.innerHTML = areas.map((area) => {
    const cleared = state.cleared.has(area.number);
    return `
      <button class="area-card ${cleared ? "is-cleared" : ""}" type="button" data-area="${area.number}" style="background-image: linear-gradient(180deg, rgba(12, 14, 16, 0.18), rgba(12, 14, 16, 0.76)), url('${area.bg}')">
        <span class="area-index">${area.number}</span>
        <img src="${area.img}" alt="${area.enemy}" />
        <span class="area-title">${area.number}の位 / ${area.theme}</span>
        <strong>${area.name}</strong>
        <small>${cleared ? "解放済み" : area.enemy}</small>
      </button>
    `;
  }).join("");
}

function makeQuestion(areaNumberValue) {
  const b = 1 + Math.floor(Math.random() * 9);
  const answer = areaNumberValue * b;
  const candidates = new Set([answer]);

  while (candidates.size < 4) {
    const offset = Math.floor(Math.random() * 11) - 5;
    const next = clamp(answer + offset, 1, 81);
    if (next !== answer) candidates.add(next);
  }

  return {
    a: areaNumberValue,
    b,
    answer,
    choices: shuffle([...candidates])
  };
}

function setBars() {
  const area = state.currentArea;
  const playerRate = state.playerHp / ally.hp;
  const enemyRate = area ? state.enemyHp / area.maxHp : 1;
  playerHpBar.style.transform = `scaleX(${clamp(playerRate, 0, 1)})`;
  enemyHpBar.style.transform = `scaleX(${clamp(enemyRate, 0, 1)})`;
}

function setBadges() {
  turnBadge.textContent = state.finished ? "決着" : `第${state.turn}問`;
  comboBadge.textContent = `連鎖 ${state.combo}`;
}

function renderQuestion() {
  const area = state.currentArea;
  state.question = makeQuestion(area.number);
  questionText.textContent = `${state.question.a} × ${state.question.b} = ?`;
  choiceButtons.innerHTML = state.question.choices.map((choice) => (
    `<button class="choice-button" type="button" data-answer="${choice}">${choice}</button>`
  )).join("");
}

function startArea(areaNumberValue) {
  const area = areas.find((item) => item.number === Number(areaNumberValue));
  if (!area) return;

  state.currentArea = area;
  state.playerHp = ally.hp;
  state.enemyHp = area.maxHp;
  state.turn = 1;
  state.combo = 0;
  state.locked = false;
  state.finished = false;
  resultActions.classList.add("is-hidden");
  choiceButtons.classList.remove("is-hidden");
  playerSprite.classList.remove("is-celebrating");
  enemySprite.classList.remove("is-defeated");
  nextAreaButton.disabled = false;
  nextAreaButton.textContent = "次の位へ";

  areaName.textContent = `${area.number}の位`;
  areaNumber.textContent = area.number;
  enemyName.textContent = area.name;
  enemyPlateName.textContent = area.enemy;
  enemyLevel.textContent = `HP ${area.maxHp}`;
  enemySprite.src = area.img;
  enemySprite.alt = area.enemy;
  battleText.textContent = `${area.name}に入った。${area.note}`;
  battlefield.style.backgroundImage = `linear-gradient(180deg, rgba(8, 10, 12, 0.05) 0%, rgba(8, 10, 12, 0.24) 42%, rgba(8, 10, 12, 0.54) 100%), url("${area.bg}")`;

  playBgm("battle");
  showView(battleView);
  setBars();
  setBadges();
  renderQuestion();
}

function playerDamage() {
  return 1;
}

function enemyDamage() {
  const area = state.currentArea;
  return area.power + Math.floor(state.turn / 3);
}

function finishBattle(victory) {
  const area = state.currentArea;
  state.finished = true;
  state.locked = true;
  choiceButtons.classList.add("is-hidden");
  resultActions.classList.toggle("is-hidden", !victory);
  setBadges();

  if (victory) {
    state.cleared.add(area.number);
    enemySprite.src = area.defeatedImg;
    enemySprite.classList.add("is-defeated");
    playerSprite.classList.add("is-celebrating");
    battleText.textContent = `${area.name}を解放した。${ally.name}が勝利の火花を跳ね上げて喜んでいる。`;
    nextAreaButton.disabled = area.number >= 9;
    nextAreaButton.textContent = area.number >= 9 ? "全て解放済み" : "次の位へ";
    renderAreas();
  } else {
    battleText.textContent = "相棒の力が尽きた。エリア選択に戻ってもう一度挑もう。";
    window.setTimeout(() => {
      renderAreas();
      playBgm("area");
      showView(areaView);
    }, 1100);
  }
}

function submitAnswer(value) {
  if (state.locked || state.finished || !state.question) return;
  const answer = Number(value);
  if (!Number.isInteger(answer)) return;

  state.locked = true;
  const correct = answer === state.question.answer;

  if (correct) {
    state.combo += 1;
    const damage = playerDamage();
    state.enemyHp = clamp(state.enemyHp - damage, 0, state.currentArea.maxHp);
    playSfx("punch");
    playerSprite.classList.add("is-attacking");
    enemySprite.classList.add("is-hit");
    const progress = state.currentArea.maxHp - state.enemyHp;
    battleText.textContent = `正解。${state.question.a} × ${state.question.b} = ${state.question.answer}。撃破まで ${progress} / ${state.currentArea.maxHp} 正解。`;

    window.setTimeout(() => {
      playerSprite.classList.remove("is-attacking");
      enemySprite.classList.remove("is-hit");
    }, 180);

    if (state.enemyHp <= 0) {
      setBars();
      finishBattle(true);
      return;
    }
  } else {
    state.combo = 0;
    const damage = enemyDamage();
    state.playerHp = clamp(state.playerHp - damage, 0, ally.hp);
    playSfx("punch");
    battleText.textContent = `不正解。答えは${state.question.answer}。反撃で${damage}ダメージ。`;

    if (state.playerHp <= 0) {
      setBars();
      finishBattle(false);
      return;
    }
  }

  state.turn += 1;
  setBars();
  setBadges();

  window.setTimeout(() => {
    state.locked = false;
    renderQuestion();
  }, 620);
}

startButton.addEventListener("click", () => {
  renderAreas();
  playBgm("area");
  showView(areaView);
});

titleButton.addEventListener("click", () => {
  pauseAllBgm();
  showView(titleView);
});

areaBackButton.addEventListener("click", () => {
  renderAreas();
  playBgm("area");
  showView(areaView);
});

areaSelectButton.addEventListener("click", () => {
  renderAreas();
  playBgm("area");
  showView(areaView);
});

nextAreaButton.addEventListener("click", () => {
  const nextNumber = state.currentArea.number + 1;
  if (nextNumber <= 9) startArea(nextNumber);
});

areaGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-area]");
  if (!button) return;
  startArea(button.dataset.area);
});

choiceButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-answer]");
  if (!button) return;
  submitAnswer(button.dataset.answer);
});

settingsButton.addEventListener("click", () => {
  setSettingsOpen(settingsPanel.classList.contains("is-hidden"));
});

settingsCloseButton.addEventListener("click", () => setSettingsOpen(false));

titleMuteToggle.addEventListener("change", () => {
  setMuted(titleMuteToggle.checked);
});

settingsMuteToggle.addEventListener("change", () => {
  setMuted(settingsMuteToggle.checked);
});

volumeSlider.addEventListener("input", () => {
  setVolume(volumeSlider.value);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSettingsOpen(false);
  }
});

loadAudioSettings();
applyAudioSettings();
syncAudioControls();
showView(titleView);

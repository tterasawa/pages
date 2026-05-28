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
const COLLECTION_STORAGE_KEY = "kukuRuneTowerCollection";
const bgm = {
  area: new Audio("./assets/sounds/小さな冒険譚.mp3"),
  battle: new Audio("./assets/sounds/Fusion_02.mp3")
};
const sfx = {
  punch: "./assets/sounds/小パンチ.mp3",
  fanfare: "./assets/sounds/ジャジャーン3.mp3"
};

const rarityConfig = {
  common: { label: "ノーマル", fx: "./assets/loot/fx/common.gif" },
  uncommon: { label: "アンコモン", fx: "./assets/loot/fx/uncommon.gif" },
  rare: { label: "レア", fx: "./assets/loot/fx/rare.gif" },
  epic: { label: "エピック", fx: "./assets/loot/fx/epic.gif" },
  legendary: { label: "レジェンド", fx: "./assets/loot/fx/legendary.gif" }
};

const itemNames = [
  "草露の小剣", "旅人の木杖", "若葉の薬瓶", "小石の守り札", "朝露ベリー",
  "羊皮紙の地図", "銅の方位針", "風切り羽根", "丸い湖貝", "見習いの手袋",
  "花冠のピン", "麦わらチャーム", "古びた鍵", "小さなランタン", "青銅ベル",
  "訓練用盾", "森苔の包み", "星砂クッキー", "素朴な角笛", "白木の指輪",
  "水辺の真珠", "霧森の短剣", "翠葉の魔導書", "双牙のバッジ", "湖光ポーション",
  "銀糸のマント", "砂丘のスカラベ", "氷花のブローチ", "火山灰の護符", "水晶のダイス",
  "月見のブーツ", "銀鉱インゴット", "夜鳴きの仮面", "風読みの羽ペン", "緑晶リング",
  "古代ルーン片", "魔法茸の瓶", "湖底のしずく", "砂風の布", "雪兎の鈴",
  "青星のワンド", "三日月の護石", "竜鱗の欠片", "氷銀の剣", "火口の宝珠",
  "水鏡のアミュレット", "森王の種", "砂王のコイン", "遺跡の歯車", "雷雲の巻物",
  "蒼灯のランタン", "魔導コンパス", "星詠みの本", "ルーンの小冠", "幻霧のケープ",
  "湖竜の涙", "溶岩硝子", "雪晶の短杖", "影縫いの針", "古城の銀鍵",
  "碧空の宝剣", "白銀グリモア", "湖神の杯", "砂漠王の腕輪", "雪嶺の羽衣",
  "紅蓮角の槍", "霧鐘のオーブ", "水晶竜の爪", "魔城の紋章", "流星の砂時計",
  "蒼穹の聖剣", "森羅の王冠", "深湖の星珠", "黄昏の魔導杖", "氷凰の仮面",
  "爆炎の指輪", "七鈴の聖鐘", "八晶の宝箱鍵", "九冠竜の逆鱗", "虹色ルーン盤",
  "天翔ける羽靴", "王家の星盾", "太陽石の首飾り", "月影のマント", "賢者の羅針盤",
  "古代王の金貨", "深緑の聖杯", "蒼海の竪琴", "灼熱の竜珠", "白夜の結晶剣",
  "紫電の魔導核", "星界のティアラ", "幻王の大鍵", "黎明の宝玉", "魔王封じの鎖",
  "天空城の王冠", "不死鳥の心羽", "九九賢者の聖典", "創星のルーン", "奇跡の王笏"
];

const itemCatalog = itemNames.map((name, index) => {
  const number = index + 1;
  let rarity = "common";
  if (number > 40 && number <= 70) rarity = "uncommon";
  if (number > 70 && number <= 88) rarity = "rare";
  if (number > 88 && number <= 97) rarity = "epic";
  if (number > 97) rarity = "legendary";

  return {
    id: `item-${String(number).padStart(3, "0")}`,
    name,
    rarity,
    icon: `./assets/loot/items/item-${String(number).padStart(3, "0")}.png`
  };
});

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
  collection: {},
  pendingDrop: null,
  question: null,
  locked: false,
  finished: false
};

const titleView = document.querySelector("#titleView");
const areaView = document.querySelector("#areaView");
const battleView = document.querySelector("#battleView");
const battlefield = document.querySelector(".battlefield");
const collectionButton = document.querySelector("#collectionButton");
const collectionOverlay = document.querySelector("#collectionOverlay");
const collectionCloseButton = document.querySelector("#collectionCloseButton");
const collectionGrid = document.querySelector("#collectionGrid");
const collectionSummary = document.querySelector("#collectionSummary");
const lootOverlay = document.querySelector("#lootOverlay");
const chestPhase = document.querySelector("#chestPhase");
const rewardPhase = document.querySelector("#rewardPhase");
const openChestButton = document.querySelector("#openChestButton");
const lootChestImage = document.querySelector("#lootChestImage");
const rewardRarity = document.querySelector("#rewardRarity");
const rewardTitle = document.querySelector("#rewardTitle");
const rewardFx = document.querySelector("#rewardFx");
const rewardItemIcon = document.querySelector("#rewardItemIcon");
const rewardItemName = document.querySelector("#rewardItemName");
const rewardItemCount = document.querySelector("#rewardItemCount");
const lootCloseButton = document.querySelector("#lootCloseButton");
const lootCollectionButton = document.querySelector("#lootCollectionButton");
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
let rewardFxTimer = null;
let collectionReturnAfterClose = null;

function showView(view) {
  [titleView, areaView, battleView].forEach((target) => {
    target.classList.toggle("is-hidden", target !== view);
  });
}

function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY) || "{}");
    state.collection = saved && typeof saved === "object" ? saved : {};
  } catch {
    state.collection = {};
  }
}

function saveCollection() {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state.collection));
  } catch {
    // Collection persistence is non-critical; keep the in-memory state.
  }
}

function getOwnedCount(itemId) {
  return Number(state.collection[itemId] || 0);
}

function addItemToCollection(item) {
  state.collection[item.id] = getOwnedCount(item.id) + 1;
  saveCollection();
}

function rarityWeights(areaNumberValue) {
  return [
    ["common", Math.max(58 - areaNumberValue * 5, 10)],
    ["uncommon", 28],
    ["rare", 10 + areaNumberValue * 3],
    ["epic", 3 + areaNumberValue * 2],
    ["legendary", 1 + Math.max(0, areaNumberValue - 4) * 2]
  ];
}

function rollRarity(areaNumberValue) {
  const weights = rarityWeights(areaNumberValue);
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return "common";
}

function rollDrop(areaNumberValue) {
  const rarity = rollRarity(areaNumberValue);
  const pool = itemCatalog.filter((item) => item.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderCollection() {
  const ownedKinds = itemCatalog.filter((item) => getOwnedCount(item.id) > 0).length;
  const ownedTotal = itemCatalog.reduce((sum, item) => sum + getOwnedCount(item.id), 0);
  collectionSummary.textContent = `${ownedKinds} / ${itemCatalog.length} 種類  合計 ${ownedTotal} 個`;

  collectionGrid.innerHTML = itemCatalog.map((item) => {
    const count = getOwnedCount(item.id);
    const rarity = rarityConfig[item.rarity];
    return `
      <article class="collection-item rarity-${item.rarity} ${count === 0 ? "is-locked" : ""}">
        <img src="${item.icon}" alt="${count > 0 ? item.name : "未発見アイテム"}" />
        <strong>${count > 0 ? item.name : "？？？"}</strong>
        <span>${rarity.label} / ${count}個</span>
      </article>
    `;
  }).join("");
}

function resumeBgmForCurrentView() {
  if (!battleView.classList.contains("is-hidden") && !state.finished) {
    playBgm("battle");
  } else if (!areaView.classList.contains("is-hidden")) {
    playBgm("area");
  } else {
    pauseAllBgm();
  }
}

function setCollectionOpen(open, options = {}) {
  if (open) {
    collectionReturnAfterClose = options.returnToArea ? "area" : null;
    renderCollection();
    playBgm("area");
  }
  collectionOverlay.classList.toggle("is-hidden", !open);

  if (!open) {
    if (collectionReturnAfterClose === "area") {
      collectionReturnAfterClose = null;
      renderAreas();
      playBgm("area");
      showView(areaView);
      return;
    }

    resumeBgmForCurrentView();
  }
}

function showChestDrop(area) {
  stopRewardFx();
  state.pendingDrop = rollDrop(area.number);
  chestPhase.classList.remove("is-hidden");
  rewardPhase.classList.add("is-hidden");
  openChestButton.disabled = false;
  openChestButton.classList.remove("is-opening");
  lootChestImage.src = "./assets/loot/chest/chest-closed.png";
  lootOverlay.classList.remove("is-hidden");
}

function rarityFramePath(rarity, frame) {
  return `./assets/loot/fx/${rarity}-${frame}.png`;
}

function stopRewardFx() {
  if (rewardFxTimer) {
    window.clearInterval(rewardFxTimer);
    rewardFxTimer = null;
  }
}

function startRewardFx(rarity) {
  stopRewardFx();
  let frame = 1;
  rewardFx.src = rarityFramePath(rarity, frame);
  rewardFxTimer = window.setInterval(() => {
    frame = frame >= 5 ? 1 : frame + 1;
    rewardFx.src = rarityFramePath(rarity, frame);
  }, 95);
}

function revealDrop() {
  const item = state.pendingDrop;
  if (!item) return;

  addItemToCollection(item);
  const rarity = rarityConfig[item.rarity];
  chestPhase.classList.add("is-hidden");
  rewardPhase.classList.remove("is-hidden");
  rewardRarity.textContent = rarity.label;
  rewardTitle.textContent = item.rarity === "legendary" ? "伝説のアイテム獲得" : "アイテム獲得";
  startRewardFx(item.rarity);
  rewardItemIcon.src = item.icon;
  rewardItemIcon.alt = item.name;
  rewardItemName.textContent = item.name;
  rewardItemName.className = `reward-name ${item.rarity}`;
  rewardItemCount.textContent = `所持数 ${getOwnedCount(item.id)} 個`;
}

function openLootChest() {
  if (!state.pendingDrop) return;
  openChestButton.disabled = true;
  openChestButton.classList.add("is-opening");
  lootChestImage.src = "./assets/loot/chest/chest-open.gif";
  playSfx("fanfare");
  window.setTimeout(revealDrop, 850);
}

function closeLootOverlay() {
  stopRewardFx();
  lootOverlay.classList.add("is-hidden");
  state.pendingDrop = null;
}

function continueAfterLoot() {
  closeLootOverlay();
  renderAreas();
  playBgm("area");
  showView(areaView);
}

function openCollectionAfterLoot() {
  closeLootOverlay();
  setCollectionOpen(true, { returnToArea: true });
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
  state.pendingDrop = null;
  lootOverlay.classList.add("is-hidden");
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
  resultActions.classList.add("is-hidden");
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
    window.setTimeout(() => showChestDrop(area), 650);
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

collectionButton.addEventListener("click", () => setCollectionOpen(true));

collectionCloseButton.addEventListener("click", () => setCollectionOpen(false));

openChestButton.addEventListener("click", openLootChest);

lootCloseButton.addEventListener("click", continueAfterLoot);

lootCollectionButton.addEventListener("click", openCollectionAfterLoot);

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
    setCollectionOpen(false);
  }
});

loadCollection();
loadAudioSettings();
applyAudioSettings();
syncAudioControls();
showView(titleView);

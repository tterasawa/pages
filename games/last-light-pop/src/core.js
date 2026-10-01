// Original simulation. No DOM, rendering, audio, or network dependencies.
// `fx` is a presentation-only queue (hits, kills, pickups) that never feeds back into the simulation.
export const LIMITS = Object.freeze({ enemies: 1200, bullets: 420, gems: 400, particles: 240, fx: 900 });
export const MODES = Object.freeze({
  patrol: { name: '夜間巡回', duration: 180, ramp: 320, difficulty: 0.8, label: '03 MIN', description: '短い夜で、灯火の扱いを覚える。' },
  guard: { name: '灯火防衛', duration: 360, difficulty: 1, label: '06 MIN', description: '武器を育て、夜の主を迎え撃つ。' },
  eclipse: { name: '極夜作戦', duration: 360, difficulty: 1.4, label: 'HARD', description: 'さらに速く、さらに深い夜へ。' },
  endless: { name: 'エンドレス', duration: 900, ramp: 600, rampCap: 3.2, difficulty: 1, endless: true, label: '∞', description: '終わらない夜。どこまで耐えられる？' }
});
export const UPGRADES = Object.freeze([
  {id:'bolt',name:'光弾',tag:'WEAPON',icon:'bolt',max:5,color:'#bbebae',description:'最も近い敵へ光の弾丸を放つ。',effect:['射撃速度と光弾の威力が上昇','2連射・光弾の威力が上昇','貫通 +1・光弾の威力が上昇','進化：3連射・貫通 +2']},
  {id:'orbit',name:'衛星刃',tag:'WEAPON',icon:'orbit',max:5,color:'#b5ddd5',description:'周回する刃が近づく敵を切り裂く。',effect:['刃 +1・軌道が拡大','刃 +1・衛星刃の威力が上昇','高速回転・刃 +1・威力が上昇','進化：5枚の刃と拡大軌道']},
  {id:'arc',name:'雷の糸',tag:'WEAPON',icon:'arc',max:5,color:'#edda9b',description:'雷が近くの敵を連鎖して貫く。',effect:['連鎖 +1・雷の威力が上昇','連鎖 +1・間隔 −20%','連鎖 +1・雷の威力が上昇','進化：広域連鎖・射撃間隔短縮']},
  {id:'frost',name:'霜の庭',tag:'WEAPON',icon:'frost',max:5,color:'#a3cce4',description:'冷気の領域で敵を減速させる。',effect:['領域が拡大・威力が上昇','強い減速・冷気の威力が上昇','領域が拡大・威力が上昇','進化：永久凍土・広域の冷気']},
  {id:'drone',name:'蛍の使い',tag:'WEAPON',icon:'drone',max:5,color:'#d7c4ed',description:'小さな蛍が別方向から援護射撃。',effect:['蛍 +1・援護射撃の威力が上昇','援護射撃の速度と威力が上昇','蛍 +1・貫通 +1','進化：4機の蛍・高速援護']},
  {id:'nova',name:'残光爆弾',tag:'WEAPON',icon:'nova',max:5,color:'#efa78c',description:'敵の集まる場所で光の爆発を起こす。',effect:['爆発領域が拡大・威力が上昇','爆発の間隔短縮・威力が上昇','爆発領域が拡大・威力が上昇','進化：二重の爆発・威力 +60%']},
  {id:'boomer',name:'ブーメラン星',tag:'WEAPON',icon:'boomer',max:5,color:'#ffd23f',description:'投げた星が敵を貫いて戻ってくる。',effect:['ブーメランの威力が上昇','星 +1・飛距離が伸びる','回転が速く、威力が上昇','進化：3つの巨大な星']},
  {id:'laser',name:'プリズム光線',tag:'WEAPON',icon:'laser',max:5,color:'#4cc9f0',description:'一直線の光線が並んだ敵をまとめて貫く。',effect:['光線が太く、威力が上昇','発射間隔 −20%','光線が太く、威力が上昇','進化：三方向に放つプリズム']},
  {id:'mine',name:'花火地雷',tag:'WEAPON',icon:'mine',max:5,color:'#ff5f8a',description:'足元に地雷を置き、触れた敵を花火で吹き飛ばす。',effect:['設置数 +1・威力が上昇','爆発範囲が拡大','設置間隔 −25%・威力が上昇','進化：連鎖する大花火']},
  {id:'rain',name:'星降りの夜',tag:'WEAPON',icon:'rain',max:5,color:'#9b5de5',description:'周りの敵めがけて星が降りそそぐ。',effect:['星 +1・威力が上昇','星 +1・落下範囲が拡大','星 +2・威力が上昇','進化：流星群']},
  {id:'power',name:'増幅レンズ',tag:'SUPPORT',icon:'power',max:5,color:'#e7ba8c',description:'すべての武器の威力が20%上昇。'},
  {id:'haste',name:'軽量ブーツ',tag:'SUPPORT',icon:'dash',max:5,color:'#d4ddad',description:'移動速度 +10%。ダッシュ間隔 −8%。'},
  {id:'magnet',name:'引力の灯',tag:'SUPPORT',icon:'magnet',max:5,color:'#a8d5ca',description:'経験値の回収範囲が50%拡大。'},
  {id:'vital',name:'生命の種',tag:'SUPPORT',icon:'heart',max:5,color:'#e6a4b2',description:'最大HP +25。HPを35回復。'},
  {id:'regen',name:'再生の芽',tag:'SUPPORT',icon:'leaf',max:5,color:'#b9d19b',description:'毎秒HPを0.6ずつ追加回復。'},
  {id:'crit',name:'幸運の四つ葉',tag:'SUPPORT',icon:'clover',max:5,color:'#3ee0a0',description:'8%の確率でクリティカル（ダメージ2倍）。'},
  {id:'tempo',name:'メトロノーム',tag:'SUPPORT',icon:'tempo',max:5,color:'#ff9f1c',description:'すべての武器の攻撃間隔 −7%。'}
]);
export const ENEMY_TYPES = [
  { name:'煤の群れ',hp:18,speed:44,r:13,xp:3,damage:9,color:'#c48778' },
  { name:'夜蛾',hp:13,speed:82,r:12,xp:4,damage:8,color:'#cdad87' },
  { name:'苔の鎧',hp:80,speed:30,r:21,xp:9,damage:15,color:'#829987' },
  { name:'虚ろな眼',hp:36,speed:38,r:15,xp:6,damage:12,color:'#ae91b9' },
  { name:'夜の主',hp:1550,speed:38,r:44,xp:100,damage:22,color:'#d3a780' }
];
// A weapon evolves (Lv.5) only while its partner support is owned.
export const EVOLVE_PAIRS = Object.freeze({ bolt:'power', orbit:'vital', arc:'magnet', frost:'regen', drone:'haste', nova:'power', boomer:'haste', laser:'crit', mine:'vital', rain:'tempo' });
export const SLOT_LIMIT = Object.freeze({ WEAPON: 4, SUPPORT: 4 });
export const CHARACTERS = Object.freeze({
  keeper: { name:'ランタン', title:'灯火の番人', start:'bolt', hp:1, speed:1, damage:1, xp:1, perk:'バランス型・光弾スタート' },
  runner: { name:'ソラ', title:'風の配達人', start:'arc', hp:.85, speed:1.15, damage:1, xp:1, perk:'移動 +15% / HP −15%・雷の糸スタート' },
  knight: { name:'ガンテツ', title:'鉄壁の騎士', start:'orbit', hp:1.4, speed:.92, damage:1, xp:1, perk:'HP +40% / 移動 −8%・衛星刃スタート' },
  witch: { name:'ミント', title:'星読みの魔女', start:'rain', hp:.9, speed:1, damage:1.1, xp:1.15, perk:'威力 +10% / 経験値 +15% / HP −10%・星降りスタート' }
});
export const SPECIALS = Object.freeze(['magnet', 'bomb', 'freeze', 'star']);
export const EVENTS = Object.freeze({ siege:'包囲', stampede:'大暴走', meteor:'流星群' });
// Heat: cumulative difficulty steps unlocked by clearing the previous heat.
export const HEATS = Object.freeze([
  { level:0, name:'ノーマル', rule:'いつもの夜' },
  { level:1, name:'ピリ辛', rule:'敵の体力 +20%' },
  { level:2, name:'中辛', rule:'敵の速度 +8%' },
  { level:3, name:'辛口', rule:'エリートの体力 +80%' },
  { level:4, name:'大辛', rule:'回復ドロップ半減' },
  { level:5, name:'激辛', rule:'敵弾が速く、ボスの連射 +30%' },
  { level:6, name:'超激辛', rule:'敵の攻撃力 +25%' },
  { level:7, name:'地獄辛', rule:'獲得経験値 −12%' },
  { level:8, name:'獄炎', rule:'最終ボスが2体同時に出現' }
]);
// Daily-challenge mutators. Each tweaks the run modifiers.
export const MUTATORS = Object.freeze({
  glass:{ name:'ガラスの大砲', rule:'与ダメージ +50% / 最大HP −35%' },
  horde:{ name:'大群の夜', rule:'敵の出現 +35% / 経験値 +15%' },
  magnet:{ name:'超引力', rule:'回収範囲 2倍' },
  frenzy:{ name:'ハイテンポ', rule:'敵も自分も 15% 速い' },
  treasure:{ name:'宝の夜', rule:'エリート2倍・宝箱が大当たりしやすい' },
  tank:{ name:'鉄壁の群れ', rule:'敵の体力 +35% / 経験値 +25%' },
  swift:{ name:'韋駄天', rule:'移動 +20% / ダッシュ間隔 −30%' },
  fragile:{ name:'紙装甲', rule:'敵の体力 −25% / 敵の攻撃力 +40%' }
});
export const META_DEFAULT = Object.freeze({ hp:0, power:0, speed:0, magnet:0, growth:0, regen:0, reroll:0, banish:0, luck:0, revive:0 });
export function runModifiers({ heat = 0, meta = {}, mutators = [] } = {}) {
  const r = n => Math.max(0, Math.floor(Number(meta[n]) || 0));
  const m = { eliteHP:1, enemyHP:1, enemySpeed:1, enemyDamage:1, xp:1, heal:1, elite:1, bulletSpeed:1, bossRate:1, spawn:1, finalBosses:1,
    damage:1 + r('power') * .05, playerHP:10 * r('hp'), hpScale:1, speed:1 + r('speed') * .04, dashCD:1, magnet:1 + r('magnet') * .15, regen:r('regen') * .15,
    rerolls:1 + r('reroll'), banishes:1 + r('banish'), luck:r('luck'), revives:Math.min(1, r('revive')) };
  m.xp *= 1 + r('growth') * .06;
  heat = Math.max(0, Math.min(HEATS.length - 1, Math.floor(heat) || 0));
  m.enemyHP *= 1 + heat * .08; m.enemyDamage *= 1 + heat * .05; // every step also toughens the night
  if (heat >= 1) m.enemyHP *= 1.2; if (heat >= 2) m.enemySpeed *= 1.08; if (heat >= 3) m.eliteHP = 1.8; if (heat >= 4) m.heal *= .5;
  if (heat >= 5) { m.bulletSpeed *= 1.2; m.bossRate *= 1.3; } if (heat >= 6) m.enemyDamage *= 1.25; if (heat >= 7) m.xp *= .88; if (heat >= 8) m.finalBosses = 2;
  for (const id of mutators) switch (id) {
    case 'glass': m.damage *= 1.5; m.hpScale *= .65; break; case 'horde': m.spawn *= 1.35; m.xp *= 1.15; break; case 'magnet': m.magnet *= 2; break;
    case 'frenzy': m.enemySpeed *= 1.15; m.speed *= 1.15; break; case 'treasure': m.elite *= 2; m.luck += 3; break; case 'tank': m.enemyHP *= 1.35; m.xp *= 1.25; break;
    case 'swift': m.speed *= 1.2; m.dashCD *= .7; break; case 'fragile': m.enemyHP *= .75; m.enemyDamage *= 1.4; break;
  }
  m.heat = heat; return m;
}
export class SpatialHash {
  constructor(cell=80, radius=1400, capacity=LIMITS.enemies) {
    this.cell=cell;this.radius=radius;this.width=Math.ceil(radius*2/cell)+2;
    this.heads=new Int32Array(this.width*this.width);this.next=new Int32Array(capacity);this.items=[];
  }
  coord(v){return Math.max(0,Math.min(this.width-1,Math.floor((v+this.radius)/this.cell)));}
  rebuild(items){this.items=items;this.heads.fill(-1);for(let i=0;i<items.length;i++){const e=items[i];if(!e.alive)continue;const c=this.coord(e.x)+this.coord(e.y)*this.width;this.next[i]=this.heads[c];this.heads[c]=i;}}
  query(x,y,r,fn){const x0=this.coord(x-r),x1=this.coord(x+r),y0=this.coord(y-r),y1=this.coord(y+r),rr=r*r;for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){let i=this.heads[gx+gy*this.width];while(i!==-1){const e=this.items[i];if(e.alive&&(e.x-x)**2+(e.y-y)**2<=rr)fn(e);i=this.next[i];}}}
  nearest(x,y,r){let best=null,dist=r*r;this.query(x,y,r,e=>{const d=(e.x-x)**2+(e.y-y)**2;if(d<dist){best=e;dist=d;}});return best;}
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export class Game {
  constructor(mode='guard',seed=Date.now(),options={}){
    this.mode=MODES[mode]?mode:'guard';this.config=MODES[this.mode];this.duration=this.config.duration;this.seed=seed>>>0||1;this.state='home';this.worldRadius=1280;
    this.player={x:0,y:0,hp:110,maxHP:110,speed:158,r:14,invincible:0,dashTime:0,dashCD:0,pulseCD:0,dx:0,dy:1,angle:0};
    this.time=0;this.kills=0;this.level=1;this.xp=0;this.xpNext=16;this.levels=Object.fromEntries(UPGRADES.map(u=>[u.id,u.id==='bolt'?1:0]));this.choices=[];
    this.enemies=[];this.bullets=[];this.gems=[];this.particles=[];this.enemyPool=[];this.bulletPool=[];this.gemPool=[];this.particlePool=[];
    this.hash=new SpatialHash();this.events=[];this.timers={bolt:0,orbit:0,arc:0,frost:0,drone:0,nova:0};this.spawnTimer=0;this.midSpawned=false;this.finalSpawned=false;this.finalKilled=false;this.nextId=1;this.shake=0;this.flash=0;this.viewRadius=480;this.effects=true;this.boss=null;this.bossAlert=0;this.fx=[];
    this.options=options;this.mods=runModifiers(options);const md=this.mods,p=this.player;
    this.character=CHARACTERS[options.character]?options.character:'keeper';const ch=CHARACTERS[this.character];this.levels.bolt=0;this.levels[ch.start]=1;md.damage*=ch.damage;md.speed*=ch.speed;md.xp*=ch.xp;
    p.maxHP=Math.round((110+md.playerHP)*md.hpScale*ch.hp);p.hp=p.maxHP;this.locked=new Set((options.locked||[]).filter(id=>id!==ch.start));this.endless=!!this.config.endless;
    this.damageBy={};this.killsBy={};this.mines=[];this.strikes=[];this.hazards=[];this.freeze=0;this.starPower=0;this.events2=this.endless?[]:[.22,.55,.8].map(f=>f*this.duration);this.nextEvent=this.endless?70:this.events2.shift();this.eventTimer=0;this.eventKind=null;this.nextBoss=150;
    Object.assign(this.timers,{boomer:0,laser:0,mine:0,rain:0});
    this.rerolls=md.rerolls;this.banishes=md.banishes;this.revives=md.revives;this.banished=new Set();this.chest=null;this.eliteTimer=28;this.finalsAlive=0;this.finalsKilled=0;
    this.stats={specials:0,events:0,chests:0,jackpots:0,elites:0,bossKills:0,evolves:0,damageTaken:0,hits:0,bossHits:0,dashes:0,pulses:0,rerolls:0,banishes:0,skips:0,revived:0};
  }
  rng(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
  fxPush(k,x,y,a=0,b=0){const n=this.fx.length;if(n>=LIMITS.fx+100||n>=LIMITS.fx&&k==='hit')return;this.fx.push({k,x,y,a,b});}
  emit(type,data={}){if(this.events.length<40)this.events.push({type,...data});}
  start(){if(this.state==='home'){this.state='running';for(let i=0;i<12;i++)this.spawnEnemy(0);for(let i=0;i<26;i++){const a=this.rng()*Math.PI*2,r=55+this.rng()*220;this.dropXP(Math.cos(a)*r,Math.sin(a)*r,1);}this.emit('start');}}
  pause(){if(this.state==='running'){this.state='paused';return true;}return false;}
  resume(){if(this.state==='paused'){this.state='running';return true;}return false;}
  dash(){const p=this.player;if(this.state!=='running'||p.dashCD>0)return false;p.dashTime=0.19;p.dashCD=3*(1-this.levels.haste*0.08)*this.mods.dashCD;this.stats.dashes++;p.invincible=Math.max(p.invincible,0.3);this.fxPush('dash',p.x,p.y,p.dx,p.dy);this.emit('dash');return true;}
  pulse(){const p=this.player;if(this.state!=='running'||p.pulseCD>0)return false;p.pulseCD=18;this.hash.rebuild(this.enemies);this.hash.query(p.x,p.y,230,e=>{this.hitEnemy(e,60*(1+this.levels.power*0.2)*this.mods.damage,'pulse');const d=Math.hypot(e.x-p.x,e.y-p.y)||1;e.x+=((e.x-p.x)/d)*65;e.y+=((e.y-p.y)/d)*65;});for(const gem of this.gems)gem.magnet=true;this.particle(p.x,p.y,'ring',230,0.55);this.fxPush('pulse',p.x,p.y,230);this.shake=0.24;this.stats.pulses++;this.emit('pulse');return true;}
  gainXP(n){if(!['running','upgrade'].includes(this.state))return;this.xp+=n;this.checkLevel();}
  // Upgrades that may be offered now: not maxed, not banished, and evolutions only with their partner support.
  owned(tag){return UPGRADES.filter(u=>u.tag===tag&&this.levels[u.id]>0).length;}
  eligible(exclude=[]){const full={WEAPON:this.owned('WEAPON')>=SLOT_LIMIT.WEAPON,SUPPORT:this.owned('SUPPORT')>=SLOT_LIMIT.SUPPORT};return UPGRADES.filter(u=>this.levels[u.id]<u.max&&!this.banished.has(u.id)&&!this.locked.has(u.id)&&!exclude.includes(u.id)&&!(this.levels[u.id]===0&&full[u.tag])&&this.canLevel(u));}
  canLevel(u){return !(u.tag==='WEAPON'&&this.levels[u.id]===4&&this.levels[EVOLVE_PAIRS[u.id]]<1);}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  rollChoices(exclude=[]){let pool=this.shuffle(this.eligible(exclude));if(pool.length<3&&exclude.length)pool=pool.concat(this.shuffle(this.eligible().filter(u=>!pool.includes(u))));return pool.slice(0,3);}
  checkLevel(){if(this.xp<this.xpNext||this.state!=='running')return;this.xp-=this.xpNext;this.level++;this.xpNext=Math.floor(16+this.level*7.5);const choices=this.rollChoices();if(!choices.length){this.player.hp=Math.min(this.player.maxHP,this.player.hp+25);this.emit('heal');return;}this.choices=choices;this.state='upgrade';this.fxPush('level',this.player.x,this.player.y);this.emit('level');}
  reroll(){if(this.state!=='upgrade'||this.rerolls<=0)return false;const before=this.choices.map(c=>c.id);const next=this.rollChoices(before);if(!next.length)return false;this.rerolls--;this.stats.rerolls++;this.choices=next;this.emit('reroll');return true;}
  banish(id){if(this.state!=='upgrade'||this.banishes<=0||!this.choices.some(c=>c.id===id))return false;this.banishes--;this.stats.banishes++;this.banished.add(id);const keep=this.choices.filter(c=>c.id!==id),extra=this.shuffle(this.eligible(keep.map(c=>c.id).concat(id)))[0];this.choices=extra?keep.concat(extra):keep;this.emit('banish');if(!this.choices.length){this.state='running';this.checkLevel();}return true;}
  skip(){if(this.state!=='upgrade')return false;this.state='running';this.choices=[];this.stats.skips++;this.player.hp=Math.min(this.player.maxHP,this.player.hp+20);this.emit('skip');this.checkLevel();return true;}
  chooseUpgrade(id){if(this.state!=='upgrade'||!this.choices.some(c=>c.id===id))return false;const u=UPGRADES.find(x=>x.id===id);if(this.levels[id]>=u.max||!this.canLevel(u))return false;this.levels[id]++;if(id==='vital'){this.player.maxHP+=25;this.player.hp=Math.min(this.player.maxHP,this.player.hp+35);}this.state='running';this.choices=[];const evolved=this.levels[id]===5&&u.tag==='WEAPON';if(evolved)this.stats.evolves++;this.emit(evolved?'evolve':'choose',{id});this.checkLevel();return true;}
  // Treasure: tier 1 from elites, tier 2 from bosses. Rewards are applied at once; the UI only presents them.
  openChest(tier=1){
    const luck=this.mods.luck,roll=this.rng();let count=tier>=2?(roll<.25+luck*.04?5:3):(roll<.05+luck*.025?5:roll<.3+luck*.05?3:1);
    const rewards=[];for(let i=0;i<count;i++){const pool=this.eligible();if(!pool.length){rewards.push({id:'heal',level:0});this.player.hp=Math.min(this.player.maxHP,this.player.hp+30);continue;}
      const weights=pool.map(u=>u.tag==='WEAPON'&&this.levels[u.id]===4?6:this.levels[u.id]>0?3:1);let t=this.rng()*weights.reduce((a,b)=>a+b,0),pick=pool[0];for(let k=0;k<pool.length;k++){t-=weights[k];if(t<=0){pick=pool[k];break;}}
      this.levels[pick.id]++;if(pick.id==='vital'){this.player.maxHP+=25;this.player.hp=Math.min(this.player.maxHP,this.player.hp+35);}const evolved=pick.tag==='WEAPON'&&this.levels[pick.id]===5;if(evolved)this.stats.evolves++;rewards.push({id:pick.id,level:this.levels[pick.id],evolved});}
    this.stats.chests++;if(count===5)this.stats.jackpots++;this.chest={tier,rewards,count};this.state='chest';this.emit('chest',{count});return this.chest;
  }
  claimChest(){if(this.state!=='chest')return false;const evolved=this.chest.rewards.some(r=>r.evolved);this.chest=null;this.state='running';if(evolved)this.emit('evolve');this.checkLevel();return true;}
  // Bosses escalate in three phases: fan shots → ring bursts + minions → telegraphed slams.
  bossPattern(e,dx,dy,d,dt){
    const frac=e.hp/e.maxHP,phase=frac>.66?1:frac>.33?2:3;if((e.phase2||1)<phase){e.phase2=phase;e.ringCD=1.2;e.slamCD=1.5;this.fxPush('bossPhase',e.x,e.y,phase);this.emit('bossPhase',{phase});
      if(phase===2)for(let i=0;i<(e.final?8:6);i++){const m=this.spawnEnemy(i%2?1:0);if(m){const a=i/6*Math.PI*2;m.x=clamp(e.x+Math.cos(a)*90,-1240,1240);m.y=clamp(e.y+Math.sin(a)*90,-1240,1240);}}}
    if(phase>=2&&d<800){e.ringCD-=dt;if(e.ringCD<=0){const n=e.final?20:14,off=this.rng()*Math.PI;for(let j=0;j<n;j++){const a=off+j*Math.PI*2/n;this.shoot(e.x,e.y,Math.cos(a),Math.sin(a),e.damage*.8,{speed:120*this.mods.bulletSpeed,r:7,hostile:true,ttl:6});}this.particle(e.x,e.y,'warning',e.r+30,0.5);e.ringCD=(e.final?3.6:4.5)/this.mods.bossRate;this.emit('bossShot');}}
    if(phase>=3&&d<900){e.slamCD-=dt;if(e.slamCD<=0){const p=this.player;this.hazard(p.x,p.y,95,1.1,e.damage*1.2);if(e.final)this.hazard(p.x+p.dx*120,p.y+p.dy*120,80,1.4,e.damage);e.slamCD=(e.final?2.6:3.3)/this.mods.bossRate;}}
  }
  spawnElite(){const progress=this.time/this.duration,types=[0,1];if(progress>.25)types.push(2);if(progress>.4)types.push(3);const e=this.spawnEnemy(types[Math.floor(this.rng()*types.length)],false,true);if(e)this.emit('elite');return e;}
  spawnEnemy(type=0,final=false,elite=false){if(this.enemies.length>=LIMITS.enemies){if(type!==4)return null;const i=this.enemies.findIndex(e=>e.type!==4);if(i<0)return null;this.enemyPool.push(this.enemies[i]);this.enemies[i]=this.enemies[this.enemies.length-1];this.enemies.pop();}
    const def=ENEMY_TYPES[type],md=this.mods,em=elite?{hp:9*md.eliteHP,r:1.45,speed:.85,damage:1.5,xp:7}:{hp:1,r:1,speed:1,damage:1,xp:1},a=this.rng()*Math.PI*2,r=clamp(this.viewRadius+55,360,850),p=this.player,e=this.enemyPool.pop()||{};const ramp=Math.min(this.config.rampCap||1.25,this.time/(this.config.ramp||this.duration)),scale=1+ramp*1.5,pressure=clamp((ramp-.2)/.8,0,1),health=1+pressure*.12*(this.mode==='eclipse'?.5:1),pursuit=1+pressure*.07*(this.mode==='eclipse'?.5:1);
    const late=this.endless?Math.max(0,this.time-360):0,endlessHP=1+late/240+(late/480)**2,endlessDmg=1+late/900;
    Object.assign(e,{id:this.nextId++,type,x:clamp(p.x+Math.cos(a)*r,-1240,1240),y:clamp(p.y+Math.sin(a)*r,-1240,1240),hp:def.hp*(type===4?(final?2.4*(md.finalBosses>1?.7:1):1):scale)*this.config.difficulty*health*md.enemyHP*em.hp*endlessHP,maxHP:0,speed:def.speed*(1+ramp*0.22)*this.config.difficulty*pursuit*md.enemySpeed*em.speed,r:def.r*em.r,xp:def.xp*(this.mode==='eclipse'?0.65:1)*em.xp,damage:def.damage*this.config.difficulty*md.enemyDamage*em.damage*endlessDmg,elite,phase2:1,ringCD:0,slamCD:0,alive:true,hit:0,slow:0,cooldown:1+this.rng()*2,phase:this.rng()*6.28,final});e.maxHP=e.hp;this.enemies.push(e);
    if(type===4){this.boss=e;this.bossAlert=3;this.emit('boss',{final});}return e;
  }
  shoot(x,y,dx,dy,damage,opts={}){if(this.bullets.length>=LIMITS.bullets)return null;const b=this.bulletPool.pop()||{};Object.assign(b,{x,y,vx:dx*(opts.speed||440),vy:dy*(opts.speed||440),damage,ttl:opts.ttl||1.6,r:opts.r||4,pierce:opts.pierce||0,hostile:!!opts.hostile,lastId:-1,color:opts.color||'mint',src:opts.src||'other',boomer:!!opts.boomer,age:0});this.bullets.push(b);return b;}
  dropXP(x,y,value,kind='xp'){if(this.gems.length>=LIMITS.gems&&kind!=='chest'&&kind!=='special'){if(kind==='heal'){this.player.hp=Math.min(this.player.maxHP,this.player.hp+value);return;}let best=null,dist=Infinity;for(const g of this.gems){if(g.kind!=='xp')continue;const d=(g.x-x)**2+(g.y-y)**2;if(d<dist){dist=d;best=g;}}if(best){best.value+=value;return;}const old=this.gems[0];this.player.hp=Math.min(this.player.maxHP,this.player.hp+old.value);Object.assign(old,{x,y,value,kind:'xp',magnet:false});return;}
    const g=this.gemPool.pop()||{};Object.assign(g,{x,y,value,kind,magnet:false,phase:this.rng()*6.28});this.gems.push(g);
  }
  particle(x,y,type='spark',size=4,ttl=0.35,x2=0,y2=0){if(!this.effects&&type==='spark')return;if(this.particles.length>=LIMITS.particles)return;const p=this.particlePool.pop()||{};Object.assign(p,{x,y,type,size,ttl,maxTTL:ttl,x2,y2,vx:(this.rng()-0.5)*100,vy:(this.rng()-0.5)*100});this.particles.push(p);}
  hitEnemy(e,damage,src='other'){if(!e.alive)return;let crit=false;if(src!=='other'){if(this.starPower>0)damage*=1.5;if(this.levels.crit&&this.rng()<this.levels.crit*.08){damage*=2;crit=true;}}const dealt=Math.min(damage,Math.max(0,e.hp));this.damageBy[src]=(this.damageBy[src]||0)+dealt;e.hp-=damage;e.hit=0.09;this.fxPush('hit',e.x,e.y,damage,crit?10+e.type:e.type);if(e.hp<=0){e.alive=false;this.kills++;this.killsBy[src]=(this.killsBy[src]||0)+1;this.fxPush('kill',e.x,e.y,e.type,e.r);this.dropXP(e.x,e.y,e.xp);for(let i=0;i<(e.type===4?12:2);i++)this.particle(e.x,e.y,'spark',e.type===4?8:3);if(e.elite){this.stats.elites++;this.dropXP(e.x,e.y,1,'chest');if(this.rng()<.45)this.dropXP(e.x+26,e.y+10,1+Math.floor(this.rng()*SPECIALS.length),'special');this.fxPush('eliteDown',e.x,e.y,e.type,e.r);}
    if(e.type===4){this.stats.bossKills++;if(e.final){this.finalsKilled++;if(this.finalsKilled>=this.finalsAlive)this.finalKilled=true;}this.dropXP(e.x-24,e.y,2,'chest');this.boss=this.enemies.find(b=>b.alive&&b.type===4&&b.final)||this.enemies.find(b=>b.alive&&b.type===4)||null;this.dropXP(e.x+20,e.y,35,'heal');this.fxPush('bossDown',e.x,e.y,e.final?1:0);this.emit('bossDown');}else if(this.rng()<0.014*this.mods.heal)this.dropXP(e.x,e.y,18,'heal');else if(this.time>45&&this.rng()<0.0007)this.dropXP(e.x,e.y,1+Math.floor(this.rng()*SPECIALS.length),'special');this.emit('kill');}}
  damagePlayer(n){const p=this.player;if(this.state!=='running'||p.invincible>0)return;p.hp=Math.max(0,p.hp-n);p.invincible=0.65;this.shake=0.18;this.flash=0.2;this.stats.damageTaken+=n;this.stats.hits++;if(this.boss?.alive)this.stats.bossHits++;this.fxPush('hurt',p.x,p.y,n);this.emit('hurt');
    if(p.hp<=0&&this.revives>0){this.revives--;this.stats.revived++;p.hp=Math.round(p.maxHP*.5);p.invincible=2.5;this.hash.rebuild(this.enemies);this.hash.query(p.x,p.y,260,e=>{if(e.type!==4)this.hitEnemy(e,120*this.mods.damage,'pulse');const d=Math.hypot(e.x-p.x,e.y-p.y)||1;e.x+=(e.x-p.x)/d*120;e.y+=(e.y-p.y)/d*120;});for(const b of this.bullets)if(b.hostile)b.ttl=0;this.fxPush('revive',p.x,p.y);this.emit('revive');return;}
    if(p.hp<=0){this.state='dead';this.emit('dead');}}
  update(dt,input={}){
    if(this.state!=='running')return;dt=clamp(dt,0,1/30);this.time+=dt;const p=this.player,l=this.levels;this.shake=Math.max(0,this.shake-dt);this.flash=Math.max(0,this.flash-dt);this.bossAlert=Math.max(0,this.bossAlert-dt);
    this.freeze=Math.max(0,this.freeze-dt);this.starPower=Math.max(0,this.starPower-dt);p.invincible=Math.max(0,p.invincible-dt);p.dashCD=Math.max(0,p.dashCD-dt);p.pulseCD=Math.max(0,p.pulseCD-dt);p.hp=Math.min(p.maxHP,p.hp+dt*(0.18+l.regen*0.6+this.mods.regen));
    let mx=input.x||0,my=input.y||0;const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m;}if(m>0.05){p.dx=mx/(Math.hypot(mx,my)||1);p.dy=my/(Math.hypot(mx,my)||1);p.angle=Math.atan2(p.dy,p.dx);}
    const speed=p.speed*(1+l.haste*0.1)*this.mods.speed;if(p.dashTime>0){p.dashTime-=dt;p.x+=p.dx*speed*4.6*dt;p.y+=p.dy*speed*4.6*dt;if(this.rng()<0.5)this.particle(p.x,p.y,'trail',18,0.22);}else{p.x+=mx*speed*dt;p.y+=my*speed*dt;}p.x=clamp(p.x,-this.worldRadius+24,this.worldRadius-24);p.y=clamp(p.y,-this.worldRadius+24,this.worldRadius-24);
    if(this.endless){if(this.time>=this.nextBoss){this.nextBoss+=150;this.spawnEnemy(4,this.time>=900);}}
    else if(!this.midSpawned&&this.time>=this.duration*0.43){this.midSpawned=true;this.spawnEnemy(4);}
    // Timed set pieces: siege, stampede or a meteor shower.
    if(this.nextEvent!=null&&this.time>=this.nextEvent&&!(this.boss?.alive&&this.time<this.nextEvent+20)){const kinds=Object.keys(EVENTS);this.startEvent(kinds[Math.floor(this.rng()*kinds.length)]);this.nextEvent=this.endless?this.time+75:this.events2.shift();}
    if(this.eventKind==='meteor'&&this.eventTimer>0){this.eventTimer-=dt;if(Math.floor((this.eventTimer+dt)/.3)!==Math.floor(this.eventTimer/.3)){const a=this.rng()*Math.PI*2,r=this.rng()*320;this.hazard(clamp(p.x+Math.cos(a)*r,-1240,1240),clamp(p.y+Math.sin(a)*r,-1240,1240),68,1.05,16*this.config.difficulty*this.mods.enemyDamage);}if(this.eventTimer<=0)this.eventKind=null;}
    for(let i=this.hazards.length-1;i>=0;i--){const h=this.hazards[i];h.t-=dt;if(h.t<=0){if((p.x-h.x)**2+(p.y-h.y)**2<(h.r+p.r*.5)**2)this.damagePlayer(h.damage);this.fxPush('slam',h.x,h.y,h.r);this.shake=Math.max(this.shake,.12);this.hazards.splice(i,1);}}
    if(!this.endless&&!this.finalSpawned&&this.time>=this.duration-35){this.finalSpawned=true;for(let i=0;i<this.mods.finalBosses;i++)if(this.spawnEnemy(4,true))this.finalsAlive++;if(!this.finalsAlive)this.finalKilled=true;}
    this.eliteTimer-=dt*this.mods.elite;if(this.eliteTimer<=0){this.eliteTimer=34+this.rng()*14;this.spawnElite();}
    if(!this.endless&&this.time>=this.duration&&this.finalKilled){this.state='won';this.emit('won');return;}
    this.spawnTimer-=dt;if(this.spawnTimer<=0){const progression=Math.min(this.config.rampCap||1.25,this.time/(this.config.ramp||this.duration));const count=1+Math.floor(progression*4);for(let i=0;i<count;i++){const roll=this.rng();const type=progression>0.45&&roll<0.15?3:progression>0.25&&roll<0.3?2:progression>0.1&&roll<0.55?1:0;this.spawnEnemy(type);}this.spawnTimer=Math.max(0.09,0.85-progression*0.65)/this.config.difficulty/this.mods.spawn;}
    // Linear enemy movement. Enemies never perform pairwise collision checks.
    for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];if(!e.alive){this.enemyPool.push(e);this.enemies[i]=this.enemies[this.enemies.length-1];this.enemies.pop();continue;}e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;const slow=this.freeze>0?0:e.slow>0?(l.frost>=3?0.45:0.65):1;let velocity=e.speed*slow;
      if(e.type===3&&d<300)velocity*=d<180?-0.5:0.1;e.x+=dx/d*velocity*dt;e.y+=dy/d*velocity*dt;
      if(d<p.r+e.r)this.damagePlayer(e.damage);
      if(e.type===4&&this.freeze<=0)this.bossPattern(e,dx,dy,d,dt);
      if((e.type===3||e.type===4)&&d<700&&this.freeze<=0){e.cooldown-=dt;if(e.cooldown<=0){if(e.type===4){const a=Math.atan2(dy,dx);for(let j=-2;j<=2;j++)this.shoot(e.x,e.y,Math.cos(a+j*0.25),Math.sin(a+j*0.25),e.damage,{speed:145*this.config.difficulty*this.mods.bulletSpeed,r:7,hostile:true,ttl:5});this.particle(e.x,e.y,'warning',e.r+16,0.6);this.emit('bossShot');e.cooldown=(e.final?1.65:2.3)/this.mods.bossRate*(e.phase2>=3?.75:1);}else{this.shoot(e.x,e.y,dx/d,dy/d,e.damage,{speed:175*this.config.difficulty*this.mods.bulletSpeed,r:5,hostile:true,ttl:4});e.cooldown=2.8;}}}
      if(d>1200&&e.type!==4){const a=this.rng()*6.28;e.x=clamp(p.x+Math.cos(a)*(this.viewRadius+50),-1240,1240);e.y=clamp(p.y+Math.sin(a)*(this.viewRadius+50),-1240,1240);}
    }
    if(this.state!=='running')return;this.hash.rebuild(this.enemies);this.updateWeapons(dt);
    for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i];b.ttl-=dt;b.age+=dt;if(b.boomer&&b.age>.55){const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy)||1,sp=Math.hypot(b.vx,b.vy);b.vx+=(dx/d*sp-b.vx)*Math.min(1,dt*6);b.vy+=(dy/d*sp-b.vy)*Math.min(1,dt*6);if(d<24&&b.age>.8)b.ttl=0;if(b.lastId!==-1&&b.age%.25<dt)b.lastId=-1;}b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.hostile){if((b.x-p.x)**2+(b.y-p.y)**2<(b.r+p.r)**2){this.damagePlayer(b.damage);b.ttl=0;}}
      else if(b.ttl>0){this.hash.query(b.x,b.y,56,e=>{if(b.ttl<=0||e.id===b.lastId)return;if((b.x-e.x)**2+(b.y-e.y)**2<(e.r+b.r)**2){this.hitEnemy(e,b.damage,b.src);b.lastId=e.id;if(b.pierce--<=0)b.ttl=0;}});}
      if(b.ttl<=0){this.bulletPool.push(b);this.bullets[i]=this.bullets[this.bullets.length-1];this.bullets.pop();}
    }
    const magnet=66*(1+l.magnet*0.5)*this.mods.magnet;for(let i=this.gems.length-1;i>=0;i--){const g=this.gems[i],dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy);if(d<magnet||g.magnet){g.magnet=true;const v=(320+220/Math.max(1,d))*dt;g.x+=dx/(d||1)*Math.min(d,v);g.y+=dy/(d||1)*Math.min(d,v);}if(d<20){this.fxPush('pick',g.x,g.y,g.kind==='heal'?1:0,g.value);const kind=g.kind,value=g.value;this.gemPool.push(g);this.gems[i]=this.gems[this.gems.length-1];this.gems.pop();if(kind==='chest'){this.openChest(value);return;}if(kind==='special'){this.useSpecial(SPECIALS[value-1]||'magnet');continue;}if(kind==='heal'){p.hp=Math.min(p.maxHP,p.hp+value);this.emit('heal');}else{this.xp+=value*this.mods.xp;this.emit('xp');}}}
    for(let i=this.particles.length-1;i>=0;i--){const q=this.particles[i];q.ttl-=dt;if(q.type==='spark'){q.x+=q.vx*dt;q.y+=q.vy*dt;}if(q.ttl<=0){this.particlePool.push(q);this.particles[i]=this.particles[this.particles.length-1];this.particles.pop();}}
    if(this.state==='running')this.checkLevel();
  }
  updateWeapons(dt){const p=this.player,l=this.levels,mult=(1+l.power*0.2)*this.mods.damage;const haste=1+l.tempo*.075;for(const k of Object.keys(this.timers))this.timers[k]-=dt*haste;
    if(this.timers.bolt<=0){const target=l.bolt?this.hash.nearest(p.x,p.y,650):null;if(target){const a=Math.atan2(target.y-p.y,target.x-p.x),count=l.bolt>=5?3:l.bolt>=3?2:1;for(let j=0;j<count;j++){const angle=a+(j-(count-1)/2)*0.11;this.shoot(p.x,p.y,Math.cos(angle),Math.sin(angle),18*(1+(l.bolt-1)*0.35)*mult,{pierce:l.bolt>=5?2:l.bolt>=4?1:0,src:'bolt'});}this.timers.bolt=0.55*Math.pow(0.82,l.bolt-1);this.emit('shot');}}
    if(l.orbit&&this.timers.orbit<=0){const count=l.orbit===5?5:l.orbit+1,rad=orbitRadius(l.orbit);for(let i=0;i<count;i++){const a=this.time*(l.orbit>=4?2.9:2.2)+i*Math.PI*2/count;this.hash.query(p.x+Math.cos(a)*rad,p.y+Math.sin(a)*rad,27,e=>this.hitEnemy(e,15*(1+l.orbit*0.4)*mult,'orbit'));}this.timers.orbit=0.2;}
    if(l.frost&&this.timers.frost<=0){const rad=frostRadius(l.frost);this.hash.query(p.x,p.y,rad,e=>{e.slow=0.6;this.hitEnemy(e,6*(1+l.frost*0.4)*mult,'frost');});this.timers.frost=0.45;}
    if(l.arc&&this.timers.arc<=0){let target=this.hash.nearest(p.x,p.y,460),x=p.x,y=p.y,visited=new Set();for(let i=0;target&&i<2+l.arc;i++){visited.add(target.id);this.particle(x,y,'arc',2,0.22,target.x,target.y);this.hitEnemy(target,24*(1+l.arc*0.35)*mult,'arc');x=target.x;y=target.y;let next=null,dist=(l.arc===5?330:220)**2;this.hash.query(x,y,l.arc===5?330:220,e=>{const d=(e.x-x)**2+(e.y-y)**2;if(!visited.has(e.id)&&d<dist){dist=d;next=e;}});target=next;}this.timers.arc=1.9*(l.arc>=3?0.8:1)*(l.arc===5?0.65:1);if(visited.size)this.emit('arc');}
    if(l.drone&&this.timers.drone<=0){const count=l.drone===5?4:l.drone>=4?3:l.drone>=2?2:1;for(let i=0;i<count;i++){const a=-this.time*1.3+i*Math.PI*2/count,x=p.x+Math.cos(a)*50,y=p.y+Math.sin(a)*50;const e=this.hash.nearest(x,y,600);if(e){const d=Math.hypot(e.x-x,e.y-y)||1;this.shoot(x,y,(e.x-x)/d,(e.y-y)/d,12*(1+l.drone*0.3)*mult,{color:'purple',pierce:l.drone>=4?1:0,src:'drone'});}}this.timers.drone=l.drone===5?0.32:l.drone>=3?0.55:0.7;}
    if(l.nova&&this.timers.nova<=0){const e=this.hash.nearest(p.x,p.y,450);if(e){const r=65+l.nova*15,bursts=l.nova===5?2:1,damage=(l.nova===5?62.4:30*(1+l.nova*0.4))*mult;for(let i=0;i<bursts;i++){const x=e.x+i*24,y=e.y-i*24;this.hash.query(x,y,r,t=>this.hitEnemy(t,damage,'nova'));this.particle(x,y,'nova',r,0.5);this.fxPush('nova',x,y,r);}this.emit('nova');}this.timers.nova=l.nova>=3?2.2:2.8;}
    if(l.boomer&&this.timers.boomer<=0){const e=this.hash.nearest(p.x,p.y,560);if(e){const a=Math.atan2(e.y-p.y,e.x-p.x),count=l.boomer>=5?3:l.boomer>=2?2:1;for(let j=0;j<count;j++){const an=a+(j-(count-1)/2)*0.5;this.shoot(p.x,p.y,Math.cos(an),Math.sin(an),16*(1+l.boomer*0.35)*mult*(l.boomer>=5?1.4:1),{speed:l.boomer>=3?470:400,ttl:l.boomer>=2?1.5:1.25,r:l.boomer>=5?16:10,pierce:999,boomer:true,color:'boomer',src:'boomer'});}this.emit('shot');}this.timers.boomer=1.5;}
    if(l.laser&&this.timers.laser<=0){const e=this.hash.nearest(p.x,p.y,600);if(e){const a0=Math.atan2(e.y-p.y,e.x-p.x),beams=l.laser>=5?3:1,width=14+l.laser*3+(l.laser>=5?8:0),len=560,dmg=30*(1+l.laser*0.35)*mult;for(let j=0;j<beams;j++){const a=a0+j*Math.PI*2/beams,cx=Math.cos(a),cy=Math.sin(a),hit=new Set();for(let d=30;d<=len;d+=45)this.hash.query(p.x+cx*d,p.y+cy*d,45+width,t=>{if(hit.has(t.id))return;const rx=t.x-p.x,ry=t.y-p.y,along=rx*cx+ry*cy,perp=Math.abs(rx*cy-ry*cx);if(along>0&&along<len&&perp<width+t.r){hit.add(t.id);this.hitEnemy(t,dmg,'laser');}});this.particle(p.x,p.y,'beam',width,0.28,p.x+cx*len,p.y+cy*len);}this.emit('laser');}this.timers.laser=2.6*(l.laser>=2?0.8:1)*(l.laser>=5?0.85:1);}
    if(l.mine&&this.timers.mine<=0){const cap=2+l.mine;if(this.mines.length>=cap)this.mines.shift();this.mines.push({x:p.x,y:p.y,arm:.45,ttl:12});this.timers.mine=1.7*(l.mine>=3?0.75:1);}
    for(let i=this.mines.length-1;i>=0;i--){const m=this.mines[i];m.arm-=dt;m.ttl-=dt;let boom=m.ttl<=0;if(m.arm<=0&&!boom)this.hash.query(m.x,m.y,30,()=>{boom=true;});if(boom){const r=(l.mine>=2?95:75)*(l.mine>=5?1.5:1),dmg=40*(1+l.mine*0.4)*mult*(l.mine>=5?1.6:1);this.hash.query(m.x,m.y,r,t=>this.hitEnemy(t,dmg,'mine'));this.particle(m.x,m.y,'nova',r,0.5);this.fxPush('firework',m.x,m.y,r);this.mines.splice(i,1);this.emit('nova');}}
    if(l.rain&&this.timers.rain<=0){const n=(l.rain>=5?9:1+l.rain+(l.rain>=4?1:0)),rad=l.rain>=2?440:360,targets=[];this.hash.query(p.x,p.y,rad,t=>{if(targets.length<40)targets.push(t);});for(let i=0;i<n;i++){const t=targets.length?targets[Math.floor(this.rng()*targets.length)]:null,x=t?t.x:p.x+(this.rng()-.5)*rad,y=t?t.y:p.y+(this.rng()-.5)*rad;this.strikes.push({x,y,t:.45+i*.06,max:.45+i*.06,r:l.rain>=5?70:50,dmg:22*(1+l.rain*0.35)*mult});}this.timers.rain=1.9;}
    for(let i=this.strikes.length-1;i>=0;i--){const st=this.strikes[i];st.t-=dt;if(st.t<=0){this.hash.query(st.x,st.y,st.r,t=>this.hitEnemy(t,st.dmg,'rain'));this.fxPush('star',st.x,st.y,st.r);this.strikes.splice(i,1);}}
  }
  useSpecial(kind){const p=this.player;this.stats.specials++;
    if(kind==='magnet')for(const g of this.gems){if(g.kind==='xp'||g.kind==='heal')g.magnet=true;}
    else if(kind==='bomb'){this.hash.rebuild(this.enemies);this.hash.query(p.x,p.y,760,e=>this.hitEnemy(e,e.type===4?300*this.mods.damage:e.hp+1,'bomb'));this.shake=.5;for(const b of this.bullets)if(b.hostile)b.ttl=0;}
    else if(kind==='freeze')this.freeze=4.5;
    else if(kind==='star'){this.starPower=7;p.invincible=Math.max(p.invincible,7);}
    this.fxPush('special',p.x,p.y,SPECIALS.indexOf(kind));this.emit('special',{kind});}
  hazard(x,y,r,delay,damage){if(this.hazards.length<60)this.hazards.push({x,y,r,t:delay,max:delay,damage});}
  startEvent(kind){this.eventKind=kind;this.stats.events++;const p=this.player;
    if(kind==='siege'){for(let i=0;i<34;i++){const a=i/34*Math.PI*2,e=this.spawnEnemy(i%3===0?2:0);if(e){e.x=clamp(p.x+Math.cos(a)*430,-1240,1240);e.y=clamp(p.y+Math.sin(a)*430,-1240,1240);}}this.eventTimer=0;}
    else if(kind==='stampede'){const a=this.rng()*Math.PI*2;for(let i=0;i<26;i++){const e=this.spawnEnemy(1);if(e){const side=(i-13)*26;e.x=clamp(p.x+Math.cos(a)*560-Math.sin(a)*side,-1240,1240);e.y=clamp(p.y+Math.sin(a)*560+Math.cos(a)*side,-1240,1240);e.speed*=1.7;}}this.eventTimer=0;}
    else this.eventTimer=8;
    this.emit('event',{kind});}
}
export function orbitRadius(level){return level===5?105:68+level*6;}
export function frostRadius(level){return level===5?160:76+level*13;}
export function formatTime(seconds){const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}

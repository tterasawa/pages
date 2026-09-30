// Original 132 BPM dark electro score. Instruments and effects are synthesized here.
// Optional MP3 replacements are local files configured in assets/audio-config.json.
export const MUSIC_BPM = 132;
const AUDIO_FETCH_TIMEOUT=30_000;
async function audioRequest(url,consume){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),AUDIO_FETCH_TIMEOUT);
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Audio resource unavailable');return await consume(response);}finally{clearTimeout(timer);}
}
export const EFFECT_NAMES = Object.freeze(['shot','kill','xp','hurt','dash','pulse','arc','nova','heal','boss','bossDown','level','choose','evolve','won','start','dead']);
export function parseAudioConfig(data,configURL){
  const result={music:null,effects:Object.create(null)};
  if(!data||typeof data!=='object'||Array.isArray(data))return result;
  const base=new URL('../',configURL);
  function local(value){
    if(typeof value!=='string'||!value.trim())return null;
    try{const url=new URL(value,configURL);return url.origin===base.origin&&url.pathname.startsWith(base.pathname)&&!url.username&&!url.password?url.href:null;}catch{return null;}
  }
  result.music=local(data.music);
  for(const name of EFFECT_NAMES){const url=local(data.effects?.[name]);if(url)result.effects[name]=url;}
  return result;
}
export class AudioEngine {
  constructor(){
    this.ctx=null;this.master=null;this.musicGain=null;this.sfxGain=null;
    this.enabled=false;this.active=true;this.musicVolume=.38;this.sfxVolume=.55;
    this.step=0;this.nextBeat=0;this.scheduler=null;this.voices=0;this.musicVoices=0;
    this.nodes=new Set();this.musicNodes=new Set();this.lastEffects=new Map();
    this.musicBuffer=null;this.effectBuffers=Object.create(null);this.playingMusic=null;
    this.musicOffset=0;this.musicStartedAt=0;this.assetsReady=null;this.assetErrors=[];
  }
  connect(context){
    this.ctx=context;this.master=context.createGain();this.master.gain.value=.72;
    this.musicGain=context.createGain();this.sfxGain=context.createGain();this.musicGain.gain.value=0;this.sfxGain.gain.value=0;
    this.pumpGain=context.createGain();this.pumpGain.connect(this.musicGain);
    this.drumGain=context.createGain();this.drumGain.connect(this.musicGain);
    this.musicGain.connect(this.master);this.sfxGain.connect(this.master);
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.14;
    this.master.connect(compressor);compressor.connect(context.destination);
    this.delay=context.createDelay(.5);this.delay.delayTime.value=60/MUSIC_BPM/2;
    const feedback=context.createGain(),wet=context.createGain();feedback.gain.value=.26;wet.gain.value=.17;
    this.delay.connect(feedback);feedback.connect(this.delay);this.delay.connect(wet);wet.connect(this.pumpGain);
    this.noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
    const data=this.noiseBuffer.getChannelData(0);let seed=81391;
    for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
    this.nextBeat=context.currentTime;
    this.applyVolumes();
  }
  async unlock(){
    try{
      if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.connect(new C());this.scheduler=setInterval(()=>this.schedule(),25);this.assetsReady=this.loadAssets();}
      if(this.ctx.state==='suspended')await this.ctx.resume();
      this.applyVolumes();this.syncPlayback();
    }catch{this.enabled=false;this.applyVolumes();}
  }
  async loadAssets(){
    const configURL=new URL('../assets/audio-config.json',import.meta.url);
    try{
      const config=parseAudioConfig(await audioRequest(configURL,response=>response.json()),configURL);
      const decoded=new Map();
      const load=url=>{if(!decoded.has(url))decoded.set(url,(async()=>{try{return await this.ctx.decodeAudioData(await audioRequest(url,response=>response.arrayBuffer()));}catch{this.assetErrors.push(url);return null;}})());return decoded.get(url);};
      await Promise.all([config.music?(async()=>{const buffer=await load(config.music);if(buffer){this.musicBuffer=buffer;for(const source of this.musicNodes){try{source.stop();}catch{}}this.syncPlayback();}})():null,...Object.entries(config.effects).map(async([name,url])=>{const buffer=await load(url);if(buffer)this.effectBuffers[name]=buffer;})]);
      this.syncPlayback();
    }catch{this.assetErrors.push(configURL.href);}
  }
  applyVolumes(){
    if(!this.ctx)return;const t=this.ctx.currentTime,on=this.enabled&&this.active;
    this.musicGain.gain.setTargetAtTime(on?this.musicVolume:0,t,.045);
    this.sfxGain.gain.setTargetAtTime(on?this.sfxVolume:0,t,.02);
  }
  setEnabled(value){this.enabled=!!value;if(value)void this.unlock();this.applyVolumes();this.syncPlayback();}
  setActive(value){this.active=!!value;this.applyVolumes();this.syncPlayback();if(value&&this.ctx)this.nextBeat=this.ctx.currentTime;}
  syncPlayback(){
    if(!this.ctx)return;
    if(this.enabled&&this.active&&this.musicBuffer){
      if(this.playingMusic)return;
      const source=this.ctx.createBufferSource();source.buffer=this.musicBuffer;source.loop=true;source.connect(this.musicGain);
      this.playingMusic=source;this.musicStartedAt=this.ctx.currentTime;
      source.onended=()=>source.disconnect();source.start(0,this.musicOffset%source.buffer.duration);
    }else if(this.playingMusic){
      this.musicOffset=(this.musicOffset+this.ctx.currentTime-this.musicStartedAt)%this.musicBuffer.duration;
      const source=this.playingMusic;this.playingMusic=null;source.stop();
    }
  }
  reserve(dest){return this.ctx&&this.voices<28&&(dest===this.sfxGain||this.musicVoices<20);}
  track(source,dest,nodes){
    const music=dest!==this.sfxGain;this.voices++;if(music){this.musicVoices++;this.musicNodes.add(source);}this.nodes.add(source);
    source.onended=()=>{this.voices--;if(music){this.musicVoices--;this.musicNodes.delete(source);}this.nodes.delete(source);for(const node of nodes)node.disconnect();};
  }
  note(freq,time,duration=.2,type='sine',gain=.12,dest=this.pumpGain,options={}){
    if(!this.reserve(dest))return;
    const osc=this.ctx.createOscillator(),env=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    osc.type=type;osc.frequency.setValueAtTime(freq,time);if(options.end)osc.frequency.exponentialRampToValueAtTime(options.end,time+duration);
    filter.type='lowpass';filter.Q.value=options.resonance||.8;filter.frequency.setValueAtTime(options.cutoff||6500,time);
    if(options.cutoffEnd)filter.frequency.exponentialRampToValueAtTime(options.cutoffEnd,time+duration);
    env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+(options.attack||.003));env.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(filter);filter.connect(env);env.connect(dest);if(options.echo)env.connect(this.delay);
    this.track(osc,dest,[osc,filter,env]);osc.start(time);osc.stop(time+duration+.015);
  }
  noise(time,duration,gain,dest=this.pumpGain,frequency=6500,kind='highpass'){
    if(!this.reserve(dest))return;
    const source=this.ctx.createBufferSource(),env=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();source.buffer=this.noiseBuffer;
    filter.type=kind;filter.frequency.value=frequency;filter.Q.value=.7;
    env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(gain,time+.001);env.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(env);env.connect(dest);this.track(source,dest,[source,filter,env]);source.start(time);source.stop(time+duration+.01);
  }
  kick(time){
    this.note(155,time,.23,'sine',.66,this.drumGain,{end:43});this.noise(time,.024,.09,this.drumGain,3200,'lowpass');
    this.pumpGain.gain.setValueAtTime(.48,time);this.pumpGain.gain.linearRampToValueAtTime(1,time+.15);
  }
  musicStep(step,time){
    const beat=step%16,bar=Math.floor(step/16),section=bar%32;
    const breakdown=section>=16&&section<20,build=section>=4&&section<8||section>=20&&section<24,drop=section>=8&&section<16||section>=24;
    const root=[73.4162,58.2705,87.3071,65.4064][Math.floor(bar/2)%4];
    if(!breakdown&&beat%4===0)this.kick(time);
    if(!breakdown&&(beat===4||beat===12)){
      this.noise(time,.15,.2,this.drumGain,1550,'bandpass');this.noise(time+.017,.08,.1,this.drumGain,4200);this.note(185,time,.08,'triangle',.045,this.drumGain);
    }
    if(!breakdown&&beat%2===1)this.noise(time,.032,.055,this.drumGain,7800);
    if(!breakdown&&beat%4===2)this.noise(time,.085,drop?.08:.055,this.drumGain,6900);
    if(build&&beat>=8)this.noise(time,.045,.055+beat*.002,this.drumGain,2200,'bandpass');
    if(bar%8===7&&beat>=12&&!breakdown)this.noise(time,.05,.06,this.drumGain,3500,'bandpass');
    // Offbeat bass leaves room for the kick, with a separate sub layer in the drop.
    if(!breakdown&&[2,6,8,10,14].includes(beat)){
      const bass=root*(beat===14?2:1);this.note(bass,time,.16,'sawtooth',.16,this.pumpGain,{cutoff:drop?1600:950,cutoffEnd:220,resonance:2.1});
      if(drop)this.note(bass,time,.15,'sine',.1);
    }
    const melody=[0,7,12,3,0,10,7,12,0,7,15,12,10,7,1,7];
    if(beat%2===0||drop&&beat>=12){
      const f=root*4*2**(melody[beat]/12);this.note(f,time,breakdown?.36:.13,'sawtooth',breakdown?.045:drop?.072:.05,this.pumpGain,{cutoff:breakdown?1100:build?1400+beat*140:3100,cutoffEnd:650,echo:true});
      if(drop&&beat%4===0)this.note(f*1.006,time,.13,'triangle',.035,this.pumpGain,{echo:true});
    }
    if(beat===0){this.note(root*2,time,1.2,'triangle',.025);this.note(root*2*1.1892,time,1.2,'sine',.018);}
    if((section===8||section===24)&&beat===0)this.noise(time,.5,.11,this.drumGain,5500);
  }
  schedule(){
    if(!this.ctx)return;const now=this.ctx.currentTime;
    if(!this.enabled||!this.active||this.musicBuffer){this.nextBeat=now;return;}
    if(this.nextBeat<now-.2)this.nextBeat=now;
    while(this.nextBeat<now+.12){this.musicStep(this.step,this.nextBeat);this.nextBeat+=60/MUSIC_BPM/4;this.step++;}
  }
  effect(type){
    if(!this.ctx||!this.enabled||!this.active||!EFFECT_NAMES.includes(type))return;
    const t=this.ctx.currentTime,spacing={shot:.09,kill:.07,xp:.07,arc:.09,nova:.1}[type]||.045;
    if(t-(this.lastEffects.get(type)??-Infinity)<spacing)return;this.lastEffects.set(type,t);
    const dest=this.sfxGain,buffer=this.effectBuffers[type];
    if(buffer){if(!this.reserve(dest))return;const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(dest);this.track(source,dest,[source]);source.start(t);return;}
    const tone=(f,d,w,v,end,extra={})=>this.note(f,t,d,w,v,dest,{end,...extra});
    const noise=(d,v,f=3200,kind='bandpass')=>this.noise(t,d,v,dest,f,kind);
    switch(type){
      case 'shot':tone(1750,.075,'sawtooth',.11,360,{cutoff:3600});noise(.03,.035,5000);break;
      case 'kill':tone(240,.095,'triangle',.105,65);noise(.055,.07,2100);break;
      case 'xp':tone(1050,.075,'sine',.08,1650);break;
      case 'hurt':tone(145,.22,'sawtooth',.22,44,{cutoff:1400});noise(.17,.16,1100);break;
      case 'dash':noise(.16,.19,3900);tone(180,.18,'triangle',.13,1150);break;
      case 'pulse':tone(145,.6,'sine',.52,30);tone(660,.24,'sawtooth',.12,150,{cutoff:2200});noise(.35,.24,1600,'lowpass');break;
      case 'arc':tone(2450,.12,'sawtooth',.13,480);noise(.085,.14,5100);break;
      case 'nova':tone(120,.43,'sine',.4,32);noise(.3,.29,1900,'lowpass');tone(420,.16,'triangle',.1,70);break;
      case 'boss':tone(82,.9,'sawtooth',.19,49,{cutoff:800});tone(87,.85,'sawtooth',.1,46,{cutoff:750});noise(.55,.13,750);break;
      case 'heal':[587.33,739.99,880].forEach((f,i)=>this.note(f,t+i*.07,.32,'sine',.12,dest));break;
      case 'dead':[220,174.614,146.832].forEach((f,i)=>this.note(f,t+i*.16,.52,'triangle',.14,dest));noise(.3,.09,900);break;
      default:{
        const triumphant=['evolve','won','bossDown'].includes(type);
        const notes=type==='won'?[293.665,349.228,440,587.33]:type==='evolve'?[293.665,440,587.33,880]:type==='bossDown'?[146.832,293.665,440,587.33]:[440,523.25,659.255];
        if(triumphant){tone(100,.35,'sine',.22,38);noise(.22,.11,4800);}
        notes.forEach((f,i)=>{this.note(f,t+i*.075,.3,'triangle',.15,dest);if(triumphant)this.note(f*2,t+i*.075,.22,'sine',.06,dest);});break;
      }
    }
  }
}

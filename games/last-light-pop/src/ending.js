// Presentation clock only: terminal game state and saved records stay unchanged.
export class EndingSequence {
  constructor(kind,{reducedMotion=false}={}){
    if(!['won','dead'].includes(kind))throw new Error('Unknown ending outcome');
    this.kind=kind;this.reducedMotion=reducedMotion;this.duration=reducedMotion?.35:kind==='won'?2.9:2.25;this.age=0;this.done=false;
  }
  get progress(){return Math.min(1,this.age/this.duration);}
  advance(dt,active=true){if(this.done||!active||!Number.isFinite(dt)||dt<0)return;this.age=Math.min(this.duration,this.age+dt);this.done=this.age>=this.duration;}
  skip(){if(this.done)return false;this.age=this.duration;this.done=true;return true;}
}

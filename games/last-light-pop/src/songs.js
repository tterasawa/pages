// Stage songs for the synthesized trance engine in audio.js. Each stage has its own tempo,
// progression, melodies, rhythm and timbre so the three nights sound like different tracks.
// Chords and leads are MIDI note numbers; leads are eighth notes over an 8-bar phrase (0 = rest).
export const SONGS = Object.freeze({
  wilds: {
    name: '夜の荒野 — Lantern Rush', bpm: 138, key: 'A minor',
    main: [{ chord: [57, 60, 64], bass: 45 }, { chord: [57, 60, 65], bass: 41 }, { chord: [55, 60, 64], bass: 48 }, { chord: [55, 59, 62], bass: 43 }],
    boss: [{ chord: [57, 60, 64], bass: 45 }, { chord: [57, 60, 65], bass: 41 }, { chord: [57, 62, 65], bass: 50 }, { chord: [56, 59, 64], bass: 40 }],
    lead: [
      76, 0, 81, 0, 84, 0, 83, 81, 76, 0, 81, 0, 84, 86, 84, 0,
      77, 0, 81, 0, 84, 0, 83, 81, 77, 0, 81, 0, 84, 88, 86, 84,
      79, 0, 84, 0, 88, 0, 86, 84, 79, 0, 84, 0, 86, 0, 84, 83,
      79, 0, 83, 0, 86, 0, 84, 83, 81, 83, 84, 86, 88, 0, 91, 0],
    bossLead: [
      81, 84, 88, 84, 81, 84, 89, 88, 81, 84, 88, 84, 93, 91, 89, 88,
      81, 84, 89, 84, 81, 84, 89, 91, 93, 89, 84, 81, 89, 88, 86, 84,
      86, 89, 93, 89, 86, 89, 94, 93, 86, 89, 93, 89, 98, 96, 94, 93,
      88, 92, 95, 92, 88, 92, 95, 96, 98, 96, 95, 92, 88, 86, 84, 83],
    arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 4, 3, 2, 1],
    gate: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    bass: 'rolling', swing: 0, hats: 16, clap: 'backbeat',
    leadVoice: { kind: 'saw', gain: .2, spread: [-16, -6, 6, 16], release: 3.2, cutoff: 6500 },
    arpVoice: { type: 'square', gain: .16, octave: 12, cutoffEnd: 700 }
  },
  frost: {
    name: '氷の湖 — Crystal Drift', bpm: 132, key: 'E minor',
    main: [{ chord: [55, 59, 64], bass: 40 }, { chord: [54, 59, 62], bass: 47 }, { chord: [55, 60, 64], bass: 48 }, { chord: [57, 60, 64], bass: 45 }],
    boss: [{ chord: [55, 59, 64], bass: 40 }, { chord: [55, 60, 64], bass: 48 }, { chord: [57, 60, 64], bass: 45 }, { chord: [54, 59, 63], bass: 47 }],
    lead: [
      83, 0, 79, 0, 76, 0, 79, 83, 88, 0, 86, 0, 83, 0, 0, 0,
      86, 0, 83, 0, 78, 0, 83, 86, 90, 0, 88, 0, 86, 0, 0, 0,
      84, 0, 79, 0, 76, 0, 79, 84, 88, 0, 84, 0, 83, 0, 79, 0,
      81, 0, 84, 0, 88, 0, 86, 84, 83, 0, 0, 0, 79, 81, 83, 0],
    bossLead: [
      88, 83, 79, 83, 88, 91, 88, 83, 88, 84, 79, 84, 88, 91, 93, 91,
      88, 84, 81, 84, 88, 93, 91, 88, 87, 83, 78, 83, 87, 90, 87, 83,
      88, 83, 79, 83, 88, 91, 95, 91, 88, 84, 79, 84, 88, 91, 96, 95,
      93, 88, 84, 88, 93, 96, 93, 88, 87, 90, 95, 99, 95, 90, 87, 83],
    arp: [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 2, 3, 1, 4, 2],
    gate: [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1],
    bass: 'pulse', swing: 0, hats: 8, clap: 'snare',
    leadVoice: { kind: 'bell', gain: .2, release: 6, cutoff: 9000 },
    arpVoice: { type: 'sine', gain: .2, octave: 24, cutoffEnd: 3000 }
  },
  candy: {
    name: 'キャンディの森 — Sugar Stampede', bpm: 142, key: 'C major',
    main: [{ chord: [55, 60, 64], bass: 48 }, { chord: [55, 59, 62], bass: 43 }, { chord: [57, 60, 64], bass: 45 }, { chord: [57, 60, 65], bass: 41 }],
    boss: [{ chord: [55, 60, 63], bass: 48 }, { chord: [56, 60, 63], bass: 44 }, { chord: [58, 62, 65], bass: 46 }, { chord: [55, 59, 62], bass: 43 }],
    lead: [
      79, 0, 76, 79, 84, 0, 79, 76, 77, 76, 74, 0, 72, 0, 0, 0,
      74, 0, 79, 74, 83, 0, 79, 74, 76, 74, 71, 0, 67, 0, 0, 0,
      76, 0, 72, 76, 81, 0, 76, 72, 77, 76, 72, 0, 69, 0, 0, 0,
      77, 0, 81, 77, 84, 0, 81, 77, 79, 81, 83, 84, 86, 0, 88, 0],
    bossLead: [
      84, 87, 91, 87, 84, 87, 91, 96, 84, 87, 92, 87, 84, 87, 92, 96,
      82, 86, 89, 86, 82, 86, 89, 94, 83, 86, 91, 86, 83, 86, 91, 95,
      84, 91, 87, 91, 84, 91, 87, 96, 80, 87, 84, 87, 80, 87, 84, 92,
      82, 89, 86, 89, 82, 89, 86, 94, 83, 86, 89, 91, 95, 91, 89, 86],
    arp: [0, 3, 1, 3, 2, 3, 1, 3, 0, 3, 2, 4, 1, 3, 2, 4],
    gate: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    bass: 'bounce', swing: .22, hats: 16, clap: 'double',
    leadVoice: { kind: 'chip', gain: .14, release: 1.2, cutoff: 7000 },
    arpVoice: { type: 'square', gain: .13, octave: 12, cutoffEnd: 1800 }
  }
});
export const SONG_IDS = Object.keys(SONGS);

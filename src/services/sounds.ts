import type { AudioPlayer } from 'expo-audio';

// Kısa arayüz sesleri (tools/make_sounds.py ile üretildi). Diğer uygulamaların sesini kesmez.
const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  check: require('../../assets/sounds/check.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
};
const VOLUME: Record<Sound, number> = { tap: 0.25, pop: 0.5, check: 0.6, complete: 0.7, levelup: 0.7 };
export type Sound = keyof typeof SOURCES;

const KEY = 'mvm.sounds';
const players = new Map<Sound, AudioPlayer>();
let ready = false;

export function soundsEnabled() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setSoundsEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* depolama yok */ }
}

/** Sesi çalar; ses kapalıysa ya da ses modülü yoksa sessizce geçer. */
export function play(name: Sound) {
  if (!soundsEnabled()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül her ortamda olmayabilir
    const audio = require('expo-audio') as typeof import('expo-audio');
    if (!ready) {
      ready = true;
      audio.setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false }).catch(() => {});
    }
    let p = players.get(name);
    if (!p) {
      p = audio.createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name];
      players.set(name, p);
    }
    const player = p;
    player.seekTo(0).then(() => player.play(), () => player.play());
  } catch {
    // ses modülü yok
  }
}

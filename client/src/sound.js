// Synthetisierte Soundeffekte über die Web Audio API – keine Audiodateien nötig.
let ctx = null;
let master = null;
let muted = (() => {
  try { return localStorage.getItem('lafootball-muted') === '1'; } catch { return false; }
})();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', gain = 0.2, delay = 0, slideTo, attack = 0.005 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur, { gain = 0.15, from = 400, to = 4000, delay = 0, q = 1.2 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  click: () => tone(880, 0.06, { type: 'triangle', gain: 0.08 }),
  hover: () => tone(1400, 0.03, { type: 'sine', gain: 0.025 }),
  nav: () => { tone(520, 0.08, { type: 'triangle', gain: 0.08 }); tone(780, 0.1, { type: 'triangle', gain: 0.06, delay: 0.05 }); },
  send: () => { noise(0.35, { gain: 0.12, from: 300, to: 5000 }); tone(300, 0.25, { type: 'sine', gain: 0.08, slideTo: 900 }); },
  search: () => { tone(1320, 0.12, { type: 'sine', gain: 0.05 }); tone(1980, 0.18, { type: 'sine', gain: 0.03, delay: 0.06 }); },
  card: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', gain: 0.07, delay: i * 0.06 })),
  place: () => { tone(200, 0.12, { type: 'square', gain: 0.06, slideTo: 90 }); noise(0.15, { gain: 0.1, from: 2000, to: 600, delay: 0.02 }); tone(1046, 0.25, { gain: 0.07, delay: 0.1 }); },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.45, { type: 'triangle', gain: 0.1, delay: i * 0.08 }));
    [0, 0.1, 0.2, 0.3].forEach((d) => tone(2093 + Math.random() * 400, 0.12, { type: 'sine', gain: 0.04, delay: 0.45 + d }));
    noise(0.8, { gain: 0.06, from: 6000, to: 1500, delay: 0.4, q: 0.6 });
  },
  lose: () => { tone(220, 0.5, { type: 'sawtooth', gain: 0.05, slideTo: 110 }); tone(165, 0.6, { type: 'sine', gain: 0.08, delay: 0.1, slideTo: 82 }); },
  error: () => { tone(330, 0.15, { type: 'square', gain: 0.05 }); tone(247, 0.25, { type: 'square', gain: 0.05, delay: 0.12 }); },
  done: () => { tone(1568, 0.15, { gain: 0.04 }); tone(2093, 0.25, { gain: 0.03, delay: 0.07 }); },
};

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem('lafootball-muted', v ? '1' : '0'); } catch { /* ignorieren */ }
}

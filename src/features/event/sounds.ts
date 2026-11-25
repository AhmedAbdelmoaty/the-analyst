let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());
function tone(freq: number, at: number, dur: number, type: OscillatorType = "triangle", vol = .25) {
  const c = ac(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, c.currentTime + at); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + at + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + dur);
}
export function fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .14, .5)); tone(1047, .6, 1.2, "sawtooth", .12); }
export function drumroll(seconds = 2) {
  const c = ac();
  for (let t = 0; t < seconds; t += .045) {
    const len = Math.floor(c.sampleRate * .04), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), g = c.createGain(); g.gain.value = .15 + (t / seconds) * .35; s.buffer = b; s.connect(g).connect(c.destination); s.start(c.currentTime + t);
  }
  tone(80, seconds, .6, "sine", .6);
}
export const unlockAudio = () => { void ac().resume(); };

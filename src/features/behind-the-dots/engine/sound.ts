let ctx: AudioContext | null = null;

export function playTone(kind: "tap" | "reveal" | "save" | "win" | "lose", muted: boolean) {
  if (muted || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const notes = { tap: [520], reveal: [440, 660], save: [600, 800], win: [523, 659, 784, 1047], lose: [430, 330, 390] }[kind];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.25);
    });
  } catch {
    /* audio unavailable */
  }
}

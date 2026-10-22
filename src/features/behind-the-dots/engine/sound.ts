let ctx: AudioContext | null = null;

type SoundKind = "tap" | "reveal" | "save" | "win" | "lose" | "heart" | "timeout";

const SOUND_SHAPES: Record<SoundKind, { notes: number[]; wave: OscillatorType; duration: number; spacing: number }> = {
  tap: { notes: [560], wave: "triangle", duration: 0.08, spacing: 0 },
  reveal: { notes: [440, 660], wave: "sine", duration: 0.18, spacing: 0.09 },
  save: { notes: [600, 800], wave: "triangle", duration: 0.2, spacing: 0.1 },
  win: { notes: [523, 659, 784, 1047], wave: "triangle", duration: 0.26, spacing: 0.085 },
  lose: { notes: [420, 350, 290], wave: "sawtooth", duration: 0.2, spacing: 0.075 },
  heart: { notes: [190, 120, 78], wave: "square", duration: 0.17, spacing: 0.095 },
  timeout: { notes: [520, 320, 180, 90], wave: "sawtooth", duration: 0.22, spacing: 0.12 },
};

export function playTone(kind: SoundKind, muted: boolean) {
  if (muted || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const shape = SOUND_SHAPES[kind];
    shape.notes.forEach((frequency, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = shape.wave;
      o.frequency.setValueAtTime(frequency, ctx!.currentTime + i * shape.spacing);
      if (kind === "heart" || kind === "timeout" || kind === "lose") {
        o.frequency.exponentialRampToValueAtTime(Math.max(42, frequency * 0.72), ctx!.currentTime + i * shape.spacing + shape.duration);
      }
      const t = ctx!.currentTime + i * shape.spacing;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.035 : 0.055, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + shape.duration);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + shape.duration + 0.01);
    });
  } catch {
    /* audio unavailable */
  }
}

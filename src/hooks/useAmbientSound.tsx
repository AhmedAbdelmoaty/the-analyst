import { useEffect, useRef } from "react";
import { useSound } from "./useSoundEffects";

export type AmbientScene = "store" | "office" | "street" | "hallway" | "storeRich" | "phoneCall" | "none";

/**
 * Plays a synthesized ambient loop for a given scene. All synth — no audio files.
 * Volume sits behind dialogue & music. Respects the global sound toggle.
 */
export const useAmbientSound = (scene: AmbientScene) => {
  const { isSoundEnabled } = useSound();
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<Array<AudioNode>>([]);
  const intervalsRef = useRef<number[]>([]);

  useEffect(() => {
    if (scene === "none" || !isSoundEnabled) return;

    let cancelled = false;
    let ctx: AudioContext;
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return;
    }
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    // Slightly louder for richness, but still subtle
    const targetVol =
      scene === "street" ? 0.09 :
      scene === "storeRich" ? 0.075 :
      scene === "hallway" ? 0.055 :
      scene === "phoneCall" ? 0.05 :
      0.06;
    master.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.4);
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const track = (n: AudioNode) => nodesRef.current.push(n);

    const makeNoiseBuffer = (lengthSec = 2, brown = false) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * lengthSec, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = white;
        }
      }
      return buf;
    };

    const buildStore = (rich = false) => {
      // AC hum
      const noise = ctx.createBufferSource();
      noise.buffer = makeNoiseBuffer(2);
      noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 280;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = rich ? 0.7 : 0.6;
      noise.connect(lp).connect(noiseGain).connect(master);
      noise.start();
      track(noise); track(lp); track(noiseGain);

      // Mid-band chatter shimmer
      const chatterRate = rich ? 2200 : 3500;
      const chatter = window.setInterval(() => {
        if (cancelled) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = "triangle";
        o.frequency.value = 220 + Math.random() * 200;
        f.type = "bandpass";
        f.frequency.value = 600 + Math.random() * 400;
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(rich ? 0.06 : 0.04, t + 0.6);
        g.gain.linearRampToValueAtTime(0, t + 1.6);
        o.connect(f).connect(g).connect(master);
        o.start(t);
        o.stop(t + 1.7);
      }, chatterRate);
      intervalsRef.current.push(chatter);

      if (rich) {
        // Cash register dings — occasional
        const ding = window.setInterval(() => {
          if (cancelled) return;
          const t = ctx.currentTime;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(1800 + Math.random() * 200, t);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          o.connect(g).connect(master);
          o.start(t);
          o.stop(t + 0.45);
        }, 7000 + Math.random() * 3000);
        intervalsRef.current.push(ding);
      }
    };

    const buildOffice = () => {
      // Low room tone
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 70;
      g.gain.value = 0.3;
      o.connect(g).connect(master);
      o.start();
      track(o); track(g);

      // Faint clock tick
      const tick = window.setInterval(() => {
        if (cancelled) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const tg = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 1800;
        tg.gain.setValueAtTime(0.05, t);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(tg).connect(master);
        osc.start(t);
        osc.stop(t + 0.05);
      }, 1000);
      intervalsRef.current.push(tick);

      // Distant keyboard typing flurry
      const typing = window.setInterval(() => {
        if (cancelled) return;
        const burstCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            const t = ctx.currentTime;
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
            const ns = ctx.createBufferSource();
            ns.buffer = buf;
            const bp = ctx.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 1500;
            const ng = ctx.createGain();
            ng.gain.value = 0.15;
            ns.connect(bp).connect(ng).connect(master);
            ns.start(t);
          }, i * (60 + Math.random() * 50));
        }
      }, 5500);
      intervalsRef.current.push(typing);
    };

    const buildStreet = () => {
      // Brown noise = distant traffic rumble
      const noise = ctx.createBufferSource();
      noise.buffer = makeNoiseBuffer(3, true);
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 400;
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = 0.55;
      noise.connect(bp).connect(ng).connect(master);
      noise.start();
      track(noise); track(bp); track(ng);

      // City rumble drone
      const rumble = ctx.createOscillator();
      const rg = ctx.createGain();
      rumble.type = "sawtooth";
      rumble.frequency.value = 55;
      rg.gain.value = 0.08;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 120;
      rumble.connect(lp).connect(rg).connect(master);
      rumble.start();
      track(rumble); track(rg); track(lp);

      // Random distant horns
      const horns = window.setInterval(() => {
        if (cancelled) return;
        const t = ctx.currentTime;
        [440, 392].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const lpF = ctx.createBiquadFilter();
          o.type = "square";
          o.frequency.value = f * 0.95;
          lpF.type = "lowpass";
          lpF.frequency.value = 800;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.08 * (i === 0 ? 1 : 0.5), t + 0.03);
          g.gain.linearRampToValueAtTime(0.05, t + 0.35);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
          o.connect(lpF).connect(g).connect(master);
          o.start(t);
          o.stop(t + 0.6);
        });
      }, 4500 + Math.random() * 2500);
      intervalsRef.current.push(horns);
    };

    const buildHallway = () => {
      // Low room tone with subtle echo
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 90;
      g.gain.value = 0.25;
      o.connect(g).connect(master);
      o.start();
      track(o); track(g);

      // Distant echo noise
      const noise = ctx.createBufferSource();
      noise.buffer = makeNoiseBuffer(2);
      noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 320;
      const ng = ctx.createGain();
      ng.gain.value = 0.35;
      noise.connect(lp).connect(ng).connect(master);
      noise.start();
      track(noise); track(lp); track(ng);
    };

    const buildPhoneCall = () => {
      // Gentle line static
      const noise = ctx.createBufferSource();
      noise.buffer = makeNoiseBuffer(2);
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1500;
      bp.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.value = 0.4;
      noise.connect(bp).connect(ng).connect(master);
      noise.start();
      track(noise); track(bp); track(ng);
    };

    if (scene === "store") buildStore(false);
    else if (scene === "storeRich") buildStore(true);
    else if (scene === "office") buildOffice();
    else if (scene === "street") buildStreet();
    else if (scene === "hallway") buildHallway();
    else if (scene === "phoneCall") buildPhoneCall();

    return () => {
      cancelled = true;
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current = [];
      const m = masterGainRef.current;
      const c = ctxRef.current;
      if (m && c) {
        try {
          m.gain.cancelScheduledValues(c.currentTime);
          m.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
        } catch { /* noop */ }
      }
      setTimeout(() => {
        nodesRef.current.forEach((n) => {
          try { (n as OscillatorNode).stop?.(); } catch { /* noop */ }
          try { n.disconnect?.(); } catch { /* noop */ }
        });
        nodesRef.current = [];
        try { ctxRef.current?.close(); } catch { /* noop */ }
        ctxRef.current = null;
        masterGainRef.current = null;
      }, 600);
    };
  }, [scene, isSoundEnabled]);
};

import { useCallback, useRef, useEffect, createContext, useContext, ReactNode, useState } from "react";

type SoundType =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "navigate"
  | "collect"
  | "reveal"
  | "dialogue"
  | "suspense"
  | "accuse"
  | "door"
  | "storeBell"
  | "confetti"
  | "doorKnock"
  | "pageFlip"
  | "stamp"
  | "penWrite"
  | "sparkle"
  | "tick"
  | "footstep"
  | "doorCreak"
  | "lowTension"
  | "fanfare"
  | "somber"
  | "whoosh"
  // New cinematic sounds
  | "phoneRingModern"
  | "footstepHard"
  | "footstepSoft"
  | "carHorn"
  | "carHornDistant"
  | "paperRustle"
  | "notification"
  | "successChime"
  | "failureBuzz"
  | "keyboardKey";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack?: number;
  decay?: number;
  detune?: number;
  secondaryFreq?: number;
  noSecondary?: boolean;
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  click: { frequency: 850, duration: 0.07, type: "sine", volume: 0.55, attack: 0.005, decay: 0.05 },
  hover: { frequency: 620, duration: 0.04, type: "sine", volume: 0.25, attack: 0.005, decay: 0.03 },
  success: { frequency: 523.25, duration: 0.45, type: "sine", volume: 0.6, attack: 0.01, secondaryFreq: 783.99 },
  error: { frequency: 220, duration: 0.28, type: "triangle", volume: 0.5, attack: 0.005, decay: 0.25 },
  navigate: { frequency: 520, duration: 0.16, type: "triangle", volume: 0.45, attack: 0.01, decay: 0.12, secondaryFreq: 660 },
  collect: { frequency: 880, duration: 0.22, type: "sine", volume: 0.55, attack: 0.005, secondaryFreq: 1320 },
  reveal: { frequency: 320, duration: 0.32, type: "triangle", volume: 0.4, attack: 0.03, decay: 0.25 },
  dialogue: { frequency: 360, duration: 0.05, type: "sine", volume: 0.18, attack: 0.005, decay: 0.04 },
  suspense: { frequency: 160, duration: 0.5, type: "triangle", volume: 0.3, attack: 0.08, decay: 0.4 },
  accuse: { frequency: 260, duration: 0.55, type: "triangle", volume: 0.5, attack: 0.03, secondaryFreq: 200 },
  door: { frequency: 130, duration: 0.35, type: "sine", volume: 0.7, attack: 0.002, decay: 0.3, secondaryFreq: 90 },
  storeBell: { frequency: 1250, duration: 0.55, type: "sine", volume: 0.5, attack: 0.005, decay: 0.45, secondaryFreq: 1680 },
  confetti: { frequency: 660, duration: 0.32, type: "sine", volume: 0.55, attack: 0.005, secondaryFreq: 990 },
  doorKnock: { frequency: 180, duration: 0.14, type: "sine", volume: 0.95, attack: 0.001, decay: 0.12, secondaryFreq: 110 },
  pageFlip: { frequency: 2400, duration: 0.13, type: "triangle", volume: 0.32, attack: 0.002, decay: 0.12 },
  stamp: { frequency: 95, duration: 0.25, type: "square", volume: 0.85, attack: 0.001, decay: 0.22, secondaryFreq: 60 },
  penWrite: { frequency: 2400, duration: 0.06, type: "triangle", volume: 0.18, attack: 0.002, decay: 0.05 },
  sparkle: { frequency: 1800, duration: 0.35, type: "sine", volume: 0.4, attack: 0.005, decay: 0.3, secondaryFreq: 2700 },
  tick: { frequency: 1400, duration: 0.03, type: "sine", volume: 0.18, attack: 0.001, decay: 0.025 },
  footstep: { frequency: 95, duration: 0.12, type: "sine", volume: 0.45, attack: 0.002, decay: 0.1 },
  doorCreak: { frequency: 200, duration: 0.6, type: "triangle", volume: 0.4, attack: 0.08, decay: 0.5 },
  lowTension: { frequency: 90, duration: 1.0, type: "triangle", volume: 0.35, attack: 0.12, decay: 0.85 },
  fanfare: { frequency: 523.25, duration: 0.65, type: "triangle", volume: 0.6, attack: 0.005, secondaryFreq: 783.99 },
  somber: { frequency: 196, duration: 0.9, type: "sine", volume: 0.5, attack: 0.04, decay: 0.75, secondaryFreq: 164.81 },
  whoosh: { frequency: 600, duration: 0.35, type: "sine", volume: 0.35, attack: 0.05, decay: 0.3 },
  // Stubs — handled by custom synths below (config preserves shape but unused)
  phoneRingModern: { frequency: 1318, duration: 2.0, type: "sine", volume: 0.6 },
  footstepHard: { frequency: 60, duration: 0.18, type: "sine", volume: 0.7 },
  footstepSoft: { frequency: 80, duration: 0.18, type: "sine", volume: 0.4 },
  carHorn: { frequency: 440, duration: 0.4, type: "square", volume: 0.55 },
  carHornDistant: { frequency: 392, duration: 0.5, type: "square", volume: 0.3 },
  paperRustle: { frequency: 4000, duration: 0.25, type: "sine", volume: 0.35 },
  notification: { frequency: 880, duration: 0.35, type: "sine", volume: 0.55, secondaryFreq: 1320 },
  successChime: { frequency: 523.25, duration: 1.2, type: "sine", volume: 0.65 },
  failureBuzz: { frequency: 110, duration: 0.6, type: "square", volume: 0.55 },
  keyboardKey: { frequency: 1200, duration: 0.04, type: "square", volume: 0.25 },
};

// Sounds that use a custom synth path (skip the generic oscillator)
const CUSTOM_SYNTHS: Record<string, true> = {
  phoneRingModern: true,
  footstepHard: true,
  footstepSoft: true,
  carHorn: true,
  carHornDistant: true,
  paperRustle: true,
  notification: true,
  successChime: true,
  failureBuzz: true,
  keyboardKey: true,
};

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const masterVolumeRef = useRef(1);
  const activeLoopsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };
    window.addEventListener("click", initAudio, { once: true });
    window.addEventListener("touchstart", initAudio, { once: true });
    return () => {
      window.removeEventListener("click", initAudio);
      window.removeEventListener("touchstart", initAudio);
    };
  }, []);

  const getCtx = (): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") audioContextRef.current.resume();
    return audioContextRef.current;
  };

  // ---- Custom synth implementations ----
  const synthPhoneRing = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    // Classic dual-tone ringback (480Hz + 440Hz) — warm, realistic, like a real phone.
    // Two short rings ~0.45s each with a brief gap, gentle envelopes.
    const ringTimes = [0, 0.55];
    ringTimes.forEach((startOffset) => {
      const t0 = now + startOffset;
      [480, 440].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol * (i === 0 ? 0.55 : 0.45), t0 + 0.05);
        g.gain.linearRampToValueAtTime(vol * (i === 0 ? 0.5 : 0.4), t0 + 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        o.connect(g).connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 0.5);
      });
    });
  };

  const synthFootstep = (ctx: AudioContext, vol: number, hard: boolean) => {
    const now = ctx.currentTime;
    // Soft, natural thump — pure layered sines, no harsh noise burst.
    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(hard ? 110 : 85, now);
    body.frequency.exponentialRampToValueAtTime(hard ? 55 : 45, now + 0.09);
    bg.gain.setValueAtTime(0, now);
    bg.gain.linearRampToValueAtTime(vol * (hard ? 0.55 : 0.35), now + 0.008);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    body.connect(bg).connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.15);

    // Filtered triangle for subtle mid presence (sounds like material under foot)
    const mid = ctx.createOscillator();
    const mg = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    mid.type = "triangle";
    mid.frequency.setValueAtTime(hard ? 220 : 160, now);
    mid.frequency.exponentialRampToValueAtTime(110, now + 0.05);
    lp.type = "lowpass";
    lp.frequency.value = hard ? 600 : 380;
    mg.gain.setValueAtTime(0, now);
    mg.gain.linearRampToValueAtTime(vol * (hard ? 0.18 : 0.1), now + 0.005);
    mg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    mid.connect(lp).connect(mg).connect(ctx.destination);
    mid.start(now);
    mid.stop(now + 0.08);
  };

  const synthCarHorn = (ctx: AudioContext, vol: number, distant: boolean) => {
    const now = ctx.currentTime;
    const dur = distant ? 0.55 : 0.4;
    [440, 392].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(distant ? f * 0.95 : f, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol * (i === 0 ? 1 : 0.6) * (distant ? 0.4 : 1), now + 0.02);
      g.gain.linearRampToValueAtTime(vol * (i === 0 ? 0.7 : 0.4) * (distant ? 0.35 : 1), now + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      if (distant) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        o.connect(lp).connect(g).connect(ctx.destination);
      } else {
        o.connect(g).connect(ctx.destination);
      }
      o.start(now);
      o.stop(now + dur + 0.05);
    });
  };

  const synthPaperRustle = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.sin((i / d.length) * Math.PI);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.value = vol * 0.5;
    noise.connect(hp).connect(g).connect(ctx.destination);
    noise.start(now);
  };

  const synthNotification = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    [{ f: 880, t: 0 }, { f: 1320, t: 0.12 }].forEach(({ f, t }) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f, now + t);
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(vol * 0.7, now + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + 0.28);
    });
  };

  const synthSuccessChime = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const t = i * 0.13;
      [1, 2].forEach((harmonic) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f * harmonic, now + t);
        g.gain.setValueAtTime(0, now + t);
        g.gain.linearRampToValueAtTime(vol * (harmonic === 1 ? 0.7 : 0.18), now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.7);
        o.connect(g).connect(ctx.destination);
        o.start(now + t);
        o.stop(now + t + 0.75);
      });
    });
  };

  const synthFailureBuzz = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol * 0.55, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 800;
    o.connect(lp).connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.65);
  };

  const synthKeyboardKey = (ctx: AudioContext, vol: number) => {
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800 + Math.random() * 1400;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.value = vol * 0.6;
    noise.connect(bp).connect(g).connect(ctx.destination);
    noise.start(now);
  };

  const playSound = useCallback((soundType: SoundType) => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    const config = soundConfigs[soundType];
    if (!config) return;
    const vol = config.volume * masterVolumeRef.current;

    if (CUSTOM_SYNTHS[soundType]) {
      switch (soundType) {
        case "phoneRingModern": return synthPhoneRing(ctx, vol);
        case "footstepHard": return synthFootstep(ctx, vol, true);
        case "footstepSoft": return synthFootstep(ctx, vol, false);
        case "carHorn": return synthCarHorn(ctx, vol, false);
        case "carHornDistant": return synthCarHorn(ctx, vol, true);
        case "paperRustle": return synthPaperRustle(ctx, vol);
        case "notification": return synthNotification(ctx, vol);
        case "successChime": return synthSuccessChime(ctx, vol);
        case "failureBuzz": return synthFailureBuzz(ctx, vol);
        case "keyboardKey": return synthKeyboardKey(ctx, vol);
      }
      return;
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);
    if (config.detune) oscillator.detune.setValueAtTime(config.detune, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + (config.attack || 0.005));
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration);

    if (config.secondaryFreq) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = config.type;
      osc2.frequency.setValueAtTime(config.secondaryFreq, now);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(vol * 0.65, now + (config.attack || 0.005) + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + config.duration + 0.08);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.03);
      osc2.stop(now + config.duration + 0.1);
    }
  }, []);

  const playDoorKnock = useCallback(() => {
    playSound("doorKnock");
    setTimeout(() => playSound("doorKnock"), 160);
    setTimeout(() => playSound("doorKnock"), 320);
  }, [playSound]);

  const playDialogueTyping = useCallback(() => {
    playSound("dialogue");
  }, [playSound]);

  /**
   * Play a sound repeatedly at intervalMs for durationMs total.
   * Returns a cancel function.
   */
  const playLoopingSound = useCallback(
    (soundType: SoundType, intervalMs: number, durationMs: number) => {
      if (!enabledRef.current) return () => {};
      let count = 0;
      const maxCount = Math.ceil(durationMs / intervalMs);
      playSound(soundType);
      count++;
      const id = window.setInterval(() => {
        if (count >= maxCount) {
          clearInterval(id);
          activeLoopsRef.current.delete(id);
          return;
        }
        playSound(soundType);
        count++;
      }, intervalMs);
      activeLoopsRef.current.add(id);
      return () => {
        clearInterval(id);
        activeLoopsRef.current.delete(id);
      };
    },
    [playSound]
  );

  const stopAllLoops = useCallback(() => {
    activeLoopsRef.current.forEach((id) => clearInterval(id));
    activeLoopsRef.current.clear();
  }, []);

  const toggleSound = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  const setMasterVolume = useCallback((v: number) => {
    masterVolumeRef.current = Math.max(0, Math.min(1, v));
  }, []);

  return {
    playSound,
    playDoorKnock,
    playDialogueTyping,
    playLoopingSound,
    stopAllLoops,
    toggleSound,
    setMasterVolume,
    isEnabled: () => enabledRef.current,
  };
};

interface SoundContextType {
  playSound: (type: SoundType) => void;
  playDoorKnock: () => void;
  playDialogueTyping: () => void;
  playLoopingSound: (type: SoundType, intervalMs: number, durationMs: number) => () => void;
  stopAllLoops: () => void;
  toggleSound: (enabled: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export const SoundProvider = ({ children }: { children: ReactNode }) => {
  const { playSound, playDoorKnock, playDialogueTyping, playLoopingSound, stopAllLoops, toggleSound, setMasterVolume } = useSoundEffects();
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [masterVolume, setMasterVolumeState] = useState(1);

  const handleToggle = (enabled: boolean) => {
    setIsSoundEnabled(enabled);
    toggleSound(enabled);
    if (!enabled) stopAllLoops();
  };

  const handleSetVolume = (v: number) => {
    setMasterVolumeState(v);
    setMasterVolume(v);
  };

  const contextPlaySound = useCallback((type: SoundType) => {
    if (isSoundEnabled) playSound(type);
  }, [isSoundEnabled, playSound]);

  const contextPlayDoorKnock = useCallback(() => {
    if (isSoundEnabled) playDoorKnock();
  }, [isSoundEnabled, playDoorKnock]);

  const contextPlayDialogueTyping = useCallback(() => {
    if (isSoundEnabled) playDialogueTyping();
  }, [isSoundEnabled, playDialogueTyping]);

  const contextPlayLooping = useCallback(
    (type: SoundType, intervalMs: number, durationMs: number) => {
      if (!isSoundEnabled) return () => {};
      return playLoopingSound(type, intervalMs, durationMs);
    },
    [isSoundEnabled, playLoopingSound]
  );

  return (
    <SoundContext.Provider
      value={{
        playSound: contextPlaySound,
        playDoorKnock: contextPlayDoorKnock,
        playDialogueTyping: contextPlayDialogueTyping,
        playLoopingSound: contextPlayLooping,
        stopAllLoops,
        toggleSound: handleToggle,
        isSoundEnabled,
        setIsSoundEnabled: handleToggle,
        masterVolume,
        setMasterVolume: handleSetVolume,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound must be used within SoundProvider");
  return context;
};

import { useEffect, useRef } from "react";
import { useSound } from "./useSoundEffects";
import { getPreloadedAudio, preloadAudio, warmAudioUnlock } from "@/lib/assetPreloader";

/**
 * File-based scene audio manager.
 *
 * Rules enforced globally:
 *  - Only ONE ambience can play at a time.
 *  - Switching scenes immediately stops the previous ambience and resets currentTime to 0.
 *  - Ambiences loop automatically. One-shots never loop and self-clean.
 *  - Respects the global sound toggle from useSound().
 *  - Safely handles autoplay rejection promises.
 */

export type SceneAudioKey =
  | "hallway_footsteps" // one-shot
  | "door_knock" // one-shot
  | "car_traffic" // loop
  | "storefront_street" // loop
  | "store_interior" // loop
  | "report_writing" // loop
  | "keyboard_typing" // loop
  | "phone_ringtone"; // loop

interface SceneSpec {
  src: string;
  loop: boolean;
  volume: number;
}

const SCENE_MAP: Record<SceneAudioKey, SceneSpec> = {
  hallway_footsteps: { src: "/sounds/ambience_office_hallway_footsteps.mp3", loop: false, volume: 0.9 },
  door_knock: { src: "/sounds/interaction_office_door_knock.mp3", loop: false, volume: 0.95 },
  car_traffic: { src: "/sounds/ambience_car_driving_traffic.mp3", loop: true, volume: 0.9 },
  storefront_street: { src: "/sounds/ambience_storefront_street.mp3", loop: true, volume: 0.99 },
  store_interior: { src: "/sounds/ambience_store_interior_light.mp3", loop: true, volume: 0.67 },
  report_writing: { src: "/sounds/interaction_report_writing_paper.mp3", loop: true, volume: 0.95 },
  keyboard_typing: { src: "/sounds/interaction_keyboard_typing.mp3", loop: true, volume: 0.9 },
  phone_ringtone: { src: "/sounds/interaction_phone_ringtone.mp3", loop: true, volume: 0.95 },
};

// ============================================================
// Singleton audio manager — survives across React renders.
// ============================================================
class AudioManager {
  private currentAmbience: { key: SceneAudioKey; el: HTMLAudioElement } | null = null;
  private oneShots: Map<SceneAudioKey, HTMLAudioElement> = new Map();
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAmbience();
      this.oneShots.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* noop */
        }
      });
      this.oneShots.clear();
    }
  }

  private make(key: SceneAudioKey): HTMLAudioElement {
    const spec = SCENE_MAP[key];
    const el = getPreloadedAudio(spec.src);
    el.loop = spec.loop;
    el.volume = spec.volume;
    el.preload = "auto";
    return el;
  }

  playAmbience(key: SceneAudioKey) {
    if (this.muted) return;
    // Already playing this exact ambience? Do nothing.
    if (this.currentAmbience && this.currentAmbience.key === key) return;
    // Stop previous
    this.stopAmbience();
    const el = this.make(key);
    preloadAudio(SCENE_MAP[key].src, 1800).catch(() => {});
    this.currentAmbience = { key, el };
    try {
      el.currentTime = 0;
    } catch {
      /* noop */
    }
    const p = el.play();
    if (p && typeof (p as Promise<void>).then === "function") {
      (p as Promise<void>).catch(() => {
        /* autoplay blocked — ignore */
      });
    }
  }

  stopAmbience() {
    if (!this.currentAmbience) return;
    const { el } = this.currentAmbience;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* noop */
    }
    this.currentAmbience = null;
  }

  /** Stop only if the currently-playing ambience matches key. */
  stopAmbienceIf(key: SceneAudioKey) {
    if (this.currentAmbience && this.currentAmbience.key === key) {
      this.stopAmbience();
    }
  }

  playOneShot(key: SceneAudioKey) {
    if (this.muted) return;
    // Replace any existing instance to enforce "no rapid double-trigger"
    const existing = this.oneShots.get(key);
    if (existing) {
      try {
        existing.pause();
        existing.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    const el = this.make(key);
    el.loop = false;
    preloadAudio(SCENE_MAP[key].src, 1800).catch(() => {});
    this.oneShots.set(key, el);
    el.addEventListener(
      "ended",
      () => {
        if (this.oneShots.get(key) === el) this.oneShots.delete(key);
      },
      { once: true },
    );
    const p = el.play();
    if (p && typeof (p as Promise<void>).then === "function") {
      (p as Promise<void>).catch(() => {
        /* autoplay blocked — ignore */
      });
    }
  }

  stopOneShot(key: SceneAudioKey) {
    const el = this.oneShots.get(key);
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* noop */
    }
    this.oneShots.delete(key);
  }
}

const audioManager = new AudioManager();

Object.values(SCENE_MAP).forEach((spec) => {
  preloadAudio(spec.src, 2200).catch(() => {});
});

// ============================================================
// React hooks
// ============================================================

/**
 * Plays the given ambience while mounted. Stops on unmount or scene change.
 * Pass `null` to play nothing.
 */
export const useSceneAmbience = (key: SceneAudioKey | null) => {
  const { isSoundEnabled } = useSound();

  useEffect(() => {
    const unlock = () => warmAudioUnlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Keep the manager mute state in sync with the global toggle.
  useEffect(() => {
    audioManager.setMuted(!isSoundEnabled);
  }, [isSoundEnabled]);

  useEffect(() => {
    if (!key) return;
    if (!isSoundEnabled) return;
    audioManager.playAmbience(key);
    return () => {
      audioManager.stopAmbienceIf(key);
    };
  }, [key, isSoundEnabled]);
};

/**
 * Plays a one-shot exactly once on mount (never loops, never repeats while mounted).
 * Stops the sound on unmount and resets currentTime to 0.
 */
export const useSceneOneShot = (key: SceneAudioKey | null, enabled: boolean = true) => {
  const { isSoundEnabled } = useSound();
  const playedRef = useRef(false);

  useEffect(() => {
    if (!key || !enabled || !isSoundEnabled) return;
    if (playedRef.current) return;
    playedRef.current = true;
    audioManager.playOneShot(key);
    return () => {
      audioManager.stopOneShot(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, isSoundEnabled]);
};

/** Imperative trigger for click handlers (e.g. door-knock button). */
export const playSceneOneShot = (key: SceneAudioKey) => {
  audioManager.playOneShot(key);
};

export const stopSceneAmbience = () => audioManager.stopAmbience();

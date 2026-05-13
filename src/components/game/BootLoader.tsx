import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { preloadAudio, preloadImage, runWithConcurrency, warmAudioUnlock } from "@/lib/assetPreloader";
import { SCREEN_ASSETS } from "@/lib/pf-case/asset-manifest";
import impLogo from "@/assets/brand/imp-logo.webp";

interface BootLoaderProps {
  children: React.ReactNode;
}

const CRITICAL_SCREENS = ["company-briefing", "travel", "velaro-street", "arrival"] as const;
const SECONDARY_SCREENS = [
  "incoming-call", "phone-call", "inquiry", "reflection",
  "framing", "email-send", "mansour-receives", "result",
] as const;

const collectAssets = (screens: readonly string[]) => {
  const images = new Set<string>();
  const audio = new Set<string>();
  screens.forEach((s) => {
    const group = SCREEN_ASSETS[s as keyof typeof SCREEN_ASSETS];
    if (!group) return;
    group.images.forEach((src) => images.add(src));
    group.audio.forEach((src) => audio.add(src));
  });
  return { images: [...images], audio: [...audio] };
};

const HARD_CAP_MS = 12000; // never block the player longer than this

export const BootLoader = ({ children }: BootLoaderProps) => {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const onUnlock = () => warmAudioUnlock();
    window.addEventListener("pointerdown", onUnlock, { once: true });
    window.addEventListener("keydown", onUnlock, { once: true });

    let cancelled = false;
    const hardCap = window.setTimeout(() => {
      if (!cancelled) {
        setProgress(1);
        setReady(true);
      }
    }, HARD_CAP_MS);

    const run = async () => {
      const critical = collectAssets(CRITICAL_SCREENS);
      const secondary = collectAssets(SECONDARY_SCREENS);

      const criticalTasks = [
        ...critical.images.map((src) => () => preloadImage(src, 4000)),
        ...critical.audio.map((src) => () => preloadAudio(src, 3500)),
      ];

      const total = criticalTasks.length;
      await runWithConcurrency(criticalTasks, 6, (done) => {
        if (cancelled) return;
        setProgress(total === 0 ? 1 : Math.min(0.95, done / total));
      });

      if (cancelled) return;
      setProgress(1);
      setReady(true);

      // Background prefetch for the rest. It smooths later scenes without blocking the opening.
      const tail = [
        ...secondary.images.map((src) => () => preloadImage(src, 6000)),
        ...secondary.audio.map((src) => () => preloadAudio(src, 6000)),
      ];
      runWithConcurrency(tail, 4);
    };

    run();

    return () => {
      cancelled = true;
      window.clearTimeout(hardCap);
      window.removeEventListener("pointerdown", onUnlock);
      window.removeEventListener("keydown", onUnlock);
    };
  }, []);

  if (ready) return <>{children}</>;

  const pct = Math.round(progress * 100);

  return (
    <div className="relative min-h-screen bg-[#f7f2e8] flex items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.18),transparent_42%)]" />
      <div className="imp-panel w-full max-w-sm overflow-hidden rounded-3xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="imp-panel-header px-6 py-5 text-center"
        >
          <img src={impLogo} alt="IMP" className="mx-auto mb-3 h-12 w-auto rounded-md bg-white px-2 py-1" />
          <p className="text-white/80 text-xs tracking-[0.35em] uppercase">Loading</p>
        </motion.div>

        <div className="m-6 h-2 overflow-hidden rounded-full border border-black/15 bg-black/10">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

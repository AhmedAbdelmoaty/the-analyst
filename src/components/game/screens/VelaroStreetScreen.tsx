import { useEffect } from "react";
import { motion } from "framer-motion";
import { useSceneAmbience } from "@/hooks/useSceneAudio";
import velaroStreetImg from "@/assets/scenes/velaro-street.webp";

interface VelaroStreetScreenProps {
  onComplete: () => void;
}

const TOTAL_DURATION = 4500;

export const VelaroStreetScreen = ({ onComplete }: VelaroStreetScreenProps) => {
  useSceneAmbience("storefront_street");
  useEffect(() => {
    const done = setTimeout(onComplete, TOTAL_DURATION);
    return () => clearTimeout(done);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Pure cinematic ken-burns — no text, no UI */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: 1.0, opacity: 1 }}
        transition={{ duration: TOTAL_DURATION / 1000, ease: "easeOut" }}
      >
        <img
          src={velaroStreetImg}
          alt="VELARO storefront from the street"
          className="w-full h-full object-cover"
        />
        {/* Light vignette only */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      </motion.div>
    </div>
  );
};

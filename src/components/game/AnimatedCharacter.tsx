import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import character images
import analystImg from "@/assets/characters/analyst.webp";
import ahmedImg from "@/assets/characters/mansour.webp";
import hishamImg from "@/assets/characters/hesham.webp";
import khaledImg from "@/assets/characters/karim.webp";
import nouraImg from "@/assets/characters/noura.webp";
import amiraImg from "@/assets/characters/sara.webp";
import karimImg from "@/assets/characters/karim.webp";
import detectiveImg from "@/assets/characters/detective.webp";

export type CharacterId = "ahmed" | "sara" | "karim" | "detective" | "hisham" | "khaled" | "noura" | "umFahd" | "mansour";

interface AnimatedCharacterProps {
  characterId: CharacterId;
  size?: "sm" | "md" | "lg" | "xl";
  isActive?: boolean;
  isSpeaking?: boolean;
  mood?: "neutral" | "happy" | "nervous" | "angry" | "suspicious";
  showName?: boolean;
  onClick?: () => void;
  entrance?: "slide-left" | "slide-right" | "fade" | "zoom" | "bounce";
  className?: string;
  imageOverride?: string;
  nameOverride?: string;
}

const characterData: Record<CharacterId, { name: string; nameEn: string; role: string; roleEn: string; image: string; color: string }> = {
  ahmed: { name: "أحمد", nameEn: "Ahmed", role: "المدير المالي", roleEn: "CFO", image: karimImg, color: "cyan" },
  sara: { name: "سارة", nameEn: "Sara", role: "محاسبة", roleEn: "Accountant", image: nouraImg, color: "purple" },
  karim: { name: "كريم", nameEn: "Karim", role: "مسؤول المشتريات", roleEn: "Procurement", image: khaledImg, color: "red" },
  detective: { name: "المحلل", nameEn: "Analyst", role: "أنت", roleEn: "You", image: analystImg, color: "gold" },
  hisham: { name: "أ. هشام", nameEn: "Hisham El Sherif", role: "مالك VELARO", roleEn: "VELARO Owner", image: hishamImg, color: "teal" },
  khaled: { name: "خالد", nameEn: "Khaled", role: "مدير الصالة", roleEn: "Floor Manager", image: khaledImg, color: "red" },
  noura: { name: "نورة", nameEn: "Noura", role: "الكاشير", roleEn: "Cashier", image: nouraImg, color: "purple" },
  umFahd: { name: "أميرة", nameEn: "Amira", role: "زبونة دائمة", roleEn: "Regular Customer", image: amiraImg, color: "cyan" },
  mansour: { name: "أ. منصور", nameEn: "A. Mansour", role: "مدير الاستشارات", roleEn: "Consulting Manager", image: ahmedImg, color: "gold" },
};

const sizeClasses = {
  sm: { container: "w-16 h-16", image: "w-14 h-14" },
  md: { container: "w-24 h-24", image: "w-22 h-22" },
  lg: { container: "w-32 h-32", image: "w-28 h-28" },
  xl: { container: "w-48 h-48", image: "w-44 h-44" },
};

const colorClasses = {
  cyan: { border: "border-cyan-500", glow: "shadow-[0_0_30px_rgba(34,211,238,0.5)]", bg: "bg-cyan-500/20", text: "text-cyan-400" },
  purple: { border: "border-purple-500", glow: "shadow-[0_0_30px_rgba(168,85,247,0.5)]", bg: "bg-purple-500/20", text: "text-purple-400" },
  red: { border: "border-red-500", glow: "shadow-[0_0_30px_rgba(239,68,68,0.5)]", bg: "bg-red-500/20", text: "text-red-400" },
  gold: { border: "border-amber-500", glow: "shadow-[0_0_30px_rgba(245,158,11,0.5)]", bg: "bg-amber-500/20", text: "text-amber-400" },
  teal: { border: "border-teal-500", glow: "shadow-[0_0_30px_rgba(20,184,166,0.5)]", bg: "bg-teal-500/20", text: "text-teal-400" },
};

const entranceVariants = {
  "slide-left": { initial: { x: -100, opacity: 0, scale: 0.8 }, animate: { x: 0, opacity: 1, scale: 1 }, exit: { x: -100, opacity: 0, scale: 0.8 } },
  "slide-right": { initial: { x: 100, opacity: 0, scale: 0.8 }, animate: { x: 0, opacity: 1, scale: 1 }, exit: { x: 100, opacity: 0, scale: 0.8 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  zoom: { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0, opacity: 0 } },
  bounce: { initial: { y: -50, opacity: 0, scale: 0.5 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: 50, opacity: 0, scale: 0.5 } },
};

const moodAnimations = {
  neutral: {},
  happy: { y: [0, -5, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 } },
  nervous: { x: [-2, 2, -2, 2, 0], transition: { duration: 0.3, repeat: Infinity, repeatDelay: 1 } },
  angry: { scale: [1, 1.05, 1], transition: { duration: 0.3, repeat: Infinity, repeatDelay: 0.5 } },
  suspicious: { rotate: [-2, 2, -2], transition: { duration: 2, repeat: Infinity } },
};

export const AnimatedCharacter = ({
  characterId,
  size = "md",
  isActive = false,
  isSpeaking = false,
  mood = "neutral",
  showName = true,
  onClick,
  entrance = "fade",
  className = "",
  imageOverride,
  nameOverride,
}: AnimatedCharacterProps) => {
  const character = characterData[characterId];
  const sizeClass = sizeClasses[size];
  const colors = colorClasses[character.color as keyof typeof colorClasses];
  const entranceAnim = entranceVariants[entrance];
  const displayImage = imageOverride || character.image;
  const displayName = nameOverride || character.name;

  return (
    <motion.div
      className={`flex flex-col items-center ${onClick ? "cursor-pointer" : ""} ${className}`}
      variants={entranceAnim}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5 }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <motion.div
        className={`relative rounded-full overflow-hidden border-4 ${colors.border} ${isActive ? colors.glow : ""} ${sizeClass.container} transition-all duration-300`}
        animate={moodAnimations[mood]}
      >
        {isActive && (
          <motion.div className={`absolute inset-0 ${colors.bg}`} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        )}
        <motion.img
          src={displayImage}
          alt={character.nameEn}
          className={`${sizeClass.image} object-cover rounded-full ${!isSpeaking ? "animate-idle-breath" : ""}`}
          animate={isSpeaking ? { scale: [1, 1.025, 1], transition: { duration: 0.28, repeat: Infinity } } : {}}
        />
        {/* Blink overlay — subtle dark bar across the eyes */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-[38%] h-[12%] bg-black/70 rounded-sm animate-blink"
        />
        <AnimatePresence>
          {isSpeaking && (
            <motion.div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border`} animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {isActive && (
          <motion.div className={`absolute inset-0 rounded-full border-2 ${colors.border}`} animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2, repeat: Infinity }} />
        )}
      </motion.div>
      {showName && (
        <motion.div className="mt-3 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className={`font-bold ${colors.text}`}>{displayName}</p>
          <p className="text-xs text-muted-foreground">{character.role}</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export { characterData };

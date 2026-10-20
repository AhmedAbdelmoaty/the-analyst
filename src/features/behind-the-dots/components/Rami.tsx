export type RamiMood = "greeting" | "pointing" | "thinking" | "celebration" | "oops";

/** Rami, drawn with adult proportions and a relaxed, friendly expression. */
export function Rami({ size = 56, mood = "greeting" }: { size?: number; mood?: RamiMood; hero?: boolean }) {
  const motion = mood === "celebration" ? "animate-rami-celebrate" : mood === "oops" ? "animate-rami-oops" : mood === "thinking" ? "animate-bob" : "animate-rami-wave";
  return (
    <div aria-hidden className={`shrink-0 ${motion}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 96" width="100%" height="100%">
        <ellipse cx="44" cy="92" rx="24" ry="3" fill="#263648" opacity=".12" />
        {/* jacket and shirt */}
        <path d="M18 86 Q19 57 31 51 L57 51 Q69 58 70 86Z" fill="#42b8ca" stroke="#25384d" strokeWidth="3" strokeLinejoin="round" />
        <path d="M36 52 L44 64 L52 52" fill="#fff8eb" />
        <path d="M24 67 L15 81 M64 67 L74 78" fill="none" stroke="#42b8ca" strokeWidth="7" strokeLinecap="round" />
        {mood === "celebration" && <path d="M20 67 L11 57 M67 66 L77 54" fill="none" stroke="#42b8ca" strokeWidth="7" strokeLinecap="round" />}
        {/* neck and head */}
        <path d="M38 46 L38 57 Q44 62 50 56 L50 46Z" fill="#e9b995" />
        <path d="M29 24 Q30 7 45 8 Q61 8 61 25 L58 43 Q53 51 44 51 Q34 49 30 41Z" fill="#f0c6a6" stroke="#25384d" strokeWidth="3" strokeLinejoin="round" />
        <path d="M27 29 Q22 12 37 6 Q53 0 63 14 L63 28 Q55 18 47 18 Q38 23 29 23Z" fill="#303749" stroke="#25384d" strokeWidth="3" strokeLinejoin="round" />
        <path d="M34 29 Q38 26 41 29 M49 29 Q53 26 56 29" fill="none" stroke="#303749" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="38" cy="34" r="2" fill="#25384d" /><circle cx="52" cy="34" r="2" fill="#25384d" />
        <path d="M41 42 Q46 46 52 41" fill="none" stroke="#984f57" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="31" cy="39" r="3" fill="#ec8a83" opacity=".48" /><circle cx="59" cy="39" r="3" fill="#ec8a83" opacity=".48" />
        {/* file badge */}
        <circle cx="57" cy="66" r="7" fill="#fff8eb" stroke="#25384d" strokeWidth="2" />
        <path d="M54 66 L57 69 L61 63" fill="none" stroke="#42b8ca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {mood === "celebration" && <g fill="#f6bf4c"><path d="M11 27 L14 33 L20 34 L15 38 L16 44 L11 41 L6 44 L7 38 L2 34 L8 33Z"/><path d="M73 18 L75 22 L80 23 L76 26 L77 31 L73 28 L69 31 L70 26 L66 23 L71 22Z"/></g>}
        {mood === "oops" && <path d="M65 8 Q75 12 70 21" fill="none" stroke="#63a8cf" strokeWidth="3" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

import { Dotty, Glitch } from "./Mascot";

export type StoryScene = "welcome" | "notebook" | "axes" | "point" | "patterns" | "chase";

const sceneNotes: Record<StoryScene, string> = {
  welcome: "ليلى عند عربية الآيس كريم",
  notebook: "في الدفتر: يوم الثلاثاء ٢٤ درجة و١٨ كوباية",
  axes: "الخط الأفقي للحرارة والخط الرأسي للكوبايات",
  point: "نقطة يوم الثلاثاء عند ٢٤ درجة و١٨ كوباية",
  patterns: "النقط ممكن تطلع أو تنزل أو تتبعثر",
  chase: "جليتش بيجري ورا دوتّي",
};

function IntroPlot({ showPoint }: { showPoint: boolean }) {
  return (
    <div className="guide-demo-plot" dir="rtl">
      <strong>{showPoint ? "يوم الثلاثاء" : "مخطط النقط"}</strong>
      <svg viewBox="0 0 170 128" role="presentation" aria-hidden="true">
        <path d="M25 12 V101 H158" className="guide-demo-axis" />
        <text x="92" y="120" textAnchor="middle">الحرارة →</text>
        <text x="8" y="56" transform="rotate(-90 8 56)" textAnchor="middle">الكوبايات →</text>
        <text x="101" y="114">٢٤</text>
        <text x="6" y="52">١٨</text>
        {showPoint && (
          <>
            <path d="M113 101 V44 H25" className="guide-demo-guides" />
            <circle cx="113" cy="44" r="8" className="guide-demo-dot" />
          </>
        )}
      </svg>
      <small>{showPoint ? "٢٤° + ١٨ كوباية = نقطة واحدة" : "كل يوم له مكان في الرسم"}</small>
    </div>
  );
}

/** Scene art for the introduction: one reusable guide with animated, scene-specific clues. */
export function GuideIllustration({ scene }: { scene: StoryScene }) {
  return (
    <div className={`guide-stage guide-stage-${scene}`} role="img" aria-label={sceneNotes[scene]}>
      <div className="guide-stage-glow" />
      <div className="guide-spark guide-spark-one">✦</div>
      <div className="guide-spark guide-spark-two">✦</div>
      <div className="guide-cart-awning" aria-hidden="true"><span>🍦</span></div>
      <img className="guide-painted-figure" src="/assets/behind-dots/guide.png" alt="" />
      {scene === "welcome" && <div className="guide-floating-note">يلا نفتح دفتر العربية <span>📒</span></div>}
      {scene === "notebook" && (
        <div className="guide-day-card" dir="rtl">
          <strong>يوم الثلاثاء</strong>
          <span>🌡️ ٢٤ درجة</span>
          <span>🍦 ١٨ كوباية</span>
        </div>
      )}
      {(scene === "axes" || scene === "point") && <IntroPlot showPoint={scene === "point"} />}
      {scene === "patterns" && (
        <div className="guide-pattern-cards" dir="rtl">
          <span>↗ طالعة</span><span>↘ نازلة</span><span>✦ متبعثرة</span>
        </div>
      )}
      {scene === "chase" && (
        <div className="guide-chase-friends" dir="ltr">
          <div className="guide-dotty-arrive"><Dotty size={62} mood="scared" /></div>
          <div className="guide-glitch-arrive"><Glitch size={72} /></div>
        </div>
      )}
      <div className="guide-stage-caption">{sceneNotes[scene]}</div>
    </div>
  );
}

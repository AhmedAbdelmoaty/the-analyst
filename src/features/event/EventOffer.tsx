import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GameOptions, SettingsButton } from "../training-evaluation/GameOptions";
import { clearRun } from "../training-evaluation/persistence";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import impLogo from "@/assets/offer/imp-logo.png.asset.json";
import analystLogo from "@/assets/offer/the-analyst-logo.png.asset.json";
import excel from "@/assets/offer/excel.jpg.asset.json";
import powerbi from "@/assets/offer/powerbi.jpg.asset.json";
import sql from "@/assets/offer/sql.jpg.asset.json";
import automate from "@/assets/offer/power-automate.jpg.asset.json";
import { Arrow, Brain, Gamepad, PadOutline, Person, Team } from "./OfferArt";
import "./offer.css";

/** Lead interest stored on the player's profile; read by the admin Excel export. */
export type LeadInterest = "individual" | "organization";

const Logos = () => <div className="o-logos"><img src={impLogo.url} alt="IMP — Institute of Management Professionals" /><i /><img className="ta" src={analystLogo.url} alt="The Analyst" /></div>;
const rise = (d: number) => ({ initial: { y: 18, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: d, duration: .45 } });

export default function EventOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const choose = async (kind: LeadInterest) => {
    if (!user) return navigate("/login");
    setBusy(true); setErr("");
    const { error } = await supabase.from("profiles").update({ lead_status: kind, lead_at: new Date().toISOString() }).eq("user_id", user.id);
    setBusy(false);
    if (error) setErr("حصلت مشكلة، جرّب تاني."); else setDone(true);
  };
  return <main className="offer" dir="ltr">
    <SettingsButton className="te-offer-settings" onClick={() => setOptionsOpen(true)} />
    <GameOptions open={optionsOpen} onResume={() => navigate("/games/training-evaluation")} onHome={() => navigate("/app")} onRestart={() => { if (user) clearRun(user.id); navigate("/games/training-evaluation"); }} />
    <AnimatePresence mode="wait">
      {done ? <motion.section key="done" className="offer-sheet o-done" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
        <Logos />
        <motion.div className="big" initial={{ scale: .6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 12 }}><Gamepad check /></motion.div>
        <motion.h1 {...rise(.2)}>We received <b>your request</b></motion.h1>
        <motion.div className="soon" {...rise(.35)}>&amp; we will contact you soon</motion.div>
        <Link to="/app" className="o-back">Back to games</Link>
        <svg className="o-swoosh" viewBox="0 0 300 12" aria-hidden><path d="M5 10Q150-4 295 10" fill="none" stroke="#A61E25" strokeWidth="4" strokeLinecap="round" /></svg>
      </motion.section>
      : <motion.section key="offer" className="offer-sheet" exit={{ opacity: 0, y: -20 }}>
        <Logos />
        <motion.div className="o-badge" {...rise(.05)}><Gamepad className="o-pad" /><div className="pill"><span>You’ve Played<br />the Game.</span></div></motion.div>
        <motion.h2 className="o-h1" {...rise(.12)}>Now Discover the Power of <b>Data Analysis.</b></motion.h2>
        <motion.div className="o-culture" {...rise(.2)}>Build a Culture of Analysis Across Your Organization.</motion.div>
        <p className="o-with">With IMP’s <b>Data Analysis &amp; Business Intelligence Diploma,</b><br />which combines:</p>
        <motion.div className="o-card" {...rise(.28)}>
          <div className="o-tools"><img src={excel.url} alt="Excel" /><img src={powerbi.url} alt="Power BI" /><img src={sql.url} alt="SQL" /><img src={automate.url} alt="Power Automate" /></div>
          <span className="o-sep" /><div><div className="o-ct">Data Analysis Tools</div><div className="o-cs">Excel • Power BI • SQL • Power Automate</div></div>
        </motion.div>
        <div className="o-plus"><hr /><span>+</span><hr /></div>
        <motion.div className="o-card" {...rise(.36)}>
          <Brain className="h-12 w-12 shrink-0 text-[#A61E25]" /><span className="o-sep" style={{ alignSelf: "center", height: 36 }} /><PadOutline className="h-11 w-14 shrink-0 text-[#A61E25]" />
          <span className="o-sep" /><div className="o-ct">Analytical Thinking &amp; Game-Based Learning</div>
        </motion.div>
        <div className="o-line"><hr />Ready to Take the Next Step?<hr /></div>
        <motion.div className="o-choice" {...rise(.44)}>
          <Person /><span className="o-sep" /><div className="t"><h3>For Yourself</h3><p>Invest in Your Analytical Skills.</p></div>
          <button className="o-btn solid" disabled={busy} onClick={() => choose("individual")}>Apply for<br />the Diploma<Arrow /></button>
        </motion.div>
        <motion.div className="o-choice" {...rise(.52)}>
          <Team /><span className="o-sep" /><div className="t"><h3>For Your Organization</h3><p>Build Analytical Skills Across Your Teams.</p></div>
          <button className="o-btn ghost" disabled={busy} onClick={() => choose("organization")}>Book a<br />Demo Meeting<Arrow /></button>
        </motion.div>
        {err && <p className="o-err" dir="rtl">{err}</p>}
        <div className="o-disc"><hr /><span>Get The Exclusive Event Discount</span><hr /></div>
      </motion.section>}
    </AnimatePresence>
  </main>;
}

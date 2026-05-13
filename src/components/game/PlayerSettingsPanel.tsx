import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, User, RotateCcw, Building2, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/hooks/useSoundEffects";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";

interface PlayerSettingsPanelProps {
  onReplayBriefing: () => void;
  onResetProgress: () => void;
}

export const PlayerSettingsPanel = ({ onReplayBriefing, onResetProgress }: PlayerSettingsPanelProps) => {
  const { profile, updateProfile } = useAuth();
  const { isSoundEnabled, setIsSoundEnabled, playSound } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState(profile?.first_name || "");
  const [editLastName, setEditLastName] = useState(profile?.last_name || "");
  const [editGender, setEditGender] = useState<"male" | "female">(profile?.gender as any || "male");
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSoundToggle = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    if (newState) setTimeout(() => playSound("click"), 100);
  };

  const handleSaveProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) return;
    setSaving(true);
    await updateProfile({
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      gender: editGender,
      avatar_choice: editGender === "male" ? "analyst" : "sara",
    });
    setSaving(false);
    setIsEditingProfile(false);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onResetProgress();
    setConfirmReset(false);
    setIsOpen(false);
  };

  const avatarImg = profile?.gender === "female" ? saraImg : analystImg;

  return (
    <>
      {/* Settings button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-xl border border-black/15 bg-white p-2.5 text-[#171717] shadow-lg shadow-black/15 backdrop-blur-md transition-all hover:border-primary hover:text-primary"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        title="الإعدادات"
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      {/* Panel overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsOpen(false); setIsEditingProfile(false); setConfirmReset(false); }}
            />
            <motion.div
              className="imp-panel fixed left-0 top-0 bottom-0 z-[61] w-80 max-w-[85vw] overflow-y-auto rounded-none border-y-0 border-l-4 border-r-0 border-primary"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className="imp-panel-header flex items-center justify-between p-4">
                <h2 className="text-white font-bold text-lg">⚙️ الإعدادات</h2>
                <button
                  onClick={() => { setIsOpen(false); setIsEditingProfile(false); setConfirmReset(false); }}
                  className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white hover:text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Player profile section */}
              <div className="p-4 border-b border-black/10 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                    <img src={avatarImg} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[#171717] font-bold">{profile?.display_name}</p>
                    <p className="text-[#666] text-xs">
                      {profile?.gender === "female" ? "محللة بيانات" : "محلل بيانات"}
                    </p>
                  </div>
                </div>

                {isEditingProfile ? (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="الاسم الأول"
                      dir="auto"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-black/15 text-[#171717] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="الاسم الأخير"
                      dir="auto"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-black/15 text-[#171717] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      {[
                        { id: "male" as const, label: "محلل", img: analystImg },
                        { id: "female" as const, label: "محللة", img: saraImg },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setEditGender(opt.id)}
                          className={`flex-1 flex items-center gap-2 p-2 rounded-lg border transition-all ${
                            editGender === opt.id
                              ? "border-primary bg-[#fff4f4]"
                              : "border-black/15 bg-white hover:border-primary"
                          }`}
                        >
                          <img src={opt.img} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className={`text-xs font-bold ${editGender === opt.id ? "text-primary" : "text-[#666]"}`}>
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving || !editFirstName.trim() || !editLastName.trim()}
                        className="imp-action flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      >
                        {saving ? "جاري الحفظ..." : "حفظ"}
                      </button>
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="imp-outline px-3 py-2 rounded-lg text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => {
                      setEditFirstName(profile?.first_name || "");
                      setEditLastName(profile?.last_name || "");
                      setEditGender(profile?.gender as any || "male");
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-2 text-primary text-sm hover:underline"
                  >
                    <User className="w-4 h-4" />
                    تعديل البروفايل
                  </button>
                )}
              </div>

              {/* Audio controls */}
              <div className="p-4 border-b border-black/10 bg-[#f7f2e8] space-y-4">
                <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  الصوت
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#555] flex items-center gap-2">
                    {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    المؤثرات الصوتية
                  </span>
                  <motion.button
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${isSoundEnabled ? "bg-primary" : "bg-black/20"}`}
                    onClick={handleSoundToggle}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div className="w-4 h-4 rounded-full bg-white shadow"
                      animate={{ x: isSoundEnabled ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2 bg-white">
                {/* Replay briefing */}
                <button
                  onClick={() => {
                    onReplayBriefing();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-black/10 bg-white hover:border-primary hover:bg-[#fff7f7] text-[#171717] transition-colors text-right"
                >
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold">مكتب الشركة</p>
                    <p className="text-xs text-[#666]">إعادة مشاهدة اجتماع Prism Consulting</p>
                  </div>
                </button>

                {/* Reset progress */}
                <button
                  onClick={handleReset}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right ${
                    confirmReset
                      ? "bg-destructive/15 hover:bg-destructive/25 text-destructive"
                      : "border border-black/10 bg-white hover:border-primary hover:bg-[#fff7f7] text-[#171717]"
                  }`}
                >
                  <RotateCcw className={`w-5 h-5 ${confirmReset ? "text-destructive" : "text-primary"}`} />
                  <div>
                    <p className="text-sm font-bold">
                      {confirmReset ? "اضغط مرة تانية للتأكيد" : "إعادة اللعبة من البداية"}
                    </p>
                    <p className="text-xs text-[#666]">
                      {confirmReset ? "هتفقد كل تقدمك الحالي" : "ابدأ القضية من أول وجديد"}
                    </p>
                  </div>
                </button>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

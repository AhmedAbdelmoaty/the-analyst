import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";

const Setup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateProfile, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isProfileComplete) {
      navigate("/", { replace: true });
    }
  }, [isProfileComplete, navigate]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !gender) return;
    setLoading(true);
    await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender,
      avatar_choice: gender === "male" ? "analyst" : "sara",
    });
    navigate("/");
    setLoading(false);
  };

  const characters = [
    { id: "male" as const, label: "محلل", image: analystImg },
    { id: "female" as const, label: "محللة", image: saraImg },
  ];

  if (isProfileComplete) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-sm space-y-5"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">عرّفنا بنفسك</h1>
          <p className="text-muted-foreground text-sm">قبل ما نبدأ المهمة</p>
        </div>

        <div>
          <label className="text-foreground text-sm font-bold mb-2 block">الاسم الأول</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder=""
            dir="auto"
            className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-foreground text-sm font-bold mb-2 block">الاسم الأخير</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder=""
            dir="auto"
            className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-foreground text-sm font-bold mb-3 block">اختر شخصيتك</label>
          <div className="flex gap-4 justify-center">
            {characters.map((char) => (
              <motion.button
                key={char.id}
                onClick={() => setGender(char.id)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                  gender === char.id
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-24 h-24 rounded-full overflow-hidden border-3 mb-2 ${
                  gender === char.id ? "border-primary" : "border-border"
                }`}>
                  <img src={char.image} alt={char.label} className="w-full h-full object-cover" />
                </div>
                <span className={`font-bold text-sm ${
                  gender === char.id ? "text-primary" : "text-muted-foreground"
                }`}>
                  {char.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={!firstName.trim() || !lastName.trim() || !gender || loading}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            "يلا نبدأ 🚀"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Setup;

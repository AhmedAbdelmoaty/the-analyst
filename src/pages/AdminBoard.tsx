import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, LogOut, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface CompletedPlayer {
  id: string;
  first_name: string;
  last_name: string;
  completed_at: string;
  qualified: boolean;
}

const completedAtTime = (player: CompletedPlayer) => {
  const time = new Date(player.completed_at).getTime();
  return Number.isFinite(time) ? time : Infinity;
};

const sortByCompletedAt = (a: CompletedPlayer, b: CompletedPlayer) => {
  const delta = completedAtTime(a) - completedAtTime(b);
  return Number.isFinite(delta) && delta !== 0 ? delta : a.id.localeCompare(b.id);
};

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];
const SUCCESS_ICONS = ["🎯", "🎆", "🎮", "🏅", "🚀", "🌟"];

const getSuccessEmoji = (player: CompletedPlayer, rank: number) => {
  if (rank === 0) return "🏆";

  const seed = Array.from(player.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return SUCCESS_ICONS[seed % SUCCESS_ICONS.length];
};

const AdminBoard = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<CompletedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session || !isAdmin) navigate("/admin/login", { replace: true });
  }, [session, isAdmin, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("completed_players")
      .select("id, first_name, last_name, completed_at, qualified")
      .eq("qualified", true)
      .order("completed_at", { ascending: true })
      .limit(100);
    if (!error && data) setPlayers(data as CompletedPlayer[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!session || !isAdmin) return;
    load();

    const channel = supabase
      .channel("leaderboard-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "completed_players" },
        (payload) => {
          const row = payload.new as CompletedPlayer;
          if (!row.qualified) return;
          setPlayers((prev) => {
            if (prev.find((p) => p.id === row.id)) return prev;
            const next = [...prev, row].sort(sortByCompletedAt);
            return next.slice(0, 100);
          });
          setNewId(row.id);
          setTimeout(() => setNewId((cur) => (cur === row.id ? null : cur)), 4000);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "completed_players" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isAdmin]);

  const handleReset = async () => {
    setShowResetConfirm(false);
    const { error } = await supabase.from("completed_players").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn("Reset failed:", error.message);
    setPlayers([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (authLoading || !session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_hsl(220_50%_15%),_hsl(220_60%_5%))] text-foreground">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-amber-500/10 blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-15%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-fuchsia-500/10 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[30%] right-[20%] w-[28rem] h-[28rem] rounded-full bg-cyan-500/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 lg:py-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >
              <Trophy className="w-8 h-8 lg:w-11 lg:h-11 text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.6)]" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight">
                Champions Board
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all font-bold text-sm"
              title="إعادة تعيين"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">RESET</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
              title="خروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : players.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="text-6xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              🏆
            </motion.div>
          </motion.div>
        ) : (
          <ol className="mx-auto space-y-2.5 lg:max-w-[38rem] xl:max-w-[40rem]" dir="ltr">
            <AnimatePresence initial={false}>
              {players.map((p, i) => (
                <PlayerRow key={p.id} player={p} rank={i} isNew={newId === p.id} />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      {/* Reset confirm */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              className="bg-card border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="text-xl font-bold mb-2">إعادة تعيين القائمة؟</h3>
              <p className="text-sm text-muted-foreground mb-5">
                هتمسح كل اللاعبين من اللوحة. ده الإجراء ده مش بيرجع.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm"
                >
                  مسح الكل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============== Row ==============
const PlayerRow = ({
  player,
  rank,
  isNew,
}: {
  player: CompletedPlayer;
  rank: number;
  isNew: boolean;
}) => {
  const isFirst = rank === 0;
  const isPodium = rank < 3;
  const fullName = `${player.first_name} ${player.last_name}`;
  const successEmoji = getSuccessEmoji(player, rank);

  // Style per rank
  let cardClass = "bg-white/5 border-white/10";
  let nameClass = "text-foreground";
  let glow = "";
  if (isFirst) {
    cardClass =
      "bg-gradient-to-r from-amber-500/30 via-yellow-400/25 to-amber-500/30 border-amber-300/60";
    nameClass = "text-amber-50";
    glow = "shadow-[0_0_40px_-10px_rgba(251,191,36,0.7)]";
  } else if (rank === 1) {
    cardClass =
      "bg-gradient-to-r from-slate-300/20 via-slate-200/15 to-slate-300/20 border-slate-200/40";
    nameClass = "text-slate-50";
    glow = "shadow-[0_0_25px_-12px_rgba(226,232,240,0.5)]";
  } else if (rank === 2) {
    cardClass =
      "bg-gradient-to-r from-orange-700/25 via-amber-700/20 to-orange-700/25 border-orange-400/40";
    nameClass = "text-orange-50";
    glow = "shadow-[0_0_25px_-12px_rgba(251,146,60,0.5)]";
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
        boxShadow: isNew
          ? [
              "0 0 0px rgba(255,255,255,0)",
              "0 0 60px rgba(251,191,36,0.7)",
              "0 0 0px rgba(255,255,255,0)",
            ]
          : undefined,
      }}
      exit={{ opacity: 0, x: -40, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={`relative min-h-[4.5rem] rounded-xl border p-3.5 backdrop-blur-sm overflow-hidden ${cardClass} ${glow}`}
      dir="ltr"
    >
      {/* Confetti-ish sparkles for #1 */}
      {isFirst && (
        <>
          <motion.div
            className="absolute top-2 right-4 text-amber-300"
            animate={{ y: [0, -6, 0], rotate: [0, 15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          <motion.div
            className="absolute bottom-2 left-8 text-yellow-200"
            animate={{ y: [0, -8, 0], rotate: [0, -20, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </motion.div>
        </>
      )}

      <div className="flex min-h-11 items-center gap-2.5 lg:gap-3">
        {/* Rank number */}
        <motion.div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold tabular-nums text-foreground/90 shadow-inner shadow-white/5"
          animate={isFirst ? { scale: [1, 1.05, 1] } : undefined}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {rank + 1}
        </motion.div>

        {/* Podium medal slot keeps names aligned */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-2xl lg:text-3xl">
          {isPodium && <span className="drop-shadow-lg">{PODIUM_MEDALS[rank]}</span>}
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1 text-left" dir="auto">
          <p
            className={`truncate text-left text-base font-extrabold lg:text-lg ${nameClass}`}
          >
            {fullName}
          </p>
        </div>

        {/* Success mark */}
        <motion.div
          className="flex h-11 w-14 flex-shrink-0 items-center justify-center text-4xl leading-none drop-shadow-[0_0_16px_rgba(255,214,102,0.38)] lg:text-5xl"
          animate={
            isFirst
              ? { y: [0, -4, 0], scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }
              : { y: [0, -3, 0], scale: [1, 1.1, 1] }
          }
          transition={{
            duration: isFirst ? 1.7 : 2.4,
            repeat: Infinity,
            delay: isFirst ? 0 : rank * 0.08,
            ease: "easeInOut",
          }}
        >
          {successEmoji}
        </motion.div>
      </div>
    </motion.li>
  );
};

export default AdminBoard;

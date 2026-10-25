import { useNavigate } from "react-router-dom";
import { decideAccess, gameTier } from "./access";
import { useGameAccess } from "./useGameAccess";

/**
 * Future paid-game gate. While the server enforcement flag is OFF (the default and
 * current state), it renders children unchanged for every authenticated user.
 * When the flag is ON in an isolated environment: free games stay open, annual games
 * require a server-verified active entitlement, and a verification failure shows a
 * retry state instead of falsely claiming the user is unpaid.
 */
export default function GameGate({ game, children }: { game: string; children: React.ReactNode }) {
  const { snapshot, loading, refresh } = useGameAccess();
  const navigate = useNavigate();
  const tier = gameTier(game);

  if (!snapshot) {
    if (!loading || tier === "free") return <>{children}</>;
    return <div className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">جاري التحميل...</div>;
  }

  const decision = decideAccess(snapshot.enforcement, tier, snapshot.entitled);
  if (decision === "allow") return <>{children}</>;

  return (
    <main className="game-surface flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-game-paper px-6 text-center text-game-ink" dir="rtl">
      {decision === "verify" ? (
        <>
          <h1 className="text-2xl font-bold">تعذّر التحقق من اشتراكك الآن</h1>
          <p className="max-w-md text-game-muted">مشكلة مؤقتة في الاتصال. لم يتغيّر وضع حسابك — جرّب مرة أخرى.</p>
          <div className="flex gap-3">
            <button onClick={() => void refresh()} className="min-h-11 rounded-md bg-primary px-5 font-bold text-primary-foreground">إعادة المحاولة</button>
            <button onClick={() => navigate("/app")} className="min-h-11 rounded-md border border-game-line px-5 font-bold text-game-muted">العودة إلى الألعاب</button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">هذه اللعبة ضمن الاشتراك السنوي</h1>
          <p className="max-w-md text-game-muted">الخطة المجانية تشمل «اسأل صح». فعّل الاشتراك السنوي للوصول إلى بقية التجارب.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/plans")} className="min-h-11 rounded-md bg-primary px-5 font-bold text-primary-foreground">استعرض الخطط</button>
            <button onClick={() => navigate("/app")} className="min-h-11 rounded-md border border-game-line px-5 font-bold text-game-muted">العودة إلى الألعاب</button>
          </div>
        </>
      )}
    </main>
  );
}

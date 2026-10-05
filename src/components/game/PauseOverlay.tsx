interface PauseOverlayProps {
  onContinue: () => void;
  updatePending?: boolean;
  onUpdate?: () => void;
}

/** Light veil over the frozen scene with a single resume action (no sound, no motion). */
export const PauseOverlay = ({ onContinue, updatePending, onUpdate }: PauseOverlayProps) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-game-charcoal/35 px-6 backdrop-blur-[2px]" dir="rtl">
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        autoFocus
        onClick={onContinue}
        className="rounded-md bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-black/25 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        متابعة اللعب
      </button>
      {updatePending && onUpdate && (
        <button
          type="button"
          onClick={onUpdate}
          className="rounded-md border border-game-line bg-game-paper px-4 py-2 text-xs font-bold text-game-ink shadow-sm transition-colors hover:border-primary hover:text-primary"
        >
          تحديث الآن
        </button>
      )}
    </div>
  </div>
);

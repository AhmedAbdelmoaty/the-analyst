import { motion, AnimatePresence } from "framer-motion";

interface ScreenTransitionProps {
  isActive: boolean;
  type?: "fade" | "iris";
  duration?: number;
  onComplete?: () => void;
}

export const ScreenTransition = ({
  isActive,
  type = "fade",
  duration = 0.4,
  onComplete,
}: ScreenTransitionProps) => {
  if (type === "iris") {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={onComplete}
          >
            <motion.div
              className="absolute inset-0 bg-black"
              style={{ clipPath: "circle(0% at 50% 50%)" }}
              animate={{ clipPath: "circle(150% at 50% 50%)" }}
              transition={{ duration: duration * 2, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          onAnimationComplete={onComplete}
        />
      )}
    </AnimatePresence>
  );
};

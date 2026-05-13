import { motion, AnimatePresence } from "framer-motion";

interface StampEffectProps {
  isVisible: boolean;
  text?: string;
}

export const StampEffect = ({ isVisible, text = "تم التأكيد" }: StampEffectProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 3, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: "spring", damping: 8, stiffness: 200 }}
          >
            <div className="border-4 border-primary rounded-lg px-8 py-4 bg-primary/10 backdrop-blur-sm">
              <p className="text-primary text-3xl font-bold tracking-wider" dir="rtl">
                {text}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

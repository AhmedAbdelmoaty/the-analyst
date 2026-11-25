import { useEffect, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyStatus } from "./eventApi";
import { VoucherModal } from "./VoucherCard";

/** Persistent gold notice for players who won a voucher; pops the card automatically the first time it appears. */
export default function VoucherBadge() {
  const { user } = useAuth();
  const inGame = useLocation().pathname === "/games/training-evaluation";
  const status = useMyStatus(!!user);
  const voucher = status?.voucher;
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const shown = useRef(false);
  useEffect(() => {
    if (inGame || !voucher || !user || shown.current) return;
    shown.current = true;
    const key = `imp-voucher-seen-${user.id}`;
    if (!localStorage.getItem(key)) { localStorage.setItem(key, "1"); setCelebrate(true); setOpen(true); }
  }, [voucher, user, inGame]);
  if (!voucher || inGame) return null;
  return <>
    <button onClick={() => { setCelebrate(false); setOpen(true); }} dir="rtl" className="fixed left-1/2 top-2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#d9b25f] bg-[#2a0b0d]/95 px-4 py-2 text-sm font-bold text-[#f3dc9b] shadow-lg"><Ticket className="h-4 w-4" /> لديك قسيمة معتمدة من IMP</button>
    {open && <VoucherModal voucher={voucher} celebrate={celebrate} onClose={() => setOpen(false)} />}
  </>;
}

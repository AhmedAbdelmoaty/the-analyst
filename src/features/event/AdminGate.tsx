import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "./useIsAdmin";
import "./event.css";

export default function AdminGate({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (isAdmin === null) return <main className="imp-light grid place-items-center" dir="rtl"><p className="text-lg font-bold">جاري التحميل...</p></main>;
  if (!isAdmin) return <main className="imp-light grid place-items-center p-6" dir="rtl"><div className="lb-card max-w-sm p-8 text-center"><p className="mb-4 text-xl font-black lb-red">الصفحة دي للأدمن بس</p><Link to="/admin/login" className="lb-btn lb-primary">دخول الأدمن</Link></div></main>;
  return <>{children}</>;
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Game from "@/features/training-evaluation/Game";
import type { State } from "@/features/training-evaluation/engine";
import { eventJoin, eventSubmit, useMyStatus, placeName } from "./eventApi";
import { VoucherCard, VoucherModal } from "./VoucherCard";
import { Button } from "@/components/ui/button";

export default function TrainingEvaluationRoute() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<State | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const status = useMyStatus(true);
  useEffect(() => { void eventJoin(); }, []);
  const onSubmit = useCallback((s: State) => {
    setResult(s); setSaving(true); setError("");
    void eventSubmit(s.claim, s.evidence).then(({ data, error: failure }) => {
      if (failure || data !== true) { setError(failure ? "حفظ النتيجة ما تمش، جرّب تاني." : "التحدي لسه ما بدأش؛ استنى البداية وجرّب تاني."); return; }
      setSaved(true);
      window.dispatchEvent(new Event("event-result-saved"));
    }).catch(() => setError("حفظ النتيجة ما تمش، جرّب تاني.")).finally(() => setSaving(false));
  }, []);
  const voucher = saved ? status?.voucher : undefined;
  const endActions = <div className="event-end-actions">
    <p className="mb-3 font-extrabold leading-7">{saving ? "جاري حفظ توصيتك..." : saved ? "تم توثيق توصيتك بنجاح! الترتيب بيظهر مباشرة على شاشة التحدي." : error}</p>
    {voucher && <div className="imp-event flex flex-col items-center gap-3 pb-4">
      <p className="imp-gold-text font-bold">مبروك! {placeName(voucher.rank)}</p>
      <VoucherCard voucher={voucher} />
      <Button className="imp-btn-gold" onClick={() => setDownloadOpen(true)}>عرض وتحميل القسيمة</Button>
    </div>}
    {downloadOpen && voucher && <VoucherModal voucher={voucher} onClose={() => setDownloadOpen(false)} />}
    {error && result && <Button disabled={saving} onClick={() => onSubmit(result)}>إعادة حفظ النتيجة</Button>}
    <Button className="g-btn primary big" disabled={!saved || saving} onClick={() => navigate("/event/offer", { replace: true })}>متابعة</Button>
  </div>;
  return <Game onSubmit={onSubmit} endActions={endActions} />;
}

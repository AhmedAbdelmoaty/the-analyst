import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthShell, ErrorBox, LinkButton, PrimaryButton } from "@/components/auth/AuthUI";
import WorkProfileFields from "@/features/profile/WorkProfileFields";
import { isWorkProfileSchemaUnavailable, validateWorkProfile, type WorkProfile } from "@/features/profile/workProfile";
import { useAuth } from "@/contexts/AuthContext";

const EMPTY: WorkProfile = { department: null, department_other: null, industry: null, industry_other: null };
export default function WorkDetails() {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<WorkProfile>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof WorkProfile, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (profile) setValue({ department: profile.department ?? null, department_other: profile.department_other ?? null, industry: profile.industry ?? null, industry_other: profile.industry_other ?? null }); }, [profile]);
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;
  const save = async () => {
    const checked = validateWorkProfile(value); setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setSaving(true); setError(null);
    const result = await updateProfile(checked.value);
    setSaving(false);
    if (result.error) setError(isWorkProfileSchemaUnavailable(result.error)
      ? "حفظ بيانات القسم والقطاع غير مفعّل على الخادم بعد. ارجع للألعاب، ويلزم تحديث قاعدة البيانات لتفعيل الحفظ."
      : "ماقدرناش نحفظ البيانات. جرّب تاني."); else navigate("/app", { replace: true });
  };
  return <AuthShell title="بيانات العمل" subtitle="حدّث القسم والقطاع المرتبطين بملفك">
    <div className="space-y-5"><WorkProfileFields value={value} onChange={setValue} errors={errors}/>{error && <ErrorBox>{error}</ErrorBox>}
      <PrimaryButton type="button" loading={saving} onClick={save}>حفظ البيانات</PrimaryButton>
      <LinkButton className="w-full text-muted-foreground" onClick={() => navigate("/app")}>رجوع للألعاب</LinkButton>
    </div>
  </AuthShell>;
}

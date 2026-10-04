import { supabase } from "@/lib/supabase";

export interface Country { code: string; dial: string; name: string; flag: string; }

export const COUNTRIES: Country[] = [
  { code: "EG", dial: "20", name: "مصر", flag: "🇪🇬" },
  { code: "SA", dial: "966", name: "السعودية", flag: "🇸🇦" },
  { code: "AE", dial: "971", name: "الإمارات", flag: "🇦🇪" },
  { code: "KW", dial: "965", name: "الكويت", flag: "🇰🇼" },
  { code: "QA", dial: "974", name: "قطر", flag: "🇶🇦" },
  { code: "BH", dial: "973", name: "البحرين", flag: "🇧🇭" },
  { code: "OM", dial: "968", name: "عُمان", flag: "🇴🇲" },
  { code: "JO", dial: "962", name: "الأردن", flag: "🇯🇴" },
  { code: "LB", dial: "961", name: "لبنان", flag: "🇱🇧" },
  { code: "IQ", dial: "964", name: "العراق", flag: "🇮🇶" },
  { code: "LY", dial: "218", name: "ليبيا", flag: "🇱🇾" },
  { code: "SD", dial: "249", name: "السودان", flag: "🇸🇩" },
  { code: "MA", dial: "212", name: "المغرب", flag: "🇲🇦" },
  { code: "TN", dial: "216", name: "تونس", flag: "🇹🇳" },
  { code: "DZ", dial: "213", name: "الجزائر", flag: "🇩🇿" },
  { code: "GB", dial: "44", name: "بريطانيا", flag: "🇬🇧" },
  { code: "US", dial: "1", name: "أمريكا / كندا", flag: "🇺🇸" },
];

/** Builds an E.164 number from a dial code and a locally typed number. Returns null if invalid. */
export function toE164(dial: string, local: string): string | null {
  let digits = local.replace(/[^\d]/g, "");
  // Accept numbers typed with the country code or 00 prefix
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(dial) && digits.length > dial.length + 7) digits = digits.slice(dial.length);
  digits = digits.replace(/^0+/, "");
  const full = `+${dial}${digits}`;
  if (digits.length < 6 || !/^\+[1-9]\d{7,14}$/.test(full)) return null;
  return full;
}

export function maskPhone(e164: string): string {
  if (e164.length < 8) return e164;
  return `${e164.slice(0, 4)} •••• ${e164.slice(-3)}`;
}

export interface PhoneAuthResult {
  ok: boolean;
  error?: string;
  sent?: boolean;
  cooldown?: number;
  expires_in?: number;
  retry_after?: number;
  remaining?: number;
  reset_token?: string;
}

export async function phoneAuth(action: string, payload: Record<string, unknown>): Promise<PhoneAuthResult> {
  try {
    const { data, error } = await supabase.functions.invoke("phone-auth", { body: { action, ...payload } });
    if (error || !data) return { ok: false, error: "network" };
    return data as PhoneAuthResult;
  } catch {
    return { ok: false, error: "network" };
  }
}

export const ERROR_TEXT: Record<string, string> = {
  invalid_input: "راجع البيانات اللي كتبتها.",
  invalid_phone: "رقم الواتساب مش صحيح. اكتبه من غير كود الدولة.",
  invalid_credentials: "الرقم أو كلمة السر مش صح.",
  account_exists: "الرقم ده عنده حساب بالفعل. سجّل دخول أو استخدم «نسيت كلمة السر».",
  account_pending: "الرقم ده متسجل ولسه مش متأكد. سجّل دخول بكلمة السر الأصلية عشان نبعتلك كود، أو استخدم «نسيت كلمة السر».",
  already_verified: "الرقم ده متأكد بالفعل. سجّل دخول.",
  weak_password: "كلمة السر ضعيفة. استخدم 8 حروف أو أرقام على الأقل.",
  password_mismatch: "كلمتين السر مش متطابقين.",
  invalid_code: "الكود غلط.",
  expired: "الكود انتهت صلاحيته. اطلب كود جديد.",
  used: "الكود ده اتستخدم أو اتلغى. اطلب كود جديد.",
  locked: "عدد المحاولات خلص للكود ده. اطلب كود جديد.",
  no_challenge: "مفيش كود فعّال. اطلب كود جديد.",
  cooldown: "استنى شوية قبل ما تطلب كود تاني.",
  rate_limited: "محاولات كتير. جرّب تاني بعد شوية.",
  reset_expired: "انتهت مهلة تغيير كلمة السر. ابدأ من الأول.",
  same_phone: "ده نفس الرقم.",
  network: "مشكلة في الاتصال. جرّب تاني.",
  server_error: "حصلت مشكلة عندنا. جرّب تاني.",
};
export const errText = (code?: string) => ERROR_TEXT[code ?? "server_error"] ?? ERROR_TEXT.server_error;

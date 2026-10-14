/** Display estimate only. The payment server must price a verified account independently. */
export interface AuthPhoneIdentity {
  phone?: string | null;
  phone_confirmed_at?: string | null;
  email_confirmed_at?: string | null;
}

export interface AnnualDisplayPrice {
  amount: 400 | 1200;
  baseAmount: 1200;
  currency: "EGP";
  discounted: boolean;
}

const EGYPTIAN_MOBILE = /^\+?201[0125]\d{8}$/;

export function annualPriceForUser(user: AuthPhoneIdentity | null, loading: boolean): AnnualDisplayPrice | null {
  if (loading) return null;
  const discounted = Boolean(user?.phone_confirmed_at && user.phone && EGYPTIAN_MOBILE.test(user.phone));
  return { amount: discounted ? 400 : 1200, baseAmount: 1200, currency: "EGP", discounted };
}

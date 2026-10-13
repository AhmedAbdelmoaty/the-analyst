import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { clearPlanIntent } from "@/features/subscription/planIntent";
import { buildProfileUpdatePatch, isIdentityProfileComplete, isWorkProfileSchemaUnavailable } from "@/features/profile/workProfile";

export interface PlayerProfile {
  display_name: string | null; // Equals firstName — used everywhere in-game
  first_name?: string | null;
  last_name?: string | null;
  gender: "male" | "female" | null;
  avatar_choice: string | null;
  phone?: string | null;
  department?: string | null;
  department_other?: string | null;
  industry?: string | null;
  industry_other?: string | null;
  work_details_prompt_dismissed_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: PlayerProfile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Email sign-in/up — admin access only */
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<PlayerProfile>) => Promise<{ error: any }>;
  isProfileComplete: boolean;
}

// Keep one context instance across hot reloads so already-mounted consumers never lose the provider.
const g = globalThis as { __taAuthContext?: React.Context<AuthContextType | undefined> };
const AuthContext = g.__taAuthContext ?? (g.__taAuthContext = createContext<AuthContextType | undefined>(undefined));

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // The user whose data the UI currently shows; stale responses for anyone else are dropped.
  const currentUidRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  /** `background` refreshes never toggle loading, so mounted screens (the game) stay put. */
  const loadUserData = useCallback(async (uid: string, background = false) => {
    const token = ++requestRef.current;
    if (!background) setProfileLoading(true);
    const [profileResult, { data: role }] = await Promise.all([
      supabase.from("profiles").select("first_name,last_name,display_name,gender,avatar_choice,phone,department,department_other,industry,industry_other,work_details_prompt_dismissed_at").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);
    let prof = profileResult.data;
    // Keep legacy accounts usable while the additive work-profile migration is pending.
    if (profileResult.error && isWorkProfileSchemaUnavailable(profileResult.error)) {
      const fallback = await supabase.from("profiles").select("first_name,last_name,display_name,gender,avatar_choice,phone").eq("user_id", uid).maybeSingle();
      if (!fallback.error) prof = fallback.data ? {
        ...fallback.data,
        department: null,
        department_other: null,
        industry: null,
        industry_other: null,
        work_details_prompt_dismissed_at: null,
      } : null;
    }
    if (token !== requestRef.current || currentUidRef.current !== uid) return;
    if (prof || !background) setProfile(prof ? { ...prof, gender: (prof.gender as "male" | "female" | null) ?? null } : null);
    setIsAdmin(!!role);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    // Guest profiles are no longer supported — players must sign in.
    localStorage.removeItem("pf-guest-profile");

    const apply = (s: Session | null) => {
      setSession(s);
      const uid = s?.user?.id ?? null;
      if (uid && uid === currentUidRef.current) {
        // Same player re-confirmed (tab return, SIGNED_IN replay): refresh quietly.
        setTimeout(() => loadUserData(uid, true), 0);
        setSessionLoading(false);
        return;
      }
      currentUidRef.current = uid;
      requestRef.current++;
      setUser(s?.user ?? null);
      setProfile(null);
      setIsAdmin(false);
      if (uid) {
        setProfileLoading(true);
        setTimeout(() => loadUserData(uid), 0);
      } else {
        setProfileLoading(false);
      }
      setSessionLoading(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED") { setSession(s); return; }
      apply(s);
    });
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/admin/stats" },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithPhone = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ phone, password });
    if (!error) return { error: null };
    const code = (error as { code?: string }).code;
    if (code === "phone_not_confirmed" || /phone not confirmed/i.test(error.message)) return { error: "phone_not_confirmed" };
    if (code === "invalid_credentials" || /invalid/i.test(error.message)) return { error: "invalid_credentials" };
    if ((error as { status?: number }).status === 429) return { error: "rate_limited" };
    return { error: "server_error" };
  };

  const signOut = async () => {
    clearPlanIntent();
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!user) return { error: new Error("not_signed_in") };
    const input = { ...data };
    if (data.first_name !== undefined) input.display_name = data.first_name;
    const { patch, error: validationError } = buildProfileUpdatePatch(profile, input);
    if (validationError) return { error: new Error(validationError) };
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    if (!error) setProfile((p) => ({ ...(p ?? { display_name: null, gender: null, avatar_choice: null }), ...patch }));
    return { error };
  };

  const isProfileComplete = !!user && isIdentityProfileComplete(profile);
  const loading = sessionLoading || profileLoading;

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isAdmin,
      signUp, signIn, signInWithPhone, signOut, updateProfile,
      isProfileComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

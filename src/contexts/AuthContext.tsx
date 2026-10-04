import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface PlayerProfile {
  display_name: string | null; // Equals firstName — used everywhere in-game
  first_name?: string | null;
  last_name?: string | null;
  gender: "male" | "female" | null;
  avatar_choice: string | null;
  phone?: string | null;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadUserData = useCallback(async (uid: string) => {
    setProfileLoading(true);
    const [{ data: prof }, { data: role }] = await Promise.all([
      supabase.from("profiles").select("first_name,last_name,display_name,gender,avatar_choice,phone").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);
    setProfile(prof ? { ...prof, gender: (prof.gender as "male" | "female" | null) ?? null } : null);
    setIsAdmin(!!role);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    // Guest profiles are no longer supported — players must sign in.
    localStorage.removeItem("pf-guest-profile");

    const apply = (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const uid = s.user.id;
        setProfileLoading(true);
        setTimeout(() => loadUserData(uid), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
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
      options: { emailRedirectTo: window.location.origin + "/admin/board-9k2x" },
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
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!user) return { error: new Error("not_signed_in") };
    const patch: Record<string, string | null> = {};
    if (data.first_name !== undefined) { patch.first_name = data.first_name; patch.display_name = data.first_name; }
    if (data.last_name !== undefined) patch.last_name = data.last_name;
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.avatar_choice !== undefined) patch.avatar_choice = data.avatar_choice;
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
    if (!error) setProfile((p) => ({ ...(p ?? { display_name: null, gender: null, avatar_choice: null }), ...(patch as any) }));
    return { error };
  };

  const isProfileComplete = !!(user && profile?.first_name && profile?.last_name && profile?.gender);
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

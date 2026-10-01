import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface PlayerProfile {
  display_name: string | null; // Equals firstName — used everywhere in-game
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  gender: "male" | "female" | null;
  avatar_choice: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: PlayerProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, redirectPath?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<PlayerProfile>) => Promise<{ error: any }>;
  isProfileComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: role }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("first_name,last_name,phone,gender,avatar_choice").eq("user_id", uid).maybeSingle(),
    ]);
    setIsAdmin(!!role);
    setProfile(
      p
        ? {
            first_name: p.first_name,
            last_name: p.last_name,
            phone: p.phone,
            display_name: p.first_name,
            gender: (p.gender as "male" | "female" | null) ?? null,
            avatar_choice: p.avatar_choice,
          }
        : null
    );
  }, []);

  useEffect(() => {
    const apply = (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          loadUserData(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setIsAdmin(false);
        setProfile(null);
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = async (email: string, password: string, redirectPath = "/") => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + redirectPath },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!user) return { error: new Error("not signed in") };
    const merged = {
      first_name: data.first_name ?? profile?.first_name ?? null,
      last_name: data.last_name ?? profile?.last_name ?? null,
      phone: data.phone ?? profile?.phone ?? null,
      gender: data.gender ?? profile?.gender ?? null,
      avatar_choice: data.avatar_choice ?? profile?.avatar_choice ?? null,
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, email: user.email, display_name: merged.first_name, ...merged },
        { onConflict: "user_id" }
      );
    if (!error) setProfile({ ...merged, display_name: merged.first_name });
    return { error };
  };

  const isProfileComplete = !!(profile?.first_name && profile?.last_name && profile?.gender && profile?.phone);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isAdmin,
      signUp, signIn, signOut, updateProfile,
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

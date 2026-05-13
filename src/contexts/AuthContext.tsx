import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface PlayerProfile {
  display_name: string | null; // Equals firstName — used everywhere in-game
  first_name?: string | null;
  last_name?: string | null;
  gender: "male" | "female" | null;
  avatar_choice: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: PlayerProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<PlayerProfile>) => Promise<{ error: any }>;
  isProfileComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_KEY = "pf-guest-profile";

const readGuestProfile = (): PlayerProfile | null => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.first_name || !p?.gender) return null;
    return {
      first_name: p.first_name,
      last_name: p.last_name ?? "",
      display_name: p.first_name, // in-game name = first name
      gender: p.gender,
      avatar_choice: p.avatar_choice ?? (p.gender === "female" ? "sara" : "analyst"),
    };
  } catch {
    return null;
  }
};

const writeGuestProfile = (p: PlayerProfile | null) => {
  if (!p) {
    localStorage.removeItem(GUEST_KEY);
    return;
  }
  localStorage.setItem(
    GUEST_KEY,
    JSON.stringify({
      first_name: p.first_name,
      last_name: p.last_name,
      gender: p.gender,
      avatar_choice: p.avatar_choice,
    })
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(() => readGuestProfile());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkAdmin(session.user.id), 0);
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/admin/board-9k2x" },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Sign out admin if logged in
    if (session) await supabase.auth.signOut();
    // Clear guest profile (player "logout" from game)
    writeGuestProfile(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    const merged: PlayerProfile = {
      first_name: data.first_name ?? profile?.first_name ?? null,
      last_name: data.last_name ?? profile?.last_name ?? null,
      display_name: (data.first_name ?? profile?.first_name) ?? null,
      gender: data.gender ?? profile?.gender ?? null,
      avatar_choice: data.avatar_choice ?? profile?.avatar_choice ?? null,
    };
    writeGuestProfile(merged);
    setProfile(merged);
    return { error: null };
  };

  const isProfileComplete = !!(profile?.first_name && profile?.last_name && profile?.gender);

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

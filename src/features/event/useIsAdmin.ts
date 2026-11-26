import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Server-checked admin role; null while loading. */
export function useIsAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    let active = true;
    void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (active) setIsAdmin(data === true); });
    return () => { active = false; };
  }, [user, loading]);
  return isAdmin;
}

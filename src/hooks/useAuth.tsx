import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserRole = "admin" | "gerente" | "atendente" | "financeiro" | "operacional" | "cliente" | "super_admin";

type AuthUser = {
  role?: UserRole | null;
  [key: string]: unknown;
} | null;

interface AuthContextType {
  user: AuthUser;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAuthData = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsSuperAdmin(false);
      setIsApproved(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSession(currentSession);

    const userId = currentSession.user.id;

    const [{ data: profileData }, { data: rolesData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
    ]);

    const roles = rolesData?.map((row) => row.role) ?? [];
    const primaryRole = roles[0] ?? null;
    const superAdmin = roles.includes("super_admin");

    setUser({ ...currentSession.user, role: primaryRole });
    setProfile(profileData ?? null);
    setIsSuperAdmin(superAdmin);
    setIsApproved(superAdmin || (profileData?.aprovado === true));
    setLoading(false);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadAuthData(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      void loadAuthData(data.session);
    });

    return () => subscription.unsubscribe();
  }, [loadAuthData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsSuperAdmin(false);
    setIsApproved(false);
  }, []);

  const value = useMemo(
    () => ({ user, session, profile, loading, isSuperAdmin, isApproved, signOut }),
    [user, session, profile, loading, isSuperAdmin, isApproved, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

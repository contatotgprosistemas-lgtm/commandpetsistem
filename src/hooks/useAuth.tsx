import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: {
    id: string;
    nome: string;
    email: string | null;
    empresa_id: string | null;
    cargo: string | null;
    status: string;
  } | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  isSuperAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, empresa_id, cargo, status")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
      ]);

      const profileNotFound = profileRes.error?.code === "PGRST116";
      if (profileRes.error && !profileNotFound) throw profileRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfile(profileRes.data ?? null);
      setRoles(rolesRes.data?.map((r) => r.role) || []);
    } catch {
      setProfile(null);
      setRoles([]);
    }
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null, showLoading = true) => {
      if (showLoading) setLoading(true);

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await loadUserData(nextSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      setLoading(false);
    },
    [loadUserData]
  );

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      setTimeout(() => {
        if (!isMounted) return;
        void applySession(nextSession, true);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      void applySession(session, false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isSuperAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, signOut, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

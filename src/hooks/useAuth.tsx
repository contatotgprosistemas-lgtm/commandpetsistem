import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { id: string; nome: string; email: string | null; empresa_id: string | null; cargo: string | null; status: string } | null;
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
  const initRef = useRef(false);

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
      setProfile(profileRes.data);
      setRoles(rolesRes.data?.map((r) => r.role) || []);
    } catch {
      setProfile(null);
      setRoles([]);
    }
  }, []);

  const handleSession = useCallback(async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await loadUserData(newSession.user.id);
    } else {
      setProfile(null);
      setRoles([]);
    }
    setLoading(false);
  }, [loadUserData]);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    let isMounted = true;

    // 1. Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        // Use setTimeout to avoid Supabase deadlock warnings
        // but keep it simple - just load data
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadUserData(session.user.id);
          }
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      await handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession, loadUserData]);

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

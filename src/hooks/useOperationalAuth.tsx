import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface OperationalUser {
  id: string;
  nome: string;
  email: string;
  empresa_id: string;
  ativo: boolean;
  user_id: string;
}

interface OperationalAuthContextType {
  user: OperationalUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const OPERATIONAL_AUTH_CONTEXT_KEY = "__lovable_operational_auth_context__";

type GlobalWithOperationalAuthContext = typeof globalThis & {
  [OPERATIONAL_AUTH_CONTEXT_KEY]?: ReturnType<typeof createContext<OperationalAuthContextType | undefined>>;
};

const globalWithOperationalAuthContext = globalThis as GlobalWithOperationalAuthContext;

const OperationalAuthContext =
  globalWithOperationalAuthContext[OPERATIONAL_AUTH_CONTEXT_KEY] ??
  (globalWithOperationalAuthContext[OPERATIONAL_AUTH_CONTEXT_KEY] = createContext<OperationalAuthContextType | undefined>(undefined));

// Cargos that can access operational portal without an operational_users record
const ADMIN_CARGOS = ["admin", "gerente"];

export function OperationalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OperationalUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);
  const latestRequestId = useRef(0);

  const loadData = useCallback(async (s: Session | null) => {
    const requestId = ++latestRequestId.current;

    if (!s?.user) {
      if (requestId !== latestRequestId.current) return;
      setSession(null);
      setUser(null);
      setLoading(false);
      hasInitialized.current = true;
      return;
    }

    // Set session immediately so ProtectedRoute doesn't bounce while we resolve the user record
    setSession(s);
    setLoading(true);

    // First try operational_users
    const { data: opData, error: opError } = await supabase
      .from("operational_users")
      .select("*")
      .eq("user_id", s.user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (requestId !== latestRequestId.current) return;

    if (!opError && opData) {
      setSession(s);
      setUser(opData as OperationalUser);
      setLoading(false);
      hasInitialized.current = true;
      return;
    }

    // Fallback: check if user is admin/gerente with acesso_operacional
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, nome, email, empresa_id, cargo, acesso_operacional")
      .eq("user_id", s.user.id)
      .maybeSingle();

    if (requestId !== latestRequestId.current) return;

    if (
      profileData &&
      ADMIN_CARGOS.includes(profileData.cargo ?? "") &&
      profileData.acesso_operacional !== false
    ) {
      // Build a virtual OperationalUser from the profile
      setSession(s);
      setUser({
        id: profileData.id,
        nome: profileData.nome ?? "",
        email: profileData.email ?? "",
        empresa_id: profileData.empresa_id ?? "",
        ativo: true,
        user_id: s.user.id,
      });
    } else {
      setSession(s);
      setUser(null);
    }

    setLoading(false);
    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      queueMicrotask(() => {
        void loadData(s);
      });
    });
    void supabase.auth.getSession().then(({ data }) => void loadData(data.session));
    return () => subscription.unsubscribe();
  }, [loadData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, session, loading, signOut }), [user, session, loading, signOut]);

  return <OperationalAuthContext.Provider value={value}>{children}</OperationalAuthContext.Provider>;
}

export function useOperationalAuth() {
  const ctx = useContext(OperationalAuthContext);
  if (!ctx) throw new Error("useOperationalAuth must be used within OperationalAuthProvider");
  return ctx;
}

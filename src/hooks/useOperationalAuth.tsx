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

const OperationalAuthContext = createContext<OperationalAuthContextType | undefined>(undefined);

export function OperationalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OperationalUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  const loadData = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setSession(null);
      setUser(null);
      setLoading(false);
      hasInitialized.current = true;
      return;
    }

    if (!hasInitialized.current) {
      setLoading(true);
    }

    setSession(s);
    const { data } = await supabase
      .from("operational_users")
      .select("*")
      .eq("user_id", s.user.id)
      .eq("ativo", true)
      .maybeSingle();
    setUser((data as OperationalUser) ?? null);
    setLoading(false);
    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      void loadData(s);
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClienteData {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  endereco: string | null;
  data_nascimento: string | null;
}

export function usePortalCliente() {
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("clientes")
        .select("id, empresa_id, nome, email, telefone, whatsapp, cpf, endereco, data_nascimento")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setCliente(data as ClienteData | null);
      setLoading(false);
    };
    fetch();
  }, []);

  return { cliente, loading };
}

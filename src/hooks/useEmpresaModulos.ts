import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ModuloFlags } from "@/lib/modulos";

export interface EmpresaModulos extends ModuloFlags {
  valor_mensal: number;
  data_inicio: string | null;
  data_fim: string | null;
  loaded: boolean;
}

const DEFAULT: EmpresaModulos = {
  banho_tosa: true,
  hotel_creche: true,
  ponto: true,
  valor_mensal: 247,
  data_inicio: null,
  data_fim: null,
  loaded: false,
};

export function useEmpresaModulos(): EmpresaModulos {
  const { profile, isSuperAdmin } = useAuth();
  const [data, setData] = useState<EmpresaModulos>(DEFAULT);

  useEffect(() => {
    if (isSuperAdmin) {
      setData({ ...DEFAULT, loaded: true });
      return;
    }
    const empresaId = profile?.empresa_id;
    if (!empresaId) {
      setData({ ...DEFAULT, loaded: true });
      return;
    }
    let active = true;
    (async () => {
      const { data: row } = await supabase
        .from("empresa_modulos")
        .select("modulo_banho_tosa, modulo_hotel_creche, modulo_ponto, valor_mensal, data_inicio, data_fim")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (!active) return;
      if (!row) {
        setData({ ...DEFAULT, loaded: true });
        return;
      }
      setData({
        banho_tosa: !!row.modulo_banho_tosa,
        hotel_creche: !!row.modulo_hotel_creche,
        ponto: !!row.modulo_ponto,
        valor_mensal: Number(row.valor_mensal ?? 0),
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
        loaded: true,
      });
    })();
    return () => {
      active = false;
    };
  }, [profile?.empresa_id, isSuperAdmin]);

  return data;
}
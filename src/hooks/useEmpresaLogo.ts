import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_LOGO_ADMIN = "/placeholder.svg";

/**
 * Fetches the company logo URL for the current authenticated user's empresa.
 * Falls back to the provided defaultLogo or a placeholder.
 */
export function useEmpresaLogo(defaultLogo?: string) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo || DEFAULT_LOGO_ADMIN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogo() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("empresa_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile?.empresa_id) {
          setLoading(false);
          return;
        }

        const { data: empresa } = await supabase
          .from("empresas")
          .select("logo_url")
          .eq("id", profile.empresa_id)
          .maybeSingle();

        if (!cancelled && empresa?.logo_url) {
          setLogoUrl(empresa.logo_url);
        }
      } catch {
        // Fallback to default
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLogo();
    return () => { cancelled = true; };
  }, []);

  return { logoUrl, loading };
}

/**
 * Fetches logo for a specific empresa_id (for portal/operacional where we know the empresa).
 */
export function useEmpresaLogoById(empresaId: string | null | undefined, defaultLogo?: string) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo || DEFAULT_LOGO_ADMIN);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;

    supabase
      .from("empresas")
      .select("logo_url")
      .eq("id", empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.logo_url) {
          setLogoUrl(data.logo_url);
        }
      });

    return () => { cancelled = true; };
  }, [empresaId]);

  return logoUrl;
}

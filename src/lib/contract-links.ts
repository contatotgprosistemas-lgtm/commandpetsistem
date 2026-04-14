import { supabase } from "@/integrations/supabase/client";

export async function createContractShareLink(signingToken: string, empresaId: string, origin = window.location.origin) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: shortLink, error } = await supabase
    .from("short_links")
    .insert({
      type: "contrato",
      target_id: signingToken,
      origin,
      empresa_id: empresaId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return `https://${projectId}.supabase.co/functions/v1/og-preview?s=${shortLink.id}`;
}

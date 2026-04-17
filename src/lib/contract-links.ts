import { supabase } from "@/integrations/supabase/client";

export async function createContractShareLink(
  signingToken: string,
  empresaId: string,
  origin = window.location.origin,
) {
  // Persist a short link for tracking, but return a direct link to the app domain.
  // Hosting OG preview on Supabase Edge Functions doesn't work for messengers
  // (the platform forces Content-Type: text/plain + sandbox CSP), so the preview
  // would just show raw HTML code. The app domain serves the page directly.
  await supabase.from("short_links").insert({
    type: "contrato",
    target_id: signingToken,
    origin,
    empresa_id: empresaId,
  });

  return `${origin}/assinar/${signingToken}`;
}

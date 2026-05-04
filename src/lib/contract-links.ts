import { supabase } from "@/integrations/supabase/client";

export function extractContractSigningToken(tokenResponse: unknown): string | null {
  if (!tokenResponse) return null;

  if (typeof tokenResponse === "string") {
    return tokenResponse.trim() || null;
  }

  if (Array.isArray(tokenResponse)) {
    for (const row of tokenResponse) {
      if (row && typeof row === "object" && "signing_token" in row) {
        const token = (row as { signing_token?: unknown }).signing_token;
        if (typeof token === "string" && token.trim()) {
          return token;
        }
      }
    }

    return null;
  }

  if (typeof tokenResponse === "object" && "signing_token" in tokenResponse) {
    const token = (tokenResponse as { signing_token?: unknown }).signing_token;
    if (typeof token === "string" && token.trim()) {
      return token;
    }
  }

  return null;
}

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

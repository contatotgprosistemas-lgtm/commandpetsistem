import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "cadastro" or "contrato"
  const id = url.searchParams.get("id"); // empresa_id or signing_token

  if (!type || !id) {
    return new Response("Missing params", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let logoUrl = "";
  let title = "PetControl";
  let description = "Sistema de gestão para pet shops";
  let redirectUrl = "";

  // Detect the origin from the custom domain or fallback
  const origin = url.searchParams.get("origin") || "https://petcontrol.tgprosistemas.com.br";

  if (type === "cadastro") {
    const { data } = await supabase
      .from("empresas")
      .select("logo_url, nome_empresa")
      .eq("id", id)
      .maybeSingle();

    if (data?.logo_url) logoUrl = data.logo_url;
    if (data?.nome_empresa) title = data.nome_empresa;
    description = `Cadastro de Cliente e Pet — ${title}`;
    redirectUrl = `${origin}/cadastro/${id}`;
  } else if (type === "contrato") {
    const { data: contract } = await supabase
      .from("contracts")
      .select("title, empresa_id, signing_token")
      .eq("signing_token", id)
      .maybeSingle();

    if (contract) {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("logo_url, nome_empresa")
        .eq("id", contract.empresa_id)
        .maybeSingle();

      if (empresa?.logo_url) logoUrl = empresa.logo_url;
      if (empresa?.nome_empresa) title = empresa.nome_empresa;
      description = `Contrato para assinatura — ${contract.title || title}`;
      redirectUrl = `${origin}/assinar/${id}`;
    }
  }

  // Fallback logo
  if (!logoUrl) {
    logoUrl = `${supabaseUrl}/storage/v1/object/public/profile-photos/og-logo.png`;
  }

  logoUrl = appendCacheParam(logoUrl, id);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(logoUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(logoUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(title)}">
  <meta property="og:url" content="${escapeHtml(redirectUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(logoUrl)}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>Redirecionando...</p>
  <p><a href="${escapeHtml(redirectUrl)}">Clique aqui se o redirecionamento não acontecer.</a></p>
  <script>
    setTimeout(function () {
      window.location.replace("${escapeJs(redirectUrl)}");
    }, 50);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
});

function appendCacheParam(url: string, cacheKey: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(cacheKey)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

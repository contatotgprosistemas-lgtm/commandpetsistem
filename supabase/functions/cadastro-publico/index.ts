import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET: carregar cadastro existente via token
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "token obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: cli, error: cErr } = await supabase
        .from("clientes")
        .select("id, empresa_id, nome, cpf, data_nascimento, whatsapp, email, endereco, como_conheceu, foto_url")
        .eq("edit_token", token)
        .maybeSingle();
      if (cErr || !cli) {
        return new Response(JSON.stringify({ error: "Link de edição inválido ou expirado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: petsData } = await supabase
        .from("pets")
        .select("*")
        .eq("cliente_id", cli.id);
      return new Response(JSON.stringify({ cliente: cli, pets: petsData || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { empresa_id, cliente, pets, edit_token } = body;

    if (!empresa_id || !cliente?.nome) {
      return new Response(
        JSON.stringify({ error: "empresa_id e nome do cliente são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cliente.nome.length < 2 || cliente.nome.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter entre 2 e 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: empresa, error: empresaError } = await supabase
      .from("empresas").select("id").eq("id", empresa_id).maybeSingle();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientePayload = {
      nome: cliente.nome.trim().slice(0, 100),
      data_nascimento: cliente.data_nascimento || null,
      whatsapp: cliente.whatsapp?.trim().slice(0, 20) || null,
      email: cliente.email?.trim().slice(0, 255) || null,
      endereco: cliente.endereco?.trim().slice(0, 500) || null,
      cpf: cliente.cpf?.trim().slice(0, 14) || null,
      como_conheceu: cliente.como_conheceu?.trim().slice(0, 100) || null,
      foto_url: cliente.foto_url?.trim().slice(0, 1000) || null,
    };

    let clienteId: string;
    let returnedToken: string | null = null;
    let isUpdate = false;

    if (edit_token) {
      // MODO EDIÇÃO
      const { data: existing, error: findErr } = await supabase
        .from("clientes")
        .select("id, empresa_id, edit_token")
        .eq("edit_token", edit_token)
        .maybeSingle();
      if (findErr || !existing || existing.empresa_id !== empresa_id) {
        return new Response(JSON.stringify({ error: "Link de edição inválido" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: updErr } = await supabase
        .from("clientes")
        .update(clientePayload)
        .eq("id", existing.id);
      if (updErr) {
        console.error("cadastro-publico update error:", updErr);
        return new Response(JSON.stringify({ error: "Erro ao atualizar cadastro. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      clienteId = existing.id;
      returnedToken = edit_token;
      isUpdate = true;
      // Apaga pets anteriores deste cliente para reinserir (forma simples)
      await supabase.from("pets").delete().eq("cliente_id", clienteId);
    } else {
      const { data: novoCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          empresa_id,
          ...clientePayload,
          origem_cadastro: "publico",
          notificacao_cadastro_dispensada: false,
        })
        .select("id, edit_token")
        .single();

      if (clienteError) {
        console.error("cadastro-publico insert error:", clienteError);
        return new Response(
          JSON.stringify({ error: "Erro ao cadastrar cliente. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      clienteId = novoCliente.id;
      returnedToken = (novoCliente as any).edit_token || null;
    }

    let petsInseridos = 0;
    if (Array.isArray(pets) && pets.length > 0) {
      const petRows = pets.slice(0, 20).map((p: any) => ({
        empresa_id,
        cliente_id: clienteId,
        nome: (p.nome || "").trim().slice(0, 100),
        especie: (p.especie || "Cachorro").trim().slice(0, 50),
        raca: p.raca?.trim().slice(0, 100) || null,
        sexo: p.sexo || null,
        peso: p.peso ? parseFloat(p.peso) || null : null,
        data_nascimento: p.data_nascimento || null,
        idade: p.idade?.trim?.().slice(0, 50) || null,
        pelagem: p.pelagem?.trim?.().slice(0, 50) || null,
        comportamento: p.comportamento?.trim?.().slice(0, 500) || null,
        restricoes_alimentares: p.restricoes_alimentares?.trim?.().slice(0, 500) || null,
        vacinas: p.vacinas?.trim?.().slice(0, 500) || null,
        antiparasitario_data: p.antiparasitario_data || null,
        v10_data: p.v10_data || null,
        raiva_data: p.raiva_data || null,
        gripe_data: p.gripe_data || null,
        giardia_data: p.giardia_data || null,
        medicacoes: p.medicacoes?.trim?.().slice(0, 500) || null,
        foto_url: p.foto_url?.trim?.().slice(0, 1000) || null,
        cor: p.cor?.trim?.().slice(0, 100) || null,
        porte: p.porte?.trim?.().slice(0, 50) || null,
      })).filter((p: any) => p.nome.length >= 1);

      if (petRows.length > 0) {
        const { error: petsError } = await supabase.from("pets").insert(petRows);
        if (!petsError) petsInseridos = petRows.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, cliente_id: clienteId, pets_inseridos: petsInseridos, edit_token: returnedToken, updated: isUpdate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cadastro-publico unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

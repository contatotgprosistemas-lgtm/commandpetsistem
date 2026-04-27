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
    const { empresa_id, cliente, pets } = await req.json();

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: empresa, error: empresaError } = await supabase
      .from("empresas").select("id").eq("id", empresa_id).maybeSingle();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: novoCliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        empresa_id,
        nome: cliente.nome.trim().slice(0, 100),
        data_nascimento: cliente.data_nascimento || null,
        whatsapp: cliente.whatsapp?.trim().slice(0, 20) || null,
        email: cliente.email?.trim().slice(0, 255) || null,
        endereco: cliente.endereco?.trim().slice(0, 500) || null,
        cpf: cliente.cpf?.trim().slice(0, 14) || null,
        como_conheceu: cliente.como_conheceu?.trim().slice(0, 100) || null,
        foto_url: cliente.foto_url?.trim().slice(0, 1000) || null,
        origem_cadastro: "publico",
        notificacao_cadastro_dispensada: false,
      })
      .select("id")
      .single();

    if (clienteError) {
      return new Response(
        JSON.stringify({ error: "Erro ao cadastrar cliente: " + clienteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let petsInseridos = 0;
    if (Array.isArray(pets) && pets.length > 0) {
      const petRows = pets.slice(0, 20).map((p: any) => ({
        empresa_id,
        cliente_id: novoCliente.id,
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
      JSON.stringify({ success: true, cliente_id: novoCliente.id, pets_inseridos: petsInseridos }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

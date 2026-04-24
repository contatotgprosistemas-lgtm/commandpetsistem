import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }

function dentroDoExpediente(cfg: any): boolean {
  if (!cfg?.ativo) return true; // sem horário = sempre dentro
  try {
    const tz = cfg.fuso ?? "America/Sao_Paulo";
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, weekday: "short",
      hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wd = wdMap[parts.weekday] ?? 0;
    const ymd = `${parts.year}-${parts.month}-${parts.day}`;
    const feriados: string[] = Array.isArray(cfg.feriados) ? cfg.feriados : [];
    if (feriados.includes(ymd)) return false;
    const hhmm = `${parts.hour}:${parts.minute}`;
    const slots: { inicio: string; fim: string }[] = (cfg.horarios?.[String(wd)] ?? []);
    return slots.some((s) => hhmm >= s.inicio && hhmm <= s.fim);
  } catch { return true; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const event: string = body.event ?? body.type ?? "";
    const instance: string = body.instance ?? body.instanceName ?? body?.data?.instance ?? "";
    const data: any = body.data ?? body;

    console.log("webhook:", event, "instance:", instance);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Procura o canal: primeiro pelo identificador exato; se não achar,
    // tenta encontrar pelo nome da instância armazenado em config->>'instance'.
    let { data: canal } = await admin
      .from("crm_canais")
      .select("*")
      .eq("identificador", instance)
      .maybeSingle();
    if (!canal) {
      const { data: byCfg } = await admin
        .from("crm_canais")
        .select("*")
        .filter("config->>instance", "eq", instance)
        .maybeSingle();
      canal = byCfg ?? null;
    }
    if (!canal) {
      console.warn("canal não encontrado:", instance);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state ?? data?.connection;
      const novoStatus = state === "open" ? "conectado" : state === "close" ? "desconectado" : "conectando";
      await admin.from("crm_canais").update({
        status: novoStatus,
        ultima_conexao: novoStatus === "conectado" ? new Date().toISOString() : canal.ultima_conexao,
      }).eq("id", canal.id);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      const qr = data?.qrcode?.base64 ?? data?.base64 ?? data?.code ?? null;
      await admin.from("crm_canais").update({
        config: { ...(canal.config as any), qr, instance },
        status: "conectando",
      }).eq("id", canal.id);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const msg = Array.isArray(data?.messages) ? data.messages[0] : (data?.key ? data : data?.message);
      if (!msg) {
        console.warn("messages.upsert sem msg. data keys:", Object.keys(data ?? {}));
        return new Response(JSON.stringify({ ok: true, skip: "no-msg" }), { headers: corsHeaders });
      }
      console.log("msg keys:", Object.keys(msg ?? {}), "key:", JSON.stringify(msg?.key));

      const fromMe = !!msg?.key?.fromMe;
      const remoteJid: string = msg?.key?.remoteJid ?? "";
      if (remoteJid.includes("@g.us")) return new Response(JSON.stringify({ ok: true, skip: "group" }), { headers: corsHeaders }); // ignora grupo
      const numero = onlyDigits(remoteJid.split("@")[0]);
      if (!numero) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

      // Nome do contato: nunca usar pushName quando a mensagem é nossa (fromMe),
      // pois aí ele representa o nome da própria empresa no WhatsApp.
      const contactNameFromPayload: string =
        msg?.verifiedBizName ??
        msg?.notifyName ??
        msg?.pushname ??
        (!fromMe ? (msg?.pushName ?? "") : "") ??
        "";
      const pushName: string = (contactNameFromPayload || numero).toString().trim() || numero;
      const text: string =
        msg?.message?.conversation ??
        msg?.message?.extendedTextMessage?.text ??
        msg?.message?.imageMessage?.caption ??
        msg?.message?.videoMessage?.caption ??
        "[mídia]";
      const externalId: string = msg?.key?.id ?? crypto.randomUUID();
      const ts = msg?.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();

      // Detecta mídia
      const mm = msg?.message ?? {};
      const mediaInfo =
        mm.imageMessage ? { kind: "imagem", mimetype: mm.imageMessage.mimetype, filename: "image.jpg" } :
        mm.videoMessage ? { kind: "video", mimetype: mm.videoMessage.mimetype, filename: "video.mp4" } :
        mm.audioMessage ? { kind: "audio", mimetype: mm.audioMessage.mimetype, filename: "audio.ogg" } :
        mm.documentMessage ? { kind: "documento", mimetype: mm.documentMessage.mimetype, filename: mm.documentMessage.fileName ?? "arquivo" } :
        null;

      // contato (upsert por whatsapp)
      let { data: contato } = await admin.from("crm_contatos")
        .select("id, nome").eq("empresa_id", canal.empresa_id).eq("whatsapp", numero).maybeSingle();
      if (!contato) {
        const ins = await admin.from("crm_contatos").insert({
          empresa_id: canal.empresa_id,
          nome: pushName,
          whatsapp: numero,
          telefone: numero,
          origem: "whatsapp",
        }).select("id, nome").single();
        contato = ins.data!;
      } else if (
        !fromMe &&
        contactNameFromPayload &&
        (contato.nome === numero || !contato.nome || contato.nome === canal.nome)
      ) {
        // Atualiza nome quando o contato existente está com placeholder (número/canal)
        await admin.from("crm_contatos")
          .update({ nome: contactNameFromPayload })
          .eq("id", contato.id);
        contato.nome = contactNameFromPayload;
      }

      // conversa
      let { data: conv } = await admin.from("crm_conversas")
        .select("id, nao_lidas, status, setor_id, aguardando_setor")
        .eq("empresa_id", canal.empresa_id)
        .eq("canal_id", canal.id)
        .eq("contato_id", contato.id)
        .maybeSingle();
      if (!conv) {
        const ins = await admin.from("crm_conversas").insert({
          empresa_id: canal.empresa_id,
          canal_id: canal.id,
          contato_id: contato.id,
          status: "aberta",
          identificador_externo: remoteJid,
          setor_id: canal.setor_padrao_id ?? null,
        }).select("id, nao_lidas, status, setor_id, aguardando_setor").single();
        conv = ins.data!;

        // ====== Roteamento automático de NOVAS conversas ======
        try {
          const modo = canal.roteamento_modo ?? "nenhum";

          // 1) Menu automático: envia opções e marca aguardando_setor
          if (modo === "menu" && canal.menu_config?.opcoes?.length && EVOLUTION_URL && EVOLUTION_KEY) {
            const opcoes: any[] = canal.menu_config.opcoes;
            const cabecalho = canal.menu_config.texto ?? "Escolha uma opção:";
            const lista = opcoes.map((o: any) => `${o.tecla} - ${o.rotulo}`).join("\n");
            const txt = `${cabecalho}\n\n${lista}`;
            await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${instance}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
              body: JSON.stringify({ number: numero, text: txt }),
            });
            const nowIso = new Date().toISOString();
            await admin.from("crm_mensagens").insert({
              empresa_id: canal.empresa_id, conversa_id: conv.id, tipo: "texto",
              direcao: "saida", conteudo: txt, status: "enviada",
              remetente_nome: "🤖 Menu", enviada_em: nowIso,
            });
            await admin.from("crm_conversas").update({
              aguardando_setor: true, ultima_mensagem: txt, ultima_mensagem_em: nowIso,
            }).eq("id", conv.id);
            conv.aguardando_setor = true;
          }

          // 2) Palavras-chave: detecta setor pela primeira mensagem
          if (modo === "palavras_chave") {
            const regras: any[] = canal.palavras_chave_config?.regras ?? [];
            const lower = (text ?? "").toLowerCase();
            for (const r of regras) {
              const lista = String(r.palavras ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
              if (lista.some((p) => lower.includes(p)) && r.setor_id) {
                await admin.from("crm_conversas").update({ setor_id: r.setor_id }).eq("id", conv.id);
                conv.setor_id = r.setor_id;
                break;
              }
            }
          }
        } catch (e) {
          console.error("roteamento error:", e);
        }
      } else if (!fromMe && conv.aguardando_setor) {
        // Conversa existente aguardando escolha do menu
        try {
          const opcoes: any[] = canal.menu_config?.opcoes ?? [];
          const escolha = (text ?? "").trim().split(/\s+/)[0];
          const op = opcoes.find((o: any) => String(o.tecla).trim() === escolha);
          if (op?.setor_id) {
            await admin.from("crm_conversas").update({
              setor_id: op.setor_id, aguardando_setor: false,
            }).eq("id", conv.id);
            conv.setor_id = op.setor_id;
            conv.aguardando_setor = false;
          }
        } catch (e) { console.error("menu choice error:", e); }
      }

      // dedupe por externalId
      const { data: existing } = await admin.from("crm_mensagens")
        .select("id").eq("identificador_externo", externalId).maybeSingle();
      if (existing) return new Response(JSON.stringify({ ok: true, dedupe: true }), { headers: corsHeaders });

      // Baixar mídia se houver
      let mediaUrl: string | null = null;
      let mediaSize: number | null = null;
      if (mediaInfo && EVOLUTION_URL && EVOLUTION_KEY) {
        try {
          const dl = await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${instance}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
            body: JSON.stringify({ message: { key: msg.key }, convertToMp4: false }),
          });
          const dlData = await dl.json();
          const b64: string = dlData?.base64 ?? dlData?.data?.base64 ?? "";
          if (b64) {
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            mediaSize = bin.length;
            const ext = (mediaInfo.mimetype?.split("/")[1] ?? "bin").split(";")[0];
            const path = `${canal.empresa_id}/${conv.id}/${externalId}.${ext}`;
            const up = await admin.storage.from("chat-media").upload(path, bin, {
              contentType: mediaInfo.mimetype, upsert: true,
            });
            if (!up.error) {
              const { data: signed } = await admin.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
              mediaUrl = signed?.signedUrl ?? null;
            }
          }
        } catch (e) {
          console.error("media download error:", e);
        }
      }

      await admin.from("crm_mensagens").insert({
        empresa_id: canal.empresa_id,
        conversa_id: conv.id,
        tipo: (mediaInfo?.kind ?? "texto") as any,
        direcao: fromMe ? "saida" : "entrada",
        conteudo: text,
        midia_url: mediaUrl,
        midia_mimetype: mediaInfo?.mimetype ?? null,
        midia_filename: mediaInfo?.filename ?? null,
        midia_tamanho: mediaSize,
        status: "entregue",
        identificador_externo: externalId,
        enviada_em: ts,
        remetente_nome: fromMe ? null : pushName,
      });

      await admin.from("crm_conversas").update({
        ultima_mensagem: mediaInfo ? `[${mediaInfo.kind}] ${text === "[mídia]" ? "" : text}`.trim() : text,
        ultima_mensagem_em: ts,
        nao_lidas: fromMe ? (conv.nao_lidas ?? 0) : (conv.nao_lidas ?? 0) + 1,
        status: conv.status === "fechada" ? "aberta" : conv.status,
      }).eq("id", conv.id);

      await admin.from("crm_contatos").update({ ultima_interacao: ts }).eq("id", contato.id);

      // ====== Auto-resposta fora do expediente ======
      if (!fromMe) {
        try {
          const { data: hc } = await admin.from("crm_horario_comercial")
            .select("*").eq("empresa_id", canal.empresa_id).maybeSingle();
          if (hc?.ativo && !dentroDoExpediente(hc) && hc.mensagem_fora_expediente) {
            // Busca conv atualizada para checar se já enviamos aviso recente
            const { data: convFull } = await admin.from("crm_conversas")
              .select("aviso_ausencia_em").eq("id", conv.id).maybeSingle();
            const ja = convFull?.aviso_ausencia_em;
            const ultimoMs = ja ? new Date(ja).getTime() : 0;
            const horasDesde = (Date.now() - ultimoMs) / 36e5;
            const podeEnviar = !ja || (!hc.enviar_apenas_uma_vez && horasDesde > 6);
            if (podeEnviar && EVOLUTION_URL && EVOLUTION_KEY) {
              const txt = String(hc.mensagem_fora_expediente)
                .replace(/\{\{nome\}\}/g, contato.nome ?? "")
                .replace(/\{\{primeiro_nome\}\}/g, (contato.nome ?? "").split(" ")[0]);
              await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${instance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
                body: JSON.stringify({ number: numero, text: txt }),
              });
              const nowIso = new Date().toISOString();
              await admin.from("crm_mensagens").insert({
                empresa_id: canal.empresa_id, conversa_id: conv.id, tipo: "texto",
                direcao: "saida", conteudo: txt, status: "enviada",
                remetente_nome: "🌙 Auto (fora do expediente)", enviada_em: nowIso,
              });
              await admin.from("crm_conversas").update({
                aviso_ausencia_em: nowIso, ultima_mensagem: txt, ultima_mensagem_em: nowIso,
              }).eq("id", conv.id);
            }
          }
        } catch (e) {
          console.error("ausencia error:", e);
        }
      }

      // ============ EXECUTOR DE FLUXOS ============
      if (!fromMe) {
        try {
          const { data: flows } = await admin.from("crm_flows")
            .select("*").eq("empresa_id", canal.empresa_id).eq("ativo", true);
          for (const flow of flows ?? []) {
            let match = false;
            if (flow.gatilho === "mensagem_recebida") match = true;
            else if (flow.gatilho === "palavra_chave") {
              const palavras = (flow.gatilho_config?.palavras ?? "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
              match = palavras.some((p: string) => text.toLowerCase().includes(p));
            } else if (flow.gatilho === "nova_conversa") {
              const { count } = await admin.from("crm_mensagens")
                .select("*", { count: "exact", head: true }).eq("conversa_id", conv.id);
              match = (count ?? 0) <= 1;
            }
            if (!match) continue;

            const steps: any[] = flow.definicao?.steps ?? [];
            const { data: exec } = await admin.from("crm_flow_executions").insert({
              empresa_id: canal.empresa_id, flow_id: flow.id, conversa_id: conv.id,
              contato_id: contato.id, status: "executando", iniciado_em: new Date().toISOString(),
            }).select("id").single();

            // executa em background
            (async () => {
              try {
                for (const step of steps) {
                  if (step.type === "espera") {
                    await new Promise((r) => setTimeout(r, Math.min((step.config?.segundos ?? 1) * 1000, 30000)));
                  } else if (step.type === "mensagem" && step.config?.texto) {
                    const txt = String(step.config.texto)
                      .replace(/\{\{nome\}\}/g, contato.nome ?? "")
                      .replace(/\{\{primeiro_nome\}\}/g, (contato.nome ?? "").split(" ")[0]);
                    await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${instance}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
                      body: JSON.stringify({ number: numero, text: txt }),
                    });
                    const nowIso = new Date().toISOString();
                    await admin.from("crm_mensagens").insert({
                      empresa_id: canal.empresa_id, conversa_id: conv.id, tipo: "texto",
                      direcao: "saida", conteudo: txt, status: "enviada",
                      remetente_nome: `🤖 ${flow.nome}`, enviada_em: nowIso,
                    });
                    await admin.from("crm_conversas").update({
                      ultima_mensagem: txt, ultima_mensagem_em: nowIso,
                    }).eq("id", conv.id);
                  } else if (step.type === "tag" && step.config?.tag) {
                    let { data: tag } = await admin.from("crm_contato_tags")
                      .select("id").eq("empresa_id", canal.empresa_id).eq("nome", step.config.tag).maybeSingle();
                    if (!tag) {
                      const ins = await admin.from("crm_contato_tags").insert({
                        empresa_id: canal.empresa_id, nome: step.config.tag, cor: "#8B5CF6",
                      }).select("id").single();
                      tag = ins.data!;
                    }
                    await admin.from("crm_contato_tag_links").upsert({
                      empresa_id: canal.empresa_id, contato_id: contato.id, tag_id: tag.id,
                    }, { onConflict: "contato_id,tag_id" });
                  }
                }
                await admin.from("crm_flow_executions").update({
                  status: "concluido", finalizado_em: new Date().toISOString(),
                }).eq("id", exec!.id);
              } catch (err) {
                await admin.from("crm_flow_executions").update({
                  status: "erro", erro: String(err), finalizado_em: new Date().toISOString(),
                }).eq("id", exec!.id);
              }
            })();
          }
        } catch (e) {
          console.error("flow runner error:", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ ok: true, error: (e as Error).message }), { headers: corsHeaders });
  }
});
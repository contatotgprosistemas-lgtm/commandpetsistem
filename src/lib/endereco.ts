/**
 * Helpers para serializar/parsear endereço composto em um único campo de texto.
 *
 * Formato salvo no banco (campo `clientes.endereco`):
 *   "<logradouro>, Nº <numero> - <complemento>"
 *
 * O logradouro pode conter "Rua X, Bairro Y, Cidade - UF" (formato vindo do ViaCEP).
 * Os marcadores "Nº " e " - " (após Nº) são determinísticos e permitem o parse reverso.
 *
 * Também suporta o formato antigo "<logradouro>, <numero> - <complemento>" como fallback.
 */

export interface EnderecoParts {
  logradouro: string;
  numero: string;
  complemento: string;
}

export function montarEndereco(parts: Partial<EnderecoParts>): string {
  const logradouro = (parts.logradouro || "").trim();
  const numero = (parts.numero || "").trim();
  const complemento = (parts.complemento || "").trim();

  let out = logradouro;
  if (numero) {
    out = out ? `${out}, Nº ${numero}` : `Nº ${numero}`;
  }
  if (complemento) {
    out = out ? `${out} - ${complemento}` : complemento;
  }
  return out;
}

export function parseEndereco(endereco: string | null | undefined): EnderecoParts {
  const empty: EnderecoParts = { logradouro: "", numero: "", complemento: "" };
  if (!endereco) return empty;
  let resto = endereco.trim();
  if (!resto) return empty;

  let complemento = "";
  let numero = "";

  // 1) Marcador explícito "Nº" (case-insensitive, aceita "N°" ou "No")
  const nMatch = resto.match(/,\s*(?:n[º°o]\.?)\s*([^,\-]+?)(?:\s*-\s*(.+))?$/i);
  if (nMatch) {
    numero = (nMatch[1] || "").trim();
    complemento = (nMatch[2] || "").trim();
    resto = resto.slice(0, nMatch.index).trim();
    return { logradouro: resto, numero, complemento };
  }

  // 2) Fallback formato antigo: "<logradouro>, <numero> - <complemento>"
  //    Tenta detectar o último segmento após vírgula que comece por dígito.
  const lastComma = resto.lastIndexOf(",");
  if (lastComma >= 0) {
    const tail = resto.slice(lastComma + 1).trim();
    const tailMatch = tail.match(/^(\d+[A-Za-z]?)(?:\s*-\s*(.+))?$/);
    if (tailMatch) {
      numero = tailMatch[1].trim();
      complemento = (tailMatch[2] || "").trim();
      return { logradouro: resto.slice(0, lastComma).trim(), numero, complemento };
    }
  }

  // 3) Sem número detectável: separa apenas complemento se houver " - " no final
  const dashIdx = resto.lastIndexOf(" - ");
  if (dashIdx > 0) {
    const before = resto.slice(0, dashIdx).trim();
    const after = resto.slice(dashIdx + 3).trim();
    // Evita confundir "Cidade - UF" do ViaCEP com complemento (UF tem 2 letras)
    if (after.length > 2 || /\d/.test(after)) {
      return { logradouro: before, numero: "", complemento: after };
    }
  }

  return { logradouro: resto, numero: "", complemento: "" };
}
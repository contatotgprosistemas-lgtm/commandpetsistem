import { formatDateBR } from "@/lib/utils";

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatHourFromDateTime(dateTime?: string | null) {
  if (!dateTime) return "___";

  const match = dateTime.match(/T(\d{2}:\d{2})/);
  if (match?.[1]) return match[1];

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "___";

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export interface ContractPlaceholderValues {
  [key: string]: string;
}

export function replaceContractPlaceholders(template: string, values: ContractPlaceholderValues) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, key) => {
    const normalizedKey = stripAccents(String(key));
    return normalizedKey in values ? values[normalizedKey] : full;
  });
}

export function buildHospedagemContractValues(params: {
  clienteNome?: string | null;
  clienteCpf?: string | null;
  clienteEmail?: string | null;
  clienteEndereco?: string | null;
  clienteWhatsapp?: string | null;
  petNome?: string | null;
  petRaca?: string | null;
  petEspecie?: string | null;
  petSexo?: string | null;
  petCor?: string | null;
  petCastrado?: boolean | null;
  tipoServico?: string | null;
  valor?: number | null;
  dataEntrada?: string | null;
  horaEntrada?: string | null;
  dataSaida?: string | null;
  horaSaida?: string | null;
  baia?: string | null;
  petsMesmoTutor?: string | null;
}) {
  const dataEntrada = params.dataEntrada ? formatDateBR(params.dataEntrada) : "___";
  const dataSaida = params.dataSaida
    ? formatDateBR(`${params.dataSaida}${params.horaSaida ? `T${params.horaSaida}` : ""}`)
    : "___";

  const entradaDateOnly = params.dataEntrada?.split("T")[0] || null;
  const saidaDateOnly = params.dataSaida?.split("T")[0] || null;
  const dataReserva = saidaDateOnly && entradaDateOnly && saidaDateOnly !== entradaDateOnly
    ? `${dataEntrada} a ${dataSaida}`
    : dataEntrada;

  return {
    cliente_nome: params.clienteNome || "___",
    cliente_cpf: params.clienteCpf || "___",
    cliente_email: params.clienteEmail || "___",
    cliente_endereco: params.clienteEndereco || "___",
    cliente_whatsapp: params.clienteWhatsapp || "___",
    pet_nome: params.petNome || "___",
    pet_raca: params.petRaca || "___",
    pet_especie: params.petEspecie || "___",
    pet_sexo: params.petSexo || "___",
    pet_cor: params.petCor || "___",
    pet_castrado: params.petCastrado === true ? "Sim" : params.petCastrado === false ? "Não" : "___",
    tipo_servico: params.tipoServico || "___",
    servicos: params.tipoServico || "___",
    servico: params.tipoServico || "___",
    valor: params.valor != null ? `R$ ${Number(params.valor).toFixed(2)}` : "___",
    data: dataReserva,
    data_entrada: dataEntrada,
    hora_entrada: params.horaEntrada || formatHourFromDateTime(params.dataEntrada),
    data_saida: dataSaida,
    hora_saida: params.horaSaida || "___",
    data_reserva: dataReserva,
    baia: params.baia || "___",
    pets_mesmo_tutor: params.petsMesmoTutor || "",
  };
}

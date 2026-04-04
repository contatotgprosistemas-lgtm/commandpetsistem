import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, XCircle, Loader2, Ban, DollarSign } from "lucide-react";

interface Props { empresaId: string }

export function NfeDashboard({ empresaId }: Props) {
  const { data: notas = [] } = useQuery({
    queryKey: ["nfe_documents_dashboard", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfe_documents")
        .select("id, status, valor_total, data_emissao")
        .eq("empresa_id", empresaId);
      return data || [];
    },
  });

  const hoje = new Date().toISOString().split("T")[0];
  const emitidasHoje = notas.filter((n: any) => n.data_emissao?.startsWith(hoje)).length;
  const processando = notas.filter((n: any) => n.status === "processando").length;
  const autorizadas = notas.filter((n: any) => n.status === "autorizada").length;
  const rejeitadas = notas.filter((n: any) => n.status === "rejeitada").length;
  const canceladas = notas.filter((n: any) => n.status === "cancelada").length;
  const valorTotal = notas
    .filter((n: any) => n.status === "autorizada")
    .reduce((acc: number, n: any) => acc + (Number(n.valor_total) || 0), 0);

  const cards = [
    { title: "Emitidas Hoje", value: emitidasHoje, icon: FileText, color: "text-blue-500" },
    { title: "Processando", value: processando, icon: Loader2, color: "text-yellow-500" },
    { title: "Autorizadas", value: autorizadas, icon: CheckCircle2, color: "text-green-500" },
    { title: "Rejeitadas", value: rejeitadas, icon: XCircle, color: "text-red-500" },
    { title: "Canceladas", value: canceladas, icon: Ban, color: "text-muted-foreground" },
    {
      title: "Faturado (Autorizadas)",
      value: valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      icon: DollarSign,
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

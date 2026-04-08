import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, ChevronRight, MoreVertical, Pencil, Trash2, FolderOpen, FileText, Loader2 } from "lucide-react";

interface Categoria {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: string;
  ordem: number;
}

interface ContaItem {
  id: string;
  empresa_id: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

const CATEGORIAS_PADRAO = [
  { nome: "Receitas", tipo: "receita", ordem: 1 },
  { nome: "Deduções sobre Vendas", tipo: "despesa", ordem: 2 },
  { nome: "Custos Variáveis", tipo: "despesa", ordem: 3 },
  { nome: "Despesas com Pessoal", tipo: "despesa", ordem: 4 },
  { nome: "Despesas Administrativas", tipo: "despesa", ordem: 5 },
  { nome: "Despesas Comerciais", tipo: "despesa", ordem: 6 },
  { nome: "Despesas Fixas", tipo: "despesa", ordem: 7 },
  { nome: "Despesas Financeiras", tipo: "despesa", ordem: 8 },
  { nome: "Investimentos", tipo: "despesa", ordem: 9 },
  { nome: "Outras Receitas", tipo: "receita", ordem: 10 },
];

const CONTAS_PADRAO: Record<string, string[]> = {
  "Receitas": [
    "Banho e Tosa", "Hospedagem", "Day Care", "Adestramento",
    "Venda de Produtos", "Consultas Veterinárias", "Transporte Pet",
    "Planos e Pacotes", "Serviços Extras"
  ],
  "Deduções sobre Vendas": [
    "Impostos sobre Serviços (ISS)", "PIS/COFINS", "Descontos Concedidos",
    "Devoluções"
  ],
  "Custos Variáveis": [
    "Produtos de Higiene Pet", "Shampoos e Condicionadores",
    "Material de Limpeza", "Ração e Petiscos", "Medicamentos",
    "Embalagens", "Comissões sobre Vendas"
  ],
  "Despesas com Pessoal": [
    "Salários", "FGTS", "INSS Patronal", "13º Salário",
    "Férias", "Vale Transporte", "Vale Alimentação",
    "Plano de Saúde", "Pró-labore", "Freelancers/Autônomos"
  ],
  "Despesas Administrativas": [
    "Aluguel", "Condomínio", "IPTU", "Energia Elétrica",
    "Água e Esgoto", "Internet e Telefone", "Contabilidade",
    "Material de Escritório", "Software e Sistemas",
    "Manutenção e Reparos"
  ],
  "Despesas Comerciais": [
    "Marketing Digital", "Publicidade", "Impressos e Cartões",
    "Brindes e Promoções", "Comissões de Venda"
  ],
  "Despesas Fixas": [
    "Seguro do Imóvel", "Seguro de Responsabilidade Civil",
    "Licenças e Alvarás", "Taxas e Contribuições",
    "Serviço de Segurança", "Monitoramento"
  ],
  "Despesas Financeiras": [
    "Juros de Empréstimos", "Tarifas Bancárias",
    "Taxas de Cartão de Crédito", "Taxas de Maquininha",
    "IOF", "Multas e Juros"
  ],
  "Investimentos": [
    "Equipamentos", "Móveis e Utensílios", "Veículos",
    "Reformas e Melhorias", "Treinamentos e Cursos"
  ],
  "Outras Receitas": [
    "Rendimentos Financeiros", "Receitas Não Operacionais",
    "Venda de Ativos"
  ],
};

export default function PlanoContasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<ContaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);

  // Dialog states
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing?: Categoria }>({ open: false });
  const [contaDialog, setContaDialog] = useState<{ open: boolean; categoriaId?: string; editing?: ContaItem }>({ open: false });
  const [catForm, setCatForm] = useState({ nome: "", tipo: "despesa" });
  const [contaForm, setContaForm] = useState({ nome: "", descricao: "", categoria_id: "" });

  async function fetchAll() {
    setLoading(true);
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("plano_contas_categorias").select("*").order("ordem"),
      supabase.from("plano_contas_items").select("*").order("nome"),
    ]);
    if (cats) setCategorias(cats as any);
    if (items) setContas(items as any);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  async function getEmpresaId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("empresa_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    return profile?.empresa_id ?? null;
  }

  // Seed default data
  async function seedDefaults() {
    setSeeding(true);
    const empresaId = await getEmpresaId();
    if (!empresaId) { toast.error("Empresa não encontrada"); setSeeding(false); return; }

    for (const cat of CATEGORIAS_PADRAO) {
      const { data: inserted, error } = await supabase
        .from("plano_contas_categorias")
        .insert({ empresa_id: empresaId, nome: cat.nome, tipo: cat.tipo, ordem: cat.ordem })
        .select()
        .single();
      if (error || !inserted) continue;

      const contasArr = CONTAS_PADRAO[cat.nome] || [];
      if (contasArr.length > 0) {
        await supabase.from("plano_contas_items").insert(
          contasArr.map(nome => ({ empresa_id: empresaId, categoria_id: (inserted as any).id, nome }))
        );
      }
    }
    toast.success("Plano de contas padrão criado com sucesso!");
    setSeeding(false);
    fetchAll();
  }

  // Category CRUD
  async function saveCategoria() {
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    if (!profile?.empresa_id) return;

    if (catDialog.editing) {
      const { error } = await supabase.from("plano_contas_categorias")
        .update({ nome: catForm.nome, tipo: catForm.tipo })
        .eq("id", catDialog.editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Categoria atualizada");
    } else {
      const maxOrdem = categorias.length > 0 ? Math.max(...categorias.map(c => c.ordem)) + 1 : 1;
      const { error } = await supabase.from("plano_contas_categorias")
        .insert({ empresa_id: profile.empresa_id, nome: catForm.nome, tipo: catForm.tipo, ordem: maxOrdem });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Categoria criada");
    }
    setCatDialog({ open: false });
    fetchAll();
  }

  async function deleteCategoria(id: string) {
    const { error } = await supabase.from("plano_contas_categorias").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Categoria excluída");
    fetchAll();
  }

  // Conta CRUD
  async function saveConta() {
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    if (!profile?.empresa_id) return;

    if (contaDialog.editing) {
      const { error } = await supabase.from("plano_contas_items")
        .update({ nome: contaForm.nome, descricao: contaForm.descricao || null, categoria_id: contaForm.categoria_id })
        .eq("id", contaDialog.editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Conta atualizada");
    } else {
      const { error } = await supabase.from("plano_contas_items")
        .insert({ empresa_id: profile.empresa_id, nome: contaForm.nome, descricao: contaForm.descricao || null, categoria_id: contaForm.categoria_id });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Conta criada");
    }
    setContaDialog({ open: false });
    fetchAll();
  }

  async function deleteConta(id: string) {
    const { error } = await supabase.from("plano_contas_items").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Conta excluída");
    fetchAll();
  }

  const isEmpty = categorias.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Plano de Contas</h1>
          <p className="text-sm text-muted-foreground">Estrutura de categorias e contas contábeis</p>
        </div>
        <div className="flex gap-2">
          {isEmpty && !loading && (
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding} className="gap-1">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Carregar Padrão
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={() => {
            setCatForm({ nome: "", tipo: "despesa" });
            setCatDialog({ open: true });
          }}>
            <Plus className="h-4 w-4" /> Nova Categoria
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => {
            setContaForm({ nome: "", descricao: "", categoria_id: categorias[0]?.id || "" });
            setContaDialog({ open: true });
          }} disabled={categorias.length === 0}>
            <Plus className="h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground gap-3">
            <FolderOpen className="h-10 w-10 opacity-40" />
            <p>Nenhuma categoria cadastrada</p>
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding} className="gap-1">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Carregar Plano de Contas Padrão
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {categorias.map(cat => {
              const catContas = contas.filter(c => c.categoria_id === cat.id);
              const isOpen = openCats.has(cat.id);
              return (
                <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCat(cat.id)}>
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{cat.nome}</span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {cat.tipo === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({catContas.length} {catContas.length === 1 ? "conta" : "contas"})
                      </span>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setContaForm({ nome: "", descricao: "", categoria_id: cat.id });
                        setContaDialog({ open: true, categoriaId: cat.id });
                      }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setCatForm({ nome: cat.nome, tipo: cat.tipo });
                            setCatDialog({ open: true, editing: cat });
                          }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteCategoria(cat.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CollapsibleContent>
                    {catContas.length === 0 ? (
                      <div className="px-12 py-3 text-xs text-muted-foreground">Nenhuma conta nesta categoria</div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {catContas.map(conta => (
                          <div key={conta.id} className="flex items-center justify-between px-12 py-2.5 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{conta.nome}</span>
                              {conta.descricao && (
                                <span className="text-xs text-muted-foreground">— {conta.descricao}</span>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setContaForm({ nome: conta.nome, descricao: conta.descricao || "", categoria_id: conta.categoria_id });
                                  setContaDialog({ open: true, editing: conta });
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteConta(conta.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Categoria Dialog */}
      <Dialog open={catDialog.open} onOpenChange={(o) => { if (!o) setCatDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catDialog.editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={catForm.nome} onChange={e => setCatForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Despesas Fixas" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={catForm.tipo} onValueChange={v => setCatForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveCategoria} disabled={!catForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta Dialog */}
      <Dialog open={contaDialog.open} onOpenChange={(o) => { if (!o) setContaDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contaDialog.editing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={contaForm.categoria_id} onValueChange={v => setContaForm(f => ({ ...f, categoria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome da Conta</Label>
              <Input value={contaForm.nome} onChange={e => setContaForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Salários" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={contaForm.descricao} onChange={e => setContaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição breve" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveConta} disabled={!contaForm.nome.trim() || !contaForm.categoria_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

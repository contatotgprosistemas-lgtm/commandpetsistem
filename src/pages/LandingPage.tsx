import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import landingDashboard from "@/assets/landing-dashboard.jpg";
import landingCrm from "@/assets/landing-crm.jpg";
import landingAgenda from "@/assets/landing-agenda.jpg";
import landingFinanceiro from "@/assets/landing-financeiro.jpg";
import {
  CalendarDays,
  MessageSquare,
  PawPrint,
  Clock,
  BarChart3,
  Shield,
  CheckCircle2,
  ArrowRight,
  Send,
  Menu,
  X,
  FileText,
  Truck,
  Loader2,
  Scissors,
  Users,
  Star,
  Zap,
  Globe,
  Smartphone,
  Bot,
  CreditCard,
  ChevronRight,
  Package,
  ShoppingBag,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ─── Feature data ───────────────────────────────── */
const modules = [
  {
    category: "Comercial",
    color: "from-blue-500 to-cyan-500",
    items: [
      { icon: MessageSquare, title: "CRM WhatsApp", desc: "Atenda seus clientes direto pelo WhatsApp com inbox inteligente, respostas rápidas e histórico completo." },
      { icon: Bot, title: "Chatbot Automático", desc: "Automatize o primeiro atendimento com fluxos visuais, menus interativos e respostas personalizadas 24h." },
      { icon: Users, title: "Pipeline de Vendas", desc: "Kanban visual para acompanhar leads e oportunidades do primeiro contato ao fechamento." },
    ],
  },
  {
    category: "Operacional",
    color: "from-emerald-500 to-teal-500",
    items: [
      { icon: CalendarDays, title: "Agenda Inteligente", desc: "Calendário visual com controle de baias, hospedagem, creche e banho & tosa integrados." },
      { icon: Scissors, title: "Esteira de Banho", desc: "Fila de atendimento em tempo real com status, banhista responsável e controle de entrada/saída." },
      { icon: PawPrint, title: "Cadastro de Pets", desc: "Ficha completa com histórico, vacinas, manejo diário, galeria de fotos e checklist veterinário." },
      { icon: Clock, title: "Ponto Digital", desc: "Controle de jornada com banco de horas, hora extra, relatórios e geolocalização dos colaboradores." },
      { icon: Truck, title: "Taxi Pet", desc: "Gestão de transporte com motoristas, veículos, rotas e acompanhamento em tempo real." },
      { icon: Smartphone, title: "App do Tutor", desc: "Aplicativo exclusivo para o cliente acompanhar seu pet: fotos, manejo, agendamentos, pagamentos e notificações em tempo real." },
      { icon: Users, title: "App Operacional", desc: "Painel dedicado para colaboradores: agenda do dia, check-in/out, galeria de fotos, ponto digital e manejo — tudo na palma da mão." },
      { icon: Package, title: "Planos & Pacotes", desc: "Gestão completa de planos mensais e pacotes avulsos com renovação automática, controle de sessões e cobrança recorrente integrada." },
      { icon: ShoppingBag, title: "Venda de Produtos & Estoque", desc: "PDV integrado para venda de produtos com controle de estoque em tempo real, emissão de cupom fiscal e relatórios de movimentação." },
    ],
  },
  {
    category: "Financeiro",
    color: "from-violet-500 to-purple-500",
    items: [
      { icon: BarChart3, title: "Financeiro Completo", desc: "Contas a pagar e receber, fluxo de caixa, DRE automático e conciliação bancária." },
      { icon: FileText, title: "Contratos Digitais", desc: "Gere, envie e colete assinaturas digitais com validade jurídica e timeline de eventos." },
      { icon: CreditCard, title: "Cobrança Automática", desc: "Integração com gateway de pagamento para boletos, PIX e cartão recorrente." },
    ],
  },
];

const highlights = [
  { icon: Zap, title: "Implantação em minutos", desc: "Sem instalação. Acesse de qualquer lugar." },
  { icon: Shield, title: "Dados protegidos", desc: "Criptografia e backup automático." },
  { icon: Globe, title: "Portal do Cliente", desc: "Área exclusiva para o tutor do pet." },
  { icon: Smartphone, title: "100% Responsivo", desc: "Funciona no celular, tablet e desktop." },
];

const screenshots = [
  { src: landingDashboard, label: "Dashboard", desc: "Visão geral do negócio com métricas em tempo real" },
  { src: landingAgenda, label: "Agenda", desc: "Calendário visual com controle completo de atendimentos" },
  { src: landingCrm, label: "CRM WhatsApp", desc: "Inbox integrado para atender seus clientes" },
  { src: landingFinanceiro, label: "Financeiro", desc: "Controle total de receitas, despesas e fluxo de caixa" },
];

const stats = [
  { value: "10+", label: "Módulos integrados" },
  { value: "24/7", label: "Sistema disponível" },
  { value: "∞", label: "Pets e clientes" },
  { value: "100%", label: "Na nuvem" },
];

/* ─── Animated section wrapper ───────────────────── */
function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", empresa: "", mensagem: "" });
  const [sending, setSending] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate screenshots
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("leads").insert({
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone.trim() || null,
      empresa: formData.empresa.trim() || null,
      mensagem: formData.mensagem.trim() || null,
    });
    setSending(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    setFormData({ nome: "", email: "", telefone: "", empresa: "", mensagem: "" });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* ── NAV ──────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-zinc-950/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-zinc-800/60" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PetControl" className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">PetControl</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <button onClick={() => scrollTo("features")} className="hover:text-zinc-100 transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo("screenshots")} className="hover:text-zinc-100 transition-colors">Telas</button>
            <button onClick={() => scrollTo("modules")} className="hover:text-zinc-100 transition-colors">Módulos</button>
            <button onClick={() => scrollTo("contact")} className="hover:text-zinc-100 transition-colors">Contato</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-zinc-300 hover:text-zinc-100">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25">
              <Link to="/signup">Começar Grátis</Link>
            </Button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-zinc-400">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-zinc-950 border-t border-zinc-800 px-4 pb-4 space-y-3"
          >
            <button onClick={() => scrollTo("features")} className="block w-full text-left py-2 text-zinc-300">Funcionalidades</button>
            <button onClick={() => scrollTo("screenshots")} className="block w-full text-left py-2 text-zinc-300">Telas</button>
            <button onClick={() => scrollTo("modules")} className="block w-full text-left py-2 text-zinc-300">Módulos</button>
            <button onClick={() => scrollTo("contact")} className="block w-full text-left py-2 text-zinc-300">Contato</button>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1 border-zinc-700 text-zinc-300">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
                <Link to="/signup">Começar Grátis</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative pt-28 pb-12 sm:pt-36 sm:pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-600/15 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <PawPrint className="h-4 w-4" />
              Sistema completo para Pet Shops, Hotéis Pet & Creches
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              A plataforma que{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                transforma
              </span>{" "}
              a gestão do seu negócio pet
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Agenda, CRM WhatsApp, financeiro, contratos digitais, ponto de colaboradores, portal do cliente e muito mais — tudo integrado em uma única plataforma moderna e intuitiva.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-13 text-base shadow-xl shadow-blue-600/20 transition-all hover:shadow-blue-600/30 hover:scale-[1.02]">
                <Link to="/signup">
                  Começar Gratuitamente <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("contact")} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800/80 px-8 h-13 text-base">
                Solicitar Demonstração
              </Button>
            </div>
          </motion.div>

          {/* Hero screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent rounded-3xl blur-xl" />
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50">
              <img src={landingDashboard} alt="Dashboard PetControl" className="w-full" width={1440} height={900} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-zinc-800/60 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <FadeInSection key={i} delay={i * 0.1} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-zinc-400 font-medium">{s.label}</div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ── HIGHLIGHTS ───────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Por que o PetControl?</h2>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
              Tecnologia de ponta pensada para o dia a dia do mercado pet.
            </p>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((h, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="group rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <h.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{h.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{h.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCREENSHOTS SHOWCASE ─────────────────── */}
      <section id="screenshots" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Conheça o sistema por dentro</h2>
            <p className="mt-4 text-zinc-400 text-lg">Interface moderna, intuitiva e pensada para produtividade.</p>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            {/* Tabs */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
              {screenshots.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenshot(i)}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeScreenshot === i
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-b from-blue-500/5 to-transparent rounded-3xl" />
              <motion.div
                key={activeScreenshot}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/40"
              >
                <img
                  src={screenshots[activeScreenshot].src}
                  alt={screenshots[activeScreenshot].label}
                  className="w-full"
                  loading="lazy"
                  width={1440}
                  height={900}
                />
              </motion.div>
              <motion.p
                key={`desc-${activeScreenshot}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-4 text-zinc-400 text-sm"
              >
                {screenshots[activeScreenshot].desc}
              </motion.p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── MODULES DETAIL ───────────────────────── */}
      <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que você precisa, em um só lugar</h2>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
              Módulos completos e integrados para cada área do seu negócio.
            </p>
          </FadeInSection>

          <div className="space-y-16">
            {modules.map((mod, mi) => (
              <FadeInSection key={mod.category} delay={mi * 0.1}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${mod.color}`} />
                  <h3 className="text-xl font-bold text-zinc-200">{mod.category}</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mod.items.map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="group rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 hover:border-zinc-700 transition-all duration-300"
                    >
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${mod.color} bg-opacity-10 flex items-center justify-center mb-4`}
                        style={{ background: `linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))` }}>
                        <item.icon className="h-5 w-5 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-base mb-2 text-zinc-100">{item.title}</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADVANTAGES ───────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Benefícios que fazem a diferença</h2>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Implantação rápida — comece a usar em minutos",
              "Suporte humanizado via WhatsApp",
              "Atualizações constantes sem custo adicional",
              "Segurança de dados com criptografia ponta a ponta",
              "Relatórios financeiros detalhados e automáticos",
              "Portal exclusivo para seus clientes acessarem",
              "Integração com gateway de pagamento (PIX, boleto, cartão)",
              "Sem limite de pets, clientes ou colaboradores",
              "Contratos digitais com assinatura eletrônica",
              "Chatbot 24h para atendimento automático",
            ].map((item, i) => (
              <FadeInSection key={i} delay={i * 0.04}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-200 text-sm">{item}</span>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>



      {/* ── LEAD FORM ────────────────────────────── */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <FadeInSection>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Fale com a gente</h2>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              Preencha o formulário e nossa equipe entrará em contato para uma demonstração personalizada do sistema.
            </p>
            <div className="space-y-4">
              {[
                "Demonstração gratuita e sem compromisso",
                "Implantação assistida pela nossa equipe",
                "Suporte contínuo via WhatsApp",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <form onSubmit={handleSubmitLead} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-nome" className="text-zinc-300 text-xs">Nome *</Label>
                  <Input id="lead-nome" placeholder="Seu nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-email" className="text-zinc-300 text-xs">Email *</Label>
                  <Input id="lead-email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500" required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-telefone" className="text-zinc-300 text-xs">Telefone / WhatsApp</Label>
                  <Input id="lead-telefone" placeholder="(00) 00000-0000" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-empresa" className="text-zinc-300 text-xs">Nome do negócio</Label>
                  <Input id="lead-empresa" placeholder="Pet Shop, Hotel Pet..." value={formData.empresa} onChange={(e) => setFormData({ ...formData, empresa: e.target.value })} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-msg" className="text-zinc-300 text-xs">Mensagem</Label>
                <Textarea id="lead-msg" placeholder="Conte um pouco sobre seu negócio e como podemos ajudar..." value={formData.mensagem} onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 min-h-[100px]" />
              </div>
              <Button type="submit" disabled={sending} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 shadow-lg shadow-blue-600/20">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Mensagem
              </Button>
            </form>
          </FadeInSection>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/15 via-transparent to-cyan-600/10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
        <FadeInSection className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
            Pronto para transformar<br />seu negócio pet?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Comece agora e descubra como o PetControl pode simplificar sua rotina e aumentar seus resultados.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-500 text-white px-10 h-13 text-base shadow-xl shadow-blue-600/25 hover:scale-[1.02] transition-all">
              <Link to="/signup">
                Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-zinc-300 hover:text-zinc-100 h-13">
              <Link to="/login">Já tenho conta → Entrar</Link>
            </Button>
          </div>
        </FadeInSection>
      </section>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-zinc-800/60 text-center text-sm text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="PetControl" className="h-6 w-6" />
            <span className="font-medium text-zinc-400">PetControl System</span>
          </div>
          <p>© {new Date().getFullYear()} PetControl System. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

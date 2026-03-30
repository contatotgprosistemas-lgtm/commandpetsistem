import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import screenshotDashboard from "@/assets/screenshot-dashboard.jpg";
import screenshotPonto from "@/assets/screenshot-ponto.jpg";
import screenshotCrm from "@/assets/screenshot-crm.jpg";
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
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda Inteligente",
    desc: "Gerencie hospedagens, creche, banho e tosa com calendário visual e controle de baias.",
  },
  {
    icon: MessageSquare,
    title: "CRM WhatsApp",
    desc: "Atenda seus clientes direto pelo WhatsApp com CRM integrado e chatbot automático.",
  },
  {
    icon: PawPrint,
    title: "Cadastro de Pets",
    desc: "Ficha completa do pet com histórico, vacinas, manejo diário e galeria de fotos.",
  },
  {
    icon: Clock,
    title: "Ponto Digital",
    desc: "Controle de jornada com banco de horas ou hora extra, relatórios e geolocalização.",
  },
  {
    icon: BarChart3,
    title: "Financeiro Completo",
    desc: "Contas a pagar/receber, fluxo de caixa, DRE e integração com gateway de pagamento.",
  },
  {
    icon: FileText,
    title: "Contratos Digitais",
    desc: "Gere contratos com assinatura digital, timeline de eventos e envio automático.",
  },
  {
    icon: Truck,
    title: "Taxi Pet",
    desc: "Gestão completa de transporte com motoristas, veículos e rastreamento.",
  },
  {
    icon: Shield,
    title: "Portal do Cliente",
    desc: "Área exclusiva para o tutor acompanhar o pet, pagamentos e documentos.",
  },
];

const screenshots = [
  { src: screenshotDashboard, label: "Dashboard com visão geral do negócio" },
  { src: screenshotPonto, label: "Controle de ponto e jornada" },
  { src: screenshotCrm, label: "CRM WhatsApp integrado" },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", empresa: "", mensagem: "" });
  const [sending, setSending] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PetControl" className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">PetControl</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <button onClick={() => scrollTo("features")} className="hover:text-zinc-100 transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo("screenshots")} className="hover:text-zinc-100 transition-colors">Telas</button>
            <button onClick={() => scrollTo("contact")} className="hover:text-zinc-100 transition-colors">Contato</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-zinc-300 hover:text-zinc-100">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link to="/signup">Criar Conta</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-zinc-400">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-950 border-t border-zinc-800 px-4 pb-4 space-y-3">
            <button onClick={() => scrollTo("features")} className="block w-full text-left py-2 text-zinc-300">Funcionalidades</button>
            <button onClick={() => scrollTo("screenshots")} className="block w-full text-left py-2 text-zinc-300">Telas</button>
            <button onClick={() => scrollTo("contact")} className="block w-full text-left py-2 text-zinc-300">Contato</button>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1 border-zinc-700 text-zinc-300">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/signup">Criar Conta</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <PawPrint className="h-4 w-4" />
              Sistema completo para Pet Shops & Hotéis Pet
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Gerencie seu negócio pet com{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                inteligência e agilidade
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Agenda, financeiro, CRM WhatsApp, ponto digital, contratos, portal do cliente e muito mais — tudo em uma única plataforma.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base">
                <Link to="/signup">
                  Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("contact")} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-8 h-12 text-base">
                Solicitar Demonstração
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que você precisa, em um só lugar</h2>
            <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
              Módulos integrados para simplificar a gestão do seu pet shop, hotel pet ou creche.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-blue-500/40 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section id="screenshots" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Conheça o sistema por dentro</h2>
            <p className="mt-4 text-zinc-400 text-lg">Interface moderna e intuitiva para o dia a dia.</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {screenshots.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveScreenshot(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeScreenshot === i
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <motion.div
            key={activeScreenshot}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-blue-900/10"
          >
            <img
              src={screenshots[activeScreenshot].src}
              alt={screenshots[activeScreenshot].label}
              className="w-full"
              loading="lazy"
              width={1280}
              height={720}
            />
          </motion.div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Por que escolher o PetControl?</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "Implantação rápida — comece a usar em minutos",
              "Suporte humanizado via WhatsApp",
              "Atualizações constantes sem custo adicional",
              "Segurança de dados com criptografia",
              "Relatórios financeiros detalhados",
              "Portal exclusivo para seus clientes",
              "Integração com gateway de pagamento",
              "Sem limite de pets ou clientes cadastrados",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-zinc-200">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD FORM */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold">Fale com a gente</h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Preencha o formulário e receba uma demonstração personalizada.
            </p>
          </div>

          <form onSubmit={handleSubmitLead} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-nome" className="text-zinc-300 text-xs">Nome *</Label>
                <Input
                  id="lead-nome"
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className="text-zinc-300 text-xs">Email *</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  required
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-telefone" className="text-zinc-300 text-xs">Telefone</Label>
                <Input
                  id="lead-telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-empresa" className="text-zinc-300 text-xs">Empresa</Label>
                <Input
                  id="lead-empresa"
                  placeholder="Nome do seu negócio"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-msg" className="text-zinc-300 text-xs">Mensagem</Label>
              <Textarea
                id="lead-msg"
                placeholder="Conte um pouco sobre seu negócio..."
                value={formData.mensagem}
                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 min-h-[100px]"
              />
            </div>
            <Button type="submit" disabled={sending} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Mensagem
            </Button>
          </form>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronto para transformar seu negócio?</h2>
          <p className="text-zinc-400 text-lg mb-8">
            Comece gratuitamente e veja como o PetControl pode simplificar sua rotina.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-12 text-base">
              <Link to="/signup">
                Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-zinc-300 hover:text-zinc-100 h-12">
              <Link to="/login">Já tenho conta → Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-zinc-800 text-center text-sm text-zinc-500">
        <p>© {new Date().getFullYear()} PetControl System. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

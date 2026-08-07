"use client";

import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { IndicatorCard } from "@/components/central-de-indicadores/indicator-card";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Phone,
  TrendingUp,
} from "lucide-react";

type DashboardSummary = {
  totalIndicadores: number;
  indicadoresAtivos: number;
  totalContatos: number;
  reunioes: number;
  conversoes: number;
  valorComissoesPagas: number;
  valorComissoesPendentes: number;
};

type RankedIndicator = {
  id: string;
  nome: string;
  vendas: number;
  conversao: number;
};

type Indicator = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  nome: string;
  telefone: string;
  whatsapp?: string | null;
  email: string;
  cidade: string;
  estado: string;
  cpf: string;
  pix: string;
  origem: string;
  profissao?: string | null;
  data_entrada?: string | null;
  status: string;
  observacoes: string;
  ativo: boolean;
  usuario_id: string;
  pipeline_stage?: string | null;
  grupo_whatsapp?: boolean;
  link_grupo?: string | null;
  grupo_criado?: boolean;
};

type IndicatorStats = Record<
  string,
  {
    contatosRecebidos: number;
    reunioesRealizadas: number;
    vendasFechadas: number;
    comissoesPagas: number;
  }
>;

type ToastState = {
  type: "success" | "error";
  title: string;
} | null;

type Contact = {
  id: string;
  indicador_id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
  usuario_id: string;
};

type Commission = {
  id: string;
  indicador_id: string;
  valor: number;
  status: string;
  pix: string;
  data_pagamento?: string | null;
  observacoes: string;
  usuario_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

const automationTexts = {
  invite: "Olá! Quero te convidar para conhecer mais sobre a nossa atuação e como podemos ajudar com soluções de consórcio.",
  partnership: "Olá! Estamos abrindo espaço para uma conversa sobre parceria estratégica e oportunidades de colaboração.",
  contacts: "Olá! Gostaria de compartilhar mais detalhes sobre nossos serviços e acompanhar seu interesse.",
  thanks: "Obrigado pelo seu contato e atenção. Ficamos à disposição para qualquer dúvida adicional.",
};

type HistoryEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  user: string;
};

const historyEvents: HistoryEvent[] = [
  {
    id: "1",
    title: "Indicador criado",
    description: "Novo indicador cadastrado na central.",
    date: "01/08/2026",
    time: "09:15",
    user: "Você",
  },
  {
    id: "2",
    title: "Contato recebido",
    description: "Contato adicionado ao indicador para prospecção.",
    date: "01/08/2026",
    time: "10:40",
    user: "Você",
  },
  {
    id: "3",
    title: "Ligação realizada",
    description: "Ligação registrada para acompanhamento inicial.",
    date: "01/08/2026",
    time: "11:10",
    user: "Você",
  },
  {
    id: "4",
    title: "Reunião marcada",
    description: "Reunião agendada para apresentação da proposta.",
    date: "01/08/2026",
    time: "13:30",
    user: "Você",
  },
  {
    id: "5",
    title: "Venda realizada",
    description: "Negócio fechado com sucesso.",
    date: "01/08/2026",
    time: "15:00",
    user: "Você",
  },
  {
    id: "6",
    title: "Comissão paga",
    description: "Comissão registrada como recebida.",
    date: "01/08/2026",
    time: "16:20",
    user: "Você",
  },
];

const emptySummary: DashboardSummary = {
  totalIndicadores: 0,
  indicadoresAtivos: 0,
  totalContatos: 0,
  reunioes: 0,
  conversoes: 0,
  valorComissoesPagas: 0,
  valorComissoesPendentes: 0,
};

const emptyForm = {
  nome: "",
  telefone: "",
  whatsapp: "",
  email: "",
  cidade: "",
  estado: "",
  cpf: "",
  pix: "",
  origem: "",
  profissao: "",
  data_entrada: new Date().toISOString().slice(0, 10),
  status: "Novo",
  observacoes: "",
  ativo: true,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const emptyContactForm = {
  nome: "",
  telefone: "",
  cidade: "",
  status: "Novo",
  observacoes: "",
};

const pipelineStages = [
  "Novo Indicador",
  "Contato recebido",
  "Mensagem enviada",
  "Ligação",
  "Reunião",
  "Venda",
  "Pagamento",
  "Comissão",
] as const;

const statusOptions = ["Novo", "Em contato", "Ativo", "Inativo", "Parceiro Premium"];

export default function CentralDeIndicadoresPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [ranking, setRanking] = useState<RankedIndicator[]>([]);
  const [draggedIndicatorId, setDraggedIndicatorId] = useState<string | null>(null);
  const [indicatorStats, setIndicatorStats] = useState<IndicatorStats>({});
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [contactFormData, setContactFormData] = useState(emptyContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isContactSaving, setIsContactSaving] = useState(false);
  const [, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    void loadIndicators();
  }, []);

  useEffect(() => {
    void loadDashboardSummary();
  }, [indicators]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleContactChange = (field: keyof typeof emptyContactForm, value: string) => {
    setContactFormData((current) => ({ ...current, [field]: value }));
  };

  const logSupabaseError = (context: string, error: unknown) => {
    console.error(`[central-de-indicadores] ${context}`, error);
  };

  const getAuthenticatedUserId = async (supabase: ReturnType<typeof createClient>) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData.user?.id) {
      return userData.user.id;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }

    return sessionData.session?.user?.id ?? null;
  };

  const loadIndicators = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setErrorMessage("A configuração do Supabase não foi encontrada.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("indicadores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logSupabaseError("loadIndicators", error);
        setErrorMessage("Não foi possível carregar os indicadores no momento.");
        setIndicators([]);
        return;
      }

      setIndicators((data as Indicator[]) ?? []);
    } catch (error) {
      logSupabaseError("loadIndicators", error);
      setErrorMessage("Ocorreu um erro inesperado ao carregar os indicadores.");
      setIndicators([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveIndicatorToStage = async (indicatorId: string, stage: string) => {
    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("indicadores").update({ pipeline_stage: stage }).eq("id", indicatorId);

    if (error) {
      setToast({ type: "error", title: "Não foi possível atualizar o estágio do indicador." });
      return;
    }

    setIndicators((current) =>
      current.map((indicator) =>
        indicator.id === indicatorId ? { ...indicator, pipeline_stage: stage } : indicator,
      ),
    );
    setToast({ type: "success", title: "Estágio atualizado com sucesso." });
    setDraggedIndicatorId(null);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, indicatorId: string) => {
    setDraggedIndicatorId(indicatorId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", indicatorId);
  };

  const handleDropOnStage = async (event: DragEvent<HTMLDivElement>, stage: string) => {
    event.preventDefault();

    const indicatorId = event.dataTransfer.getData("text/plain");
    if (!indicatorId) {
      return;
    }

    await handleMoveIndicatorToStage(indicatorId, stage);
  };

  const loadDashboardSummary = async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();

    const [{ data: indicatorsData }, { data: contactsData }, { data: commissionsData }] = await Promise.all([
      supabase.from("indicadores").select("id, nome, ativo, status").order("created_at", { ascending: false }),
      supabase.from("contatos_indicados").select("indicador_id"),
      supabase.from("comissoes_indicadores").select("indicador_id, status, valor"),
    ]);

    const safeIndicators = (indicatorsData as Array<{ id: string; nome: string; ativo: boolean; status: string }> | null) ?? [];
    const safeContacts = (contactsData as Array<{ indicador_id: string }> | null) ?? [];
    const safeCommissions = (commissionsData as Array<{ indicador_id: string; status: string; valor: number }> | null) ?? [];

    const contactsByIndicator = safeContacts.reduce<Record<string, number>>((accumulator, contact) => {
      const key = contact.indicador_id;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const commissionsByIndicator = safeCommissions.reduce<Record<string, Array<{ status: string; valor: number }>>>((accumulator, commission) => {
      const key = commission.indicador_id;
      accumulator[key] = [...(accumulator[key] ?? []), commission];
      return accumulator;
    }, {});

    const totalIndicadores = safeIndicators.length;
    const indicadoresAtivos = safeIndicators.filter((indicator) => indicator.ativo).length;
    const totalContatos = safeContacts.length;
    const reunioes = safeIndicators.filter((indicator) => ["Ativo", "Em andamento"].includes(indicator.status)).length;
    const conversoes = safeIndicators.filter((indicator) => ["Fechado", "Aprovado", "Concluído"].includes(indicator.status)).length;
    const valorComissoesPagas = safeCommissions
      .filter((commission) => commission.status === "Pago")
      .reduce((sum, commission) => sum + Number(commission.valor ?? 0), 0);
    const valorComissoesPendentes = safeCommissions
      .filter((commission) => commission.status !== "Pago")
      .reduce((sum, commission) => sum + Number(commission.valor ?? 0), 0);

    const rankingData = safeIndicators
      .map((indicator) => {
        const contactsCount = contactsByIndicator[indicator.id] ?? 0;
        const commissionsForIndicator = commissionsByIndicator[indicator.id] ?? [];
        const vendas = commissionsForIndicator.filter((commission) => commission.status === "Pago").length;
        const conversao = contactsCount > 0 ? Math.round((vendas / contactsCount) * 100) : 0;

        return {
          id: indicator.id,
          nome: indicator.nome || "Indicador sem nome",
          vendas,
          conversao,
        };
      })
      .sort((left, right) => right.vendas - left.vendas || right.conversao - left.conversao);

    const nextStats = Object.fromEntries(
      safeIndicators.map((indicator) => {
        const commissionsForIndicator = commissionsByIndicator[indicator.id] ?? [];
        const contactsCount = contactsByIndicator[indicator.id] ?? 0;
        return [
          indicator.id,
          {
            contatosRecebidos: contactsCount,
            reunioesRealizadas: 0,
            vendasFechadas: commissionsForIndicator.filter((commission) => commission.status === "Pago").length,
            comissoesPagas: commissionsForIndicator.filter((commission) => commission.status === "Pago").length,
          },
        ];
      }),
    );

    setSummary({
      totalIndicadores,
      indicadoresAtivos,
      totalContatos,
      reunioes,
      conversoes,
      valorComissoesPagas,
      valorComissoesPendentes,
    });
    setRanking(rankingData);
    setIndicatorStats(nextStats);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim() || !formData.telefone.trim()) {
      setToast({ type: "error", title: "Nome e telefone são obrigatórios." });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      setIsSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const userId = await getAuthenticatedUserId(supabase);

      if (!userId) {
        setToast({ type: "error", title: "Não foi possível identificar o usuário autenticado." });
        return;
      }

      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim(),
        cpf: formData.cpf.trim(),
        pix: formData.pix.trim(),
        origem: formData.origem.trim(),
        profissao: formData.profissao.trim(),
        data_entrada: formData.data_entrada,
        status: formData.status,
        observacoes: formData.observacoes.trim(),
        ativo: formData.ativo,
        usuario_id: userId,
        pipeline_stage: "Novo Indicador",
      };

      const request = editingIndicatorId
        ? supabase.from("indicadores").update(payload).eq("id", editingIndicatorId).select().single()
        : supabase.from("indicadores").insert(payload).select().single();

      const { data, error } = await request;

      if (error) {
        logSupabaseError("handleSubmit", error);
        setToast({ type: "error", title: editingIndicatorId ? "Não foi possível atualizar o indicador." : "Não foi possível salvar o indicador." });
        return;
      }

      if (data) {
        setIndicators((current) => {
          const next = editingIndicatorId
            ? current.map((indicator) => (indicator.id === editingIndicatorId ? ({ ...indicator, ...(data as Indicator) }) : indicator))
            : [data as Indicator, ...current];
          return next;
        });
      }

      await loadIndicators();
      await loadDashboardSummary();
      setFormData({ ...emptyForm });
      setEditingIndicatorId(null);
      setIsFormOpen(false);
      setToast({ type: "success", title: editingIndicatorId ? "Indicador atualizado com sucesso." : "Indicador cadastrado com sucesso." });
    } catch (error) {
      logSupabaseError("handleSubmit", error);
      setToast({ type: "error", title: "Ocorreu um erro inesperado ao salvar o indicador." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...emptyForm });
    setEditingIndicatorId(null);
    setIsFormOpen(false);
  };

  const handleEditIndicator = (indicator: Indicator) => {
    setEditingIndicatorId(indicator.id);
    setFormData({
      nome: indicator.nome || "",
      telefone: indicator.telefone || "",
      whatsapp: indicator.whatsapp || "",
      email: indicator.email || "",
      cidade: indicator.cidade || "",
      estado: indicator.estado || "",
      cpf: indicator.cpf || "",
      pix: indicator.pix || "",
      origem: indicator.origem || "",
      profissao: indicator.profissao || "",
      data_entrada: indicator.data_entrada || new Date().toISOString().slice(0, 10),
      status: indicator.status || "Novo",
      observacoes: indicator.observacoes || "",
      ativo: indicator.ativo,
    });
    setIsFormOpen(true);
  };

  const handleDeleteIndicator = async (indicatorId: string) => {
    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("indicadores").delete().eq("id", indicatorId);

      if (error) {
        logSupabaseError("handleDeleteIndicator", error);
        setToast({ type: "error", title: "Não foi possível excluir o indicador." });
        return;
      }

      setIndicators((current) => current.filter((indicator) => indicator.id !== indicatorId));
      setToast({ type: "success", title: "Indicador excluído com sucesso." });
    } catch (error) {
      logSupabaseError("handleDeleteIndicator", error);
      setToast({ type: "error", title: "Ocorreu um erro inesperado ao excluir o indicador." });
    }
  };

  const handleContactCancel = () => {
    setContactFormData(emptyContactForm);
    setEditingContactId(null);
    setIsContactFormOpen(false);
  };

  const loadContacts = async (indicatorId: string) => {
    setIsContactsLoading(true);

    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      setIsContactsLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("contatos_indicados")
      .select("*")
      .eq("indicador_id", indicatorId)
      .order("created_at", { ascending: false });

    if (error) {
      setToast({ type: "error", title: "Não foi possível carregar os contatos." });
      setContacts([]);
      setIsContactsLoading(false);
      return;
    }

    setContacts((data as Contact[]) ?? []);
    setIsContactsLoading(false);
  };

  const handleOpenContacts = async (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    await Promise.all([loadContacts(indicatorId), loadCommissions(indicatorId)]);
  };

  const _handleOpenContacts = handleOpenContacts;

  const handleSaveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedIndicatorId || !contactFormData.nome.trim()) {
      return;
    }

    setIsContactSaving(true);

    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      setIsContactSaving(false);
      return;
    }

    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setToast({ type: "error", title: "Não foi possível identificar o usuário autenticado." });
      setIsContactSaving(false);
      return;
    }

    if (editingContactId) {
      const { error } = await supabase
        .from("contatos_indicados")
        .update({
          nome: contactFormData.nome.trim(),
          telefone: contactFormData.telefone.trim(),
          cidade: contactFormData.cidade.trim(),
          status: contactFormData.status,
          observacoes: contactFormData.observacoes.trim(),
        })
        .eq("id", editingContactId)
        .select()
        .single();

      if (error) {
        setToast({ type: "error", title: "Não foi possível atualizar o contato." });
        setIsContactSaving(false);
        return;
      }

      setContacts((current) =>
        current.map((contact) =>
          contact.id === editingContactId
            ? {
                ...contact,
                nome: contactFormData.nome.trim(),
                telefone: contactFormData.telefone.trim(),
                cidade: contactFormData.cidade.trim(),
                status: contactFormData.status,
                observacoes: contactFormData.observacoes.trim(),
              }
            : contact,
        ),
      );
    } else {
      const { data, error } = await supabase
        .from("contatos_indicados")
        .insert({
          indicador_id: selectedIndicatorId,
          nome: contactFormData.nome.trim(),
          telefone: contactFormData.telefone.trim(),
          cidade: contactFormData.cidade.trim(),
          status: contactFormData.status,
          observacoes: contactFormData.observacoes.trim(),
          usuario_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        setToast({ type: "error", title: "Não foi possível salvar o contato." });
        setIsContactSaving(false);
        return;
      }

      if (data) {
        setContacts((current) => [data as Contact, ...current]);
      }
    }

    setContactFormData(emptyContactForm);
    setEditingContactId(null);
    setIsContactFormOpen(false);
    setToast({ type: "success", title: "Contato salvo com sucesso." });
    setIsContactSaving(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setContactFormData({
      nome: contact.nome,
      telefone: contact.telefone,
      cidade: contact.cidade,
      status: contact.status,
      observacoes: contact.observacoes,
    });
    setIsContactFormOpen(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedIndicatorId) return;

    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("contatos_indicados").delete().eq("id", contactId);

    if (error) {
      setToast({ type: "error", title: "Não foi possível excluir o contato." });
      return;
    }

    setContacts((current) => current.filter((contact) => contact.id !== contactId));
    setToast({ type: "success", title: "Contato excluído com sucesso." });
  };

  const handleCopyAutomation = async (key: keyof typeof automationTexts) => {
    try {
      await navigator.clipboard.writeText(automationTexts[key]);
      setToast({ type: "success", title: "Texto copiado." });
    } catch {
      setToast({ type: "error", title: "Não foi possível copiar o texto." });
    }
  };

  const loadCommissions = async (indicatorId: string) => {
    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("comissoes_indicadores")
      .select("*")
      .eq("indicador_id", indicatorId)
      .order("created_at", { ascending: false });

    if (error) {
      setToast({ type: "error", title: "Não foi possível carregar as comissões." });
      setCommissions([]);
      return;
    }

    setCommissions((data as Commission[]) ?? []);
  };

  const handleMarkCommissionAsPaid = async (commissionId: string) => {
    if (!selectedIndicatorId) return;

    if (!isSupabaseConfigured()) {
      setToast({ type: "error", title: "A configuração do Supabase não foi encontrada." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("comissoes_indicadores")
      .update({
        status: "Pago",
        data_pagamento: new Date().toISOString().slice(0, 10),
      })
      .eq("id", commissionId);

    if (error) {
      setToast({ type: "error", title: "Não foi possível atualizar a comissão." });
      return;
    }

    setCommissions((current) =>
      current.map((commission) =>
        commission.id === commissionId
          ? { ...commission, status: "Pago", data_pagamento: new Date().toISOString().slice(0, 10) }
          : commission,
      ),
    );
    setToast({ type: "success", title: "Comissão marcada como paga." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Central de Indicadores</h2>
          <p className="text-sm text-muted-foreground">
            O coração do Sistema Operacional do Consultor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="w-fit">
            Em evolução
          </Badge>
          <Button onClick={() => setIsFormOpen(true)}>+ Novo Indicador</Button>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.title}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Indicadores</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalIndicadores}</div>
            <p className="mt-1 text-xs text-muted-foreground">Indicadores cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores Ativos</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.indicadoresAtivos}</div>
            <p className="mt-1 text-xs text-muted-foreground">Em acompanhamento ativo</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contatos</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <Phone className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalContatos}</div>
            <p className="mt-1 text-xs text-muted-foreground">Contatos registrados</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reuniões</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.reunioes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Agendamentos em andamento</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversões</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.conversoes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Negócios fechados</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissões Pagas</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.valorComissoesPagas)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Pagamentos concluídos</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissões Pendentes</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.valorComissoesPendentes)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Aguardando pagamento</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline da Central</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4 2xl:grid-cols-8">
            {pipelineStages.map((stage) => {
              const stageIndicators = indicators.filter((indicator) => (indicator.pipeline_stage ?? "Novo Indicador") === stage);

              return (
                <div
                  key={stage}
                  className="min-h-[220px] rounded-xl border border-border/50 bg-background/40 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => void handleDropOnStage(event, stage)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{stage}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {stageIndicators.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stageIndicators.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground">
                        Solte aqui
                      </div>
                    ) : (
                      stageIndicators.map((indicator) => (
                        <div
                          key={indicator.id}
                          draggable
                          onDragStart={(event) => handleDragStart(event, indicator.id)}
                          onDragEnd={() => setDraggedIndicatorId(null)}
                          className={`cursor-grab rounded-lg border border-border/50 bg-card p-3 shadow-sm transition hover:border-primary/40 ${
                            draggedIndicatorId === indicator.id ? "opacity-60" : "opacity-100"
                          }`}
                        >
                          <p className="text-sm font-medium">{indicator.nome}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{indicator.telefone || indicator.cidade || indicator.status}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <CardTitle className="text-lg">Ranking dos melhores indicadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado disponível para ranking.</p>
              ) : (
                ranking.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                    <div>
                      <p className="font-medium">#{index + 1} {item.nome}</p>
                      <p className="text-sm text-muted-foreground">{item.vendas} vendas</p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {item.conversao}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <CardTitle className="text-lg">Gráfico de conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2 rounded-lg border border-border/50 bg-background/40 p-4">
              {(ranking.length > 0 ? ranking.slice(0, 5).map((item) => Math.min(item.conversao, 100)) : [35, 58, 42, 72, 64]).map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${value}%` }} />
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl border-border/50 bg-card shadow-2xl">
            <CardHeader>
              <CardTitle>{editingIndicatorId ? "Editar indicador" : "Novo indicador"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(event) => handleChange("nome", event.target.value)}
                    placeholder="Digite o nome"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(event) => handleChange("telefone", event.target.value)}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(event) => handleChange("whatsapp", event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(event) => handleChange("cidade", event.target.value)}
                    placeholder="Digite a cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(event) => handleChange("estado", event.target.value)}
                    placeholder="Digite o estado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(event) => handleChange("cpf", event.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pix">PIX</Label>
                  <Input
                    id="pix"
                    value={formData.pix}
                    onChange={(event) => handleChange("pix", event.target.value)}
                    placeholder="Chave PIX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="origem">Origem</Label>
                  <Input
                    id="origem"
                    value={formData.origem}
                    onChange={(event) => handleChange("origem", event.target.value)}
                    placeholder="Origem do contato"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    value={formData.profissao}
                    onChange={(event) => handleChange("profissao", event.target.value)}
                    placeholder="Profissão"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_entrada">Data de entrada</Label>
                  <Input
                    id="data_entrada"
                    type="date"
                    value={formData.data_entrada}
                    onChange={(event) => handleChange("data_entrada", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(event) => handleChange("status", event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ativo">Ativo</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                    <input
                      id="ativo"
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(event) => handleChange("ativo", event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">Marcado como ativo</span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.observacoes}
                    onChange={(event) => handleChange("observacoes", event.target.value)}
                    placeholder="Adicione observações relevantes"
                  />
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Salvando..." : editingIndicatorId ? "Salvar alterações" : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 bg-card/70">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Parcerias comerciais</CardTitle>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>+ Novo Indicador</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="px-4 py-10 text-center text-muted-foreground">Carregando indicadores...</p>
          ) : indicators.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum indicador cadastrado ainda.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {indicators.map((indicator) => (
                <IndicatorCard
                  key={indicator.id}
                  indicator={indicator}
                  stats={indicatorStats[indicator.id] ?? { contatosRecebidos: 0, reunioesRealizadas: 0, vendasFechadas: 0, comissoesPagas: 0 }}
                  onEdit={() => handleEditIndicator(indicator)}
                  onDelete={() => void handleDeleteIndicator(indicator.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedIndicatorId && (
        <>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Contatos indicados</CardTitle>
              <Button onClick={() => setIsContactFormOpen(true)} size="sm">
                + Novo Contato
              </Button>
            </CardHeader>
          <CardContent>
            {isContactFormOpen && (
              <form className="mb-6 grid gap-4 rounded-lg border border-border/50 p-4 md:grid-cols-2" onSubmit={handleSaveContact}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact-nome">Nome</Label>
                  <Input
                    id="contact-nome"
                    value={contactFormData.nome}
                    onChange={(event) => handleContactChange("nome", event.target.value)}
                    placeholder="Digite o nome"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-telefone">Telefone</Label>
                  <Input
                    id="contact-telefone"
                    value={contactFormData.telefone}
                    onChange={(event) => handleContactChange("telefone", event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-cidade">Cidade</Label>
                  <Input
                    id="contact-cidade"
                    value={contactFormData.cidade}
                    onChange={(event) => handleContactChange("cidade", event.target.value)}
                    placeholder="Digite a cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-status">Status</Label>
                  <select
                    id="contact-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={contactFormData.status}
                    onChange={(event) => handleContactChange("status", event.target.value)}
                  >
                    <option value="Novo">Novo</option>
                    <option value="Em contato">Em contato</option>
                    <option value="Qualificado">Qualificado</option>
                    <option value="Fechado">Fechado</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact-observacoes">Observações</Label>
                  <textarea
                    id="contact-observacoes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={contactFormData.observacoes}
                    onChange={(event) => handleContactChange("observacoes", event.target.value)}
                    placeholder="Adicione observações relevantes"
                  />
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={isContactSaving}>
                    {isContactSaving ? "Salvando..." : editingContactId ? "Salvar alterações" : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleContactCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {isContactsLoading ? (
              <p className="px-4 py-10 text-center text-muted-foreground">Carregando contatos...</p>
            ) : contacts.length === 0 ? (
              <p className="px-4 py-10 text-center text-muted-foreground">Nenhum contato registrado para este indicador.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cidade</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-t border-border/50">
                        <td className="px-4 py-3">{contact.nome}</td>
                        <td className="px-4 py-3">{contact.telefone}</td>
                        <td className="px-4 py-3">{contact.cidade}</td>
                        <td className="px-4 py-3">{contact.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditContact(contact)}>
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void handleDeleteContact(contact.id)}>
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Automações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={() => void handleCopyAutomation("invite")}>
                  Copiar convite para indicador
                </Button>
                <Button variant="outline" onClick={() => void handleCopyAutomation("partnership")}>
                  Copiar apresentação da parceria
                </Button>
                <Button variant="outline" onClick={() => void handleCopyAutomation("contacts")}>
                  Copiar mensagem para contatos
                </Button>
                <Button variant="outline" onClick={() => void handleCopyAutomation("thanks")}>
                  Copiar texto de agradecimento
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historyEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-lg border border-border/50 p-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <div className="mt-2 h-full w-px bg-border" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{event.title}</p>
                        <span className="text-sm text-muted-foreground">
                          {event.date} • {event.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Usuário: {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <p className="px-4 py-10 text-center text-muted-foreground">
                  Nenhuma comissão registrada para este indicador.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">PIX</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="border-t border-border/50">
                          <td className="px-4 py-3">R$ {commission.valor.toFixed(2)}</td>
                          <td className="px-4 py-3">{commission.status}</td>
                          <td className="px-4 py-3">
                            {commission.data_pagamento ? new Date(commission.data_pagamento).toLocaleDateString("pt-BR") : "-"}
                          </td>
                          <td className="px-4 py-3">{commission.pix || "-"}</td>
                          <td className="px-4 py-3">
                            {commission.status !== "Pago" && (
                              <Button size="sm" variant="outline" onClick={() => void handleMarkCommissionAsPaid(commission.id)}>
                                Marcar como Pago
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

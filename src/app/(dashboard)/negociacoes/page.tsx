"use client";

import { useEffect, useState, useMemo } from "react";
import { useNegociacoes } from "@/hooks/use-negociacoes";
import { useClientes } from "@/hooks/use-clientes";
import { useLeads } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Handshake,
  History,
  Paperclip,
  CheckCircle2,
  X,
  UserCheck,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Copy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Negociacao, NegociacaoHistorico, NegociacaoAnexo } from "@/repositories/client/negociacoes.repository";
import type { Proposta } from "@/repositories/client/propostas.repository";
import {
  getPropostas,
  createProposta,
  updateProposta,
  deleteProposta,
  createPropostaFollowup,
  getPropostaFollowups,
  createPropostaReduzida,
  generatePropostaLink,
  generateConsorcioTemplate,
  generateCartaCreditoTemplate,
} from "@/repositories/client/propostas.repository";

const pipelineStages = [
  "Novo",
  "Contato",
  "Reunião",
  "Proposta",
  "Negociação",
  "Fechamento",
  "Venda",
] as const;

const emptyForm = {
  titulo: "",
  valor: "",
  etapa: "Novo" as Negociacao["etapa"],
  probabilidade: "0",
  data_prevista: "",
  observacoes: "",
  lead_id: "",
  cliente_id: "",
  modalidade: "",
  proposta: "",
  proxima_acao: "",
  data_proxima_acao: "",
};

type NegociacaoFormData = typeof emptyForm;

const emptyHistoricoForm = {
  tipo: "observacao" as NegociacaoHistorico["tipo"],
  descricao: "",
};

type HistoricoFormData = typeof emptyHistoricoForm;

const emptyTarefaForm = {
  descricao: "",
  data_prevista: "",
};

type TarefaFormData = typeof emptyTarefaForm;

export default function NegociacoesPage() {
  const { success, error } = useToast();
  const { list, create, update, remove, getHistorico, addHistorico, getAnexos, addAnexo, removeAnexo } = useNegociacoes();
  const { list: listLeads } = useLeads();
  const { list: listClientes } = useClientes();
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [filteredNegociacoes, setFilteredNegociacoes] = useState<Negociacao[]>([]);
  const [leads, setLeads] = useState<{ id: string; nome: string; telefone: string; email: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; telefone: string; email: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null);
  const [formData, setFormData] = useState<NegociacaoFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [etapaFilter, setEtapaFilter] = useState<string>("todos");
  const [historico, setHistorico] = useState<NegociacaoHistorico[]>([]);
  const [anexos, setAnexos] = useState<NegociacaoAnexo[]>([]);
  const [historicoForm, setHistoricoForm] = useState<HistoricoFormData>(emptyHistoricoForm);
  const [tarefas, setTarefas] = useState<{ id: string; descricao: string; data_prevista: string; done: boolean }[]>([]);
  const [tarefaForm, setTarefaForm] = useState<TarefaFormData>(emptyTarefaForm);
  const [isHistoricoSaving, setIsHistoricoSaving] = useState(false);
  const [isAnexoSaving, setIsAnexoSaving] = useState(false);
  const [isTarefaSaving, setIsTarefaSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isAnexosLoading, setIsAnexosLoading] = useState(false);
  const [tab, setTab] = useState("info");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<"parceiros" | "recrutamento" | "clientes" | "indicadores">("clientes");
  const [isConverting, setIsConverting] = useState(false);

  const [contatoSearch, setContatoSearch] = useState("");
  const [contatoResults, setContatoResults] = useState<{ id: string; nome: string; telefone: string; email: string; origem: string; type: "lead" | "cliente" | "indicador" }[]>([]);
  const [isContatoSearchLoading, setIsContatoSearchLoading] = useState(false);

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [isPropostasLoading, setIsPropostasLoading] = useState(false);
  const [isPropostaDialogOpen, setIsPropostaDialogOpen] = useState(false);
  const [isFollowupDialogOpen, setIsFollowupDialogOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({ propostaId: "", tipo: "nao_fechou", canal: "whatsapp", observacao: "", valorParcelaReduzida: "" });
  const [followups, setFollowups] = useState<{ id: string; tipo: string; canal: string; observacao: string; data_contato: string }[]>([]);
  const [propostaForm, setPropostaForm] = useState<{ titulo: string; tipo: "Imovel" | "Veiculo" | "Servicos" | "Outros bens moveis"; valorTipo: "Cheio" | "Reduzida"; valor: string; administradora: string; numeroParcelas: string; valorEntrada: string; valorParcela: string; taxaAdministracao: string; banco: string; taxaJuros: string; prazo: string; observacoes: string; banner_caminho?: string | null }>({
    titulo: "",
    tipo: "Imovel",
    valorTipo: "Cheio",
    valor: "",
    administradora: "",
    numeroParcelas: "",
    valorEntrada: "",
    valorParcela: "",
    taxaAdministracao: "",
    banco: "",
    taxaJuros: "",
    prazo: "",
    observacoes: "",
    banner_caminho: null,
  });

  const loadNegociacoes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [negociacoesData, leadsData, clientesData] = await Promise.all([list(), listLeads(), listClientes()]);
      setNegociacoes(negociacoesData);
      setFilteredNegociacoes(negociacoesData);
      setLeads(leadsData.map((l: { id: string; nome: string; telefone: string; email?: string }) => ({ id: l.id, nome: l.nome, telefone: l.telefone, email: l.email || "" })));
      setClientes(clientesData.map((c: { id: string; nome: string; telefone: string; email?: string }) => ({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email || "" })));
    } catch {
      setErrorMessage("Não foi possível carregar as negociações.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNegociacoes();
  }, []);

  const searchContatosUnificados = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setContatoResults([]);
      return;
    }
    setIsContatoSearchLoading(true);
    try {
      const { searchLeads } = await import("@/repositories/client/leads.repository");
      const { searchClientes } = await import("@/repositories/client/clientes.repository");
      const { searchIndicadores } = await import("@/repositories/client/indicadores.repository");

      const [leadsData, clientesData, indicadoresData] = await Promise.allSettled([
        searchLeads(trimmed),
        searchClientes(trimmed),
        searchIndicadores(trimmed),
      ]);

      const results: { id: string; nome: string; telefone: string; email: string; origem: string; type: "lead" | "cliente" | "indicador" }[] = [];

      if (leadsData.status === "fulfilled") {
        leadsData.value.forEach((l) => {
          results.push({ id: l.id, nome: l.nome, telefone: l.telefone, email: l.email || "", origem: "Lead", type: "lead" });
        });
      }
      if (clientesData.status === "fulfilled") {
        clientesData.value.forEach((c) => {
          results.push({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email || "", origem: "Cliente", type: "cliente" });
        });
      }
      if (indicadoresData.status === "fulfilled") {
        indicadoresData.value.forEach((i) => {
          results.push({ id: i.id, nome: i.nome, telefone: i.telefone, email: i.email || "", origem: "Indicador", type: "indicador" });
        });
      }

      setContatoResults(results);
    } catch {
      setContatoResults([]);
    } finally {
      setIsContatoSearchLoading(false);
    }
  };

  useEffect(() => {
    let result = negociacoes;
    if (etapaFilter !== "todos") {
      result = result.filter((n) => n.etapa === etapaFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((n) => {
        const lead = leads.find((l) => l.id === n.lead_id);
        const cliente = clientes.find((c) => c.id === n.cliente_id);
        return (
          n.titulo.toLowerCase().includes(q) ||
          n.observacoes.toLowerCase().includes(q) ||
          n.modalidade.toLowerCase().includes(q) ||
          n.proposta.toLowerCase().includes(q) ||
          n.proxima_acao.toLowerCase().includes(q) ||
          (lead?.nome?.toLowerCase().includes(q) ?? false) ||
          (lead?.telefone?.toLowerCase().includes(q) ?? false) ||
          (cliente?.nome?.toLowerCase().includes(q) ?? false) ||
          (cliente?.telefone?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    setFilteredNegociacoes(result);
  }, [searchQuery, etapaFilter, negociacoes]);

  const handleChange = (field: keyof NegociacaoFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setSelectedNegociacao(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setFormData({
      titulo: negociacao.titulo,
      valor: String(negociacao.valor),
      etapa: negociacao.etapa,
      probabilidade: String(negociacao.probabilidade),
      data_prevista: negociacao.data_prevista,
      observacoes: negociacao.observacoes,
      lead_id: negociacao.lead_id,
      cliente_id: negociacao.cliente_id || "",
      modalidade: negociacao.modalidade,
      proposta: negociacao.proposta,
      proxima_acao: negociacao.proxima_acao,
      data_proxima_acao: negociacao.data_proxima_acao || "",
    });
    setIsFormOpen(true);
  };

  const openDelete = (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setIsDeleteOpen(true);
  };

  const openDetail = async (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setTab("info");
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    setIsHistoryLoading(true);
    setIsAnexosLoading(true);
    try {
      const [hist, anex, propostasData] = await Promise.all([
        getHistorico(negociacao.id),
        getAnexos(negociacao.id),
        getPropostas(negociacao.id),
      ]);
      setHistorico(hist);
      setAnexos(anex);
      setPropostas(propostasData);
    } catch {
      setHistorico([]);
      setAnexos([]);
      setPropostas([]);
    } finally {
      setIsLoadingDetail(false);
      setIsHistoryLoading(false);
      setIsAnexosLoading(false);
    }
  };

  const openConvert = (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setConvertTarget("clientes");
    setIsConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!selectedNegociacao) return;
    const supabase = createClient();
    setIsConverting(true);
    try {
      const { getLead } = await import("@/repositories/client/leads.repository");
      const { getCliente } = await import("@/repositories/client/clientes.repository");

      let nome = "";
      let telefone = "";
      let email = "";
      let observacoes = "";
      let origem = "Negociações";

      if (selectedNegociacao.lead_id) {
        const lead = await getLead(selectedNegociacao.lead_id);
        if (lead) {
          nome = lead.nome;
          telefone = lead.telefone;
          email = lead.email || "";
          observacoes = lead.observacoes || "";
        }
      }
      if (selectedNegociacao.cliente_id && !nome) {
        const cliente = await getCliente(selectedNegociacao.cliente_id);
        if (cliente) {
          nome = cliente.nome;
          telefone = cliente.telefone;
          email = cliente.email || "";
          observacoes = cliente.observacoes || "";
          origem = cliente.origem || "Negociações";
        }
      }

      if (!nome) {
        error("Não foi possível localizar o contato associado a esta negociação.");
        return;
      }

      if (convertTarget === "clientes") {
        const { error: supabaseError } = await supabase.from("clientes").insert({
          nome,
          telefone,
          email,
          observacoes: observacoes || "Convertido de negociação",
          origem,
          status: "Ativo",
        });
        if (supabaseError) throw supabaseError;
      } else if (convertTarget === "parceiros") {
        const { error: supabaseError } = await supabase.from("parceiros").insert({
          nome,
          cnpj: "",
          contato: nome,
          email,
          telefone,
          tipo: "",
          status: "Ativo",
          observacoes: observacoes || "Convertido de negociação",
        });
        if (supabaseError) throw supabaseError;
      } else if (convertTarget === "recrutamento") {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: supabaseError } = await supabase.from("recrutamento").insert({
          nome,
          email,
          telefone,
          origem: "Negociações",
          status: "Novo",
          observacoes: observacoes || "Convertido de negociação",
          usuario_id: user?.id || "",
        });
        if (supabaseError) throw supabaseError;
      } else if (convertTarget === "indicadores") {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: supabaseError } = await supabase.from("indicadores").insert({
          nome,
          telefone,
          email,
          cidade: "",
          estado: "",
          cpf: "",
          pix: "",
          origem: origem || "Negociações",
          status: "Ativo",
          observacoes: observacoes || "Convertido de negociação",
          ativo: true,
          usuario_id: user?.id || "",
          grupo_whatsapp: false,
          link_grupo: "",
          grupo_criado: false,
        });
        if (supabaseError) throw supabaseError;
      }

      success("Contato convertido com sucesso.");
      setIsConvertOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível converter o contato.";
      console.error("[Negociacoes] handleConvert error:", err, message);
      error(message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.titulo.trim()) return;

    setIsSaving(true);
    try {
    const payload = {
      titulo: formData.titulo.trim(),
      valor: Number(formData.valor) || 0,
      etapa: formData.etapa,
      probabilidade: Number(formData.probabilidade) || 0,
      data_prevista: formData.data_prevista,
      observacoes: formData.observacoes.trim(),
      cliente_id: formData.cliente_id || null,
      modalidade: formData.modalidade.trim(),
      proposta: formData.proposta.trim(),
      proxima_acao: formData.proxima_acao.trim(),
      data_proxima_acao: formData.data_proxima_acao || null,
      ...(formData.lead_id ? { lead_id: formData.lead_id } : {}),
    };
    if (!selectedNegociacao && !formData.lead_id) {
      error("Selecione uma lead antes de salvar.");
      setIsSaving(false);
      return;
    }
    if (selectedNegociacao) {
        const updated = await update(selectedNegociacao.id, payload);
        setNegociacoes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        if (isDetailOpen && selectedNegociacao.id === updated.id) {
          setSelectedNegociacao(updated);
        } else {
          setSelectedNegociacao(null);
        }
      } else {
        const created = await create(payload);
        setNegociacoes((prev) => [created, ...prev]);
        setSelectedNegociacao(null);
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
    } catch (err) {
      console.error("[Negociacoes] handleSubmit error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNegociacao) return;
    try {
      await remove(selectedNegociacao.id);
      setNegociacoes((prev) => prev.filter((n) => n.id !== selectedNegociacao.id));
      setFilteredNegociacoes((prev) => prev.filter((n) => n.id !== selectedNegociacao.id));
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedNegociacao(null);
    } catch {
      // erro tratado no hook
    }
  };

  const getContatoDaNegociacao = () => {
    if (!selectedNegociacao) return null;
    const lead = leads.find((l) => l.id === selectedNegociacao.lead_id);
    const cliente = clientes.find((c) => c.id === selectedNegociacao.cliente_id);
    const contato = cliente || lead;
    return contato || null;
  };

  const selectContatoFromList = (id: string) => {
    if (!id) return "";
    return leads.find((l) => l.id === id)?.nome || clientes.find((c) => c.id === id)?.nome || "";
  };

  const handleWhatsAppContato = () => {
    const contato = getContatoDaNegociacao();
    if (!contato || !contato.telefone) {
      error("Contato não encontrado ou sem telefone.");
      return;
    }
    const digits = contato.telefone.replace(/\D/g, "");
    if (!digits) {
      error("Telefone inválido para WhatsApp.");
      return;
    }
    const mensagem = `Olá ${contato.nome}, tudo bem? Estamos entrando em contato sobre sua negociação no CRM.`;
    const link = `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`;
    window.open(link, "_blank");
  };

  const handleSMSContato = () => {
    const contato = getContatoDaNegociacao();
    if (!contato || !contato.telefone) {
      error("Contato não encontrado ou sem telefone.");
      return;
    }
    const digits = contato.telefone.replace(/\D/g, "");
    if (!digits) {
      error("Telefone inválido para SMS.");
      return;
    }
    window.location.href = `sms:+55${digits}?body=${encodeURIComponent("Olá, estamos entrando em contato sobre sua negociação.")}`;
  };

  const handleEmailContato = () => {
    const contato = getContatoDaNegociacao();
    if (!contato || !contato.email) {
      error("Contato não encontrado ou sem e-mail.");
      return;
    }
    window.location.href = `mailto:${contato.email}`;
  };

  const handleLigarContato = () => {
    const contato = getContatoDaNegociacao();
    if (!contato || !contato.telefone) {
      error("Contato não encontrado ou sem telefone.");
      return;
    }
    const digits = contato.telefone.replace(/\D/g, "");
    if (!digits) {
      error("Telefone inválido para ligação.");
      return;
    }
    window.location.href = `tel:+55${digits}`;
  };

  const loadPropostas = async () => {
    if (!selectedNegociacao) return;
    setIsPropostasLoading(true);
    try {
      const data = await getPropostas(selectedNegociacao.id);
      setPropostas(data);
    } catch {
      setPropostas([]);
    } finally {
      setIsPropostasLoading(false);
    }
  };

  const handleGerarProposta = async () => {
    if (!selectedNegociacao) return;
    try {
      const valor = Number(propostaForm.valor) || 0;
      let conteudo = "";

      if (propostaForm.tipo === "Imovel" || propostaForm.tipo === "Veiculo" || propostaForm.tipo === "Servicos" || propostaForm.tipo === "Outros bens moveis") {
        conteudo = generateConsorcioTemplate({
          titulo: propostaForm.titulo,
          valor,
          tipo: propostaForm.tipo,
          valorTipo: propostaForm.valorTipo,
          administradora: propostaForm.administradora,
          numeroParcelas: Number(propostaForm.numeroParcelas) || 0,
          valorEntrada: Number(propostaForm.valorEntrada) || 0,
          valorParcela: Number(propostaForm.valorParcela) || 0,
          taxaAdministracao: Number(propostaForm.taxaAdministracao) || 0,
          observacoes: propostaForm.observacoes,
        });
      } else {
        conteudo = generateCartaCreditoTemplate({
          titulo: propostaForm.titulo,
          valor,
          tipo: propostaForm.tipo,
          valorTipo: propostaForm.valorTipo,
          administradora: propostaForm.administradora,
          banco: propostaForm.banco,
          taxaJuros: Number(propostaForm.taxaJuros) || 0,
          numeroParcelas: Number(propostaForm.numeroParcelas) || 0,
          valorParcela: Number(propostaForm.valorParcela) || 0,
          prazo: Number(propostaForm.prazo) || 0,
          observacoes: propostaForm.observacoes,
        });
      }

      const created = await createProposta({
        negociacao_id: selectedNegociacao.id,
        titulo: propostaForm.titulo,
        tipo: propostaForm.tipo,
        conteudo,
        status: "rascunho",
        banner_caminho: propostaForm.banner_caminho || null,
      });

      setPropostas((prev) => [created, ...prev]);
      setIsPropostaDialogOpen(false);
      success("Proposta gerada com sucesso.");
    } catch {
      error("Não foi possível gerar a proposta.");
    }
  };

  const handleSendProposta = async (propostaId: string, canal: "whatsapp" | "email" | "link") => {
    const contato = getContatoDaNegociacao();
    if (!contato) {
      error("Nenhum contato associado a esta negociação.");
      return;
    }
    try {
      const proposta = propostas.find((p) => p.id === propostaId);
      if (!proposta) return;

      const link = generatePropostaLink(proposta);

      if (canal === "whatsapp") {
        const digits = contato.telefone.replace(/\D/g, "");
        if (!digits) {
          error("Telefone inválido para WhatsApp.");
          return;
        }
        const mensagem = `${proposta.titulo}\n\nOlá ${contato.nome}, segue sua proposta:\n${link}`;
        window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`, "_blank");
      } else if (canal === "email") {
        window.location.href = `mailto:${contato.email}?subject=${encodeURIComponent(proposta.titulo)}&body=${encodeURIComponent(`Olá ${contato.nome},\n\nSegue sua proposta:\n${link}`)}`;
      } else if (canal === "link") {
        await navigator.clipboard.writeText(link);
        success("Link da proposta copiado para área de transferência.");
      }

      await updateProposta(propostaId, {
        data_envio: new Date().toISOString(),
        enviado_para: contato.nome,
        enviado_canal: canal,
        status: "enviada",
      });

      await loadPropostas();
    } catch {
      error("Não foi possível enviar a proposta.");
    }
  };

  const handleCopyPropostaLink = async (proposta: Proposta) => {
    try {
      const link = generatePropostaLink(proposta);
      await navigator.clipboard.writeText(link);
      success("Link copiado.");
    } catch {
      error("Não foi possível copiar o link.");
    }
  };

  const handleDeleteProposta = async (propostaId: string) => {
    try {
      await deleteProposta(propostaId);
      setPropostas((prev) => prev.filter((p) => p.id !== propostaId));
      success("Proposta excluída.");
    } catch {
      error("Não foi possível excluir a proposta.");
    }
  };

  const openFollowup = (proposta: Proposta) => {
    setFollowupForm({ propostaId: proposta.id, tipo: "nao_fechou", canal: "whatsapp", observacao: "", valorParcelaReduzida: "" });
    setIsFollowupDialogOpen(true);
  };

  const handleSaveFollowup = async () => {
    if (!followupForm.propostaId) return;
    try {
      await createPropostaFollowup(followupForm.propostaId, {
        tipo: followupForm.tipo,
        canal: followupForm.canal,
        observacao: followupForm.observacao,
      });

      if (followupForm.tipo === "parcela_reduzida" && followupForm.valorParcelaReduzida) {
        await createPropostaReduzida(followupForm.propostaId, {
          valor_parcela_reduzida: Number(followupForm.valorParcelaReduzida),
          observacoes: followupForm.observacao,
        });
      }

      const followupsData = await getPropostaFollowups(followupForm.propostaId);
      setFollowups(followupsData.map((f) => ({ id: f.id, tipo: f.tipo, canal: f.canal, observacao: f.observacao, data_contato: f.data_contato })));
      setIsFollowupDialogOpen(false);
      success("Follow-up registrado.");
      await loadPropostas();
    } catch {
      error("Não foi possível registrar o follow-up.");
    }
  };

  const loadFollowups = async (propostaId: string) => {
    try {
      const followupsData = await getPropostaFollowups(propostaId);
      setFollowups(followupsData.map((f) => ({ id: f.id, tipo: f.tipo, canal: f.canal, observacao: f.observacao, data_contato: f.data_contato })));
    } catch {
      setFollowups([]);
    }
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNegociacao || !historicoForm.descricao.trim()) return;
    setIsHistoricoSaving(true);
    try {
      const item = await addHistorico(selectedNegociacao.id, historicoForm);
      setHistorico((prev) => [item, ...prev]);
      setHistoricoForm(emptyHistoricoForm);
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistoricoSaving(false);
    }
  };

  const handleAddAnexo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNegociacao) return;
    const input = document.getElementById(`anexo-file-${selectedNegociacao.id}`) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setIsAnexoSaving(true);
    try {
      const item = await addAnexo(selectedNegociacao.id, file);
      setAnexos((prev) => [item, ...prev]);
      setFileInputKey((k) => k + 1);
    } catch {
      // erro tratado no hook
    } finally {
      setIsAnexoSaving(false);
    }
  };

  const handleRemoveAnexo = async (id: string) => {
    try {
      await removeAnexo(id);
      setAnexos((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // erro tratado no hook
    }
  };

  const handleAddTarefa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNegociacao || !tarefaForm.descricao.trim()) return;
    setIsTarefaSaving(true);
    try {
      const item = {
        id: Math.random().toString(36).slice(2),
        descricao: tarefaForm.descricao.trim(),
        data_prevista: tarefaForm.data_prevista,
        done: false,
      };
      setTarefas((prev) => [...prev, item]);
      setTarefaForm(emptyTarefaForm);
    } finally {
      setIsTarefaSaving(false);
    }
  };

  const handleToggleTarefa = (id: string) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleRemoveTarefa = (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  };

  const etapasOptions = useMemo(() => {
    const etapas = new Set(negociacoes.map((n) => n.etapa));
    return Array.from(etapas);
  }, [negociacoes]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatPropostaTipo = (tipo: string) => {
    switch (tipo) {
      case "Imovel":
        return "Imóvel";
      case "Veiculo":
        return "Veículo";
      case "Servicos":
        return "Serviços";
      case "Outros bens moveis":
        return "Outros bens móveis";
      default:
        return tipo;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Negociações</h2>
          <p className="text-sm text-muted-foreground">Pipeline de vendas e propostas em andamento</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Negociação
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pipelineStages.map((stage) => {
          const stageNegociacoes = filteredNegociacoes.filter((n) => n.etapa === stage);
          const stageValue = stageNegociacoes.reduce((sum, n) => sum + Number(n.valor || 0), 0);
          return (
            <Card key={stage} className="border-border/50 bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stage}</CardTitle>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{stageNegociacoes.length} negociação(ões)</span>
                  <span className="text-xs font-medium">{formatCurrency(stageValue)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageNegociacoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma negociação nesta etapa.</p>
                ) : (
                  stageNegociacoes.slice(0, 5).map((negociacao) => (
                    <div
                      key={negociacao.id}
                      className="cursor-pointer rounded-lg border border-border/50 p-3 transition hover:border-primary/40"
                      onClick={() => openDetail(negociacao)}
                    >
                      <p className="text-sm font-medium">{negociacao.titulo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(Number(negociacao.valor))}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{negociacao.etapa}</Badge>
                        <span className="text-xs text-muted-foreground">{negociacao.probabilidade}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as negociações</CardTitle>
          <CardDescription>
            {filteredNegociacoes.length > 0 ? `${filteredNegociacoes.length} negociação(ões) encontrada(s)` : "Nenhuma negociação cadastrada ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título, proposta..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={etapaFilter}
              onChange={(event) => setEtapaFilter(event.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todas</option>
              {etapasOptions.map((etapa) => (
                <option key={etapa} value={etapa}>
                  {etapa}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNegociacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma negociação cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Probabilidade</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNegociacoes.map((negociacao) => (
                    <TableRow key={negociacao.id}>
                      <TableCell className="font-medium">{negociacao.titulo}</TableCell>
                      <TableCell>{formatCurrency(Number(negociacao.valor))}</TableCell>
                      <TableCell>
                        <Badge variant={negociacao.etapa === "Venda" ? "success" : negociacao.etapa === "Perdido" ? "destructive" : "secondary"}>
                          {negociacao.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell>{negociacao.probabilidade}%</TableCell>
                      <TableCell>{new Date(negociacao.data_prevista).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(negociacao)} aria-label="Ver detalhes">
                          <Handshake className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(negociacao)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(negociacao)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNegociacao ? "Editar negociação" : "Nova negociação"}</DialogTitle>
            <DialogDescription>{selectedNegociacao ? "Atualize as informações da negociação." : "Cadastre uma nova negociação no pipeline."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={formData.titulo} onChange={(e) => handleChange("titulo", e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input id="valor" type="number" step="0.01" value={formData.valor} onChange={(e) => handleChange("valor", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probabilidade">Probabilidade (%)</Label>
                <Input id="probabilidade" type="number" min="0" max="100" value={formData.probabilidade} onChange={(e) => handleChange("probabilidade", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="etapa">Etapa</Label>
                <select id="etapa" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.etapa} onChange={(e) => handleChange("etapa", e.target.value)}>
                  {pipelineStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_prevista">Data Prevista</Label>
                <Input id="data_prevista" type="date" value={formData.data_prevista} onChange={(e) => handleChange("data_prevista", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead_id">Lead / Cliente / Indicador</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lead_id"
                    placeholder="Buscar por nome ou telefone..."
                    value={formData.lead_id ? (contatoResults.find((c) => c.id === formData.lead_id)?.nome || contatoSearch) : contatoSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setContatoSearch(value);
                      void searchContatosUnificados(value);
                    }}
                    className="pl-9"
                  />
                </div>
                {contatoResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border">
                    {contatoResults.map((contato) => (
                      <div
                        key={contato.id}
                        className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted"
                        onClick={() => {
                          if (contato.type === "lead") {
                            setFormData((prev) => ({ ...prev, lead_id: contato.id, cliente_id: "" }));
                          } else {
                            setFormData((prev) => ({ ...prev, cliente_id: contato.id, lead_id: "" }));
                          }
                          setContatoSearch(contato.nome);
                          setContatoResults([]);
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">{contato.nome}</p>
                          <p className="text-xs text-muted-foreground">{contato.telefone}</p>
                          {contato.email && <p className="text-xs text-muted-foreground">{contato.email}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {contato.origem}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                {formData.lead_id && !contatoResults.length && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
                    <span className="text-xs text-muted-foreground">Selecionado: </span>
                    <span className="text-xs font-medium">
                      {selectContatoFromList(formData.lead_id) || selectContatoFromList(formData.cliente_id) || "—"}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalidade">Modalidade</Label>
                <Input id="modalidade" value={formData.modalidade} onChange={(e) => handleChange("modalidade", e.target.value)} placeholder="Ex: Consórcio, Financiamento, Carta de Crédito" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modalidade">Modalidade</Label>
                <Input id="modalidade" value={formData.modalidade} onChange={(e) => handleChange("modalidade", e.target.value)} placeholder="Ex: Consórcio, Financiamento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxima_acao">Próxima Ação</Label>
                <Input id="proxima_acao" value={formData.proxima_acao} onChange={(e) => handleChange("proxima_acao", e.target.value)} placeholder="Ex: Ligar, Enviar proposta" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_proxima_acao">Data Próxima Ação</Label>
              <Input id="data_proxima_acao" type="date" value={formData.data_proxima_acao} onChange={(e) => handleChange("data_proxima_acao", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposta">Proposta</Label>
              <Textarea id="proposta" value={formData.proposta} onChange={(e) => handleChange("proposta", e.target.value)} placeholder="Descreva a proposta..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedNegociacao(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedNegociacao ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir negociação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a negociação <strong>{selectedNegociacao?.titulo}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={(open) => { if (!open) { setIsDetailOpen(false); setSelectedNegociacao(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {isLoadingDetail || !selectedNegociacao ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNegociacao.titulo}</DialogTitle>
                <DialogDescription>{selectedNegociacao.etapa} • {formatCurrency(Number(selectedNegociacao.valor))}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 border-b">
                <Button variant={tab === "info" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("info")}>Informações</Button>
                <Button variant={tab === "historico" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("historico")}>Histórico</Button>
                <Button variant={tab === "anexos" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("anexos")}>Anexos</Button>
                <Button variant={tab === "tarefas" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("tarefas")}>Tarefas</Button>
                <Button variant={tab === "comunicacao" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("comunicacao")}>Comunicação</Button>
                <Button variant={tab === "propostas" ? "secondary" : "ghost"} size="sm" onClick={() => { setTab("propostas"); if (selectedNegociacao) { void loadPropostas(); } }}>Propostas</Button>
              </div>
               {tab === "info" && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Título</p>
                    <p className="text-sm">{selectedNegociacao.titulo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Etapa</p>
                    <Badge variant={selectedNegociacao.etapa === "Venda" ? "success" : "secondary"}>{selectedNegociacao.etapa}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Valor</p>
                    <p className="text-sm">{formatCurrency(Number(selectedNegociacao.valor))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Probabilidade</p>
                    <p className="text-sm">{selectedNegociacao.probabilidade}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Data Prevista</p>
                    <p className="text-sm">{new Date(selectedNegociacao.data_prevista).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Modalidade</p>
                    <p className="text-sm">{selectedNegociacao.modalidade || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Próxima Ação</p>
                    <p className="text-sm">{selectedNegociacao.proxima_acao || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Data Próxima Ação</p>
                    <p className="text-sm">{selectedNegociacao.data_proxima_acao ? new Date(selectedNegociacao.data_proxima_acao).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Proposta</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedNegociacao.proposta || "—"}</p>
                  </div>
                   <div className="md:col-span-2">
                     <p className="text-xs font-medium text-muted-foreground">Observações</p>
                     <p className="text-sm whitespace-pre-wrap">{selectedNegociacao.observacoes || "—"}</p>
                   </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openConvert(selectedNegociacao)}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Converter contato
                    </Button>
                  </div>
                </>
              )}
              {tab === "historico" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddHistorico} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tipo-historico">Tipo</Label>
                        <select id="tipo-historico" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={historicoForm.tipo} onChange={(e) => setHistoricoForm({ ...historicoForm, tipo: e.target.value as NegociacaoHistorico["tipo"] })}>
                          <option value="observacao">Observação</option>
                          <option value="ligacao">Ligação</option>
                          <option value="reuniao">Reunião</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricao-historico">Descrição</Label>
                        <Input id="descricao-historico" value={historicoForm.descricao} onChange={(e) => setHistoricoForm({ ...historicoForm, descricao: e.target.value })} required />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={isHistoricoSaving}>
                      {isHistoricoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                      Adicionar
                    </Button>
                  </form>
                  {isHistoryLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {historico.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs capitalize">{item.tipo}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                          <p className="mt-2 text-sm">{item.descricao}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "anexos" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddAnexo} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`anexo-file-${selectedNegociacao.id}`}>Anexo</Label>
                      <Input key={fileInputKey} id={`anexo-file-${selectedNegociacao.id}`} type="file" onChange={() => {}} />
                    </div>
                    <Button type="submit" size="sm" disabled={isAnexoSaving}>
                      {isAnexoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                      Anexar
                    </Button>
                  </form>
                  {isAnexosLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : anexos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum anexo registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {anexos.map((anexo) => (
                        <div key={anexo.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{anexo.nome}</p>
                              <p className="text-xs text-muted-foreground">{new Intl.NumberFormat("pt-BR", { style: "decimal" }).format(anexo.tamanho)} bytes</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAnexo(anexo.id)} aria-label="Remover anexo">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "tarefas" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddTarefa} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tarefa_descricao">Descrição</Label>
                        <Input id="tarefa_descricao" value={tarefaForm.descricao} onChange={(e) => setTarefaForm({ ...tarefaForm, descricao: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tarefa_data">Data Prevista</Label>
                        <Input id="tarefa_data" type="date" value={tarefaForm.data_prevista} onChange={(e) => setTarefaForm({ ...tarefaForm, data_prevista: e.target.value })} />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={isTarefaSaving}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </form>
                  {tarefas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {tarefas.map((tarefa) => (
                        <div key={tarefa.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleTarefa(tarefa.id)} aria-label="Concluir">
                              <CheckCircle2 className={`h-4 w-4 ${tarefa.done ? "text-green-600" : "text-muted-foreground"}`} />
                            </Button>
                            <div>
                              <p className={`text-sm ${tarefa.done ? "line-through text-muted-foreground" : ""}`}>{tarefa.descricao}</p>
                              <p className="text-xs text-muted-foreground">{tarefa.data_prevista ? new Date(tarefa.data_prevista).toLocaleDateString("pt-BR") : "Sem data"}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveTarefa(tarefa.id)} aria-label="Remover">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "comunicacao" && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    {getContatoDaNegociacao() ? (
                      <div className="flex items-center gap-2">
                        <span>Contato: <strong>{getContatoDaNegociacao()?.nome}</strong></span>
                        <span>{getContatoDaNegociacao()?.telefone}</span>
                      </div>
                    ) : (
                      "Nenhum contato associado. Selecione um lead ou cliente na aba Informações."
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={handleWhatsAppContato}
                    >
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span>WhatsApp</span>
                      <span className="text-xs">Abrir conversa no WhatsApp</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={handleSMSContato}
                    >
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <span>SMS</span>
                      <span className="text-xs">Enviar mensagem de texto</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={handleEmailContato}
                    >
                      <Mail className="h-5 w-5 text-purple-600" />
                      <span>E-mail</span>
                      <span className="text-xs">Abrir cliente de e-mail</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={handleLigarContato}
                    >
                      <Phone className="h-5 w-5 text-green-700" />
                      <span>Ligar</span>
                      <span className="text-xs">Iniciar ligação telefônica</span>
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Compartilhar Proposta</h4>
                    {propostas.length > 0 ? (
                      <div className="space-y-2">
                        {propostas.map((proposta) => (
                          <div key={proposta.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">{proposta.titulo}</p>
                              <p className="text-xs text-muted-foreground">
                                 {formatPropostaTipo(proposta.tipo)} • {proposta.acessos} visualização(es)
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendProposta(proposta.id, "whatsapp")}
                                aria-label="Enviar por WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendProposta(proposta.id, "email")}
                                aria-label="Enviar por e-mail"
                              >
                                <Mail className="h-4 w-4 text-purple-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyPropostaLink(proposta)}
                                aria-label="Copiar link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma proposta gerada. Gere uma proposta na aba Propostas.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {tab === "propostas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Propostas de Consórcio e Crédito</h3>
                    <Button size="sm" onClick={() => { setPropostaForm({ titulo: "", tipo: "Imovel", valorTipo: "Cheio", valor: "", administradora: "", numeroParcelas: "", valorEntrada: "", valorParcela: "", taxaAdministracao: "", banco: "", taxaJuros: "", prazo: "", observacoes: "" }); setIsPropostaDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Proposta
                    </Button>
                  </div>

                  {isPropostasLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : propostas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma proposta gerada para esta negociação.</p>
                  ) : (
                    <div className="space-y-4">
                      {propostas.map((proposta) => (
                      <Card key={proposta.id} className="border-border/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{proposta.titulo}</CardTitle>
                            <Badge variant={proposta.status === "enviada" ? "success" : proposta.status === "followup_enviado" ? "outline" : "secondary"}>
                              {proposta.status === "enviada" ? "Enviada" : proposta.status === "followup_enviado" ? "Follow-up" : "Rascunho"}
                            </Badge>
                          </div>
                          <CardDescription>
                            {formatPropostaTipo(proposta.tipo)} • Gerada em {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                          </CardDescription>
                        </CardHeader>
                        {proposta.banner_caminho && (
                          <CardContent>
                            <img src={proposta.banner_caminho} alt="Banner" className="w-full rounded-md border" />
                          </CardContent>
                        )}
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Acessos</p>
                              <p className="text-2xl font-bold">{proposta.acessos}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Última visualização</p>
                              <p className="text-sm">
                                {proposta.ultima_visualizacao
                                  ? new Date(proposta.ultima_visualizacao).toLocaleString("pt-BR")
                                  : "Nunca"}
                              </p>
                            </div>
                          </div>
                          {proposta.valor_parcela_cheia && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Parcela cheia: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(proposta.valor_parcela_cheia))}
                            </div>
                          )}
                          {proposta.valor_parcela_reduzida && (
                            <div className="mt-1 text-xs text-green-700">
                              Parcela reduzida: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(proposta.valor_parcela_reduzida))}
                            </div>
                          )}
                          {proposta.data_envio && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Enviada para: {proposta.enviado_para} via {proposta.enviado_canal}
                              {" "}em {new Date(proposta.data_envio).toLocaleString("pt-BR")}
                            </div>
                          )}
                        </CardContent>
                        <CardContent className="flex flex-wrap gap-2 border-t pt-4">
                          <Button size="sm" variant="outline" onClick={() => handleCopyPropostaLink(proposta)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar link
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSendProposta(proposta.id, "whatsapp")}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Enviar WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSendProposta(proposta.id, "email")}>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar E-mail
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(generatePropostaLink(proposta), "_blank", "noopener,noreferrer")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visualizar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openFollowup(proposta)}>
                            <History className="mr-2 h-4 w-4" />
                            Follow-up
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteProposta(proposta.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </CardContent>
                        {followups.length > 0 && proposta.id === followupForm.propostaId && (
                          <CardContent className="border-t">
                            <p className="text-xs font-medium mb-2">Follow-ups</p>
                            <div className="space-y-2">
                              {followups.map((f) => (
                                <div key={f.id} className="rounded-md border p-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{f.tipo === "nao_fechou" ? "Não fechou" : f.tipo === "parcela_reduzida" ? "Parcela reduzida" : f.tipo}</span>
                                    <span className="text-muted-foreground">{new Date(f.data_contato).toLocaleString("pt-BR")}</span>
                                  </div>
                                  {f.observacao && <p className="mt-1 text-muted-foreground">{f.observacao}</p>}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter contato</DialogTitle>
            <DialogDescription>
              Selecione para qual módulo deseja converter o contato associado à negociação <strong>{selectedNegociacao?.titulo}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destino</Label>
              <select
                value={convertTarget}
                onChange={(e) => setConvertTarget(e.target.value as "parceiros" | "recrutamento" | "clientes" | "indicadores")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="clientes">Cliente</option>
                <option value="parceiros">Parceiro</option>
                <option value="recrutamento">Recrutamento</option>
                <option value="indicadores">Indicador</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)} disabled={isConverting}>
              Cancelar
            </Button>
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Converter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPropostaDialogOpen} onOpenChange={setIsPropostaDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Nova Proposta</DialogTitle>
            <DialogDescription>
              Crie uma proposta de consórcio ou carta de crédito para o cliente desta negociação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Proposta</Label>
              <select
                value={propostaForm.tipo}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, tipo: e.target.value as "Imovel" | "Veiculo" | "Servicos" | "Outros bens moveis" }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Imovel">Imóvel</option>
                <option value="Veiculo">Veículo</option>
                <option value="Servicos">Serviços</option>
                <option value="Outros bens moveis">Outros bens móveis</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Valor</Label>
              <select
                value={propostaForm.valorTipo}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, valorTipo: e.target.value as "Cheio" | "Reduzida" }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Cheio">Cheio</option>
                <option value="Reduzida">Reduzida</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-titulo">Título</Label>
              <Input
                id="p-titulo"
                value={propostaForm.titulo}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Proposta Consórcio 2025"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Banner da proposta (imagem)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPropostaForm((prev) => ({ ...prev, banner_caminho: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {propostaForm.banner_caminho && (
                <img src={propostaForm.banner_caminho} alt="Banner" className="mt-2 max-h-32 rounded-md border" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-valor">Valor (R$)</Label>
                <Input
                  id="p-valor"
                  type="number"
                  step="0.01"
                  value={propostaForm.valor}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-administradora">Administradora</Label>
                <Input
                  id="p-administradora"
                  value={propostaForm.administradora}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, administradora: e.target.value }))}
                  placeholder="Ex: BMG Consórcios"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-valor-tipo">Tipo de Valor</Label>
              <select
                value={propostaForm.valorTipo}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, valorTipo: e.target.value as "Cheio" | "Reduzida" }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Cheio">Cheio</option>
                <option value="Reduzida">Reduzida</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-banco">Banco / Administradora</Label>
                <Input
                  id="p-banco"
                  value={propostaForm.administradora}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, administradora: e.target.value }))}
                  placeholder="Ex: BMG Consórcios"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-parcelas">Número de Parcelas</Label>
                <Input
                  id="p-parcelas"
                  type="number"
                  value={propostaForm.numeroParcelas}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, numeroParcelas: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="p-entrada">Valor de Entrada (R$)</Label>
                <Input
                  id="p-entrada"
                  type="number"
                  step="0.01"
                  value={propostaForm.valorEntrada}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, valorEntrada: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-parcela">Valor da Parcela (R$)</Label>
                <Input
                  id="p-parcela"
                  type="number"
                  step="0.01"
                  value={propostaForm.valorParcela}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, valorParcela: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-taxa-adm">Taxa de Administração / Juros (%)</Label>
                <Input
                  id="p-taxa-adm"
                  type="number"
                  step="0.01"
                  value={propostaForm.taxaAdministracao}
                  onChange={(e) => setPropostaForm((prev) => ({ ...prev, taxaAdministracao: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-prazo">Prazo (meses)</Label>
              <Input
                id="p-prazo"
                type="number"
                value={propostaForm.prazo}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, prazo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-observacoes">Observações</Label>
              <Textarea
                id="p-observacoes"
                value={propostaForm.observacoes}
                onChange={(e) => setPropostaForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais para a proposta..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPropostaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarProposta}>
              Gerar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFollowupDialogOpen} onOpenChange={setIsFollowupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar follow-up da proposta</DialogTitle>
            <DialogDescription>Registre o resultado do contato e, se quiser, gere uma nova proposta com parcela reduzida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de follow-up</Label>
              <select
                value={followupForm.tipo}
                onChange={(e) => setFollowupForm((prev) => ({ ...prev, tipo: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="nao_fechou">Cliente não fechou</option>
                <option value="parcela_reduzida">Oferecer parcela reduzida</option>
                <option value="interessado">Interessado</option>
                <option value="agendado">Agendado</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <select
                value={followupForm.canal}
                onChange={(e) => setFollowupForm((prev) => ({ ...prev, canal: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="sms">SMS</option>
                <option value="ligacao">Ligação</option>
              </select>
            </div>

            {followupForm.tipo === "parcela_reduzida" && (
              <div className="space-y-2">
                <Label htmlFor="followup-valor-parcela">Valor da parcela reduzida (R$)</Label>
                <Input
                  id="followup-valor-parcela"
                  type="number"
                  step="0.01"
                  value={followupForm.valorParcelaReduzida}
                  onChange={(e) => setFollowupForm((prev) => ({ ...prev, valorParcelaReduzida: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="followup-observacao">Observação</Label>
              <Textarea
                id="followup-observacao"
                value={followupForm.observacao}
                onChange={(e) => setFollowupForm((prev) => ({ ...prev, observacao: e.target.value }))}
                placeholder="Descreva o resultado do contato..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFollowupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFollowup}>Salvar follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

     </div>
  );
}
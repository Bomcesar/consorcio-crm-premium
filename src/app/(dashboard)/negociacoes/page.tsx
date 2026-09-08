"use client";

import { useEffect, useState, useMemo } from "react";
import { useNegociacoes } from "@/hooks/use-negociacoes";
import { useToast } from "@/hooks/use-toast";
import { useLeads } from "@/hooks/use-leads";
import { useClientes } from "@/hooks/use-clientes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Handshake,
  Paperclip,
  Archive,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Circle,
  CheckCircle2,
  ListTodo,
  Clock,
  MessageSquare,
  Send,
  FileText,
  Image,
  Video,
  Music,
} from "lucide-react";
import type { Deal, DealStage, DealStatus, DealDocumentCheckItem } from "@/types/deal";
import type { Negociacao, NegociacaoUpdate } from "@/repositories/client/negociacoes.repository";
import type { NegociacaoHistorico } from "@/repositories/client/negociacoes.repository";
import { updateNegociacao } from "@/repositories/client/negociacoes.repository";

const dealStageLabels: Record<DealStage, string> = {
  NOVO_LEAD: 'Novo Lead',
  QUALIFICANDO: 'Qualificando',
  PROPOSTA_ENVIADA: 'Proposta Enviada',
  EM_NEGOCIACAO: 'Em Negociação',
  COLETA_DOCUMENTOS: 'Coleta de Documentos',
  DADOS_CADASTRAIS: 'Dados Cadastrais',
  ANALISE_BEM_CREDITO: 'Análise de Bem/Crédito',
  ASSINATURA_ALIENACAO: 'Assinatura/Alienação',
  AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
  CONCLUIDO_SUCESSO: 'Concluído com Sucesso',
  ENVIAR_PARA_POS_VENDA: 'Enviar para Pós-venda',
};

const dealStatusLabels: Record<DealStatus, string> = {
  ATIVO: 'Ativo',
  PERDIDO_DESISTENCIA: 'Perdido/Desistência',
  RECUSADO_ADMINISTRADORA: 'Recusado pela Administradora',
  DEIXOU_PARA_DEPOIS: 'Deixou para Depois',
};

const defaultDocumentChecklist: DealDocumentCheckItem[] = [
  { id: "doc-pessoais", label: "Documentos Pessoais (RG/CNH e CPF) do Comprador", checado: false },
  { id: "comp-residencia", label: "Comprovante de Residência Atualizado", checado: false },
  { id: "renda-bancos", label: "Comprovante de Renda / Extratos Bancários", checado: false },
  { id: "doc-vendedor", label: "Documentação do Vendedor (Se carta contemplada/bem de terceiro)", checado: false },
  { id: "certidoes-bem", label: "Certidões Negativas do Bem (Imóvel/Veículo)", checado: false },
];

const kanbanStages: DealStage[] = [
  'NOVO_LEAD',
  'QUALIFICANDO',
  'PROPOSTA_ENVIADA',
  'EM_NEGOCIACAO',
  'COLETA_DOCUMENTOS',
  'DADOS_CADASTRAIS',
  'ANALISE_BEM_CREDITO',
  'ASSINATURA_ALIENACAO',
  'AGUARDANDO_PAGAMENTO',
  'CONCLUIDO_SUCESSO',
  'ENVIAR_PARA_POS_VENDA',
];

const emptyForm = {
  titulo: "",
  valor: "",
  etapa: "NOVO_LEAD" as DealStage,
  probabilidade: "0",
  data_prevista: "",
  observacoes: "",
  lead_id: "",
  cliente_id: "",
  modalidade: "",
  proposta: "",
  proxima_acao: "",
  data_proxima_acao: "",
  status: "ATIVO" as DealStatus,
  cliente_nome: "",
  valor_credito: "",
  grupo: "",
  cota: "",
  prazo: "",
  taxa: "",
  valor_lance_entrada: "",
  tipo_carta_credito: "NOVA_COTA" as Deal['tipoCartaCredito'],
  parcela_cheia: "",
  parcela_reduzida: "",
  comissao_estimada: "",
  comissao_estimada_porcentagem: "2.00",
  administradora: "",
  tipo_bem: "IMOVEL" as Deal['tipoBem'],
};

const etapaToDealStage = (etapa: string): DealStage => {
  const map: Record<string, DealStage> = {
    NOVO_LEAD: 'NOVO_LEAD',
    QUALIFICANDO: 'QUALIFICANDO',
    PROPOSTA_ENVIADA: 'PROPOSTA_ENVIADA',
    EM_NEGOCIACAO: 'EM_NEGOCIACAO',
    COLETA_DOCUMENTOS: 'COLETA_DOCUMENTOS',
    DADOS_CADASTRAIS: 'DADOS_CADASTRAIS',
    ANALISE_BEM_CREDITO: 'ANALISE_BEM_CREDITO',
    ASSINATURA_ALIENACAO: 'ASSINATURA_ALIENACAO',
    AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO',
    CONCLUIDO_SUCESSO: 'CONCLUIDO_SUCESSO',
    ENVIAR_PARA_POS_VENDA: 'ENVIAR_PARA_POS_VENDA',
    'Prospecção': 'NOVO_LEAD',
    'Qualificação': 'QUALIFICANDO',
    'Proposta': 'PROPOSTA_ENVIADA',
    'Negociação': 'EM_NEGOCIACAO',
    'Fechamento': 'ASSINATURA_ALIENACAO',
    'Venda': 'CONCLUIDO_SUCESSO',
    'Aguardando Pagamento': 'AGUARDANDO_PAGAMENTO',
    'Pós-venda': 'ENVIAR_PARA_POS_VENDA',
  };
  return map[etapa] || 'NOVO_LEAD';
};

const dealStageToEtapa = (stage: DealStage): string => {
  const map: Record<DealStage, string> = {
    NOVO_LEAD: 'Prospecção',
    QUALIFICANDO: 'Qualificação',
    PROPOSTA_ENVIADA: 'Proposta',
    EM_NEGOCIACAO: 'Negociação',
    COLETA_DOCUMENTOS: 'Negociação',
    DADOS_CADASTRAIS: 'Negociação',
    ANALISE_BEM_CREDITO: 'Fechamento',
    ASSINATURA_ALIENACAO: 'Fechamento',
    AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
    CONCLUIDO_SUCESSO: 'Venda',
    ENVIAR_PARA_POS_VENDA: 'Pós-venda',
  };
  return map[stage];
};

function dealToNegociacao(deal: Deal): Negociacao {
  return {
    id: deal.id,
    titulo: deal.clienteNome,
    valor: deal.valorCredito,
    etapa: dealStageToEtapa(deal.etapa) as Negociacao['etapa'],
    probabilidade: 0,
    data_prevista: "",
    observacoes: "",
    lead_id: "",
    cliente_id: "",
    usuario_id: "",
    modalidade: "",
    proposta: "",
    proxima_acao: "",
    data_proxima_acao: null,
    status: deal.status,
    cliente_nome: deal.clienteNome,
    valor_credito: deal.valorCredito,
    grupo: deal.grupo,
    cota: deal.cota,
    prazo: deal.prazo,
    taxa: deal.taxa,
    valor_lance_entrada: deal.valorLanceEntrada,
    tipo_carta_credito: deal.tipoCartaCredito,
    parcela_cheia: deal.parcelaCheia,
    parcela_reduzida: deal.parcelaReduzida,
    administradora: deal.administradora,
    tipo_bem: deal.tipoBem,
    comissao_estimada_em_porcentagem: deal.comissaoEstimadaEmPorcentagem,
    documentos_dados_cadastrais_checklist: deal.documentosDadosCadastraisChecklist,
    created_at: "",
    updated_at: "",
  };
}

type NegociacaoFormData = typeof emptyForm;

export default function NegociacoesPage() {
  const { success, error } = useToast();
  const { create, update, remove, getHistorico } = useNegociacoes();
  const leadsHook = useLeads();
  const clientesHook = useClientes();
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [leads, setLeads] = useState<{ id: string; nome: string; telefone: string; email: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; telefone: string; email: string }[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeDeals, setActiveDeals] = useState<Deal[]>([]);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<NegociacaoFormData>(emptyForm);
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "archived">("kanban");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDealDetailOpen, setIsDealDetailOpen] = useState(false);
  const [dealChecklist, setDealChecklist] = useState<DealDocumentCheckItem[]>(defaultDocumentChecklist);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [dealHistory, setDealHistory] = useState<NegociacaoHistorico[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newTaskTipo, setNewTaskTipo] = useState("Tarefa");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [communicationType, setCommunicationType] = useState<string>("");
  const [communicationMessage, setCommunicationMessage] = useState("");
  const [communicationFile, setCommunicationFile] = useState<File | null>(null);
  const [isSendingCommunication, setIsSendingCommunication] = useState(false);

  const handleChange = (field: keyof NegociacaoFormData, value: string | boolean | number | null) => {
    setFormData((current: NegociacaoFormData) => ({ ...current, [field]: value }));
  };

  const loadNegociacoes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getNegociacoes } = await import("@/repositories/client/negociacoes.repository");
      const negociacoesData = await getNegociacoes();
      const leadsData = await leadsHook.list();
      const clientesData = await clientesHook.list();
      setNegociacoes(negociacoesData);
      setLeads(leadsData.map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone, email: l.email || "" })));
      setClientes(clientesData.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email || "" })));

      const mappedDeals: Deal[] = negociacoesData.map((n) => {
        const lead = leadsData.find((l) => l.id === n.lead_id);
        const cliente = clientesData.find((c) => c.id === n.cliente_id);
        const clienteNome = (cliente?.nome || lead?.nome || n.titulo || "").trim();
        const status = (n.status as DealStatus) || "ATIVO";
        const rawChecklist = (n as unknown as { documentos_dados_cadastrais_checklist?: DealDocumentCheckItem[] }).documentos_dados_cadastrais_checklist;
        const documentosChecklist = Array.isArray(rawChecklist) ? rawChecklist : defaultDocumentChecklist;

        return {
          id: n.id,
          leadId: n.lead_id,
          clienteId: n.cliente_id,
          clienteNome,
          etapa: etapaToDealStage(n.etapa),
          status,
          valorCredito: Number(n.valor_credito || n.valor || 0),
          grupo: Number(n.grupo || 0),
          cota: Number(n.cota || 0),
          prazo: Number(n.prazo || 0),
          taxa: Number(n.taxa || 0),
          valorLanceEntrada: Number(n.valor_lance_entrada || 0),
          tipoCartaCredito: (n.tipo_carta_credito as Deal['tipoCartaCredito']) || 'NOVA_COTA',
          parcelaCheia: Number(n.parcela_cheia || 0),
          parcelaReduzida: Number(n.parcela_reduzida || 0),
          administradora: n.administradora || "",
          tipoBem: (n.tipo_bem as Deal['tipoBem']) || 'IMOVEL',
          comissaoEstimadaEmPorcentagem: Number(n.comissao_estimada_em_porcentagem || 0),
          documentosDadosCadastraisChecklist: documentosChecklist,
          updatedAt: new Date(n.updated_at || n.created_at || Date.now()),
        };
      });

      setDeals(mappedDeals);
      setActiveDeals(mappedDeals.filter((d) => d.status === 'ATIVO'));
      setArchivedDeals(mappedDeals.filter((d) => d.status !== 'ATIVO'));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar as negociações.";
      setErrorMessage(message);
      console.error("Erro ao carregar negociações:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNegociacoes();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDealStageLabel = (stage: DealStage) => dealStageLabels[stage] || stage;

  const getDealsByStage = (stage: DealStage) => {
    if (viewMode === "kanban") {
      return activeDeals.filter((d) => d.etapa === stage);
    }
    return [];
  };

  const archivedByStatus = useMemo(() => {
    const grouped: Record<DealStatus, Deal[]> = {
      ATIVO: [],
      PERDIDO_DESISTENCIA: [],
      RECUSADO_ADMINISTRADORA: [],
      DEIXOU_PARA_DEPOIS: [],
    };
    archivedDeals.forEach((deal) => {
      if (grouped[deal.status]) {
        grouped[deal.status].push(deal);
      }
    });
    return grouped;
  }, [archivedDeals]);

  const openCreate = () => {
    setSelectedNegociacao(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (negociacao: Negociacao) => {
    console.log("[Negociacoes] Abrir edição", negociacao.id, negociacao.etapa);
    setSelectedNegociacao(negociacao);
    setFormData({
      titulo: negociacao.titulo || "",
      valor: String(negociacao.valor ?? 0),
      etapa: etapaToDealStage(negociacao.etapa),
      probabilidade: String(negociacao.probabilidade ?? 0),
      data_prevista: negociacao.data_prevista || "",
      observacoes: negociacao.observacoes || "",
      lead_id: negociacao.lead_id || "",
      cliente_id: negociacao.cliente_id || "",
      modalidade: negociacao.modalidade || "",
      proposta: negociacao.proposta || "",
      proxima_acao: negociacao.proxima_acao || "",
      data_proxima_acao: negociacao.data_proxima_acao || "",
      status: (negociacao.status as DealStatus) || "ATIVO",
      cliente_nome: negociacao.cliente_nome || "",
      valor_credito: String(negociacao.valor_credito ?? negociacao.valor ?? 0),
      grupo: String(negociacao.grupo || 0),
      cota: String(negociacao.cota || 0),
      prazo: String(negociacao.prazo || 0),
      taxa: String(negociacao.taxa || 0),
      valor_lance_entrada: String(negociacao.valor_lance_entrada ?? 0),
      tipo_carta_credito: (negociacao.tipo_carta_credito as Deal['tipoCartaCredito']) || "NOVA_COTA",
      parcela_cheia: String(negociacao.parcela_cheia || 0),
      parcela_reduzida: String(negociacao.parcela_reduzida || 0),
      administradora: negociacao.administradora || "",
      tipo_bem: (negociacao.tipo_bem as Deal['tipoBem']) || "IMOVEL",
      comissao_estimada: String(negociacao.comissao_estimada_em_porcentagem ?? 0),
      comissao_estimada_porcentagem: String(negociacao.comissao_estimada_em_porcentagem ?? 2.00),
    });
    setIsFormOpen(true);
  };

  const openDelete = (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setIsDeleteOpen(true);
  };

  const openDealDetail = (deal: Deal) => {
    console.log("[Negociacoes] Abrir detalhe", deal.id, deal.etapa, deal.status);
    setSelectedDeal(deal);
    setDealChecklist(deal.documentosDadosCadastraisChecklist && deal.documentosDadosCadastraisChecklist.length > 0 ? deal.documentosDadosCadastraisChecklist : defaultDocumentChecklist);
    setNewTaskTipo("Tarefa");
    setNewTaskDesc("");
    setIsDealDetailOpen(true);
    setIsLoadingHistory(true);
    getHistorico(deal.id).then((history) => {
      setDealHistory(history);
      setIsLoadingHistory(false);
    });
  };

  const loadDealHistory = async (dealId: string) => {
    setIsLoadingHistory(true);
    const history = await getHistorico(dealId);
    setDealHistory(history);
    setIsLoadingHistory(false);
  };

  const getDealPhone = () => {
    if (!selectedDeal) return "";
    console.log("[Negociacoes] getDealPhone", selectedDeal.id, selectedDeal.leadId, selectedDeal.clienteId);
    const lead = leads.find((l) => l.id === selectedDeal.leadId);
    const cliente = clientes.find((c) => c.id === selectedDeal.clienteId);
    const phone = (cliente?.telefone || lead?.telefone || "").replace(/\D/g, "");
    console.log("[Negociacoes] phone found", phone);
    return phone;
  };

  const handleQuickCommunication = (type: string) => {
    if (!selectedDeal) return;
    console.log("[Negociacoes] handleQuickCommunication", type, selectedDeal.id);
    setCommunicationType(type);
    setCommunicationMessage("");
    setCommunicationFile(null);
    setIsCommunicationOpen(true);
  };

  const handleCloseCommunication = () => {
    setIsCommunicationOpen(false);
    setCommunicationType("");
    setCommunicationMessage("");
    setCommunicationFile(null);
  };

  const handleSendCommunication = async () => {
    if (!selectedDeal || !communicationMessage.trim() && !communicationFile) return;
    console.log("[Negociacoes] handleSendCommunication", selectedDeal.id, communicationType, communicationMessage);
    setIsSendingCommunication(true);
    try {
      const phone = getDealPhone();
      if (!phone) {
        error("Telefone do cliente não encontrado.");
        return;
      }

      const numero = phone.replace(/\D/g, "");
      let mensagemFinal = communicationMessage.trim();

      if (communicationFile) {
        const formData = new FormData();
        formData.append("file", communicationFile);
        formData.append("bucket", "crm-files");
        formData.append("path", `negociacoes/${selectedDeal.id}/${Date.now()}_${communicationFile.name}`);

        const uploadResponse = await fetch("/api/integrations/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("[Negociacoes] Upload failed", uploadResponse.status, errorText);
          error("Falha ao enviar arquivo.");
          return;
        }

        const uploadData = await uploadResponse.json();
        const arquivoUrl = uploadData.data?.url || uploadData.url;
        const nomeTipo =
          communicationType === 'pdf' ? 'PDF' :
          communicationType === 'imagem' ? 'imagem' :
          communicationType === 'audio' ? 'áudio' :
          communicationType === 'video' ? 'vídeo' : 'arquivo';

        mensagemFinal = `${mensagemFinal ? mensagemFinal + '\n\n' : ''}📎 ${nomeTipo}:\n${arquivoUrl}`;
      }

      const texto = encodeURIComponent(mensagemFinal || "Olá!");
      const link = `https://wa.me/55${numero}?text=${texto}`;
      window.open(link, "_blank");

      const { addNegociacaoHistorico, getNegociacaoHistorico } = await import("@/repositories/client/negociacoes.repository");
      await addNegociacaoHistorico(selectedDeal.id, {
        tipo: communicationType === 'aprovacao' ? 'E-mail' : 
              communicationType === 'pdf' ? 'Documento' :
              communicationType === 'imagem' ? 'Observação' :
              communicationType === 'audio' ? 'Ligação' :
              communicationType === 'video' ? 'Reunião' : 'Tarefa',
        descricao: `Aberto WhatsApp para envio: ${mensagemFinal || communicationType}`,
      });
      const updated = await getNegociacaoHistorico(selectedDeal.id);
      setDealHistory(updated);

      handleCloseCommunication();
      success("Abrindo WhatsApp para envio...");
    } catch (err) {
      console.error("[Negociacoes] Erro ao enviar comunicação:", err);
      error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setIsSendingCommunication(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDesc.trim() || !selectedDeal) return;
    setIsAddingTask(true);
    try {
      const { getNegociacaoHistorico, addNegociacaoHistorico } = await import("@/repositories/client/negociacoes.repository");
      await addNegociacaoHistorico(selectedDeal.id, { tipo: newTaskTipo, descricao: newTaskDesc.trim() });
      const updated = await getNegociacaoHistorico(selectedDeal.id);
      setDealHistory(updated);
      setNewTaskDesc("");
      success("Tarefa adicionada.");
    } catch {
      error("Não foi possível adicionar a tarefa.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedDeal) return;
    try {
      const { deleteNegociacaoHistorico, getNegociacaoHistorico } = await import("@/repositories/client/negociacoes.repository");
      await deleteNegociacaoHistorico(taskId);
      const updated = await getNegociacaoHistorico(selectedDeal.id);
      setDealHistory(updated);
      success("Tarefa removida.");
    } catch {
      error("Não foi possível remover a tarefa.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.titulo.trim()) return;
    console.log("[Negociacoes] Submit", selectedNegociacao?.id, formData.etapa, formData.status);
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        titulo: formData.titulo.trim(),
        valor: Number(formData.valor) || 0,
        etapa: dealStageToEtapa(formData.etapa) as Negociacao['etapa'],
        probabilidade: Number(formData.probabilidade) || 0,
        observacoes: formData.observacoes.trim(),
        cliente_id: formData.cliente_id || null,
        modalidade: formData.modalidade.trim(),
        proposta: formData.proposta.trim(),
        proxima_acao: formData.proxima_acao.trim(),
        data_proxima_acao: formData.data_proxima_acao || null,
        status: formData.status,
        cliente_nome: formData.cliente_nome.trim(),
        valor_credito: Number(formData.valor_credito) || Number(formData.valor) || 0,
        grupo: Number(formData.grupo) || 0,
        cota: Number(formData.cota) || 0,
        prazo: Number(formData.prazo) || 0,
        taxa: Number(formData.taxa) || 0,
        valor_lance_entrada: Number(formData.valor_lance_entrada) || 0,
        tipo_carta_credito: formData.tipo_carta_credito,
        parcela_cheia: Number(formData.parcela_cheia) || 0,
        parcela_reduzida: Number(formData.parcela_reduzida) || 0,
        administradora: formData.administradora.trim(),
        tipo_bem: formData.tipo_bem,
        ...(formData.lead_id ? { lead_id: formData.lead_id } : {}),
      };

      if (formData.data_prevista) {
        payload.data_prevista = formData.data_prevista;
      }

      if (selectedNegociacao) {
        await update(selectedNegociacao.id, payload);
      } else {
        await create(payload);
      }
      await loadNegociacoes();
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedNegociacao(null);
    } catch (err) {
      console.error("Erro ao salvar negociação:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNegociacao) return;
    try {
      await remove(selectedNegociacao.id);
      setNegociacoes((prev) => prev.filter((n) => n.id !== selectedNegociacao.id));
      setIsDeleteOpen(false);
      setSelectedNegociacao(null);
    } catch {
      // erro tratado no hook
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setDealChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checado: !item.checado } : item)));
  };

  const handleSaveChecklist = async () => {
    if (!selectedDeal) return;
    setIsSavingChecklist(true);
    try {
      await updateNegociacao(selectedDeal.id, {
        documentos_dados_cadastrais_checklist: dealChecklist as unknown as NegociacaoUpdate["documentos_dados_cadastrais_checklist"],
      });
      setDeals((prev) => prev.map((d) => (d.id === selectedDeal.id ? { ...d, documentosDadosCadastraisChecklist: dealChecklist } : d)));
      setActiveDeals((prev) => prev.map((d) => (d.id === selectedDeal.id ? { ...d, documentosDadosCadastraisChecklist: dealChecklist } : d)));
      setArchivedDeals((prev) => prev.map((d) => (d.id === selectedDeal.id ? { ...d, documentosDadosCadastraisChecklist: dealChecklist } : d)));
      success("Checklist atualizado.");
    } catch {
      error("Não foi possível salvar o checklist.");
    } finally {
      setIsSavingChecklist(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Negociações</h2>
          <p className="text-sm text-muted-foreground">Pipeline de vendas e propostas em andamento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")}>
            <Handshake className="mr-2 h-4 w-4" />
            Kanban
          </Button>
          <Button variant={viewMode === "archived" ? "default" : "outline"} onClick={() => setViewMode("archived")}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivados
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Negociação
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStages.map((stage) => {
            const stageDeals = getDealsByStage(stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.valorCredito, 0);
            return (
              <Card key={stage} className="w-80 shrink-0 border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{formatDealStageLabel(stage)}</CardTitle>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{stageDeals.length} negociação(ões)</span>
                    <span className="text-xs font-medium">{formatCurrency(stageValue)}</span>
                  </div>
                </CardHeader>
                 <CardContent className="space-y-2">
                   {stageDeals.length === 0 ? (
                     <p className="text-xs text-muted-foreground">Nenhuma negociação nesta etapa.</p>
                   ) : (
                     stageDeals.map((deal) => (
                       <div
                         key={deal.id}
                         className="rounded-lg border border-border/50 p-3 transition hover:border-primary/40"
                       >
                         <div className="flex items-start justify-between gap-2">
                           <div
                             className="flex-1 cursor-pointer"
                             onClick={() => openDealDetail(deal)}
                           >
                             <p className="text-sm font-medium">{deal.clienteNome}</p>
                             <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(deal.valorCredito)}</p>
                           </div>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
<DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openEdit(dealToNegociacao(deal)); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openDelete(deal as unknown as Negociacao); }}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                         <div onClick={() => openDealDetail(deal)}>
                           <div className="mt-2 flex items-center justify-between">
                             <Badge variant="outline" className="text-xs">{deal.tipoCartaCredito === 'CONTEMPLADA' ? 'Contemplada' : 'Nova Cota'}</Badge>
                             <span className="text-xs text-muted-foreground">{deal.grupo}/{deal.cota}</span>
                           </div>
                           {deal.etapa === 'COLETA_DOCUMENTOS' && (
                             <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                               <Paperclip className="h-3 w-3" />
                               {deal.documentosDadosCadastraisChecklist.filter((item) => item.checado).length}/{deal.documentosDadosCadastraisChecklist.length}
                             </div>
                           )}
                         </div>
                       </div>
                     ))
                   )}
                 </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === "archived" && (
        <Card>
          <CardHeader>
            <CardTitle>Negociações Arquivadas</CardTitle>
            <CardDescription>Negociações fora do fluxo ativo do Kanban</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(Object.keys(archivedByStatus) as DealStatus[]).map((status) => {
              const deals = archivedByStatus[status];
              if (deals.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">{dealStatusLabels[status]} ({deals.length})</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                     {deals.map((deal) => (
                       <div
                         key={deal.id}
                         className="rounded-lg border border-border/50 p-4 transition hover:border-primary/40"
                       >
                         <div className="flex items-start justify-between gap-2">
                           <div
                             className="flex-1 cursor-pointer"
                             onClick={() => openDealDetail(deal)}
                           >
                             <p className="text-sm font-medium">{deal.clienteNome}</p>
                             <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(deal.valorCredito)}</p>
                           </div>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
<DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openEdit(dealToNegociacao(deal)); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openDelete(deal as unknown as Negociacao); }}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                         <div onClick={() => openDealDetail(deal)}>
                           <div className="mt-2 flex items-center justify-between">
                             <Badge variant="outline" className="text-xs">{deal.tipoCartaCredito === 'CONTEMPLADA' ? 'Contemplada' : 'Nova Cota'}</Badge>
                             <span className="text-xs text-muted-foreground">{formatDealStageLabel(deal.etapa)}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              );
            })}
            {archivedDeals.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma negociação arquivada.</p>
            )}
          </CardContent>
        </Card>
      )}

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
                  {kanbanStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {formatDealStageLabel(stage)}
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
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="ATIVO">Ativo</option>
                  <option value="PERDIDO_DESISTENCIA">Perdido/Desistência</option>
                  <option value="RECUSADO_ADMINISTRADORA">Recusado pela Administradora</option>
                  <option value="DEIXOU_PARA_DEPOIS">Deixou para Depois</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_nome">Nome do Cliente</Label>
                <Input id="cliente_nome" value={formData.cliente_nome} onChange={(e) => handleChange("cliente_nome", e.target.value)} placeholder="Nome do cliente" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor_credito">Valor do Crédito (R$)</Label>
                <Input id="valor_credito" type="number" step="0.01" value={formData.valor_credito} onChange={(e) => handleChange("valor_credito", e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_lance_entrada">Valor de Parcela/Lance (R$)</Label>
                <Input id="valor_lance_entrada" type="number" step="0.01" value={formData.valor_lance_entrada} onChange={(e) => handleChange("valor_lance_entrada", e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parcela_cheia">Parcela Cheia (R$)</Label>
                <Input id="parcela_cheia" type="number" step="0.01" value={formData.parcela_cheia} onChange={(e) => handleChange("parcela_cheia", e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcela_reduzida">Parcela Reduzida (R$)</Label>
                <Input id="parcela_reduzida" type="number" step="0.01" value={formData.parcela_reduzida} onChange={(e) => handleChange("parcela_reduzida", e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comissao_estimada">Comissão Estimada (R$)</Label>
                <Input id="comissao_estimada" type="number" step="0.01" value={formData.comissao_estimada} onChange={(e) => handleChange("comissao_estimada", e.target.value)} placeholder="0,00" />
                <p className="text-xs text-muted-foreground">Comissão é calculada automaticamente como 2% do valor do crédito.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comissao_estimada_porcentagem">Comissão (%)</Label>
                <Input id="comissao_estimada_porcentagem" type="number" step="0.01" value={formData.comissao_estimada_porcentagem} onChange={(e) => handleChange("comissao_estimada_porcentagem", e.target.value)} placeholder="2,00" />
                <p className="text-xs text-muted-foreground">Valor padrão: 2% sobre o valor do crédito.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo_carta_credito">Tipo de Carta</Label>
                <select id="tipo_carta_credito" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.tipo_carta_credito} onChange={(e) => handleChange("tipo_carta_credito", e.target.value)}>
                  <option value="NOVA_COTA">Nova Cota</option>
                  <option value="CONTEMPLADA">Contemplada</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="APOSENTADORIA_IMOBILIARIA">Aposentadoria Imobiliária</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_bem">Tipo de Bem</Label>
                <select id="tipo_bem" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.tipo_bem} onChange={(e) => handleChange("tipo_bem", e.target.value)}>
                  <option value="IMOVEL">Imóvel</option>
                  <option value="VEICULO">Veículo</option>
                  <option value="OUTRO_BENS_MOVEIS">Outros Bens Móveis</option>
                  <option value="SERVICOS">Serviços</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="administradora">Administradora</Label>
                <Input id="administradora" value={formData.administradora} onChange={(e) => handleChange("administradora", e.target.value)} placeholder="Ex: Ademicon" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalidade">Modalidade</Label>
                <Input id="modalidade" value={formData.modalidade} onChange={(e) => handleChange("modalidade", e.target.value)} placeholder="Ex: Consórcio, Financiamento" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="proxima_acao">Próxima Ação</Label>
                <Input id="proxima_acao" value={formData.proxima_acao} onChange={(e) => handleChange("proxima_acao", e.target.value)} placeholder="Ex: Ligar, Enviar proposta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_proxima_acao">Data Próxima Ação</Label>
                <Input id="data_proxima_acao" type="date" value={formData.data_proxima_acao} onChange={(e) => handleChange("data_proxima_acao", e.target.value)} />
              </div>
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDealDetailOpen} onOpenChange={(open) => { if (!open) { setIsDealDetailOpen(false); setSelectedDeal(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {!selectedDeal ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle>{selectedDeal.clienteNome}</DialogTitle>
                    <DialogDescription>
                      {formatDealStageLabel(selectedDeal.etapa)} • {formatCurrency(selectedDeal.valorCredito)} • {dealStatusLabels[selectedDeal.status]}
                    </DialogDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openEdit(dealToNegociacao(selectedDeal!)); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setIsDealDetailOpen(false); setSelectedDeal(null); openDelete(selectedDeal as unknown as Negociacao); }}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                              </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Grupo/Cota</p>
                  <p className="text-sm">{selectedDeal.grupo} / {selectedDeal.cota}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Prazo</p>
                  <p className="text-sm">{selectedDeal.prazo} meses</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Taxa</p>
                  <p className="text-sm">{selectedDeal.taxa}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tipo de Carta</p>
                  <p className="text-sm">{selectedDeal.tipoCartaCredito === 'CONTEMPLADA' ? 'Contemplada' : 'Nova Cota'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Parcela Cheia</p>
                  <p className="text-sm">{formatCurrency(selectedDeal.parcelaCheia)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Parcela Reduzida</p>
                  <p className="text-sm">{formatCurrency(selectedDeal.parcelaReduzida)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Administradora</p>
                  <p className="text-sm">{selectedDeal.administradora || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tipo de Bem</p>
                  <p className="text-sm">{selectedDeal.tipoBem || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Comissão Estimada</p>
                  <p className="text-sm">{selectedDeal.comissaoEstimadaEmPorcentagem}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Valor de Entrada/Lance</p>
                  <p className="text-sm">{formatCurrency(selectedDeal.valorLanceEntrada)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Atualizado</p>
                  <p className="text-sm">{selectedDeal.updatedAt.toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Ações Rápidas
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleQuickCommunication("proposta")}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Proposta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCommunication("aprovacao")}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Enviar para Aprovação
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCommunication("pdf")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Enviar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCommunication("imagem")}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Enviar Imagem
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCommunication("audio")}
                  >
                    <Music className="mr-2 h-4 w-4" />
                    Enviar Áudio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCommunication("video")}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Enviar Vídeo
                  </Button>
                </div>
              </div>

              {selectedDeal.etapa === 'COLETA_DOCUMENTOS' && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Checklist de Documentos</h4>
                    <Button size="sm" onClick={handleSaveChecklist} disabled={isSavingChecklist}>
                      {isSavingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar Checklist
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dealChecklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.checado}
                          onChange={() => handleToggleChecklistItem(item.id)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tarefas e Atividades
                    <Badge variant="secondary" className="ml-1 text-xs">{dealHistory.length}</Badge>
                  </h4>
                  {selectedDeal.etapa !== 'CONCLUIDO_SUCESSO' && selectedDeal.etapa !== 'ENVIAR_PARA_POS_VENDA' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Etapa: {formatDealStageLabel(selectedDeal.etapa)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={newTaskTipo}
                    onChange={(e) => setNewTaskTipo(e.target.value)}
                  >
                    <option value="Tarefa">Tarefa</option>
                    <option value="Ligação">Ligação</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Documento">Documento</option>
                    <option value="Observação">Observação</option>
                  </select>
                  <Input
                    placeholder="Descreva a tarefa ou atividade..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                  />
                  <Button size="sm" onClick={handleAddTask} disabled={isAddingTask || !newTaskDesc.trim()}>
                    {isAddingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : dealHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma tarefa registrada.</p>
                  ) : (
                    dealHistory.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition">
                        <Circle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">{task.tipo}</Badge>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(task.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed break-words">{task.descricao}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Dialog open={isCommunicationOpen} onOpenChange={setIsCommunicationOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abrir WhatsApp</DialogTitle>
                    <DialogDescription>
                      Ao confirmar, o sistema abrirá o WhatsApp com a mensagem e/ou link do arquivo já prontos para envio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de Mídia</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                        value={communicationType}
                        onChange={(e) => setCommunicationType(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="proposta">Proposta</option>
                        <option value="aprovacao">Enviar para Aprovação</option>
                        <option value="pdf">PDF</option>
                        <option value="imagem">Imagem</option>
                        <option value="audio">Áudio</option>
                        <option value="video">Vídeo</option>
                      </select>
                    </div>
                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={communicationMessage}
                        onChange={(e) => setCommunicationMessage(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    {communicationType && communicationType !== 'proposta' && communicationType !== 'aprovacao' && (
                      <div>
                        <Label>Arquivo</Label>
                        <Input
                          type="file"
                          accept={
                            communicationType === 'pdf' ? '.pdf' :
                            communicationType === 'imagem' ? 'image/*' :
                            communicationType === 'audio' ? 'audio/*' :
                            communicationType === 'video' ? 'video/*' : '*'
                          }
                          onChange={(e) => setCommunicationFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseCommunication}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSendCommunication} disabled={isSendingCommunication || (!communicationMessage.trim() && !communicationFile)}>
                      {isSendingCommunication ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Abrir WhatsApp
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

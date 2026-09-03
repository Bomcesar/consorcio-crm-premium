"use client";

import { useEffect, useRef, useState } from "react";
import { usePosVenda } from "@/hooks/use-pos-venda";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Headphones, CheckCircle2, Circle, Phone, MessageSquare, FileText, Calendar, Search, Mail, Copy, Send, FileImage, FileVideo, FileAudio, LinkIcon, FolderInput, Paperclip } from "lucide-react";
import type { PosVendaInsert, PosVendaTarefa, PosVendaComunicacao } from "@/repositories/client/pos-venda.repository";
import { AnexosUpload } from "@/components/anexos/anexos-upload";
import { AnexosList } from "@/components/anexos/anexos-list";

const emptyForm: PosVendaInsert = {
  status: "Boas-vindas",
  priority: "normal",
  satisfaction: 3,
  channel: "WhatsApp",
  needs_attention: false,
  observacoes: "",
  cliente_id: "",
  agenda_id: null,
  next_contact_at: null,
  last_contact_at: null,
  boleto_url: "",
  lembrete_em: null,
  retencao_motivo: "",
  retencao_data: null,
};

type PosVendaFormData = PosVendaInsert;

const STATUS_OPTIONS = [
  "Boas-vindas",
  "Comprovante",
  "Lembrete de vencimento",
  "Aplicativo do cliente",
  "Pagar o boleto",
  "Boleto em atraso",
  "Pago",
  "Cancelado",
  "Ativo",
  "Sorteio Loteria Federal",
  "Resultado número da Loteria Federal",
  "Resultado da Assembleia",
  "Dia da Assembleia",
  "Imóvel",
  "Motors",
  "Serviços",
  "Outros bens móveis",
  "Contemplei",
];

const CHANNEL_OPTIONS = ["WhatsApp", "SMS", "Ligação"] as const;

const PosVendaPage = () => {
  const posVenda = usePosVenda();
  const posVendaRef = useRef(posVenda);
  posVendaRef.current = posVenda;
  const { error, success } = useToast();
  const [historicoForm, setHistoricoForm] = useState({ tipo: "observacao", descricao: "" });
  const [tarefaForm, setTarefaForm] = useState({ titulo: "", descricao: "", data_prevista: "" });
  const [comunicacaoForm, setComunicacaoForm] = useState({ tipo: "WhatsApp" as PosVendaComunicacao["tipo"], descricao: "", resultado: "" });
  const [isHistorySaving, setIsHistorySaving] = useState(false);
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [isCommsSaving, setIsCommsSaving] = useState(false);
  const [posVendaSearch, setPosVendaSearch] = useState("");
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | "document" | "pdf" | "link" | "text">("document");
  const [linkValue, setLinkValue] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  useEffect(() => {
    const current = posVendaRef.current;
    if (current.selectedPosVenda?.id) {
      void current.loadHistorico(current.selectedPosVenda.id);
      void current.loadTarefas(current.selectedPosVenda.id);
      void current.loadComunicacoes(current.selectedPosVenda.id);
    }
  }, [posVenda.selectedPosVenda?.id]);

  const handleChange = (field: keyof PosVendaFormData, value: string | number | boolean | null) => {
    posVenda.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSendWhatsApp = async (destino: "cliente" | "gestao" | "ambos") => {
    if (!posVenda.selectedPosVenda) {
      error("Selecione ou salve um registro de pós-venda antes de enviar.");
      return;
    }

    const clienteId = posVenda.formData.cliente_id;
    if (!clienteId) {
      error("Selecione um cliente para enviar o WhatsApp.");
      return;
    }

    const cliente = posVenda.clienteSearchResults.find((c) => c.id === clienteId);
    const telefone = cliente?.telefone || "";
    const mensagem = `Olá ${cliente?.nome || ""}, ${posVenda.formData.observacoes || "entramos em contato pelo CRM."}`;

    if (!telefone) {
      error("Telefone do cliente inválido para WhatsApp.");
      return;
    }

    const numero = telefone.replace(/\D/g, "");
    const texto = encodeURIComponent(mensagem);
    const link = `https://wa.me/55${numero}?text=${texto}`;

    window.open(link, "_blank");

    try {
      await posVenda.addComunicacao({
        pos_venda_id: posVenda.selectedPosVenda.id,
        tipo: "WhatsApp",
        descricao: mensagem,
        resultado: destino === "cliente" ? "Enviado para Grupo do Cliente" : destino === "gestao" ? "Enviado para Grupo da Gestão" : "Enviado para ambos",
        data: new Date().toISOString(),
        usuario_id: posVenda.selectedPosVenda.usuario_id,
      });
    } catch {
      // erro tratado no hook
    }
  };

  const handleCall = () => {
    if (!posVenda.formData.cliente_id) {
      error("Selecione um cliente antes de ligar.");
      return;
    }
    const cliente = posVenda.clienteSearchResults.find((c) => c.id === posVenda.formData.cliente_id);
    const telefone = cliente?.telefone || "";
    const digits = telefone.replace(/\D/g, "");
    if (!digits) {
      error("Telefone inválido para ligação.");
      return;
    }
    window.location.href = `tel:+55${digits}`;
    if (posVenda.selectedPosVenda) {
      void posVenda.addComunicacao({
        pos_venda_id: posVenda.selectedPosVenda.id,
        tipo: "Ligação",
        descricao: "Tentativa de ligação iniciada.",
        resultado: "Registrado",
        data: new Date().toISOString(),
        usuario_id: posVenda.selectedPosVenda.usuario_id,
      });
    }
  };

  const handleSMS = () => {
    if (!posVenda.formData.cliente_id) {
      error("Selecione um cliente antes de enviar SMS.");
      return;
    }
    const cliente = posVenda.clienteSearchResults.find((c) => c.id === posVenda.formData.cliente_id);
    const telefone = cliente?.telefone || "";
    const digits = telefone.replace(/\D/g, "");
    if (!digits) {
      error("Telefone inválido para SMS.");
      return;
    }
    window.location.href = `sms:+55${digits}?body=${encodeURIComponent(posVenda.formData.observacoes || "")}`;
    if (posVenda.selectedPosVenda) {
      void posVenda.addComunicacao({
        pos_venda_id: posVenda.selectedPosVenda.id,
        tipo: "SMS",
        descricao: "SMS iniciado.",
        resultado: "Registrado",
        data: new Date().toISOString(),
        usuario_id: posVenda.selectedPosVenda.usuario_id,
      });
    }
  };

  const handleEmail = () => {
    if (!posVenda.formData.cliente_id) {
      error("Selecione um cliente antes de enviar e-mail.");
      return;
    }
    const cliente = posVenda.clienteSearchResults.find((c) => c.id === posVenda.formData.cliente_id);
    const email = cliente?.email || "";
    if (!email) {
      error("E-mail do cliente não encontrado.");
      return;
    }
    window.location.href = `mailto:${email}`;
    if (posVenda.selectedPosVenda) {
      void posVenda.addComunicacao({
        pos_venda_id: posVenda.selectedPosVenda.id,
        tipo: "Email",
        descricao: `E-mail enviado para ${email}`,
        resultado: "Registrado",
        data: new Date().toISOString(),
        usuario_id: posVenda.selectedPosVenda.usuario_id,
      });
    }
  };

  const getClienteSelecionado = () => {
    if (!posVenda.formData.cliente_id) return null;
    return posVenda.clienteSearchResults.find((c) => c.id === posVenda.formData.cliente_id) || null;
  };

  const handleCopy = () => {
    const cliente = getClienteSelecionado();
    if (!cliente) {
      error("Selecione um cliente antes de copiar.");
      return;
    }
    const phone = cliente.telefone || cliente.telefone;
    if (!phone) {
      error("Telefone não encontrado para este cliente.");
      return;
    }
    navigator.clipboard.writeText(phone);
  };

  const handleMove = () => {
    if (!posVenda.selectedPosVenda) {
      error("Salve o registro antes de mover.");
      return;
    }
    setMoveOpen(true);
  };

  const handleConfirmMove = async () => {
    const cliente = getClienteSelecionado();
    if (!cliente || !posVenda.selectedPosVenda) {
      error("Selecione um cliente de destino.");
      return;
    }
    try {
      await posVenda.updatePosVenda(posVenda.selectedPosVenda.id, {
        cliente_id: cliente.id,
      });
      success("Registro movido com sucesso.");
    } catch {
      error("Não foi possível mover o registro.");
    }
    setMoveOpen(false);
  };

  const handleScheduleReturn = () => {
    if (!posVenda.selectedPosVenda) {
      error("Salve o registro antes de agendar retorno.");
      return;
    }
    setScheduleOpen(true);
    setScheduleDate(posVenda.formData.next_contact_at || "");
  };

  const handleConfirmSchedule = async () => {
    if (!posVenda.selectedPosVenda || !scheduleDate) return;
    try {
      await posVenda.updatePosVenda(posVenda.selectedPosVenda.id, {
        next_contact_at: scheduleDate,
      });
      posVenda.setFormData((current) => ({ ...current, next_contact_at: scheduleDate }));
      success("Retorno agendado com sucesso.");
    } catch {
      error("Não foi possível agendar o retorno.");
    }
    setScheduleOpen(false);
  };

  const getAcceptForType = (type: "image" | "audio" | "video" | "document" | "pdf") => {
    if (type === "image") return "image/*";
    if (type === "audio") return "audio/*";
    if (type === "video") return "video/*";
    if (type === "pdf") return ".pdf";
    return ".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt,.csv,.md";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadAndSendMedia = async () => {
    const cliente = getClienteSelecionado();
    if (!cliente) {
      error("Selecione um cliente antes de enviar.");
      return;
    }
    if (!posVenda.selectedPosVenda) {
      error("Salve o registro antes de enviar.");
      return;
    }

    if (mediaType === "link") {
      if (!linkValue.trim()) {
        error("Digite o link antes de enviar.");
        return;
      }
      setIsSendingMedia(true);
      try {
        const digits = cliente.telefone.replace(/\D/g, "");
        const resp = await fetch("/api/integrations/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: digits,
            mediaType: "document",
            link: linkValue.trim(),
            caption: `Link enviado pelo Pós-venda: ${posVenda.formData.observacoes || ""}`,
          }),
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || "Falha no envio");
        await posVenda.addComunicacao({
          pos_venda_id: posVenda.selectedPosVenda.id,
          tipo: "WhatsApp",
          descricao: `Link enviado: ${linkValue}`,
          resultado: `Enviado via WhatsApp - ${result.data?.messages?.[0]?.id || "ok"}`,
          data: new Date().toISOString(),
          usuario_id: posVenda.selectedPosVenda.usuario_id,
        });
        setLinkValue("");
        success("Link enviado com sucesso.");
      } catch {
        error("Não foi possível enviar o link.");
      } finally {
        setIsSendingMedia(false);
      }
      return;
    }

    if (mediaType === "text") {
      if (!linkValue.trim()) {
        error("Digite o texto antes de enviar.");
        return;
      }
      void handleSendWhatsApp("cliente");
      return;
    }

    if (!selectedFile) {
      error("Selecione um arquivo antes de enviar.");
      return;
    }

    setIsSendingMedia(true);
    try {
      const uploaded = await posVenda.anexosHook.upload("pos_venda", posVenda.selectedPosVenda.id, selectedFile);
      const downloadUrl = uploaded?.caminho ? await posVenda.anexosHook.getDownloadUrl(uploaded.caminho) : null;
      if (!downloadUrl) {
        throw new Error("Não foi possível gerar URL do arquivo.");
      }

      const digits = cliente.telefone.replace(/\D/g, "");
      const whatsappType = mediaType === "pdf" ? "document" : mediaType;
      const resp = await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: digits,
          mediaType: whatsappType,
          link: downloadUrl,
          caption: `Arquivo enviado pelo Pós-venda: ${posVenda.formData.observacoes || ""}`,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Falha no envio");

      await posVenda.addComunicacao({
        pos_venda_id: posVenda.selectedPosVenda.id,
        tipo: "WhatsApp",
        descricao: `Arquivo enviado: ${selectedFile.name} (${mediaType})`,
        resultado: `Enviado via WhatsApp - ${result.data?.messages?.[0]?.id || "ok"}`,
        data: new Date().toISOString(),
        usuario_id: posVenda.selectedPosVenda.usuario_id,
      });
      setSelectedFile(null);
      success("Arquivo enviado com sucesso.");
    } catch {
      error("Não foi possível enviar o arquivo.");
    } finally {
      setIsSendingMedia(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      "Boas-vindas": "secondary",
      Comprovante: "secondary",
      "Lembrete de vencimento": "secondary",
      "Pagar o boleto": "outline",
      "Boleto em atraso": "destructive",
      Pago: "success",
      Cancelado: "destructive",
      Ativo: "success",
      "Aplicativo do cliente": "outline",
      "Sorteio Loteria Federal": "outline",
      "Resultado número da Loteria Federal": "secondary",
      "Resultado da Assembleia": "secondary",
      "Dia da Assembleia": "outline",
      Contemplei: "success",
      Imóvel: "outline",
      Motors: "outline",
      Serviços: "outline",
      "Outros bens móveis": "outline",
    };
    return map[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pós-venda</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento, tarefas, comunicação e histórico</p>
        </div>
      </div>

      {posVenda.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{posVenda.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

       <Card>
         <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
           <div>
             <CardTitle>Ações de Pós-venda</CardTitle>
             <CardDescription>
               {posVenda.posVendas.length > 0
                 ? `${posVenda.posVendas.length} registro(s) encontrado(s)`
                 : "Nenhum registro cadastrado ainda."}
             </CardDescription>
           </div>
           <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Buscar por nome de cliente ou telefone..."
                 value={posVendaSearch}
                 onChange={(e) => setPosVendaSearch(e.target.value)}
                 className="pl-9"
               />
             </div>
             <Button onClick={posVenda.openCreate}>
               <Plus className="mr-2 h-4 w-4" />
               Novo Registro
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {posVenda.isLoading ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
             </div>
            ) : posVenda.posVendas.filter((item) => {
             if (!posVendaSearch.trim()) return true;
             const q = posVendaSearch.trim().toLowerCase();
             const clienteNome = item.cliente?.nome?.toLowerCase() || "";
             const clienteTel = item.cliente?.telefone?.toLowerCase() || "";
             return clienteNome.includes(q) || clienteTel.includes(q);
           }).length === 0 ? (
             <p className="text-sm text-muted-foreground">Nenhum registro cadastrado ainda.</p>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Cliente</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Canal</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posVenda.posVendas.filter((item) => {
                     if (!posVendaSearch.trim()) return true;
                     const q = posVendaSearch.trim().toLowerCase();
                     const clienteNome = item.cliente?.nome?.toLowerCase() || "";
                     const clienteTel = item.cliente?.telefone?.toLowerCase() || "";
                     return clienteNome.includes(q) || clienteTel.includes(q);
                   }).map((item) => {
                     const clienteNome = item.cliente?.nome || "—";
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{clienteNome}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell>{item.channel}</TableCell>
                        <TableCell>{formatDate(item.next_contact_at)}</TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => posVenda.openEdit(item)}
                            aria-label="Editar registro"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => posVenda.openDelete(item)}
                            aria-label="Excluir registro"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={posVenda.isFormOpen} onOpenChange={posVenda.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{posVenda.selectedPosVenda ? "Editar registro" : "Novo registro"}</DialogTitle>
            <DialogDescription>
              {posVenda.selectedPosVenda
                ? "Atualize o registro de pós-venda selecionado."
                : "Cadastre um novo registro de pós-venda."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={posVenda.handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cliente-search"
                  className="pl-8"
                  placeholder="Buscar por nome ou telefone..."
                  value={posVenda.clienteSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    posVenda.setClienteSearch(value);
                    if (value.trim()) {
                      void posVenda.searchContatosByTelefone(value);
                    } else {
                      void posVenda.getAllClientes();
                    }
                  }}
                />
              </div>
              {posVenda.clienteSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {posVenda.clienteSearchResults.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted"
                      onClick={() => {
                         const selected = cliente as {
                           id: string;
                           nome: string;
                           telefone: string;
                           email: string;
                           status: string;
                           origem?: string;
                           cliente_id?: string | null;
                         };
                         const clienteId = selected.cliente_id ?? selected.id;
                         posVenda.setFormData((current) => ({ ...current, cliente_id: clienteId }));
                         posVenda.setClienteSearch(selected.nome);
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{cliente.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={posVenda.formData.cliente_id || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  posVenda.setFormData((current) => ({ ...current, cliente_id: id }));
                  const found = posVenda.clienteSearchResults.find((c) => c.id === id);
                  if (found) {
                    posVenda.setClienteSearch(found.nome);
                  }
                }}
              >
                <option value="">Selecione um cliente cadastrado</option>
                {posVenda.clienteSearchResults.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} — {cliente.telefone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={posVenda.formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <select
                  id="channel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={posVenda.formData.channel}
                  onChange={(e) => handleChange("channel", e.target.value)}
                >
                  {CHANNEL_OPTIONS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={posVenda.formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Descreva a ação de pós-venda"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="next_contact_at">Próximo Contato</Label>
                <Input
                  id="next_contact_at"
                  type="datetime-local"
                  value={posVenda.formData.next_contact_at || ""}
                  onChange={(e) => handleChange("next_contact_at", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_contact_at">Último Contato</Label>
                <Input
                  id="last_contact_at"
                  type="datetime-local"
                  value={posVenda.formData.last_contact_at || ""}
                  onChange={(e) => handleChange("last_contact_at", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => handleSendWhatsApp("cliente")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Enviar para WhatsApp
              </Button>
              <Button type="button" variant="outline" onClick={handleSMS}>
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCall}>
                <Phone className="mr-2 h-4 w-4" />
                Ligar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleEmail}>
                <Mail className="mr-2 h-4 w-4" />
                E-mail
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="boleto_url">Inserir link</Label>
              <Input
                id="boleto_url"
                value={posVenda.formData.boleto_url}
                onChange={(e) => handleChange("boleto_url", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  posVenda.setIsFormOpen(false);
                  posVenda.setFormData(emptyForm);
                  posVenda.setSelectedPosVenda(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={posVenda.isSaving}>
                {posVenda.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : posVenda.selectedPosVenda ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {posVenda.selectedPosVenda && (
        <Dialog open={posVenda.isFormOpen} onOpenChange={posVenda.setIsFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro</DialogTitle>
              <DialogDescription>
                {posVenda.selectedPosVenda.observacoes}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 border-y py-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCall}>
                  <Phone className="mr-1 h-4 w-4" /> 📞 Ligar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleSendWhatsApp("cliente")}>
                  <MessageSquare className="mr-1 h-4 w-4" /> 💬 WhatsApp
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleSMS}>
                  <MessageSquare className="mr-1 h-4 w-4" /> ✉️ SMS
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-1 h-4 w-4" /> 📋 Copiar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleMove}>
                  <FolderInput className="mr-1 h-4 w-4" /> 📁 Mover
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { posVenda.setIsFormOpen(true); posVenda.setIsDetailsOpen?.(false); posVenda.openEdit(posVenda.selectedPosVenda!); }}>
                  <Pencil className="mr-1 h-4 w-4" /> ✏️ Editar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleScheduleReturn}>
                  <Calendar className="mr-1 h-4 w-4" /> 📅 Agendar retorno
                </Button>
              </div>
            </div>

            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                <TabsTrigger value="comunicacoes">Comunicação</TabsTrigger>
                <TabsTrigger value="documentos">Docs</TabsTrigger>
                <TabsTrigger value="enviar">Enviar</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{posVenda.selectedPosVenda.status}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(posVenda.selectedPosVenda.next_contact_at)}</p>
                    </div>
                  </div>

                  <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                    {posVenda.historico.map((h) => (
                      <div key={h.id} className="space-y-1">
                        <p className="text-sm font-medium">{h.descricao}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
                      </div>
                    ))}
                    {posVenda.historico.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
                    )}
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!posVenda.selectedPosVenda || !historicoForm.descricao.trim()) return;
                  setIsHistorySaving(true);
                  try {
                    await posVenda.addHistorico(posVenda.selectedPosVenda.id, historicoForm);
                    setHistoricoForm({ tipo: "observacao", descricao: "" });
                  } finally {
                    setIsHistorySaving(false);
                  }
                }} className="flex gap-2">
                  <Input
                    value={historicoForm.descricao}
                    onChange={(e) => setHistoricoForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Adicionar observação ao histórico..."
                  />
                  <Button type="submit" size="sm" disabled={isHistorySaving}>
                    {isHistorySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="tarefas" className="space-y-4">
                <div className="space-y-2">
                  {posVenda.tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => posVenda.updateTarefa(tarefa.id, { status: tarefa.status === "Pendente" ? "Concluída" : "Pendente" })}
                          aria-label={tarefa.status === "Pendente" ? "Concluir tarefa" : "Reabrir tarefa"}
                        >
                          {tarefa.status === "Pendente" ? (
                            <Circle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <div>
                          <p className={`text-sm font-medium ${tarefa.status === "Concluída" ? "line-through text-muted-foreground" : ""}`}>
                            {tarefa.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(tarefa.data_prevista)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => posVenda.deleteTarefa(tarefa.id)}
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  {posVenda.tarefas.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
                  )}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!posVenda.selectedPosVenda || !tarefaForm.titulo.trim()) return;
                  setIsTaskSaving(true);
                  try {
                    await posVenda.addTarefa({
                      pos_venda_id: posVenda.selectedPosVenda.id,
                      titulo: tarefaForm.titulo.trim(),
                      descricao: tarefaForm.descricao.trim(),
                      data_prevista: tarefaForm.data_prevista,
                      status: "Pendente",
                      usuario_id: posVenda.selectedPosVenda.usuario_id,
                    });
                    setTarefaForm({ titulo: "", descricao: "", data_prevista: "" });
                  } finally {
                    setIsTaskSaving(false);
                  }
                }} className="space-y-2">
                  <Input
                    value={tarefaForm.titulo}
                    onChange={(e) => setTarefaForm((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Nova tarefa..."
                  />
                  <Input
                    value={tarefaForm.descricao}
                    onChange={(e) => setTarefaForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descrição (opcional)"
                  />
                  <Input
                    type="date"
                    value={tarefaForm.data_prevista}
                    onChange={(e) => setTarefaForm((f) => ({ ...f, data_prevista: e.target.value }))}
                  />
                  <Button type="submit" size="sm" disabled={isTaskSaving}>
                    {isTaskSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Tarefa"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="comunicacoes" className="space-y-4">
                <div className="space-y-2">
                  {posVenda.comunicacoes.map((com) => (
                    <div key={com.id} className="flex items-start justify-between rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {com.tipo === "WhatsApp" ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{com.tipo}</p>
                          <p className="text-sm">{com.descricao}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(com.data)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {posVenda.comunicacoes.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada.</p>
                  )}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!posVenda.selectedPosVenda || !comunicacaoForm.descricao.trim()) return;
                  setIsCommsSaving(true);
                  try {
                    await posVenda.addComunicacao({
                      pos_venda_id: posVenda.selectedPosVenda.id,
                      tipo: comunicacaoForm.tipo,
                      descricao: comunicacaoForm.descricao.trim(),
                      resultado: comunicacaoForm.resultado.trim(),
                      data: new Date().toISOString(),
                      usuario_id: posVenda.selectedPosVenda.usuario_id,
                    });
                    setComunicacaoForm({ tipo: "WhatsApp", descricao: "", resultado: "" });
                  } finally {
                    setIsCommsSaving(false);
                  }
                }} className="space-y-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={comunicacaoForm.tipo}
                    onChange={(e) => setComunicacaoForm((f) => ({ ...f, tipo: e.target.value as PosVendaComunicacao["tipo"] }))}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Ligação">Ligação</option>
                  </select>
                  <Input
                    value={comunicacaoForm.descricao}
                    onChange={(e) => setComunicacaoForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descrição da comunicação..."
                  />
                  <Input
                    value={comunicacaoForm.resultado}
                    onChange={(e) => setComunicacaoForm((f) => ({ ...f, resultado: e.target.value }))}
                    placeholder="Resultado..."
                  />
                  <Button type="submit" size="sm" disabled={isCommsSaving}>
                    {isCommsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrar Comunicação"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-4">
                {posVenda.selectedPosVenda.boleto_url && (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <a
                      href={posVenda.selectedPosVenda.boleto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver link
                    </a>
                  </div>
                )}
                {posVenda.selectedPosVenda.retencao_motivo && (
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">Motivo da Retenção</p>
                    <p className="text-sm text-muted-foreground">{posVenda.selectedPosVenda.retencao_motivo}</p>
                  </div>
                )}
                {!posVenda.selectedPosVenda.boleto_url && !posVenda.selectedPosVenda.retencao_motivo && (
                  <p className="text-sm text-muted-foreground">Nenhum documento adicional.</p>
                )}
              </TabsContent>

              <TabsContent value="enviar" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={mediaType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("image"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <FileImage className="mr-1 h-4 w-4" /> Imagem
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "audio" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("audio"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <FileAudio className="mr-1 h-4 w-4" /> Áudio
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "video" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("video"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <FileVideo className="mr-1 h-4 w-4" /> Vídeo
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "pdf" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("pdf"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <FileText className="mr-1 h-4 w-4" /> PDF
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "document" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("document"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <Paperclip className="mr-1 h-4 w-4" /> Documento
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "link" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("link"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <LinkIcon className="mr-1 h-4 w-4" /> Link
                    </Button>
                    <Button
                      type="button"
                      variant={mediaType === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setMediaType("text"); setSelectedFile(null); setLinkValue(""); }}
                    >
                      <FileText className="mr-1 h-4 w-4" /> Texto
                    </Button>
                  </div>

                  {mediaType === "link" && (
                    <div className="space-y-2">
                      <Label htmlFor="link-value">URL do link</Label>
                      <Input
                        id="link-value"
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  {mediaType === "text" && (
                    <div className="space-y-2">
                      <Label htmlFor="text-value">Texto da mensagem</Label>
                      <Textarea
                        id="text-value"
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                        placeholder="Digite a mensagem para enviar via WhatsApp..."
                        rows={3}
                      />
                    </div>
                  )}

                  {mediaType !== "link" && mediaType !== "text" && (
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Arquivo selecionado</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="file-upload"
                          type="file"
                          accept={getAcceptForType(mediaType)}
                          onChange={handleFileSelect}
                        />
                        {selectedFile && (
                          <span className="text-xs text-muted-foreground">
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleUploadAndSendMedia}
                    disabled={isSendingMedia || (!selectedFile && mediaType !== "link" && mediaType !== "text")}
                    className="w-full"
                  >
                    {isSendingMedia ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Enviar para o cliente</>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="anexos" className="space-y-4">
                {posVenda.selectedPosVenda && (
                  <>
                    <AnexosUpload
                      entityType="pos_venda"
                      entityId={posVenda.selectedPosVenda.id}
                    />
                    <AnexosList
                      entityType="pos_venda"
                      entityId={posVenda.selectedPosVenda.id}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover registro</DialogTitle>
            <DialogDescription>
              Selecione outro cliente para mover este registro de pós-venda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar cliente..."
                value={posVenda.clienteSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  posVenda.setClienteSearch(value);
                  if (value.trim()) {
                    void posVenda.searchContatosByTelefone(value);
                  } else {
                    void posVenda.getAllClientes();
                  }
                }}
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {posVenda.clienteSearchResults.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    posVenda.setFormData((current) => ({ ...current, cliente_id: cliente.id }));
                    posVenda.setClienteSearch(cliente.nome);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">{cliente.telefone}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{cliente.status}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmMove}>Confirmar movimentação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar retorno</DialogTitle>
            <DialogDescription>
              Defina a data e hora do próximo retorno para este registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Data e hora</Label>
              <Input
                id="schedule-date"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSchedule}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={posVenda.isDeleteOpen} onOpenChange={posVenda.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir registro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este registro de pós-venda? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => posVenda.setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={posVenda.handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PosVendaPage;

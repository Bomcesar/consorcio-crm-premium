"use client";

import { useEffect, useState, useMemo } from "react";
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
import { useLeads } from "@/hooks/use-leads";
import { useClientes } from "@/hooks/use-clientes";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Filter,
  Phone,
  MessageCircle,
  UserPlus,
  FileText,
  History,
  Paperclip,
  X,
  ChevronDown,
  Upload,
  Link2,
  Video,
  Users,
  Building2,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadHistorico, LeadAnexo } from "@/repositories/client/leads.repository";

const emptyForm = {
  nome: "",
  telefone: "",
  cidade: "",
  email: "",
  origem: "",
  valor_estimado: "",
  probabilidade: "0",
  status: "Novo" as Lead["status"],
  observacoes: "",
};

type LeadFormData = typeof emptyForm;

const emptyHistoricoForm = {
  tipo: "observacao" as LeadHistorico["tipo"],
  descricao: "",
};

type HistoricoFormData = typeof emptyHistoricoForm;

export default function LeadsPage() {
  const { success, error } = useToast();
  const { list, create, update, remove, search, filterByStatus, getHistorico, addHistorico, getAnexos, addAnexo, removeAnexo } = useLeads();
  const clientesHook = useClientes();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [historico, setHistorico] = useState<LeadHistorico[]>([]);
  const [anexos, setAnexos] = useState<LeadAnexo[]>([]);
  const [historicoForm, setHistoricoForm] = useState<HistoricoFormData>(emptyHistoricoForm);
  const [isHistoricoSaving, setIsHistoricoSaving] = useState(false);
  const [isAnexoSaving, setIsAnexoSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isAnexosLoading, setIsAnexosLoading] = useState(false);
  const [tab, setTab] = useState("info");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<"clientes" | "indicadores" | "parceiros" | "recrutamento" | "negociacoes">("clientes");
  const [isConverting, setIsConverting] = useState(false);

  const loadLeads = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await list();
      setLeads(data);
      setFilteredLeads(data);
    } catch {
      setErrorMessage("Não foi possível carregar os leads no momento.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  useEffect(() => {
    let result = leads;
    if (statusFilter !== "todos") {
      result = result.filter((lead) => lead.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (lead) =>
          lead.nome.toLowerCase().includes(q) ||
          lead.telefone.toLowerCase().includes(q) ||
          lead.cidade.toLowerCase().includes(q) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.observacoes && lead.observacoes.toLowerCase().includes(q)),
      );
    }
    setFilteredLeads(result);
  }, [searchQuery, statusFilter, leads]);

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setSelectedLead(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      nome: lead.nome,
      telefone: lead.telefone,
      cidade: lead.cidade,
      email: lead.email || "",
      origem: lead.origem || "",
      valor_estimado: String(lead.valor_estimado ?? 0),
      probabilidade: String(lead.probabilidade ?? 0),
      status: lead.status,
      observacoes: lead.observacoes || "",
    });
    setIsFormOpen(true);
  };

  const openDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  const openDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setTab("info");
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    setIsHistoryLoading(true);
    setIsAnexosLoading(true);
    try {
      const [hist, anex] = await Promise.all([getHistorico(lead.id), getAnexos(lead.id)]);
      setHistorico(hist);
      setAnexos(anex);
    } catch {
      setHistorico([]);
      setAnexos([]);
    } finally {
      setIsLoadingDetail(false);
      setIsHistoryLoading(false);
      setIsAnexosLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.nome.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim(),
        email: formData.email.trim(),
        origem: formData.origem.trim(),
        valor_estimado: Number(formData.valor_estimado) || 0,
        probabilidade: Number(formData.probabilidade) || 0,
        status: formData.status,
        observacoes: formData.observacoes.trim(),
      };
      if (selectedLead) {
        const updated = await update(selectedLead.id, payload);
        setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
        if (isDetailOpen && selectedLead.id === updated.id) {
          setSelectedLead(updated);
        }
      } else {
        const created = await create(payload);
        setLeads((prev) => [created, ...prev]);
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedLead(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar o lead.";
      setErrorMessage(message);
      error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    try {
      await remove(selectedLead.id);
      setLeads((prev) => prev.filter((lead) => lead.id !== selectedLead.id));
      setFilteredLeads((prev) => prev.filter((lead) => lead.id !== selectedLead.id));
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedLead(null);
    } catch {
      // erro já tratado no hook
    }
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLead || !historicoForm.descricao.trim()) return;
    setIsHistoricoSaving(true);
    try {
      const item = await addHistorico(selectedLead.id, historicoForm);
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
    if (!selectedLead) return;
    const input = document.getElementById(`anexo-file-${selectedLead.id}`) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setIsAnexoSaving(true);
    try {
      const item = await addAnexo(selectedLead.id, file);
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

  const openConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertTarget("clientes");
    setIsConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!selectedLead) return;
    setIsConverting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (convertTarget === "clientes") {
        await clientesHook.create({
          nome: selectedLead.nome,
          telefone: selectedLead.telefone,
          email: selectedLead.email || "",
          cidade: selectedLead.cidade,
          estado: "",
          status: "Ativo",
          origem: selectedLead.origem || "",
          observacoes: selectedLead.observacoes || "",
        });
        await update(selectedLead.id, { status: "Ganho" });
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Ganho" as Lead["status"] } : l)));
        setSelectedLead((prev) => (prev ? { ...prev, status: "Ganho" as Lead["status"] } : prev));
        success("Lead convertido para cliente com sucesso.");
      } else if (convertTarget === "indicadores") {
        const { error: supabaseError } = await supabase.from("indicadores").insert({
          nome: selectedLead.nome,
          telefone: selectedLead.telefone,
          email: selectedLead.email || "",
          cidade: selectedLead.cidade,
          estado: "",
          cpf: "",
          pix: "",
          origem: selectedLead.origem || "",
          status: "Ativo",
          observacoes: selectedLead.observacoes || "",
          ativo: true,
          usuario_id: user?.id || "",
          grupo_whatsapp: false,
          link_grupo: "",
          grupo_criado: false,
        });
        if (supabaseError) throw supabaseError;
        await update(selectedLead.id, { status: "Ganho" });
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Ganho" as Lead["status"] } : l)));
        setSelectedLead((prev) => (prev ? { ...prev, status: "Ganho" as Lead["status"] } : prev));
        success("Lead convertido para indicador com sucesso.");
      } else if (convertTarget === "parceiros") {
        const { error: supabaseError } = await supabase.from("parceiros").insert({
          nome: selectedLead.nome,
          cnpj: "",
          contato: selectedLead.nome,
          email: selectedLead.email || "",
          telefone: selectedLead.telefone,
          tipo: "",
          status: "Ativo",
          observacoes: selectedLead.observacoes || "",
          usuario_id: user?.id || "",
        });
        if (supabaseError) throw supabaseError;
        await update(selectedLead.id, { status: "Ganho" });
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Ganho" as Lead["status"] } : l)));
        setSelectedLead((prev) => (prev ? { ...prev, status: "Ganho" as Lead["status"] } : prev));
        success("Lead convertido para parceiro com sucesso.");
      } else if (convertTarget === "recrutamento") {
        const { error: supabaseError } = await supabase.from("recrutamento").insert({
          nome: selectedLead.nome,
          email: selectedLead.email || "",
          telefone: selectedLead.telefone,
          origem: selectedLead.origem || "",
          status: "Novo",
          observacoes: selectedLead.observacoes || "",
          usuario_id: user?.id || "",
        });
        if (supabaseError) throw supabaseError;
        await update(selectedLead.id, { status: "Ganho" });
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Ganho" as Lead["status"] } : l)));
        setSelectedLead((prev) => (prev ? { ...prev, status: "Ganho" as Lead["status"] } : prev));
        success("Lead convertido para recrutamento com sucesso.");
      } else if (convertTarget === "negociacoes") {
        const { error: supabaseError } = await supabase.from("negociacoes").insert({
          titulo: selectedLead.nome,
          valor: Number(selectedLead.valor_estimado) || 0,
          etapa: "Proposta",
          probabilidade: Number(selectedLead.probabilidade) || 50,
          data_prevista: new Date().toISOString().slice(0, 10),
          observacoes: selectedLead.observacoes || "",
          lead_id: selectedLead.id,
          usuario_id: user?.id || "",
          modalidade: "",
          proposta: "",
          proxima_acao: "",
          data_proxima_acao: null,
        });
        if (supabaseError) throw supabaseError;
        await update(selectedLead.id, { status: "Proposta" });
        setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "Proposta" as Lead["status"] } : l)));
        setSelectedLead((prev) => (prev ? { ...prev, status: "Proposta" as Lead["status"] } : prev));
        success("Lead convertido para negociação com sucesso.");
      }

      setIsConvertOpen(false);
    } catch {
      error("Não foi possível converter o lead.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    const phone = (lead.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para WhatsApp.");
      return;
    }
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  const handleCall = (lead: Lead) => {
    const phone = (lead.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para ligação.");
      return;
    }
    window.location.href = `tel:+55${phone}`;
  };

  const statusOptions = useMemo(() => {
    const statuses = new Set(leads.map((l) => l.status));
    return Array.from(statuses);
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie e qualifique seus leads de consórcio
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Leads cadastrados</CardTitle>
          <CardDescription>
            {filteredLeads.length > 0 ? `${filteredLeads.length} lead(s) encontrado(s)` : "Nenhum lead cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, telefone, cidade..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lead cadastrado ainda. Clique em &quot;Novo Lead&quot; para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>
                        <Badge variant={lead.status === "Ganho" ? "success" : lead.status === "Perdido" ? "destructive" : "secondary"}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.cidade || "—"}</TableCell>
                      <TableCell>{lead.telefone || "—"}</TableCell>
                      <TableCell>{lead.origem || "—"}</TableCell>
                      <TableCell>{lead.valor_estimado ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(lead.valor_estimado)) : "—"}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetail(lead)}
                          aria-label="Ver detalhes"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleWhatsApp(lead)}
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCall(lead)}
                          aria-label="Ligar"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConvert(lead)}
                          aria-label="Converter lead"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(lead)}
                          aria-label="Editar lead"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(lead)}
                          aria-label="Excluir lead"
                        >
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
            <DialogTitle>{selectedLead ? "Editar lead" : "Novo lead"}</DialogTitle>
            <DialogDescription>
              {selectedLead
                ? "Atualize as informações do lead selecionado."
                : "Cadastre um novo lead diretamente nesta página."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(event) => handleChange("nome", event.target.value)}
                placeholder="Digite o nome"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(event) => handleChange("telefone", event.target.value)}
                  placeholder="(00) 00000-0000"
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
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <Label htmlFor="origem">Origem</Label>
                <Input
                  id="origem"
                  value={formData.origem}
                  onChange={(event) => handleChange("origem", event.target.value)}
                  placeholder="Ex: Indicação, Site, WhatsApp"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor_estimado">Valor Estimado (R$)</Label>
                <Input
                  id="valor_estimado"
                  type="number"
                  min="0"
                  value={formData.valor_estimado}
                  onChange={(event) => handleChange("valor_estimado", event.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probabilidade">Probabilidade (%)</Label>
                <Input
                  id="probabilidade"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probabilidade}
                  onChange={(event) => handleChange("probabilidade", event.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status}
                onChange={(event) => handleChange("status", event.target.value)}
              >
                <option value="Novo">Novo</option>
                <option value="Em contato">Em contato</option>
                <option value="Qualificado">Qualificado</option>
                <option value="Em análise">Em análise</option>
                <option value="Proposta">Proposta</option>
                <option value="Ganho">Ganho</option>
                <option value="Perdido">Perdido</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(event) => handleChange("observacoes", event.target.value)}
                placeholder="Adicione observações relevantes"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormData(emptyForm);
                  setSelectedLead(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : selectedLead ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir lead</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead <strong>{selectedLead?.nome}</strong>? Esta ação não pode ser desfeita.
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

      <Dialog open={isDetailOpen} onOpenChange={(open) => { if (!open) { setIsDetailOpen(false); setSelectedLead(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {isLoadingDetail || !selectedLead ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Lead</DialogTitle>
                <DialogDescription>{selectedLead.nome}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 border-b">
                <Button variant={tab === "info" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("info")}>Informações</Button>
                <Button variant={tab === "historico" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("historico")}>Histórico</Button>
                <Button variant={tab === "anexos" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("anexos")}>Anexos</Button>
                <Button variant={tab === "acoes" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("acoes")}>Ações</Button>
              </div>
              {tab === "info" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Nome</p>
                    <p className="text-sm">{selectedLead.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedLead.status === "Ganho" ? "success" : selectedLead.status === "Perdido" ? "destructive" : "secondary"}>
                      {selectedLead.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Telefone</p>
                    <p className="text-sm">{selectedLead.telefone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cidade</p>
                    <p className="text-sm">{selectedLead.cidade || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedLead.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Origem</p>
                    <p className="text-sm">{selectedLead.origem || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Valor Estimado</p>
                    <p className="text-sm">{selectedLead.valor_estimado ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(selectedLead.valor_estimado)) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Probabilidade</p>
                    <p className="text-sm">{selectedLead.probabilidade ?? 0}%</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedLead.observacoes || "—"}</p>
                  </div>
                </div>
              )}
              {tab === "historico" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddHistorico} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tipo-historico">Tipo</Label>
                        <select
                          id="tipo-historico"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={historicoForm.tipo}
                          onChange={(event) => setHistoricoForm((prev) => ({ ...prev, tipo: event.target.value as LeadHistorico["tipo"] }))}
                        >
                           <option value="observacao">Observação</option>
                           <option value="oportunidade">Oportunidade</option>
                           <option value="contactando">Contactando</option>
                           <option value="aguardando_resposta">Aguardando resposta</option>
                           <option value="reuniao">Reunião</option>
                           <option value="reuniao_agendada">Reunião agendada</option>
                           <option value="disse_nao">Disse não</option>
                           <option value="aguardando_pagamento">Aguardando pagamento</option>
                           <option value="fechamento">Fechamento</option>
                           <option value="pago">Pago</option>
                           <option value="ligacao">Ligação</option>
                           <option value="whatsapp">WhatsApp</option>
                           <option value="email">Email</option>
                           <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricao-historico">Descrição</Label>
                        <Input
                          id="descricao-historico"
                          value={historicoForm.descricao}
                          onChange={(event) => setHistoricoForm((prev) => ({ ...prev, descricao: event.target.value }))}
                          placeholder="Descreva a interação"
                          required
                        />
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
                      <Label htmlFor={`anexo-file-${selectedLead.id}`}>Anexo</Label>
                      <Input
                        key={fileInputKey}
                        id={`anexo-file-${selectedLead.id}`}
                        type="file"
                        onChange={() => {}}
                      />
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
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{anexo.nome}</p>
                              <p className="text-xs text-muted-foreground">{new Intl.NumberFormat("pt-BR", { style: "decimal" }).format(anexo.tamanho)} bytes</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAnexo(anexo.id)}
                            aria-label="Remover anexo"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "acoes" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => handleWhatsApp(selectedLead)}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => handleCall(selectedLead)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Ligar
                  </Button>
                  <Button variant="outline" onClick={() => openConvert(selectedLead)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Converter contato
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter lead</DialogTitle>
            <DialogDescription>
              Selecione para qual módulo deseja converter o lead <strong>{selectedLead?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destino</Label>
              <select
                value={convertTarget}
                onChange={(e) => setConvertTarget(e.target.value as "clientes" | "indicadores" | "parceiros" | "recrutamento" | "negociacoes")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="clientes">Cliente</option>
                <option value="indicadores">Indicador</option>
                <option value="parceiros">Parceiro</option>
                <option value="recrutamento">Recrutamento</option>
                <option value="negociacoes">Negociação</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)} disabled={isConverting}>
              Cancelar
            </Button>
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Convertendo...</> : "Converter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

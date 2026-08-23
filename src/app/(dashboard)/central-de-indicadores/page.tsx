"use client";

import { useMemo, useState, useEffect } from "react";
import { useCentralIndicadores } from "@/hooks/use-central-indicadores";
import { Badge } from "@/components/ui/badge";
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
import {
  Activity,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  UserPlus,
  FileText,
  History,
  MessageCircle,
} from "lucide-react";
import type { Indicador, IndicadorHistorico } from "@/repositories/client/indicadores.repository";
import type { ContatoIndicado } from "@/repositories/client/contatos-indicados.repository";
import { updateIndicador, deleteIndicador } from "@/repositories/client/indicadores.repository";

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  cpf: "",
  pix: "",
  origem: "",
  status: "Ativo" as Indicador["status"],
  observacoes: "",
  ativo: true,
};

const emptyHistoricoForm = {
  tipo: "observacao" as IndicadorHistorico["tipo"],
  descricao: "",
};

type FormData = typeof emptyForm;
type HistoricoFormData = typeof emptyHistoricoForm;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export default function CentralDeIndicadoresPage() {
  const {
    indicators,
    contacts,
    commissions,
    historico,
    selectedIndicatorId,
    isFormOpen,
    isContactFormOpen,
    isContactsLoading,
    isLoading,
    isHistoryLoading,
    formData,
    contactFormData,
    historicoForm,
    editingContactId,
    isSaving,
    isContactSaving,
    isHistoricoSaving,
    summary,
    ranking,
    setIndicators,
    setContacts,
    setCommissions,
    setFormData,
    setContactFormData,
    setHistoricoForm,
    setEditingContactId,
    setIsFormOpen,
    setIsContactFormOpen,
    setSelectedIndicatorId,
    loadIndicators,
    loadContacts,
    loadCommissions,
    loadHistorico,
    handleOpenContacts,
    handleSubmit,
    handleSaveContact,
    handleDeleteContact,
    handleMarkCommissionAsPaid,
    handleAddHistorico,
    success,
    error,
  } = useCentralIndicadores();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [ativoFilter, setAtivoFilter] = useState<string>("todos");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicador | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tab, setTab] = useState("info");

  const filteredIndicators = useMemo(() => {
    let result = indicators;
    if (statusFilter !== "todos") {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (ativoFilter !== "todos") {
      result = result.filter((i) => ativoFilter === "ativo" ? i.ativo : !i.ativo);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.telefone.toLowerCase().includes(q) ||
          i.cidade.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.observacoes.toLowerCase().includes(q),
      );
    }
    return result;
  }, [indicators, searchQuery, statusFilter, ativoFilter]);

  useEffect(() => {
    void loadIndicators();
  }, []);

  useEffect(() => {
    console.log("[CentralIndicadores] indicators carregados:", indicators.length);
  }, [indicators]);

  const openCreate = () => {
    setSelectedIndicator(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (indicator: Indicador) => {
    setSelectedIndicator(indicator);
    setFormData({
      nome: indicator.nome,
      telefone: indicator.telefone,
      email: indicator.email,
      cidade: indicator.cidade,
      estado: indicator.estado,
      cpf: indicator.cpf,
      pix: indicator.pix,
      origem: indicator.origem,
      status: indicator.status,
      observacoes: indicator.observacoes,
      ativo: indicator.ativo,
    });
    setIsFormOpen(true);
  };

  const openDelete = (indicator: Indicador) => {
    setSelectedIndicator(indicator);
    setIsDetailOpen(false);
    setIsFormOpen(false);
  };

  const toggleAtivo = async (indicator: Indicador) => {
    try {
      const updated = await updateIndicador(indicator.id, { ativo: !indicator.ativo });
      setIndicators((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selectedIndicator?.id === updated.id) {
        setSelectedIndicator(updated);
      }
      success(indicator.ativo ? "Indicador inativado." : "Indicador ativado.");
    } catch {
      error("Não foi possível atualizar o status do indicador.");
    }
  };

  const openDetail = async (indicator: Indicador) => {
    setSelectedIndicator(indicator);
    setTab("info");
    setIsDetailOpen(true);
    await handleOpenContacts(indicator.id);
    await loadHistorico(indicator.id);
  };

  const handleDelete = async () => {
    if (!selectedIndicator) return;
    try {
      await deleteIndicador(selectedIndicator.id);
      setIndicators((prev) => prev.filter((i) => i.id !== selectedIndicator.id));
      setIsDetailOpen(false);
      setSelectedIndicator(null);
      success("Indicador excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o indicador.");
    }
  };

  const handleWhatsApp = (indicator: Indicador) => {
    const phone = (indicator.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para WhatsApp.");
      return;
    }
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  const handleCall = (indicator: Indicador) => {
    const phone = (indicator.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para ligação.");
      return;
    }
    window.location.href = `tel:+55${phone}`;
  };

  const handleConvertToCliente = async () => {
    if (!selectedIndicator) return;
    try {
      await updateIndicador(selectedIndicator.id, { status: "Inativo" });
      setIndicators((prev) => prev.map((i) => (i.id === selectedIndicator.id ? { ...i, status: "Inativo" as Indicador["status"] } : i)));
      setSelectedIndicator((prev) => (prev ? { ...prev, status: "Inativo" as Indicador["status"] } : prev));
      success("Indicador convertido para cliente.");
    } catch {
      error("Não foi possível converter o indicador.");
    }
  };

  const statusOptions = useMemo(() => {
    const statuses = new Set(indicators.map((i) => i.status));
    return Array.from(statuses);
  }, [indicators]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Central de Indicadores</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus indicadores, contatos e comissões.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Indicador
        </Button>
      </div>

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
          <CardTitle className="text-lg">Indicadores cadastrados</CardTitle>
          <CardDescription>
            {filteredIndicators.length > 0 ? `${filteredIndicators.length} indicador(es) encontrado(s)` : "Nenhum indicador cadastrado ainda."}
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
              <select
                value={ativoFilter}
                onChange={(event) => setAtivoFilter(event.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIndicators.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum indicador cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndicators.map((indicator) => (
                    <TableRow key={indicator.id}>
                      <TableCell className="font-medium">{indicator.nome}</TableCell>
                      <TableCell>{indicator.telefone || "—"}</TableCell>
                      <TableCell>{indicator.cidade || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={indicator.status === "Ativo" ? "success" : indicator.status === "Inativo" ? "destructive" : "secondary"}>
                          {indicator.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleAtivo(indicator)}>
                          {indicator.ativo ? "Sim" : "Não"}
                        </Button>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(indicator)} aria-label="Ver detalhes">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(indicator)} aria-label="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCall(indicator)} aria-label="Ligar">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(indicator)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(indicator)} aria-label="Excluir">
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
            <DialogTitle>{selectedIndicator ? "Editar indicador" : "Novo indicador"}</DialogTitle>
            <DialogDescription>{selectedIndicator ? "Atualize as informações do indicador." : "Cadastre um novo indicador na central."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix">PIX</Label>
                <Input id="pix" value={formData.pix} onChange={(e) => setFormData({ ...formData, pix: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Input id="origem" value={formData.origem} onChange={(e) => setFormData({ ...formData, origem: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Indicador["status"] })}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedIndicator(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedIndicator ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={(open) => { if (!open) { setIsDetailOpen(false); setSelectedIndicator(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {!selectedIndicator ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Indicador</DialogTitle>
                <DialogDescription>{selectedIndicator.nome}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 border-b">
                <Button variant={tab === "info" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("info")}>Informações</Button>
                <Button variant={tab === "historico" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("historico")}>Histórico</Button>
                <Button variant={tab === "contatos" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("contatos")}>Contatos</Button>
                <Button variant={tab === "comissoes" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("comissoes")}>Comissões</Button>
                <Button variant={tab === "acoes" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("acoes")}>Ações</Button>
              </div>
              {tab === "info" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Nome</p>
                    <p className="text-sm">{selectedIndicator.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedIndicator.status === "Ativo" ? "success" : selectedIndicator.status === "Inativo" ? "destructive" : "secondary"}>{selectedIndicator.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Telefone</p>
                    <p className="text-sm">{selectedIndicator.telefone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedIndicator.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cidade</p>
                    <p className="text-sm">{selectedIndicator.cidade || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm">{selectedIndicator.estado || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">CPF</p>
                    <p className="text-sm">{selectedIndicator.cpf || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">PIX</p>
                    <p className="text-sm">{selectedIndicator.pix || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Origem</p>
                    <p className="text-sm">{selectedIndicator.origem || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ativo</p>
                    <Badge variant={selectedIndicator.ativo ? "success" : "destructive"}>{selectedIndicator.ativo ? "Sim" : "Não"}</Badge>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedIndicator.observacoes || "—"}</p>
                  </div>
                </div>
              )}
              {tab === "historico" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddHistorico} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tipo-historico">Tipo</Label>
                        <select id="tipo-historico" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={historicoForm.tipo} onChange={(e) => setHistoricoForm({ ...historicoForm, tipo: e.target.value as IndicadorHistorico["tipo"] })}>
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
              {tab === "contatos" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setEditingContactId(null); setContactFormData({ nome: "", telefone: "", cidade: "", status: "Novo", observacoes: "" }); setIsContactFormOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Contato
                    </Button>
                  </div>
                  {isContactsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contacts.map((contact) => (
                            <TableRow key={contact.id}>
                              <TableCell className="font-medium">{contact.nome}</TableCell>
                              <TableCell>{contact.telefone || "—"}</TableCell>
                              <TableCell>{contact.cidade || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={contact.status === "Novo" ? "secondary" : contact.status === "Qualificado" ? "success" : "outline"}>{contact.status}</Badge>
                              </TableCell>
                              <TableCell className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingContactId(contact.id); setContactFormData({ nome: contact.nome, telefone: contact.telefone, cidade: contact.cidade, status: contact.status as ContatoIndicado["status"], observacoes: contact.observacoes }); setIsContactFormOpen(true); }} aria-label="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)} aria-label="Excluir">
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              {tab === "comissoes" && (
                <div className="space-y-4">
                  {commissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma comissão cadastrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>PIX</TableHead>
                            <TableHead>Data Pagamento</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id}>
                              <TableCell>{formatCurrency(Number(commission.valor))}</TableCell>
                              <TableCell>
                                <Badge variant={commission.status === "Paga" ? "success" : "secondary"}>{commission.status}</Badge>
                              </TableCell>
                              <TableCell>{commission.pix || "—"}</TableCell>
                              <TableCell>{commission.data_pagamento ? new Date(commission.data_pagamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                              <TableCell>
                                {commission.status !== "Paga" && (
                                  <Button variant="ghost" size="icon" onClick={() => handleMarkCommissionAsPaid(commission.id)} aria-label="Marcar como pago">
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              {tab === "acoes" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => handleWhatsApp(selectedIndicator)}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => handleCall(selectedIndicator)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Ligar
                  </Button>
                  <Button variant="outline" onClick={handleConvertToCliente}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Converter para Cliente
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Indicador
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContactId ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription>{editingContactId ? "Atualize as informações do contato." : "Cadastre um novo contato para este indicador."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveContact}>
            <div className="space-y-2">
              <Label htmlFor="contact_nome">Nome</Label>
              <Input id="contact_nome" value={contactFormData.nome} onChange={(e) => setContactFormData({ ...contactFormData, nome: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_telefone">Telefone</Label>
                <Input id="contact_telefone" value={contactFormData.telefone} onChange={(e) => setContactFormData({ ...contactFormData, telefone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_cidade">Cidade</Label>
                <Input id="contact_cidade" value={contactFormData.cidade} onChange={(e) => setContactFormData({ ...contactFormData, cidade: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_status">Status</Label>
              <select id="contact_status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={contactFormData.status} onChange={(e) => setContactFormData({ ...contactFormData, status: e.target.value as ContatoIndicado["status"] })}>
                <option value="Novo">Novo</option>
                <option value="Em contato">Em contato</option>
                <option value="Qualificado">Qualificado</option>
                <option value="Em análise">Em análise</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_observacoes">Observações</Label>
              <Textarea id="contact_observacoes" value={contactFormData.observacoes} onChange={(e) => setContactFormData({ ...contactFormData, observacoes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsContactFormOpen(false); setContactFormData({ nome: "", telefone: "", cidade: "", status: "Novo", observacoes: "" }); setEditingContactId(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isContactSaving}>
                {isContactSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedIndicator && isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setSelectedIndicator(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir indicador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o indicador <strong>{selectedIndicator?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setSelectedIndicator(null); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

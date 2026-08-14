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
} from "lucide-react";
import type { Negociacao, NegociacaoHistorico, NegociacaoAnexo } from "@/repositories/client/negociacoes.repository";

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
  const [leads, setLeads] = useState<{ id: string; nome: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
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

  const loadNegociacoes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [negociacoesData, leadsData, clientesData] = await Promise.all([list(), listLeads(), listClientes()]);
      setNegociacoes(negociacoesData);
      setFilteredNegociacoes(negociacoesData);
      setLeads(leadsData.map((l: { id: string; nome: string }) => ({ id: l.id, nome: l.nome })));
      setClientes(clientesData.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    } catch {
      setErrorMessage("Não foi possível carregar as negociações.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNegociacoes();
  }, []);

  useEffect(() => {
    let result = negociacoes;
    if (etapaFilter !== "todos") {
      result = result.filter((n) => n.etapa === etapaFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.titulo.toLowerCase().includes(q) ||
          n.observacoes.toLowerCase().includes(q) ||
          n.modalidade.toLowerCase().includes(q) ||
          n.proposta.toLowerCase().includes(q) ||
          n.proxima_acao.toLowerCase().includes(q),
      );
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
      const [hist, anex] = await Promise.all([getHistorico(negociacao.id), getAnexos(negociacao.id)]);
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
        lead_id: formData.lead_id,
        cliente_id: formData.cliente_id || null,
        modalidade: formData.modalidade.trim(),
        proposta: formData.proposta.trim(),
        proxima_acao: formData.proxima_acao.trim(),
        data_proxima_acao: formData.data_proxima_acao || null,
      };
      if (selectedNegociacao) {
        const updated = await update(selectedNegociacao.id, payload);
        setNegociacoes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        if (isDetailOpen && selectedNegociacao.id === updated.id) {
          setSelectedNegociacao(updated);
        }
      } else {
        const created = await create(payload);
        setNegociacoes((prev) => [created, ...prev]);
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedNegociacao(null);
    } catch {
      // erro tratado no hook
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
                <Label htmlFor="lead_id">Lead</Label>
                <select id="lead_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.lead_id} onChange={(e) => handleChange("lead_id", e.target.value)}>
                  <option value="">Selecione</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente</Label>
                <select id="cliente_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.cliente_id} onChange={(e) => handleChange("cliente_id", e.target.value)}>
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
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
              </div>
              {tab === "info" && (
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

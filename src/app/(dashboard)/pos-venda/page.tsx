"use client";

import { useEffect, useState } from "react";
import { usePosVenda } from "@/hooks/use-pos-venda";
import { useClientes } from "@/hooks/use-clientes";
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
import { Plus, Pencil, Trash2, Loader2, Headphones, CheckCircle2, Circle, Phone, MessageSquare, FileText, Calendar } from "lucide-react";
import type { PosVendaInsert, PosVendaTarefa, PosVendaComunicacao } from "@/repositories/client/pos-venda.repository";
import { AnexosUpload } from "@/components/anexos/anexos-upload";
import { AnexosList } from "@/components/anexos/anexos-list";

const emptyForm: PosVendaInsert = {
  tipo: "Follow-up",
  descricao: "",
  data_prevista: "",
  data_realizada: null,
  status: "Pendente",
  cliente_id: null,
  lead_id: null,
  usuario_id: "",
  boleto_url: "",
  lembrete_em: null,
  retencao_motivo: "",
  retencao_data: null,
};

type PosVendaFormData = PosVendaInsert;

export default function PosVendaPage() {
  const posVenda = usePosVenda();
  const { list: listClientes } = useClientes();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [historicoForm, setHistoricoForm] = useState({ tipo: "observacao", descricao: "" });
  const [tarefaForm, setTarefaForm] = useState({ titulo: "", descricao: "", data_prevista: "" });
  const [comunicacaoForm, setComunicacaoForm] = useState({ tipo: "WhatsApp" as PosVendaComunicacao["tipo"], descricao: "", resultado: "" });
  const [isHistorySaving, setIsHistorySaving] = useState(false);
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [isCommsSaving, setIsCommsSaving] = useState(false);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  useEffect(() => {
    if (posVenda.selectedPosVenda) {
      void posVenda.loadHistorico(posVenda.selectedPosVenda.id);
      void posVenda.loadTarefas(posVenda.selectedPosVenda.id);
      void posVenda.loadComunicacoes(posVenda.selectedPosVenda.id);
    }
  }, [posVenda]);

  const handleChange = (field: keyof PosVendaFormData, value: string | number | boolean | null) => {
    posVenda.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!posVenda.formData.descricao?.trim()) return;

    await posVenda.handleSubmit(event);
  };

  const handleDelete = async () => {
    await posVenda.handleDelete();
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!posVenda.selectedPosVenda || !historicoForm.descricao.trim()) return;
    setIsHistorySaving(true);
    try {
      await posVenda.addHistorico(posVenda.selectedPosVenda.id, historicoForm);
      setHistoricoForm({ tipo: "observacao", descricao: "" });
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistorySaving(false);
    }
  };

  const handleAddTarefa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    } catch {
      // erro tratado no hook
    } finally {
      setIsTaskSaving(false);
    }
  };

  const handleToggleTarefa = async (tarefa: PosVendaTarefa) => {
    const newStatus = tarefa.status === "Pendente" ? "Concluída" : "Pendente";
    await posVenda.updateTarefa(tarefa.id, {
      status: newStatus,
      data_realizada: newStatus === "Concluída" ? new Date().toISOString().split("T")[0] : null,
    });
  };

  const handleAddComunicacao = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    } catch {
      // erro tratado no hook
    } finally {
      setIsCommsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      Pendente: "secondary",
      Agendado: "outline",
      Realizado: "success",
      Cancelado: "destructive",
      "Concluída": "success",
    };
    return map[status] || "secondary";
  };

  const getTipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      "Follow-up": "Follow-up",
      "Assembleia": "Assembleia",
      "Contemplação": "Contemplação",
      "Retenção": "Retenção",
      "Treinamento": "Treinamento",
      "Envio de boleto": "Envio de boleto",
      "Lembrete de vencimento": "Lembrete de vencimento",
      "Acompanhamento": "Acompanhamento",
    };
    return map[tipo] || tipo;
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "Follow-up":
        return <Phone className="h-4 w-4" />;
      case "Assembleia":
        return <Calendar className="h-4 w-4" />;
      case "Contemplação":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Retenção":
        return <Headphones className="h-4 w-4" />;
      case "Treinamento":
        return <FileText className="h-4 w-4" />;
      case "Envio de boleto":
        return <FileText className="h-4 w-4" />;
      case "Lembrete de vencimento":
        return <Calendar className="h-4 w-4" />;
      case "Acompanhamento":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
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
                ? `${posVenda.posVendas.length} ação(ões) encontrada(s)`
                : "Nenhuma ação cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={posVenda.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Ação
          </Button>
        </CardHeader>
        <CardContent>
          {posVenda.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posVenda.posVendas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posVenda.posVendas.map((item) => {
                    const cliente = clientes.find((c) => c.id === item.cliente_id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTipoIcon(item.tipo)}
                            <span className="text-sm">{getTipoLabel(item.tipo)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{cliente?.nome ?? "—"}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{item.descricao}</TableCell>
                        <TableCell>{formatDate(item.data_prevista)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => posVenda.openEdit(item)}
                            aria-label="Editar ação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => posVenda.openDelete(item)}
                            aria-label="Excluir ação"
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
            <DialogTitle>{posVenda.selectedPosVenda ? "Editar ação" : "Nova ação"}</DialogTitle>
            <DialogDescription>
              {posVenda.selectedPosVenda
                ? "Atualize a ação de pós-venda selecionada."
                : "Cadastre uma nova ação de pós-venda."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={posVenda.formData.tipo}
                onChange={(e) => handleChange("tipo", e.target.value)}
              >
                <option value="Follow-up">Follow-up</option>
                <option value="Assembleia">Assembleia</option>
                <option value="Contemplação">Contemplação</option>
                <option value="Retenção">Retenção</option>
                <option value="Treinamento">Treinamento</option>
                <option value="Envio de boleto">Envio de boleto</option>
                <option value="Lembrete de vencimento">Lembrete de vencimento</option>
                <option value="Acompanhamento">Acompanhamento</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={posVenda.formData.cliente_id || ""}
                onChange={(e) => handleChange("cliente_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={posVenda.formData.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
                placeholder="Descreva a ação"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_prevista">Data Prevista</Label>
                <Input
                  id="data_prevista"
                  type="date"
                  value={posVenda.formData.data_prevista}
                  onChange={(e) => handleChange("data_prevista", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_realizada">Data Realizada</Label>
                <Input
                  id="data_realizada"
                  type="date"
                  value={posVenda.formData.data_realizada || ""}
                  onChange={(e) => handleChange("data_realizada", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={posVenda.formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="Pendente">Pendente</option>
                <option value="Agendado">Agendado</option>
                <option value="Realizado">Realizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {posVenda.formData.tipo === "Envio de boleto" && (
              <div className="space-y-2">
                <Label htmlFor="boleto_url">URL do Boleto</Label>
                <Input
                  id="boleto_url"
                  value={posVenda.formData.boleto_url}
                  onChange={(e) => handleChange("boleto_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {posVenda.formData.tipo === "Lembrete de vencimento" && (
              <div className="space-y-2">
                <Label htmlFor="lembrete_em">Data do Lembrete</Label>
                <Input
                  id="lembrete_em"
                  type="datetime-local"
                  value={posVenda.formData.lembrete_em || ""}
                  onChange={(e) => handleChange("lembrete_em", e.target.value)}
                />
              </div>
            )}

            {posVenda.formData.tipo === "Retenção" && (
              <div className="space-y-2">
                <Label htmlFor="retencao_motivo">Motivo da Retenção</Label>
                <Textarea
                  id="retencao_motivo"
                  value={posVenda.formData.retencao_motivo}
                  onChange={(e) => handleChange("retencao_motivo", e.target.value)}
                  placeholder="Descreva o motivo da retenção"
                />
              </div>
            )}

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
              <DialogTitle>Detalhes da Ação</DialogTitle>
              <DialogDescription>
                {posVenda.selectedPosVenda.descricao}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                <TabsTrigger value="comunicacoes">Comunicação</TabsTrigger>
                <TabsTrigger value="documentos">Docs</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {getTipoIcon(posVenda.selectedPosVenda.tipo)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{getTipoLabel(posVenda.selectedPosVenda.tipo)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(posVenda.selectedPosVenda.data_prevista)}</p>
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

                <form onSubmit={handleAddHistorico} className="flex gap-2">
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
                          onClick={() => handleToggleTarefa(tarefa)}
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

                <form onSubmit={handleAddTarefa} className="space-y-2">
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

                <form onSubmit={handleAddComunicacao} className="space-y-2">
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
                      Ver boleto
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

      <Dialog open={posVenda.isDeleteOpen} onOpenChange={posVenda.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta ação de pós-venda? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => posVenda.setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

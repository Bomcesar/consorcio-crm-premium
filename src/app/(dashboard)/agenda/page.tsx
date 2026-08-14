"use client";

import { useEffect, useState, useMemo } from "react";
import { useAgenda } from "@/hooks/use-agenda";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
} from "lucide-react";
import type {
  AgendaEvento,
  AgendaEventoInsert,
  AgendaTarefa,
  AgendaTarefaInsert,
  AgendaFollowup,
  AgendaFollowupInsert,
} from "@/repositories/client/agenda.repository";

const emptyEventoForm: AgendaEventoInsert = {
  titulo: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  local: "",
  tipo: "Reunião",
  status: "Agendado",
  lead_id: null,
  cliente_id: null,
  indicador_id: null,
  negociacao_id: null,
  pos_venda_id: null,
  proxima_acao: "",
  data_proxima_acao: null,
  lembrete_em: null,
  usuario_id: "",
};

const emptyTarefaForm: AgendaTarefaInsert = {
  titulo: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  local: "",
  tipo: "Tarefa",
  status: "Pendente",
  lead_id: null,
  cliente_id: null,
  indicador_id: null,
  usuario_id: "",
};

const emptyFollowupForm: AgendaFollowupInsert = {
  evento_id: "",
  titulo: "",
  descricao: "",
  data_prevista: "",
  data_realizada: null,
  status: "Pendente",
  usuario_id: "",
};

type EventoFormData = AgendaEventoInsert;
type TarefaFormData = AgendaTarefaInsert;
type FollowupFormData = AgendaFollowupInsert;

export default function AgendaPage() {
  const { success, error } = useToast();
  const agenda = useAgenda();
  const [activeTab, setActiveTab] = useState<"eventos" | "tarefas" | "followups">("eventos");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [tarefas, setTarefas] = useState<AgendaTarefa[]>([]);
  const [followups, setFollowups] = useState<AgendaFollowup[]>([]);

  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);
  const [isTarefaFormOpen, setIsTarefaFormOpen] = useState(false);
  const [isFollowupFormOpen, setIsFollowupFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedEvento, setSelectedEvento] = useState<AgendaEvento | null>(null);
  const [selectedTarefa, setSelectedTarefa] = useState<AgendaTarefa | null>(null);
  const [selectedFollowup, setSelectedFollowup] = useState<AgendaFollowup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  const [eventoForm, setEventoForm] = useState<EventoFormData>(emptyEventoForm);
  const [tarefaForm, setTarefaForm] = useState<TarefaFormData>(emptyTarefaForm);
  const [followupForm, setFollowupForm] = useState<FollowupFormData>(emptyFollowupForm);

  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [eventosData, tarefasData] = await Promise.all([agenda.listEventos(), agenda.listTarefas()]);
      setEventos(eventosData);
      setTarefas(tarefasData);
    } catch {
      setErrorMessage("Não foi possível carregar a agenda.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredEventos = useMemo(() => {
    if (!searchQuery.trim()) return eventos;
    const q = searchQuery.trim().toLowerCase();
    return eventos.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.descricao.toLowerCase().includes(q) ||
        e.local.toLowerCase().includes(q) ||
        e.tipo.toLowerCase().includes(q)
    );
  }, [eventos, searchQuery]);

  const filteredTarefas = useMemo(() => {
    if (!searchQuery.trim()) return tarefas;
    const q = searchQuery.trim().toLowerCase();
    return tarefas.filter(
      (t) =>
        t.titulo.toLowerCase().includes(q) ||
        t.descricao.toLowerCase().includes(q) ||
        t.local.toLowerCase().includes(q)
    );
  }, [tarefas, searchQuery]);

  const handleOpenEventoForm = (evento?: AgendaEvento) => {
    if (evento) {
      setSelectedEvento(evento);
      setEventoForm({
        titulo: evento.titulo,
        descricao: evento.descricao,
        data_inicio: evento.data_inicio ? new Date(evento.data_inicio).toISOString().slice(0, 16) : "",
        data_fim: evento.data_fim ? new Date(evento.data_fim).toISOString().slice(0, 16) : "",
        local: evento.local,
        tipo: evento.tipo,
        status: evento.status,
        lead_id: evento.lead_id,
        cliente_id: evento.cliente_id,
        indicador_id: evento.indicador_id,
        negociacao_id: evento.negociacao_id,
        pos_venda_id: evento.pos_venda_id,
        proxima_acao: evento.proxima_acao,
        data_proxima_acao: evento.data_proxima_acao || null,
        lembrete_em: evento.lembrete_em || null,
        usuario_id: evento.usuario_id,
      });
    } else {
      setSelectedEvento(null);
      setEventoForm(emptyEventoForm);
    }
    setIsEventoFormOpen(true);
  };

  const handleOpenTarefaForm = (tarefa?: AgendaTarefa) => {
    if (tarefa) {
      setSelectedTarefa(tarefa);
      setTarefaForm({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        data_inicio: tarefa.data_inicio ? new Date(tarefa.data_inicio).toISOString().slice(0, 16) : "",
        data_fim: tarefa.data_fim ? new Date(tarefa.data_fim).toISOString().slice(0, 16) : "",
        local: tarefa.local,
        tipo: tarefa.tipo,
        status: tarefa.status,
        lead_id: tarefa.lead_id,
        cliente_id: tarefa.cliente_id,
        indicador_id: tarefa.indicador_id,
        usuario_id: tarefa.usuario_id,
      });
    } else {
      setSelectedTarefa(null);
      setTarefaForm(emptyTarefaForm);
    }
    setIsTarefaFormOpen(true);
  };

  const handleOpenFollowupForm = (followup?: AgendaFollowup) => {
    if (followup) {
      setSelectedFollowup(followup);
      setFollowupForm({
        evento_id: followup.evento_id,
        titulo: followup.titulo,
        descricao: followup.descricao,
        data_prevista: followup.data_prevista,
        data_realizada: followup.data_realizada || null,
        status: followup.status,
        usuario_id: followup.usuario_id,
      });
    } else {
      setSelectedFollowup(null);
      setFollowupForm({ ...emptyFollowupForm, evento_id: selectedEvento?.id || "" });
    }
    setIsFollowupFormOpen(true);
  };

  const handleSubmitEvento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventoForm.titulo?.trim()) return;

    setIsSaving(true);
    try {
      const payload: AgendaEventoInsert = {
        titulo: eventoForm.titulo.trim(),
        descricao: eventoForm.descricao?.trim() || "",
        data_inicio: eventoForm.data_inicio ? new Date(eventoForm.data_inicio).toISOString() : new Date().toISOString(),
        data_fim: eventoForm.data_fim ? new Date(eventoForm.data_fim).toISOString() : new Date().toISOString(),
        local: eventoForm.local?.trim() || "",
        tipo: eventoForm.tipo || "Reunião",
        status: eventoForm.status || "Agendado",
        lead_id: eventoForm.lead_id || null,
        cliente_id: eventoForm.cliente_id || null,
        indicador_id: eventoForm.indicador_id || null,
        negociacao_id: eventoForm.negociacao_id || null,
        pos_venda_id: eventoForm.pos_venda_id || null,
        proxima_acao: eventoForm.proxima_acao?.trim() || "",
        data_proxima_acao: eventoForm.data_proxima_acao || null,
        lembrete_em: eventoForm.lembrete_em ? new Date(eventoForm.lembrete_em).toISOString() : null,
        usuario_id: eventoForm.usuario_id || "",
      };

      if (selectedEvento) {
        const updated = await agenda.updateEvento(selectedEvento.id, payload);
        setEventos((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
      } else {
        const created = await agenda.createEvento(payload);
        setEventos((prev) => [...prev, created]);
      }
      setIsEventoFormOpen(false);
      setEventoForm(emptyEventoForm);
      setSelectedEvento(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitTarefa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tarefaForm.titulo?.trim()) return;

    setIsSaving(true);
    try {
      const payload: AgendaTarefaInsert = {
        titulo: tarefaForm.titulo.trim(),
        descricao: tarefaForm.descricao?.trim() || "",
        data_inicio: tarefaForm.data_inicio ? new Date(tarefaForm.data_inicio).toISOString() : new Date().toISOString(),
        data_fim: tarefaForm.data_fim ? new Date(tarefaForm.data_fim).toISOString() : new Date().toISOString(),
        local: tarefaForm.local?.trim() || "",
        tipo: tarefaForm.tipo || "Tarefa",
        status: tarefaForm.status || "Pendente",
        lead_id: tarefaForm.lead_id || null,
        cliente_id: tarefaForm.cliente_id || null,
        indicador_id: tarefaForm.indicador_id || null,
        usuario_id: tarefaForm.usuario_id || "",
      };

      if (selectedTarefa) {
        const updated = await agenda.updateTarefa(selectedTarefa.id, payload);
        setTarefas((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await agenda.createTarefa(payload);
        setTarefas((prev) => [...prev, created]);
      }
      setIsTarefaFormOpen(false);
      setTarefaForm(emptyTarefaForm);
      setSelectedTarefa(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFollowup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!followupForm.titulo?.trim() || !followupForm.evento_id) return;

    setIsSaving(true);
    try {
      const payload: AgendaFollowupInsert = {
        evento_id: followupForm.evento_id,
        titulo: followupForm.titulo.trim(),
        descricao: followupForm.descricao?.trim() || "",
        data_prevista: followupForm.data_prevista || new Date().toISOString().slice(0, 10),
        data_realizada: followupForm.data_realizada || null,
        status: followupForm.status || "Pendente",
        usuario_id: followupForm.usuario_id || "",
      };

      if (selectedFollowup) {
        const updated = await agenda.updateFollowup(selectedFollowup.id, payload);
        setFollowups((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      } else {
        const created = await agenda.createFollowup(payload);
        setFollowups((prev) => [...prev, created]);
      }
      setIsFollowupFormOpen(false);
      setFollowupForm(emptyFollowupForm);
      setSelectedFollowup(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "evento") {
        await agenda.removeEvento(deleteTarget.id);
        setEventos((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      } else if (deleteTarget.type === "tarefa") {
        await agenda.removeTarefa(deleteTarget.id);
        setTarefas((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      } else if (deleteTarget.type === "followup") {
        await agenda.removeFollowup(deleteTarget.id);
        setFollowups((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // erro tratado no hook
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      Agendado: "secondary",
      Confirmado: "default",
      Realizado: "success",
      Cancelado: "destructive",
      Pendente: "outline",
      EmAndamento: "default",
      Concluido: "success",
    };
    return map[status] || "secondary";
  };

  const getTipoBadge = (tipo: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "outline"> = {
      Reunião: "default",
      Visita: "secondary",
      Ligação: "outline",
      Assembleia: "default",
      Contemplação: "success",
      Treinamento: "secondary",
      Tarefa: "outline",
      FollowUp: "default",
      Lembrete: "secondary",
    };
    return map[tipo] || "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Eventos, reuniões, tarefas e follow-ups</p>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "eventos" ? "default" : "outline"}
            onClick={() => setActiveTab("eventos")}
          >
            Eventos
          </Button>
          <Button
            variant={activeTab === "tarefas" ? "default" : "outline"}
            onClick={() => setActiveTab("tarefas")}
          >
            Tarefas
          </Button>
          <Button
            variant={activeTab === "followups" ? "default" : "outline"}
            onClick={() => setActiveTab("followups")}
          >
            Follow-ups
          </Button>
        </div>
        <div className="flex gap-2">
          {activeTab === "eventos" && (
            <Button onClick={() => handleOpenEventoForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Evento
            </Button>
          )}
          {activeTab === "tarefas" && (
            <Button onClick={() => handleOpenTarefaForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          )}
          {activeTab === "followups" && selectedEvento && (
            <Button onClick={() => handleOpenFollowupForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Follow-up
            </Button>
          )}
        </div>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Input
          placeholder={`Pesquisar ${activeTab === "eventos" ? "eventos" : activeTab === "tarefas" ? "tarefas" : "follow-ups"}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "eventos" && filteredEventos.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Nenhum evento cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : activeTab === "tarefas" && filteredTarefas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : activeTab === "followups" && followups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {selectedEvento
                ? `Nenhum follow-up para o evento "${selectedEvento.titulo}".`
                : "Selecione um evento para ver seus follow-ups."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "eventos" && "Eventos"}
              {activeTab === "tarefas" && "Tarefas"}
              {activeTab === "followups" && "Follow-ups"}
            </CardTitle>
            <CardDescription>
              {activeTab === "eventos" &&
                `${filteredEventos.length} evento(s) encontrado(s)`}
              {activeTab === "tarefas" && `${filteredTarefas.length} tarefa(s) encontrada(s)`}
              {activeTab === "followups" && `${followups.length} follow-up(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {activeTab === "eventos" && (
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima Ação</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  )}
                  {activeTab === "tarefas" && (
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  )}
                  {activeTab === "followups" && (
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Data Realizada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {activeTab === "eventos" &&
                    filteredEventos.map((evento) => (
                      <TableRow key={evento.id}>
                        <TableCell className="font-medium">{evento.titulo}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadge(evento.tipo)}>{evento.tipo}</Badge>
                        </TableCell>
                        <TableCell>{formatarData(evento.data_inicio)}</TableCell>
                        <TableCell>{formatarData(evento.data_fim)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(evento.status)}>{evento.status}</Badge>
                        </TableCell>
                        <TableCell>{evento.proxima_acao || "—"}</TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEventoForm(evento)}
                            aria-label="Editar evento"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEvento(evento);
                              setDeleteTarget({ type: "evento", id: evento.id });
                              setIsDeleteOpen(true);
                            }}
                            aria-label="Excluir evento"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {activeTab === "tarefas" &&
                    filteredTarefas.map((tarefa) => (
                      <TableRow key={tarefa.id}>
                        <TableCell className="font-medium">{tarefa.titulo}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadge(tarefa.tipo)}>{tarefa.tipo}</Badge>
                        </TableCell>
                        <TableCell>{formatarData(tarefa.data_inicio)}</TableCell>
                        <TableCell>{formatarData(tarefa.data_fim)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(tarefa.status)}>{tarefa.status}</Badge>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTarefaForm(tarefa)}
                            aria-label="Editar tarefa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTarefa(tarefa);
                              setDeleteTarget({ type: "tarefa", id: tarefa.id });
                              setIsDeleteOpen(true);
                            }}
                            aria-label="Excluir tarefa"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {activeTab === "followups" &&
                    followups.map((followup) => (
                      <TableRow key={followup.id}>
                        <TableCell className="font-medium">{followup.titulo}</TableCell>
                        <TableCell>{followup.data_prevista}</TableCell>
                        <TableCell>{followup.data_realizada || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(followup.status)}>{followup.status}</Badge>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenFollowupForm(followup)}
                            aria-label="Editar follow-up"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedFollowup(followup);
                              setDeleteTarget({ type: "followup", id: followup.id });
                              setIsDeleteOpen(true);
                            }}
                            aria-label="Excluir follow-up"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEventoFormOpen} onOpenChange={setIsEventoFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvento ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>
              {selectedEvento
                ? "Atualize as informações do evento."
                : "Cadastre um novo evento na agenda."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitEvento}>
            <div className="space-y-2">
              <Label htmlFor="evento-titulo">Título</Label>
              <Input
                id="evento-titulo"
                value={eventoForm.titulo}
                onChange={(e) => setEventoForm({ ...eventoForm, titulo: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evento-inicio">Data/Hora Início</Label>
                <Input
                  id="evento-inicio"
                  type="datetime-local"
                  value={eventoForm.data_inicio}
                  onChange={(e) => setEventoForm({ ...eventoForm, data_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evento-fim">Data/Hora Fim</Label>
                <Input
                  id="evento-fim"
                  type="datetime-local"
                  value={eventoForm.data_fim}
                  onChange={(e) => setEventoForm({ ...eventoForm, data_fim: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evento-tipo">Tipo</Label>
                <select
                  id="evento-tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={eventoForm.tipo || "Reunião"}
                  onChange={(e) => setEventoForm({ ...eventoForm, tipo: e.target.value as AgendaEventoInsert["tipo"] })}
                >
                  <option value="Reunião">Reunião</option>
                  <option value="Visita">Visita</option>
                  <option value="Ligação">Ligação</option>
                  <option value="Assembleia">Assembleia</option>
                  <option value="Contemplação">Contemplação</option>
                  <option value="Treinamento">Treinamento</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evento-status">Status</Label>
                <select
                  id="evento-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={eventoForm.status || "Agendado"}
                  onChange={(e) => setEventoForm({ ...eventoForm, status: e.target.value as AgendaEventoInsert["status"] })}
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-local">Local</Label>
              <Input
                id="evento-local"
                value={eventoForm.local}
                onChange={(e) => setEventoForm({ ...eventoForm, local: e.target.value })}
                placeholder="Local do evento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-descricao">Descrição</Label>
              <Textarea
                id="evento-descricao"
                value={eventoForm.descricao}
                onChange={(e) => setEventoForm({ ...eventoForm, descricao: e.target.value })}
                placeholder="Detalhes do evento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-proxima">Próxima Ação</Label>
              <Input
                id="evento-proxima"
                value={eventoForm.proxima_acao}
                onChange={(e) => setEventoForm({ ...eventoForm, proxima_acao: e.target.value })}
                placeholder="Ex: Ligar para confirmar"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evento-data-proxima">Data Próxima Ação</Label>
                <Input
                  id="evento-data-proxima"
                  type="date"
                  value={eventoForm.data_proxima_acao || ""}
                  onChange={(e) => setEventoForm({ ...eventoForm, data_proxima_acao: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evento-lembrete">Lembrete</Label>
                <Input
                  id="evento-lembrete"
                  type="datetime-local"
                  value={eventoForm.lembrete_em ? new Date(eventoForm.lembrete_em).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setEventoForm({
                      ...eventoForm,
                      lembrete_em: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEventoFormOpen(false);
                  setEventoForm(emptyEventoForm);
                  setSelectedEvento(null);
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
                ) : selectedEvento ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTarefaFormOpen} onOpenChange={setIsTarefaFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTarefa ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            <DialogDescription>
              {selectedTarefa
                ? "Atualize as informações da tarefa."
                : "Cadastre uma nova tarefa."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitTarefa}>
            <div className="space-y-2">
              <Label htmlFor="tarefa-titulo">Título</Label>
              <Input
                id="tarefa-titulo"
                value={tarefaForm.titulo}
                onChange={(e) => setTarefaForm({ ...tarefaForm, titulo: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tarefa-inicio">Data/Hora Início</Label>
                <Input
                  id="tarefa-inicio"
                  type="datetime-local"
                  value={tarefaForm.data_inicio}
                  onChange={(e) => setTarefaForm({ ...tarefaForm, data_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarefa-fim">Data/Hora Fim</Label>
                <Input
                  id="tarefa-fim"
                  type="datetime-local"
                  value={tarefaForm.data_fim}
                  onChange={(e) => setTarefaForm({ ...tarefaForm, data_fim: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tarefa-descricao">Descrição</Label>
              <Textarea
                id="tarefa-descricao"
                value={tarefaForm.descricao}
                onChange={(e) => setTarefaForm({ ...tarefaForm, descricao: e.target.value })}
                placeholder="Detalhes da tarefa"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTarefaFormOpen(false);
                  setTarefaForm(emptyTarefaForm);
                  setSelectedTarefa(null);
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
                ) : selectedTarefa ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFollowupFormOpen} onOpenChange={setIsFollowupFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFollowup ? "Editar follow-up" : "Novo follow-up"}</DialogTitle>
            <DialogDescription>
              {selectedFollowup
                ? "Atualize as informações do follow-up."
                : "Cadastre um novo follow-up para o evento."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitFollowup}>
            <div className="space-y-2">
              <Label htmlFor="followup-titulo">Título</Label>
              <Input
                id="followup-titulo"
                value={followupForm.titulo}
                onChange={(e) => setFollowupForm({ ...followupForm, titulo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-descricao">Descrição</Label>
              <Textarea
                id="followup-descricao"
                value={followupForm.descricao}
                onChange={(e) => setFollowupForm({ ...followupForm, descricao: e.target.value })}
                placeholder="Detalhes do follow-up"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="followup-data">Data Prevista</Label>
                <Input
                  id="followup-data"
                  type="date"
                  value={followupForm.data_prevista}
                  onChange={(e) => setFollowupForm({ ...followupForm, data_prevista: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup-realizada">Data Realizada</Label>
                <Input
                  id="followup-realizada"
                  type="date"
                  value={followupForm.data_realizada || ""}
                  onChange={(e) => setFollowupForm({ ...followupForm, data_realizada: e.target.value || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFollowupFormOpen(false);
                  setFollowupForm(emptyFollowupForm);
                  setSelectedFollowup(null);
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
                ) : selectedFollowup ? (
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
            <DialogTitle>Excluir</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
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
    </div>
  );
}

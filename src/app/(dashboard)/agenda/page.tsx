"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgendas } from "@/hooks/use-agendas";
import { useAuth } from "@/hooks/use-auth";
import { useClientes } from "@/hooks/use-clientes";
import { useIndicadores } from "@/hooks/use-indicadores";
import type { Agenda, Cliente, Indicator } from "@/types/crm";

const emptyForm = {
  target_type: "indicador",
  indicador_id: "",
  cliente_id: "",
  titulo: "",
  descricao: "",
  data_hora: "",
  duracao_minutos: "30",
  tipo: "Reuniao",
  status: "Agendado",
  local_online: "",
  notas_conclusao: "",
};

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function sortByDateAsc(items: Agenda[]): Agenda[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.data_hora).getTime();
    const db = new Date(b.data_hora).getTime();
    return da - db;
  });
}

function getAgendaOrigin(agenda: Agenda) {
  if (agenda.cliente_id) {
    return {
      label: "Pós-venda",
      variant: "success" as const,
      helper: agenda.cliente_nome || "Cliente vinculado",
    };
  }

  return {
    label: "Indicador",
    variant: "outline" as const,
    helper: agenda.indicador_nome || "Indicador vinculado",
  };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { listIndicators } = useIndicadores();
  const { listClientes } = useClientes();
  const { listAgendas, saveAgenda, deleteAgenda, subscribeAgendasRealtime } = useAgendas();

  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterOrigin, setFilterOrigin] = useState<"Todos" | "Indicador" | "Pós-venda">("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [indicatorSearchTerm, setIndicatorSearchTerm] = useState("");

  const loadAgendas = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listAgendas();
      setAgendas(sortByDateAsc(data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar a agenda.";
      setErrorMessage(message);
      setAgendas([]);
    } finally {
      setIsLoading(false);
    }
  }, [listAgendas]);

  const loadIndicators = useCallback(async () => {
    try {
      const data = await listIndicators();
      setIndicators(data);
    } catch {
      setIndicators([]);
    }
  }, [listIndicators]);

  const loadClientes = useCallback(async () => {
    try {
      const data = await listClientes();
      setClientes(data);
    } catch {
      setClientes([]);
    }
  }, [listClientes]);

  useEffect(() => {
    void loadAgendas();
    void loadIndicators();
    void loadClientes();
  }, [loadAgendas, loadClientes, loadIndicators]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const indicatorId = params.get("indicatorId");
    const openForm = params.get("openForm");

    if (openForm === "1") {
      setIsFormOpen(true);
    }

    if (indicatorId) {
      setFormData((current) => ({ ...current, indicador_id: indicatorId }));
    }
  }, []);

  useEffect(() => {
    if (!formData.indicador_id) return;

    const exists = indicators.some((indicator) => indicator.id === formData.indicador_id);
    if (!exists) return;

    const selected = indicators.find((indicator) => indicator.id === formData.indicador_id);
    if (selected) {
      setIndicatorSearchTerm(selected.nome);
    }
  }, [formData.indicador_id, indicators]);

  useEffect(() => {
    const unsubscribe = subscribeAgendasRealtime(() => {
      void loadAgendas();
    });

    return unsubscribe;
  }, [loadAgendas, subscribeAgendasRealtime]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterOrigin, filterStatus]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const filteredIndicators = useMemo(() => {
    const term = indicatorSearchTerm.trim().toLowerCase();

    if (!term) return indicators;

    return indicators.filter((indicator) => {
      return [indicator.nome, indicator.telefone ?? "", indicator.cidade ?? "", indicator.status ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [indicatorSearchTerm, indicators]);

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingAgendaId(null);
    setIsFormOpen(false);
    setIndicatorSearchTerm("");
  };

  const handleEdit = (agenda: Agenda) => {
    setFormData({
      target_type: agenda.cliente_id ? "cliente" : "indicador",
      indicador_id: agenda.indicador_id ?? "",
      cliente_id: agenda.cliente_id ?? "",
      titulo: agenda.titulo,
      descricao: agenda.descricao,
      data_hora: toDatetimeLocal(agenda.data_hora),
      duracao_minutos: String(agenda.duracao_minutos || 30),
      tipo: agenda.tipo || "Reuniao",
      status: agenda.status || "Agendado",
      local_online: agenda.local_online || "",
      notas_conclusao: agenda.notas_conclusao || "",
    });
    setEditingAgendaId(agenda.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    const hasTarget = formData.target_type === "cliente" ? Boolean(formData.cliente_id) : Boolean(formData.indicador_id);
    if (!hasTarget || !formData.data_hora) {
      setErrorMessage("Selecione o vínculo do compromisso e a data/hora.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        usuario_id: user.id,
        indicador_id: formData.target_type === "indicador" ? formData.indicador_id : null,
        cliente_id: formData.target_type === "cliente" ? formData.cliente_id : null,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        data_hora: new Date(formData.data_hora).toISOString(),
        duracao_minutos: Math.max(5, Number(formData.duracao_minutos || "30")),
        tipo: formData.tipo,
        status: formData.status,
        local_online: formData.local_online.trim(),
        notas_conclusao: formData.notas_conclusao.trim(),
      };

      const saved = await saveAgenda(payload, editingAgendaId ?? undefined);
      setAgendas((current) => {
        if (editingAgendaId) {
          return sortByDateAsc(current.map((item) => (item.id === editingAgendaId ? saved : item)));
        }
        return sortByDateAsc([saved, ...current]);
      });

      setFormData(emptyForm);
      setEditingAgendaId(null);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o compromisso.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (agendaId: string) => {
    setIsDeletingId(agendaId);
    setErrorMessage(null);

    try {
      await deleteAgenda(agendaId);
      setAgendas((current) => current.filter((item) => item.id !== agendaId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o compromisso.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredAgendas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return agendas.filter((agenda) => {
      const passSearch =
        !q ||
        [
          agenda.titulo,
          agenda.descricao,
          agenda.indicador_nome ?? "",
          agenda.cliente_nome ?? "",
          agenda.tipo,
          agenda.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const passStatus = filterStatus === "Todos" || agenda.status === filterStatus;
      const origin = agenda.cliente_id ? "Pós-venda" : "Indicador";
      const passOrigin = filterOrigin === "Todos" || origin === filterOrigin;
      return passSearch && passStatus && passOrigin;
    });
  }, [agendas, filterOrigin, filterStatus, searchTerm]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAgendas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAgendas = filteredAgendas.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Registre ligacoes, reunioes e acompanhamentos com persistencia no Supabase.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsFormOpen(true);
            setEditingAgendaId(null);
            setErrorMessage(null);
            setIndicatorSearchTerm("");
          }}
        >
          + Novo compromisso
        </Button>
      </div>

      {isFormOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingAgendaId ? "Editar compromisso" : "Novo compromisso"}</CardTitle>
            <CardDescription>
              {editingAgendaId
                ? "Atualize o compromisso selecionado."
                : "Crie compromissos vinculados ao indicador."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="indicador_id">Indicador</Label>
                <select
                  id="target_type"
                  className="mb-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.target_type}
                  onChange={(event) => handleChange("target_type", event.target.value)}
                  disabled={Boolean(editingAgendaId && formData.cliente_id)}
                >
                  <option value="indicador">Indicador</option>
                  <option value="cliente">Cliente</option>
                </select>
                {formData.target_type === "indicador" ? (
                  <>
                    <Input
                      value={indicatorSearchTerm}
                      onChange={(event) => setIndicatorSearchTerm(event.target.value)}
                      placeholder="Buscar indicador por nome, telefone, cidade ou status"
                    />
                    <select
                      id="indicador_id"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.indicador_id}
                      onChange={(event) => handleChange("indicador_id", event.target.value)}
                      required={formData.target_type === "indicador"}
                    >
                      <option value="">Selecione um indicador</option>
                      {filteredIndicators.map((indicator) => (
                        <option key={indicator.id} value={indicator.id}>
                          {indicator.nome}
                        </option>
                      ))}
                    </select>
                    {filteredIndicators.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum indicador encontrado. Limpe a busca ou confira se o indicador foi cadastrado na Central de Indicadores.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <select
                    id="cliente_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.cliente_id}
                    onChange={(event) => handleChange("cliente_id", event.target.value)}
                    required={formData.target_type === "cliente"}
                    disabled={Boolean(editingAgendaId && formData.cliente_id)}
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                )}
                {editingAgendaId && formData.cliente_id ? (
                  <p className="text-xs text-muted-foreground">Compromisso integrado ao Pós-venda. O vínculo com o cliente é mantido automaticamente.</p>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Titulo</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(event) => handleChange("titulo", event.target.value)}
                  placeholder="Ex.: Reuniao de apresentacao"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descricao</Label>
                <textarea
                  id="descricao"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.descricao}
                  onChange={(event) => handleChange("descricao", event.target.value)}
                  placeholder="Detalhes do compromisso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_hora">Data e hora</Label>
                <Input
                  id="data_hora"
                  type="datetime-local"
                  value={formData.data_hora}
                  onChange={(event) => handleChange("data_hora", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao">Duracao (min)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min={5}
                  step={5}
                  value={formData.duracao_minutos}
                  onChange={(event) => handleChange("duracao_minutos", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tipo}
                  onChange={(event) => handleChange("tipo", event.target.value)}
                >
                  <option value="Reuniao">Reuniao</option>
                  <option value="Ligacao">Ligacao</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(event) => handleChange("status", event.target.value)}
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Concluido">Concluido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="local_online">Local / Link online</Label>
                <Input
                  id="local_online"
                  value={formData.local_online}
                  onChange={(event) => handleChange("local_online", event.target.value)}
                  placeholder="Ex.: https://meet.google.com/..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notas_conclusao">Notas de conclusao</Label>
                <textarea
                  id="notas_conclusao"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.notas_conclusao}
                  onChange={(event) => handleChange("notas_conclusao", event.target.value)}
                  placeholder="Preencha apos concluir o compromisso"
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : editingAgendaId ? "Atualizar" : "Salvar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Compromissos cadastrados</CardTitle>
          <CardDescription>Lista sincronizada com o Supabase e destacando integrações automáticas do Pós-venda.</CardDescription>
          <div className="pt-2">
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Pesquisar por titulo, descricao, indicador, tipo ou status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="Todos">Todos os status</option>
                <option value="Agendado">Agendado</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Concluido">Concluido</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterOrigin}
                onChange={(event) => setFilterOrigin(event.target.value as "Todos" | "Indicador" | "Pós-venda")}
              >
                <option value="Todos">Todas as origens</option>
                <option value="Indicador">Indicador</option>
                <option value="Pós-venda">Pós-venda</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando agenda...</p> : null}
          {!isLoading && !errorMessage && filteredAgendas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum compromisso cadastrado ainda.</p>
          ) : null}
          {filteredAgendas.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Origem</th>
                      <th className="px-3 py-2 font-medium">Indicador</th>
                      <th className="px-3 py-2 font-medium">Titulo</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAgendas.map((agenda) => (
                      <tr
                        key={agenda.id}
                        className={`border-b last:border-b-0 ${agenda.cliente_id ? "bg-emerald-500/5" : ""}`}
                      >
                        <td className="px-3 py-2">{new Date(agenda.data_hora).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getAgendaOrigin(agenda).variant}>{getAgendaOrigin(agenda).label}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <p>{agenda.indicador_nome || agenda.cliente_nome || "-"}</p>
                            <p className="text-xs text-muted-foreground">{getAgendaOrigin(agenda).helper}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2">{agenda.titulo || "Compromisso"}</td>
                        <td className="px-3 py-2">{agenda.tipo}</td>
                        <td className="px-3 py-2">{agenda.status}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(agenda)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingId === agenda.id}
                              onClick={() => void handleDelete(agenda.id)}
                            >
                              {isDeletingId === agenda.id ? "Excluindo..." : "Excluir"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Exibindo {paginatedAgendas.length} de {filteredAgendas.length} compromissos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {safeCurrentPage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

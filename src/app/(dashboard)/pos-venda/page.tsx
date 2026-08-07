"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Headphones, HeartHandshake, ShieldAlert, Star, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { usePosVenda } from "@/hooks/use-pos-venda";
import type { PosVendaPriority, PosVendaRecord, PosVendaStatus } from "@/types/crm";

const emptyForm = {
  id: "",
  cliente_id: "",
  cliente_nome: "",
  telefone: "",
  cidade: "",
  status: "Boas-vindas" as PosVendaStatus,
  priority: "Media" as PosVendaPriority,
  satisfaction: "3",
  next_contact_at: "",
  last_contact_at: "",
  channel: "Telefone",
  needs_attention: false,
  observacoes: "",
};

const statusOptions: PosVendaStatus[] = ["Boas-vindas", "Acompanhamento", "Renovacao", "Suporte", "Concluido"];
const priorityOptions: PosVendaPriority[] = ["Baixa", "Media", "Alta"];

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

export default function PosVendaPage() {
  const { user } = useAuth();
  const { listPosVenda, savePosVenda, deletePosVenda } = usePosVenda();
  const [records, setRecords] = useState<PosVendaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Todos" | PosVendaStatus>("Todos");
  const [filterPriority, setFilterPriority] = useState<"Todas" | PosVendaPriority>("Todas");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listPosVenda();
      setRecords(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar o pós-venda.";
      setErrorMessage(message);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [listPosVenda]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handleChange = (field: keyof typeof emptyForm, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSelectCliente = (recordId: string) => {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    setFormData({
      id: record.id,
      cliente_id: record.cliente_id,
      cliente_nome: record.cliente_nome,
      telefone: record.telefone,
      cidade: record.cidade,
      status: record.status,
      priority: record.priority,
      satisfaction: String(record.satisfaction),
      next_contact_at: toDatetimeLocal(record.next_contact_at),
      last_contact_at: toDatetimeLocal(record.last_contact_at),
      channel: record.channel,
      needs_attention: record.needs_attention,
      observacoes: record.observacoes,
    });
  };

  const handleEdit = (record: PosVendaRecord) => {
    setFormData({
      id: record.id,
      cliente_id: record.cliente_id,
      cliente_nome: record.cliente_nome,
      telefone: record.telefone,
      cidade: record.cidade,
      status: record.status,
      priority: record.priority,
      satisfaction: String(record.satisfaction),
      next_contact_at: toDatetimeLocal(record.next_contact_at),
      last_contact_at: toDatetimeLocal(record.last_contact_at),
      channel: record.channel,
      needs_attention: record.needs_attention,
      observacoes: record.observacoes,
    });
    setEditingId(record.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.cliente_id || !formData.cliente_nome.trim()) {
      setErrorMessage("Selecione um cliente existente para acompanhar no pós-venda.");
      return;
    }

    if (!user?.id) {
      setErrorMessage("Sessao invalida. Faca login novamente.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const matchedRecordId = editingId ?? records.find((record) => record.cliente_id === formData.cliente_id)?.id;
      const payload = {
        usuario_id: user.id,
        cliente_id: formData.cliente_id,
        cliente_nome: formData.cliente_nome.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim(),
        status: formData.status,
        priority: formData.priority,
        satisfaction: Math.min(5, Math.max(1, Number(formData.satisfaction || "3"))),
        next_contact_at: formData.next_contact_at ? new Date(formData.next_contact_at).toISOString() : null,
        last_contact_at: formData.last_contact_at ? new Date(formData.last_contact_at).toISOString() : null,
        channel: formData.channel.trim(),
        needs_attention: formData.needs_attention,
        observacoes: formData.observacoes.trim(),
      };

      const saved = await savePosVenda(payload, matchedRecordId ?? undefined);
      setRecords((current) => {
        if (matchedRecordId) {
          return current.map((record) => (record.id === matchedRecordId ? saved : record));
        }
        return [saved, ...current];
      });
      handleCancel();
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o acompanhamento.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    setErrorMessage(null);

    try {
      await deletePosVenda(id);
      setRecords((current) => current.filter((record) => record.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o acompanhamento.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const passSearch =
        !q ||
        [record.cliente_nome, record.telefone, record.cidade, record.status, record.channel, record.observacoes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const passStatus = filterStatus === "Todos" || record.status === filterStatus;
      const passPriority = filterPriority === "Todas" || record.priority === filterPriority;
      return passSearch && passStatus && passPriority;
    });
  }, [filterPriority, filterStatus, records, searchTerm]);

  const summary = useMemo(() => {
    return {
      total: records.length,
      atencao: records.filter((record) => record.needs_attention).length,
      concluidos: records.filter((record) => record.status === "Concluido").length,
      satisfacaoMedia:
        records.length > 0
          ? (records.reduce((total, record) => total + record.satisfaction, 0) / records.length).toFixed(1)
          : "0.0",
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pós-venda</h2>
          <p className="text-sm text-muted-foreground">Acompanhamento operacional da base de clientes após contratação.</p>
        </div>
        <Badge variant="success" className="w-fit">Operacional</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes em carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedem atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{summary.atencao}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{summary.concluidos}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfação média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.satisfacaoMedia}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/70">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Carteira de acompanhamento</CardTitle>
            </div>
            <Button
              onClick={() => {
                setIsFormOpen(true);
                setEditingId(null);
                setErrorMessage(null);
                setFormData(emptyForm);
              }}
            >
              + Novo acompanhamento
            </Button>
          </div>
          <CardDescription>Todos os clientes cadastrados podem ser acompanhados, com próximos contatos, prioridade e nível de satisfação.</CardDescription>
          <div className="grid gap-2 pt-2 md:grid-cols-3">
            <Input
              placeholder="Pesquisar por cliente, cidade, telefone, canal ou observações"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as "Todos" | PosVendaStatus)}
            >
              <option value="Todos">Todos os status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value as "Todas" | PosVendaPriority)}
            >
              <option value="Todas">Todas as prioridades</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}

          {isFormOpen ? (
            <form className="mb-6 grid gap-4 rounded-xl border border-border/50 p-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cliente_nome">Cliente</Label>
                {editingId ? (
                  <Input id="cliente_nome" value={formData.cliente_nome} disabled />
                ) : (
                  <select
                    id="cliente_nome"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.id}
                    onChange={(event) => handleSelectCliente(event.target.value)}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {records.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.cliente_nome}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-muted-foreground">O acompanhamento é vinculado a um cliente já cadastrado na base.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} disabled />
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
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.priority}
                  onChange={(event) => handleChange("priority", event.target.value)}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="satisfaction">Satisfação (1 a 5)</Label>
                <Input
                  id="satisfaction"
                  type="number"
                  min={1}
                  max={5}
                  value={formData.satisfaction}
                  onChange={(event) => handleChange("satisfaction", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Canal principal</Label>
                <select
                  id="channel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.channel}
                  onChange={(event) => handleChange("channel", event.target.value)}
                >
                  <option value="Telefone">Telefone</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_contact_at">Próximo contato</Label>
                <Input
                  id="next_contact_at"
                  type="datetime-local"
                  value={formData.next_contact_at}
                  onChange={(event) => handleChange("next_contact_at", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_contact_at">Último contato</Label>
                <Input
                  id="last_contact_at"
                  type="datetime-local"
                  value={formData.last_contact_at}
                  onChange={(event) => handleChange("last_contact_at", event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea
                  id="observacoes"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.observacoes}
                  onChange={(event) => handleChange("observacoes", event.target.value)}
                  placeholder="Registre pendências, oportunidades de recompra, suporte ou relacionamento"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="needs_attention">Pede atenção imediata</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                  <input
                    id="needs_attention"
                    type="checkbox"
                    checked={formData.needs_attention}
                    onChange={(event) => handleChange("needs_attention", event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground">Marque para priorizar o cliente na carteira</span>
                </div>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar acompanhamento"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : null}

          {isLoading ? <p className="text-sm text-muted-foreground">Carregando carteira de pós-venda...</p> : null}
          {!isLoading && filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente disponível para acompanhamento.</p>
          ) : null}

          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Prioridade</th>
                    <th className="px-3 py-2 font-medium">Satisfação</th>
                    <th className="px-3 py-2 font-medium">Próximo contato</th>
                    <th className="px-3 py-2 font-medium">Canal</th>
                    <th className="px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{record.cliente_nome}</p>
                          <p className="text-xs text-muted-foreground">{record.telefone || "Sem telefone"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">{record.status}</td>
                      <td className="px-3 py-2">
                        <span className={record.priority === "Alta" ? "text-amber-600" : undefined}>{record.priority}</span>
                      </td>
                      <td className="px-3 py-2">{record.satisfaction}/5</td>
                      <td className="px-3 py-2">{formatDate(record.next_contact_at)}</td>
                      <td className="px-3 py-2">{record.channel}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(record)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isDeletingId === record.id}
                            onClick={() => void handleDelete(record.id)}
                          >
                            {isDeletingId === record.id ? "Excluindo..." : "Excluir"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLeads } from "@/hooks/use-leads";
import type { Lead } from "@/types/crm";

type LeadStore = {
  leads: Lead[];
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Lead[];
  setLeads: (leads: Lead[]) => void;
  prependLead: (lead: Lead) => void;
};

const emptyForm = {
  nome: "",
  telefone: "",
  cidade: "",
  status: "Novo",
  observacoes: "",
};

function createLeadStore(): LeadStore {
  const listeners = new Set<() => void>();
  let leads: Lead[] = [];

  return {
    leads,
    listeners,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return leads;
    },
    setLeads(nextLeads) {
      leads = nextLeads;
      listeners.forEach((listener) => listener());
    },
    prependLead(lead) {
      leads = [lead, ...leads];
      listeners.forEach((listener) => listener());
    },
  };
}

const leadStore = createLeadStore();

export default function LeadsPage() {
  const { listLeads, createLead, updateLead, deleteLead } = useLeads();
  const leads = useSyncExternalStore(leadStore.subscribe, leadStore.getSnapshot, leadStore.getSnapshot);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listLeads();
      leadStore.setLeads(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar os leads no momento.";
      setErrorMessage(message);
      leadStore.setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [listLeads]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim(),
        status: formData.status,
        observacoes: formData.observacoes.trim(),
      };

      if (editingLeadId) {
        const updated = await updateLead(editingLeadId, payload);
        leadStore.setLeads(leads.map((lead) => (lead.id === editingLeadId ? updated : lead)));
      } else {
        const created = await createLead(payload);
        leadStore.prependLead(created);
      }

      setFormData(emptyForm);
      setEditingLeadId(null);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar o lead. Tente novamente.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingLeadId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
      nome: lead.nome,
      telefone: lead.telefone ?? "",
      cidade: lead.cidade ?? "",
      status: lead.status,
      observacoes: lead.observacoes ?? "",
    });
    setEditingLeadId(lead.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleDelete = async (leadId: string) => {
    setIsDeletingId(leadId);
    setErrorMessage(null);

    try {
      await deleteLead(leadId);
      leadStore.setLeads(leads.filter((lead) => lead.id !== leadId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível excluir o lead.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const q = searchTerm.trim().toLowerCase();
    const passSearch = !q || [lead.nome, lead.status, lead.cidade ?? "", lead.telefone ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
    const passStatus = filterStatus === "Todos" || lead.status === filterStatus;
    return passSearch && passStatus;
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie e qualifique seus leads de consórcio
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>+ Novo Lead</Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLeadId ? "Editar lead" : "Novo lead"}</CardTitle>
            <CardDescription>
              {editingLeadId
                ? "Atualize os dados do lead selecionado."
                : "Cadastre um novo lead diretamente nesta página."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(event) => handleChange("nome", event.target.value)}
                  placeholder="Digite o nome"
                  required
                />
              </div>

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
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea
                  id="observacoes"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.observacoes}
                  onChange={(event) => handleChange("observacoes", event.target.value)}
                  placeholder="Adicione observações relevantes"
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : editingLeadId ? "Atualizar" : "Salvar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leads cadastrados</CardTitle>
          <CardDescription>Lista sincronizada com o Supabase.</CardDescription>
          <div className="pt-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Pesquisar por nome, status, cidade ou telefone"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="Todos">Todos os status</option>
                <option value="Novo">Novo</option>
                <option value="Em contato">Em contato</option>
                <option value="Qualificado">Qualificado</option>
                <option value="Em análise">Em análise</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando leads...</p> : null}
          {!isLoading && !errorMessage && filteredLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
          ) : null}
          {filteredLeads.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Cidade</th>
                      <th className="px-3 py-2 font-medium">Telefone</th>
                      <th className="px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => (
                      <tr key={lead.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{lead.nome}</td>
                        <td className="px-3 py-2">{lead.status}</td>
                        <td className="px-3 py-2">{lead.cidade || "—"}</td>
                        <td className="px-3 py-2">{lead.telefone || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(lead)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingId === lead.id}
                              onClick={() => void handleDelete(lead.id)}
                            >
                              {isDeletingId === lead.id ? "Excluindo..." : "Excluir"}
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
                  Exibindo {paginatedLeads.length} de {filteredLeads.length} leads
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
                    Página {safeCurrentPage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Próxima
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

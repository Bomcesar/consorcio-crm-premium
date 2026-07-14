"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

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
  const leads = useSyncExternalStore(leadStore.subscribe, leadStore.getSnapshot, leadStore.getSnapshot);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadLeads();
  }, []);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loadLeads = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setErrorMessage("A configuração do Supabase não foi encontrada.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("Não foi possível carregar os leads no momento.");
      leadStore.setLeads([]);
      setIsLoading(false);
      return;
    }

    leadStore.setLeads((data as Lead[]) ?? []);
    setIsLoading(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setErrorMessage("A configuração do Supabase não foi encontrada.");
      setIsSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        cidade: formData.cidade.trim(),
        status: formData.status,
        observacoes: formData.observacoes.trim(),
      })
      .select()
      .single();

    if (error) {
      setErrorMessage("Não foi possível salvar o lead. Tente novamente.");
      setIsSaving(false);
      return;
    }

    if (data) {
      leadStore.prependLead(data as Lead);
    }

    setFormData(emptyForm);
    setIsFormOpen(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setIsFormOpen(false);
  };

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
            <CardTitle>Novo lead</CardTitle>
            <CardDescription>Cadastre um novo lead diretamente nesta página.</CardDescription>
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
                  {isSaving ? "Salvando..." : "Salvar"}
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
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando leads...</p> : null}
          {!isLoading && !errorMessage && leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
          ) : null}
          {leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Cidade</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{lead.nome}</td>
                      <td className="px-3 py-2">{lead.status}</td>
                      <td className="px-3 py-2">{lead.cidade || "—"}</td>
                      <td className="px-3 py-2">{lead.telefone || "—"}</td>
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

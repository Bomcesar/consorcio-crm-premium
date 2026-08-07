"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientes } from "@/hooks/use-clientes";
import { Users } from "lucide-react";
import type { Cliente } from "@/types/crm";

const emptyForm = {
  nome: "",
  telefone: "",
  cidade: "",
  status: "Ativo",
  observacoes: "",
};

export default function ClientesPage() {
  const { listClientes, createCliente, updateCliente, deleteCliente } = useClientes();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loadClientes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listClientes();
      setClientes(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar os clientes.";
      setErrorMessage(message);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  }, [listClientes]);

  useEffect(() => {
    void loadClientes();
  }, [loadClientes]);

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

      if (editingClienteId) {
        const updated = await updateCliente(editingClienteId, payload);
        setClientes((current) => current.map((cliente) => (cliente.id === editingClienteId ? updated : cliente)));
      } else {
        const created = await createCliente(payload);
        setClientes((current) => [created, ...current]);
      }

      setFormData(emptyForm);
      setEditingClienteId(null);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o cliente.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingClienteId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone ?? "",
      cidade: cliente.cidade ?? "",
      status: cliente.status,
      observacoes: cliente.observacoes ?? "",
    });
    setEditingClienteId(cliente.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleDelete = async (clienteId: string) => {
    setIsDeletingId(clienteId);
    setErrorMessage(null);

    try {
      await deleteCliente(clienteId);
      setClientes((current) => current.filter((cliente) => cliente.id !== clienteId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o cliente.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredClientes = clientes.filter((cliente) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    return [cliente.nome, cliente.status, cliente.cidade ?? "", cliente.telefone ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Base completa de clientes</p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>+ Novo Cliente</Button>
      </div>

      {isFormOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingClienteId ? "Editar cliente" : "Novo cliente"}</CardTitle>
            <CardDescription>
              {editingClienteId
                ? "Atualize os dados do cliente selecionado."
                : "Cadastre um novo cliente diretamente nesta pagina."}
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
                  <option value="Ativo">Ativo</option>
                  <option value="Em analise">Em analise</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observacoes</Label>
                <textarea
                  id="observacoes"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.observacoes}
                  onChange={(event) => handleChange("observacoes", event.target.value)}
                  placeholder="Adicione observacoes relevantes"
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : editingClienteId ? "Atualizar" : "Salvar"}
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
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Lista sincronizada com o Supabase.</CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Pesquisar por nome, status, cidade ou telefone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando clientes...</p> : null}
          {!isLoading && !errorMessage && filteredClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Cidade</th>
                  <th className="px-3 py-2 font-medium">Telefone</th>
                  <th className="px-3 py-2 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{cliente.nome}</td>
                    <td className="px-3 py-3">{cliente.status}</td>
                    <td className="px-3 py-3">{cliente.cidade}</td>
                    <td className="px-3 py-3">{cliente.telefone}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(cliente)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isDeletingId === cliente.id}
                          onClick={() => void handleDelete(cliente.id)}
                        >
                          {isDeletingId === cliente.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

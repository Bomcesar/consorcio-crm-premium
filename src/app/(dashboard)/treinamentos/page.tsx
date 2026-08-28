"use client";

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
import { useTreinamentos } from "@/hooks/use-treinamentos";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Treinamento } from "@/repositories/client/treinamentos.repository";
import { useEffect, useState } from "react";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

const emptyForm = {
  nome: "",
  descricao: "",
  categoria: "",
  link: "",
  status: "Ativo" as const,
  usuario_id: "",
};

type TreinamentoFormData = typeof emptyForm;

export default function TreinamentosPage() {
  const { success, error } = useToast();
  const { treinamentos, isLoading, isSaving, errorMessage, formData, setFormData, selectedTreinamento, setSelectedTreinamento, isFormOpen, setIsFormOpen, isDeleteOpen, setIsDeleteOpen, searchQuery, setSearchQuery, filterCategoria, setFilterCategoria, categorias, openCreate, openEdit, openDelete, handleSubmit, handleDelete, toggleVisibilidade, refresh } = useTreinamentos();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (!cancelled) {
          setIsAdmin(isAdminOrGestor(user));
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field: keyof TreinamentoFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleAccess = (treinamento: Treinamento) => {
    if (!treinamento.link) {
      error("Este treinamento não possui um link válido.");
      return;
    }
    window.open(treinamento.link, "_blank");
    success("Abrindo treinamento em uma nova aba.");
  };

  const handleToggleVisibility = async (treinamento: Treinamento) => {
    await toggleVisibilidade(treinamento);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Treinamentos</h2>
          <p className="text-sm text-muted-foreground">Treinamentos disponíveis para consultores</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Treinamento
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
          <CardTitle>Treinamentos cadastrados</CardTitle>
          <CardDescription>
            {treinamentos.length > 0 ? `${treinamentos.length} treinamento(s) encontrado(s)` : "Nenhum treinamento cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou descrição..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterCategoria}
              onChange={(event) => setFilterCategoria(event.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : treinamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[180px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinamentos.map((treinamento) => (
                    <TableRow key={treinamento.id}>
                      <TableCell className="font-medium">{treinamento.nome}</TableCell>
                      <TableCell>{treinamento.categoria || "—"}</TableCell>
                      <TableCell>
                        {treinamento.link ? (
                          <a href={treinamento.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                            Abrir link
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={treinamento.status === "Ativo" ? "success" : "secondary"}>
                          {treinamento.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleAccess(treinamento)} aria-label="Acessar treinamento">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(treinamento)} aria-label={treinamento.visivel ? "Ocultar" : "Mostrar"}>
                            {treinamento.visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(treinamento)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(treinamento)} aria-label="Excluir">
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
            <DialogTitle>{selectedTreinamento ? "Editar treinamento" : "Novo treinamento"}</DialogTitle>
            <DialogDescription>{selectedTreinamento ? "Atualize as informações do treinamento." : "Cadastre um novo treinamento para consultores."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => handleChange("descricao", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={formData.categoria} onChange={(e) => handleChange("categoria", e.target.value)} placeholder="Ex: Vendas, Técnico, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link do Treinamento</Label>
              <Input id="link" value={formData.link} onChange={(e) => handleChange("link", e.target.value)} placeholder="Cole o link aqui (ex: YouTube, Vimeo, Google Drive, etc.)" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedTreinamento(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedTreinamento ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir treinamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o treinamento <strong>{selectedTreinamento?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

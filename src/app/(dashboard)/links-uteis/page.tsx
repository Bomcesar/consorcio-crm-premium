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
import { useLinksUteis } from "@/hooks/use-links-uteis";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import type { LinkUtil } from "@/repositories/client/links-uteis.repository";

const emptyForm = {
  nome: "",
  descricao: "",
  categoria: "",
  url: "",
  status: "Ativo" as const,
  usuario_id: "",
};

type LinkFormData = typeof emptyForm;

export default function LinksUteisPage() {
  const { error } = useToast();
  const { links, isLoading, isSaving, errorMessage, formData, setFormData, selectedLink, setSelectedLink, isFormOpen, setIsFormOpen, isDeleteOpen, setIsDeleteOpen, searchQuery, setSearchQuery, filterCategoria, setFilterCategoria, categorias, openCreate, openEdit, openDelete, handleSubmit, handleDelete } = useLinksUteis();

  const handleChange = (field: keyof LinkFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleAccess = (link: LinkUtil) => {
    if (!link.url) {
      error("Este link não possui uma URL válida.");
      return;
    }
    window.open(link.url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Links úteis</h2>
          <p className="text-sm text-muted-foreground">Acesse links úteis para consultores</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Link
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
          <CardTitle>Links cadastrados</CardTitle>
          <CardDescription>
            {links.length > 0 ? `${links.length} link(s) encontrado(s)` : "Nenhum link cadastrado ainda."}
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
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum link cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[180px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.nome}</TableCell>
                      <TableCell>{link.categoria || "—"}</TableCell>
                      <TableCell>
                        {link.url ? (
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                            Abrir link
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.status === "Ativo" ? "success" : "secondary"}>
                          {link.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleAccess(link)} aria-label="Acessar link">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(link)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(link)} aria-label="Excluir">
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
            <DialogTitle>{selectedLink ? "Editar link" : "Novo link"}</DialogTitle>
            <DialogDescription>{selectedLink ? "Atualize as informações do link." : "Cadastre um novo link útil para consultores."}</DialogDescription>
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
                <Input id="categoria" value={formData.categoria} onChange={(e) => handleChange("categoria", e.target.value)} placeholder="Ex: Portal, Suporte, etc." />
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
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={formData.url} onChange={(e) => handleChange("url", e.target.value)} placeholder="https://..." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedLink(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedLink ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir link</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o link <strong>{selectedLink?.nome}</strong>? Esta ação não pode ser desfeita.
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

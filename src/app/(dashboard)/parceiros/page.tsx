"use client";

import { useState } from "react";
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
import { useParceiros } from "@/hooks/use-parceiros";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";

import type { ParceiroInsert } from "@/repositories/client/parceiros.repository";

const emptyForm: ParceiroInsert = {
  nome: "",
  cnpj: "",
  contato: "",
  email: "",
  telefone: "",
  tipo: "Administradora",
  status: "Ativo",
  observacoes: "",
  usuario_id: "",
};

export default function ParceirosPage() {
  const { success, error } = useToast();
  const {
    parceiros,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selected,
    setSelected,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    searchQuery,
    setSearchQuery,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
  } = useParceiros();

  const handleChange = (field: "nome" | "cnpj" | "contato" | "email" | "telefone" | "tipo" | "status" | "observacoes", value: string) => {
    setFormData((current: ParceiroInsert) => ({ ...current, [field]: value }));
  };

  const filtered = parceiros.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.tipo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parceiros</h2>
          <p className="text-sm text-muted-foreground">Rede de parceiros e administradoras de consórcio</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Parceiro
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
          <CardTitle>Parceiros cadastrados</CardTitle>
          <CardDescription>
            {filtered.length > 0 ? `${filtered.length} parceiro(s) encontrado(s)` : "Nenhum parceiro cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, e-mail ou tipo..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((parceiro) => (
                    <TableRow key={parceiro.id}>
                      <TableCell className="font-medium">{parceiro.nome}</TableCell>
                      <TableCell>{parceiro.cnpj || "—"}</TableCell>
                      <TableCell>{parceiro.contato || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{parceiro.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parceiro.status === "Ativo" ? "success" : "secondary"}>
                          {parceiro.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(parceiro)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(parceiro)} aria-label="Excluir">
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
            <DialogTitle>{selected ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
            <DialogDescription>{selected ? "Atualize as informações do parceiro." : "Cadastre um novo parceiro ou administradora."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={formData.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                  <option value="Administradora">Administradora</option>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Fornecedor">Fornecedor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contato">Contato</Label>
                <Input id="contato" value={formData.contato} onChange={(e) => handleChange("contato", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelected(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selected ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir parceiro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o parceiro <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.
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

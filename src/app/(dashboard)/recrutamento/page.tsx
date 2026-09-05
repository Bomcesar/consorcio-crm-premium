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
import { useRecrutamento } from "@/hooks/use-recrutamento";
import { useToast } from "@/hooks/use-toast";
import type { RecrutamentoInsert } from "@/repositories/client/recrutamento.repository";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";

const emptyForm: RecrutamentoInsert = {
  nome: "",
  email: "",
  telefone: "",
  origem: "",
  status: "Novo",
  observacoes: "",
  usuario_id: "",
  tipo: "convite",
  genero: "",
  endereco: "",
  equipe: "",
  veio_por: "",
  indicacao: false,
  catho: false,
  instagram: false,
  outros: "",
  trabalhou_vendas: false,
  trabalhou_comissionado: false,
  clt: false,
  conhecimento_office: false,
  entende_prospeccao: false,
  facilidade_equipe: false,
  disponibilidade_integral: false,
  disponibilidade_finais_semana: false,
  conhece_consorcios: false,
  conhece_ademicon: false,
  por_onde_conheceu: "",
};

export default function RecrutamentoPage() {
  const { success, error } = useToast();
  const {
    candidatos,
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
  } = useRecrutamento();

  const handleChange = (field: keyof RecrutamentoInsert, value: string | boolean) => {
    setFormData((current: RecrutamentoInsert) => ({ ...current, [field]: value }));
  };

  const filtered = candidatos.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.origem.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recrutamento</h2>
          <p className="text-sm text-muted-foreground">Gestão de candidatos e equipe comercial</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Candidato
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
          <CardTitle>Candidatos cadastrados</CardTitle>
          <CardDescription>
            {filtered.length > 0 ? `${filtered.length} candidato(s) encontrado(s)` : "Nenhum candidato cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, e-mail ou origem..."
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
            <p className="text-sm text-muted-foreground">Nenhum candidato cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((candidato) => (
                    <TableRow key={candidato.id}>
                      <TableCell className="font-medium">{candidato.nome}</TableCell>
                      <TableCell>{candidato.tipo === "ficha_completa" ? "Ficha completa" : "Convite"}</TableCell>
                      <TableCell>{candidato.genero || "—"}</TableCell>
                      <TableCell>{candidato.equipe || "—"}</TableCell>
                      <TableCell>{candidato.trabalhou_vendas ? "Sim" : "Não"}</TableCell>
                      <TableCell>{candidato.origem || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={candidato.status === "Novo" ? "secondary" : "success"}>
                          {candidato.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(candidato)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(candidato)} aria-label="Excluir">
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
            <DialogTitle>{selected ? "Editar candidato" : "Novo candidato"}</DialogTitle>
            <DialogDescription>{selected ? "Atualize as informações do candidato." : "Cadastre um novo candidato para o processo seletivo."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Tipo de cadastro</Label>
              <select
                value={formData.tipo || "convite"}
                onChange={(e) => handleChange("tipo", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="convite">Convite para apresentação</option>
                <option value="ficha_completa">Ficha cadastral completa</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>

            {formData.tipo === "ficha_completa" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="genero">Gênero</Label>
                    <Input id="genero" value={formData.genero} onChange={(e) => handleChange("genero", e.target.value)} placeholder="Ex: Masculino, Feminino" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={formData.endereco} onChange={(e) => handleChange("endereco", e.target.value)} placeholder="Rua, número, bairro, cidade" />
                </div>

                <div className="space-y-2">
                  <Label>Veio por</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.indicacao} onChange={(e) => handleChange("indicacao", e.target.checked)} />
                      Indicação
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.catho} onChange={(e) => handleChange("catho", e.target.checked)} />
                      Catho
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.instagram} onChange={(e) => handleChange("instagram", e.target.checked)} />
                      Instagram
                    </label>
                  </div>
                  <Input value={formData.outros} onChange={(e) => handleChange("outros", e.target.value)} placeholder="Outros" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipe">Equipe</Label>
                  <Input id="equipe" value={formData.equipe} onChange={(e) => handleChange("equipe", e.target.value)} placeholder="Ex: Equipe de Vendas" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Já trabalhou com vendas?</Label>
                    <select value={formData.trabalhou_vendas ? "sim" : "nao"} onChange={(e) => handleChange("trabalhou_vendas", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Já trabalhou comissionado?</Label>
                    <select value={formData.trabalhou_comissionado ? "sim" : formData.clt ? "clt" : "nao"} onChange={(e) => { handleChange("trabalhou_comissionado", e.target.value === "sim"); handleChange("clt", e.target.value === "clt"); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                      <option value="clt">CLT</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Conhece o produto consórcios?</Label>
                    <select value={formData.conhece_consorcios ? "sim" : "nao"} onChange={(e) => handleChange("conhece_consorcios", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conhece a Ademicon?</Label>
                    <select value={formData.conhece_ademicon ? "sim" : "nao"} onChange={(e) => handleChange("conhece_ademicon", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="por_onde_conheceu">Por onde conheceu a empresa?</Label>
                  <Input id="por_onde_conheceu" value={formData.por_onde_conheceu} onChange={(e) => handleChange("por_onde_conheceu", e.target.value)} placeholder="Ex: Internet, indicação, evento" />
                </div>
              </>
            )}

            {formData.tipo === "convite" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
                </div>
              </div>
            )}

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
            <DialogTitle>Excluir candidato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o candidato <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.
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

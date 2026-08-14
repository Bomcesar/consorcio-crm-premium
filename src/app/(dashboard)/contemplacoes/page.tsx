"use client";

import { useEffect, useState } from "react";
import { useContemplacoes } from "@/hooks/use-contemplacoes";
import { useClientes } from "@/hooks/use-clientes";
import { useAssembleias } from "@/hooks/use-assembleias";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Trophy } from "lucide-react";
import type { ContemplacaoInsert } from "@/repositories/client/contemplacoes.repository";

const emptyForm: ContemplacaoInsert = {
  cliente_id: null,
  grupo: "",
  cota: 0,
  assembleia_id: null,
  data: "",
  tipo: "Lance",
  resultado: "",
  documentos: "",
  observacoes: "",
  usuario_id: "",
};

type ContemplacaoFormData = ContemplacaoInsert;

export default function ContemplacoesPage() {
  const contemplacoes = useContemplacoes();
  const { list: listClientes } = useClientes();
  const assembleiasHook = useAssembleias();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [historicoForm, setHistoricoForm] = useState({ tipo: "observacao", descricao: "" });
  const [isHistorySaving, setIsHistorySaving] = useState(false);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  const handleChange = (field: keyof ContemplacaoFormData, value: string | number | boolean | null) => {
    contemplacoes.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contemplacoes.formData.grupo?.trim() && !contemplacoes.selectedContemplacao) return;

    await contemplacoes.handleSubmit(event);
  };

  const handleDelete = async () => {
    await contemplacoes.handleDelete();
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contemplacoes.selectedContemplacao || !historicoForm.descricao.trim()) return;
    setIsHistorySaving(true);
    try {
      await contemplacoes.addHistorico(contemplacoes.selectedContemplacao.id, historicoForm);
      setHistoricoForm({ tipo: "observacao", descricao: "" });
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistorySaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contemplação</h1>
          <p className="text-sm text-muted-foreground">Gestão de contemplações por lance ou sorteio</p>
        </div>
      </div>

      {contemplacoes.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{contemplacoes.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Contemplações</CardTitle>
            <CardDescription>
              {contemplacoes.contemplacoes.length > 0
                ? `${contemplacoes.contemplacoes.length} contemplação(ões) encontrada(s)`
                : "Nenhuma contemplação cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={contemplacoes.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Contemplação
          </Button>
        </CardHeader>
        <CardContent>
          {contemplacoes.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contemplacoes.contemplacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma contemplação cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Cota</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contemplacoes.contemplacoes.map((contemplacao) => {
                    const cliente = clientes.find((c) => c.id === contemplacao.cliente_id);
                    return (
                      <TableRow key={contemplacao.id}>
                        <TableCell className="font-medium">{cliente?.nome ?? "—"}</TableCell>
                        <TableCell>{contemplacao.grupo || "—"}</TableCell>
                        <TableCell>{contemplacao.cota}</TableCell>
                        <TableCell>{formatDate(contemplacao.data)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            {contemplacao.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => contemplacoes.openEdit(contemplacao)}
                            aria-label="Editar contemplação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => contemplacoes.openDelete(contemplacao)}
                            aria-label="Excluir contemplação"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={contemplacoes.isFormOpen} onOpenChange={contemplacoes.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contemplacoes.selectedContemplacao ? "Editar contemplação" : "Nova contemplação"}</DialogTitle>
            <DialogDescription>
              {contemplacoes.selectedContemplacao
                ? "Atualize as informações da contemplação."
                : "Cadastre uma nova contemplação."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contemplacoes.formData.cliente_id || ""}
                onChange={(e) => handleChange("cliente_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grupo">Grupo</Label>
                <Input
                  id="grupo"
                  value={contemplacoes.formData.grupo}
                  onChange={(e) => handleChange("grupo", e.target.value)}
                  placeholder="Nome do grupo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cota">Cota</Label>
                <Input
                  id="cota"
                  type="number"
                  value={contemplacoes.formData.cota}
                  onChange={(e) => handleChange("cota", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={contemplacoes.formData.data}
                  onChange={(e) => handleChange("data", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={contemplacoes.formData.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                >
                  <option value="Lance">Lance</option>
                  <option value="Sorteio">Sorteio</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assembleia_id">Assembleia</Label>
              <select
                id="assembleia_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contemplacoes.formData.assembleia_id || ""}
                onChange={(e) => handleChange("assembleia_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {assembleiasHook.assembleias.map((assembleia) => (
                  <option key={assembleia.id} value={assembleia.id}>
                    {assembleia.grupo} - {formatDate(assembleia.data)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <Input
                id="resultado"
                value={contemplacoes.formData.resultado}
                onChange={(e) => handleChange("resultado", e.target.value)}
                placeholder="Resultado da contemplação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentos">Documentos</Label>
              <Input
                id="documentos"
                value={contemplacoes.formData.documentos}
                onChange={(e) => handleChange("documentos", e.target.value)}
                placeholder="Links ou referências de documentos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={contemplacoes.formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Observações adicionais"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  contemplacoes.setIsFormOpen(false);
                  contemplacoes.setFormData(emptyForm);
                  contemplacoes.setSelectedContemplacao(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={contemplacoes.isSaving}>
                {contemplacoes.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : contemplacoes.selectedContemplacao ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {contemplacoes.selectedContemplacao && (
        <Dialog open={contemplacoes.isFormOpen} onOpenChange={contemplacoes.setIsFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Contemplação</DialogTitle>
              <DialogDescription>
                {contemplacoes.selectedContemplacao.grupo} - {formatDate(contemplacoes.selectedContemplacao.data)}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="historico" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="pos-venda">Pós-venda</TabsTrigger>
              </TabsList>

              <TabsContent value="historico" className="space-y-4">
                <div className="space-y-2">
                  {contemplacoes.historico.map((h) => (
                    <div key={h.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{h.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                  {contemplacoes.historico.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
                  )}
                </div>

                <form onSubmit={handleAddHistorico} className="flex gap-2">
                  <Input
                    value={historicoForm.descricao}
                    onChange={(e) => setHistoricoForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Adicionar ao histórico..."
                  />
                  <Button type="submit" size="sm" disabled={isHistorySaving}>
                    {isHistorySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="pos-venda" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Integração com Pós-venda: crie uma ação de pós-venda do tipo Contemplação para esta contemplação.
                </p>
                <Button
                  onClick={() => {
                    if (!contemplacoes.selectedContemplacao) return;
                    const posVendaLink = `/pos-venda?tipo=Contemplação&cliente_id=${contemplacoes.selectedContemplacao.cliente_id}&referencia=${contemplacoes.selectedContemplacao.id}`;
                    window.open(posVendaLink, "_blank");
                  }}
                >
                  Abrir Pós-venda
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={contemplacoes.isDeleteOpen} onOpenChange={contemplacoes.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contemplação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta contemplação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => contemplacoes.setIsDeleteOpen(false)}>
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

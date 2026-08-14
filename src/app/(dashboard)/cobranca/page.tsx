"use client";

import { useEffect, useState } from "react";
import { useCobrancas } from "@/hooks/use-cobrancas";
import { useClientes } from "@/hooks/use-clientes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Loader2, DollarSign } from "lucide-react";
import type { CobrancaInsert } from "@/repositories/client/cobranca.repository";

const emptyForm: CobrancaInsert = {
  valor: 0,
  valor_pago: 0,
  metodo_pagamento: "",
  data_vencimento: "",
  data_pagamento: null,
  status: "Pendente",
  cliente_id: null,
  observacoes: "",
  numero_parcela: 1,
  total_parcelas: 1,
  boleto_url: "",
  lembrete_em: null,
  cliente_origem_id: null,
  usuario_id: "",
};

type CobrancaFormData = CobrancaInsert;

export default function CobrancaPage() {
  const cobrancas = useCobrancas();
  const { list: listClientes } = useClientes();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [historicoForm, setHistoricoForm] = useState({ tipo: "observacao", descricao: "" });
  const [isHistorySaving, setIsHistorySaving] = useState(false);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  const handleChange = (field: keyof CobrancaFormData, value: string | number | boolean | null) => {
    cobrancas.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cobrancas.formData.valor && !cobrancas.selectedCobranca) return;

    await cobrancas.handleSubmit(event);
  };

  const handleDelete = async () => {
    await cobrancas.handleDelete();
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cobrancas.selectedCobranca || !historicoForm.descricao.trim()) return;
    setIsHistorySaving(true);
    try {
      await cobrancas.addHistorico(cobrancas.selectedCobranca.id, historicoForm);
      setHistoricoForm({ tipo: "observacao", descricao: "" });
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistorySaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      Pendente: "secondary",
      Enviado: "outline",
      Pago: "success",
      Atrasado: "destructive",
      Renegociação: "default",
    };
    return map[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cobrança</h1>
          <p className="text-sm text-muted-foreground">Gestão financeira, parcelas e histórico</p>
        </div>
      </div>

      {cobrancas.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{cobrancas.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(cobrancas.cobrancas.filter((c) => c.status === "Pendente" || c.status === "Atrasado" || c.status === "Enviado").reduce((sum, c) => sum + Number(c.valor), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cobrancas.cobrancas.filter((c) => c.status === "Pago").reduce((sum, c) => sum + Number(c.valor_pago), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cobrancas.cobrancas.filter((c) => c.status === "Atrasado").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Renegociação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {cobrancas.cobrancas.filter((c) => c.status === "Renegociação").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Cobranças</CardTitle>
            <CardDescription>
              {cobrancas.cobrancas.length > 0
                ? `${cobrancas.cobrancas.length} cobrança(s) encontrada(s)`
                : "Nenhuma cobrança cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={cobrancas.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Cobrança
          </Button>
        </CardHeader>
        <CardContent>
          {cobrancas.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cobrancas.cobrancas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cobrança cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobrancas.cobrancas.map((cobranca) => {
                    const cliente = clientes.find((c) => c.id === cobranca.cliente_id);
                    return (
                      <TableRow key={cobranca.id}>
                        <TableCell className="font-medium">{cliente?.nome ?? "—"}</TableCell>
                        <TableCell>{formatCurrency(Number(cobranca.valor))}</TableCell>
                        <TableCell>
                          {cobranca.numero_parcela}/{cobranca.total_parcelas}
                        </TableCell>
                        <TableCell>
                          {new Date(cobranca.data_vencimento).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(cobranca.status)}`}>
                            {cobranca.status}
                          </span>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cobrancas.openEdit(cobranca)}
                            aria-label="Editar cobrança"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cobrancas.openDelete(cobranca)}
                            aria-label="Excluir cobrança"
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

      <Dialog open={cobrancas.isFormOpen} onOpenChange={cobrancas.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{cobrancas.selectedCobranca ? "Editar cobrança" : "Nova cobrança"}</DialogTitle>
            <DialogDescription>
              {cobrancas.selectedCobranca
                ? "Atualize as informações da cobrança."
                : "Cadastre uma nova cobrança."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente</Label>
                <select
                  id="cliente_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={cobrancas.formData.cliente_id || ""}
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
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={cobrancas.formData.valor}
                  onChange={(e) => handleChange("valor", e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numero_parcela">Parcela</Label>
                <Input
                  id="numero_parcela"
                  type="number"
                  value={cobrancas.formData.numero_parcela}
                  onChange={(e) => handleChange("numero_parcela", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                <Input
                  id="total_parcelas"
                  type="number"
                  value={cobrancas.formData.total_parcelas}
                  onChange={(e) => handleChange("total_parcelas", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={cobrancas.formData.data_vencimento}
                  onChange={(e) => handleChange("data_vencimento", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={cobrancas.formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Pago">Pago</option>
                  <option value="Atrasado">Atrasado</option>
                  <option value="Renegociação">Renegociação</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="boleto_url">URL do Boleto</Label>
                <Input
                  id="boleto_url"
                  value={cobrancas.formData.boleto_url}
                  onChange={(e) => handleChange("boleto_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                <Input
                  id="metodo_pagamento"
                  value={cobrancas.formData.metodo_pagamento}
                  onChange={(e) => handleChange("metodo_pagamento", e.target.value)}
                  placeholder="Ex: Boleto, PIX, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={cobrancas.formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Adicione observações relevantes"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  cobrancas.setIsFormOpen(false);
                  cobrancas.setFormData(emptyForm);
                  cobrancas.setSelectedCobranca(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={cobrancas.isSaving}>
                {cobrancas.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : cobrancas.selectedCobranca ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cobrancas.isDeleteOpen} onOpenChange={cobrancas.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cobrança</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => cobrancas.setIsDeleteOpen(false)}>
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

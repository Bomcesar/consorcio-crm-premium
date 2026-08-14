"use client";

import { useEffect, useState } from "react";
import { useComissoes } from "@/hooks/use-comissoes";
import { useToast } from "@/hooks/use-toast";
import { useCentralIndicadores } from "@/hooks/use-central-indicadores";
import { useLeads } from "@/hooks/use-leads";
import { useClientes } from "@/hooks/use-clientes";
import { useNegociacoes } from "@/hooks/use-negociacoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import type { ComissaoIndicador } from "@/repositories/client/comissoes-indicadores.repository";
import { formatCurrency } from "@/lib/utils";

export function ComissoesClient() {
  const { success, error } = useToast();
  const comissoes = useComissoes();
  const { indicators } = useCentralIndicadores();
  const { list: listLeads } = useLeads();
  const { list: listClientes } = useClientes();
  const { list: listNegociacoes } = useNegociacoes();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [indicadores, setIndicadores] = useState<{ id: string; nome: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [negociacoes, setNegociacoes] = useState<{ id: string; titulo: string }[]>([]);

  useEffect(() => {
    void comissoes.loadComissoes();
  }, []);

  useEffect(() => {
    const loadOptions = async () => {
      const [leadsData, clientesData, negociacoesData] = await Promise.all([
        listLeads(),
        listClientes(),
        listNegociacoes(),
      ]);
      setIndicadores(indicators.map((i) => ({ id: i.id, nome: i.nome })));
      setClientes(clientesData.map((c) => ({ id: c.id, nome: c.nome })));
      setNegociacoes(negociacoesData.map((n) => ({ id: n.id, titulo: n.titulo })));
    };
    void loadOptions();
  }, [indicators, listLeads, listClientes, listNegociacoes]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      comissoes.loadComissoes();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterStatus, comissoes]);

  const filteredComissoes = comissoes.comissoes.filter((comissao) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const indicador = indicadores.find((i) => i.id === comissao.indicador_id);
    const cliente = clientes.find((c) => c.id === comissao.cliente_id);
    const negociacao = negociacoes.find((n) => n.id === comissao.negociacao_id);
    return (
      (indicador?.nome.toLowerCase().includes(q) ?? false) ||
      (cliente?.nome.toLowerCase().includes(q) ?? false) ||
      (negociacao?.titulo.toLowerCase().includes(q) ?? false) ||
      comissao.observacoes.toLowerCase().includes(q) ||
      comissao.pix.toLowerCase().includes(q)
    );
  });

  const getIndicadorNome = (id: string) => {
    return indicadores.find((i) => i.id === id)?.nome ?? "—";
  };

  const getClienteNome = (id: string) => {
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  };

  const getNegociacaoTitulo = (id: string) => {
    return negociacoes.find((n) => n.id === id)?.titulo ?? "—";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "outline" | "destructive"> = {
      Prevista: "secondary",
      Pendente: "outline",
      Paga: "success",
      "A receber": "default",
    };
    return map[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de comissões de indicadores e vínculos com vendas
          </p>
        </div>
        <Button onClick={comissoes.openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Comissão
        </Button>
      </div>

      {comissoes.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{comissoes.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(comissoes.resumo.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(comissoes.resumo.totalPendente)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(comissoes.resumo.totalPago)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(comissoes.resumo.totalAReceber)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comissões</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar comissões..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-[180px]"
            >
              <option value="todos">Todos</option>
              <option value="Prevista">Prevista</option>
              <option value="Pendente">Pendente</option>
              <option value="Paga">Paga</option>
              <option value="A receber">A receber</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {comissoes.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredComissoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma comissão cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComissoes.map((comissao) => (
                    <TableRow key={comissao.id}>
                      <TableCell className="font-medium">{getIndicadorNome(comissao.indicador_id)}</TableCell>
                      <TableCell>{getClienteNome(comissao.cliente_id || "")}</TableCell>
                      <TableCell>{getNegociacaoTitulo(comissao.negociacao_id || "")}</TableCell>
                      <TableCell>{formatCurrency(Number(comissao.valor))}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(comissao.status)}`}>
                          {comissao.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {comissao.data_prevista
                          ? new Date(comissao.data_prevista).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {comissao.data_pagamento
                          ? new Date(comissao.data_pagamento).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => comissoes.openEdit(comissao)}
                          aria-label="Editar comissão"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta comissão?")) {
                              comissoes.handleDelete(comissao.id);
                            }
                          }}
                          aria-label="Excluir comissão"
                        >
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

      <Dialog open={comissoes.isFormOpen} onOpenChange={comissoes.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{comissoes.editingId ? "Editar comissão" : "Nova comissão"}</DialogTitle>
            <DialogDescription>
              {comissoes.editingId
                ? "Atualize as informações da comissão."
                : "Cadastre uma nova comissão."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={comissoes.handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="indicador_id">Indicador</Label>
                <select
                  id="indicador_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comissoes.formData.indicador_id}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, indicador_id: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {indicadores.map((indicador) => (
                    <option key={indicador.id} value={indicador.id}>
                      {indicador.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente</Label>
                <select
                  id="cliente_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comissoes.formData.cliente_id}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, cliente_id: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="negociacao_id">Venda/Negociação</Label>
                <select
                  id="negociacao_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comissoes.formData.negociacao_id}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, negociacao_id: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {negociacoes.map((negociacao) => (
                    <option key={negociacao.id} value={negociacao.id}>
                      {negociacao.titulo}
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
                  min="0"
                  value={comissoes.formData.valor}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comissoes.formData.status}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, status: e.target.value as ComissaoIndicador["status"] }))}
                >
                  <option value="Prevista">Prevista</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Paga">Paga</option>
                  <option value="A receber">A receber</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comissoes.formData.tipo}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, tipo: e.target.value as ComissaoIndicador["tipo"] }))}
                >
                  <option value="Venda">Venda</option>
                  <option value="Indicacao">Indicação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_prevista">Data Prevista</Label>
                <Input
                  id="data_prevista"
                  type="date"
                  value={comissoes.formData.data_prevista}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, data_prevista: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_pagamento">Data de Pagamento</Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={comissoes.formData.data_pagamento}
                  onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, data_pagamento: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix">PIX</Label>
              <Input
                id="pix"
                value={comissoes.formData.pix}
                onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, pix: e.target.value }))}
                placeholder="Chave PIX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={comissoes.formData.observacoes}
                onChange={(e) => comissoes.setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => comissoes.setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={comissoes.isSaving}>
                {comissoes.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : comissoes.editingId ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

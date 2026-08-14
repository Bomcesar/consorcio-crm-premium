"use client";

import { useEffect, useState } from "react";
import { useLances } from "@/hooks/use-lances";
import { useClientes } from "@/hooks/use-clientes";
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
import { Plus, Pencil, Trash2, Loader2, Trophy } from "lucide-react";
import type { LanceInsert } from "@/repositories/client/loteria-lances.repository";
import { getAssembleias } from "@/repositories/client/assembleias.repository";

const emptyForm: LanceInsert = {
  valor: 0,
  percentual: 0,
  data: "",
  assembleia_id: null,
  grupo: "",
  cota: 0,
  cliente_id: null,
  resultado: "",
  status: "Aguardando",
  usuario_id: "",
};

type LancesFormData = LanceInsert;

export default function LancesPage() {
  const lancesHook = useLances();
  const { list: listClientes } = useClientes();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [assembleias, setAssembleias] = useState<{ id: string; grupo: string; data: string }[]>([]);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  useEffect(() => {
    void getAssembleias().then((data) => {
      setAssembleias(data.map((a) => ({ id: a.id, grupo: a.grupo, data: a.data })));
    });
  }, []);

  const handleChange = (field: keyof LancesFormData, value: string | number | boolean | null) => {
    lancesHook.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lancesHook.formData.grupo?.trim() && !lancesHook.selectedLance) return;

    await lancesHook.handleSubmit(event);
  };

  const handleDelete = async () => {
    await lancesHook.handleDelete();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      Enviado: "outline",
      Aguardando: "secondary",
      Vencedor: "success",
      "Não vencedor": "destructive",
    };
    return map[status] || "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lances</h1>
          <p className="text-sm text-muted-foreground">Gestão de lances e resultados</p>
        </div>
      </div>

      {lancesHook.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{lancesHook.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Lances</CardTitle>
            <CardDescription>
              {lancesHook.lances.length > 0
                ? `${lancesHook.lances.length} lance(s) encontrado(s)`
                : "Nenhum lance cadastrado ainda."}
            </CardDescription>
          </div>
          <Button onClick={lancesHook.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lance
          </Button>
        </CardHeader>
        <CardContent>
          {lancesHook.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lancesHook.lances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lance cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Cota</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancesHook.lances.map((lance) => (
                    <TableRow key={lance.id}>
                      <TableCell className="font-medium">{lance.grupo || "—"}</TableCell>
                      <TableCell>{lance.cota}</TableCell>
                      <TableCell>{formatCurrency(Number(lance.valor))}</TableCell>
                      <TableCell>{Number(lance.percentual).toFixed(2)}%</TableCell>
                      <TableCell>{formatDate(lance.data)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(lance.status)}`}>
                          {lance.status}
                        </span>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => lancesHook.openEdit(lance)}
                          aria-label="Editar lance"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => lancesHook.openDelete(lance)}
                          aria-label="Excluir lance"
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

      <Dialog open={lancesHook.isFormOpen} onOpenChange={lancesHook.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lancesHook.selectedLance ? "Editar lance" : "Novo lance"}</DialogTitle>
            <DialogDescription>
              {lancesHook.selectedLance
                ? "Atualize as informações do lance."
                : "Cadastre um novo lance."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grupo">Grupo</Label>
                <Input
                  id="grupo"
                  value={lancesHook.formData.grupo}
                  onChange={(e) => handleChange("grupo", e.target.value)}
                  placeholder="Nome do grupo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cota">Cota</Label>
                <Input
                  id="cota"
                  type="number"
                  value={lancesHook.formData.cota}
                  onChange={(e) => handleChange("cota", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={lancesHook.formData.valor}
                  onChange={(e) => handleChange("valor", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentual">Percentual (%)</Label>
                <Input
                  id="percentual"
                  type="number"
                  step="0.01"
                  value={lancesHook.formData.percentual}
                  onChange={(e) => handleChange("percentual", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={lancesHook.formData.data}
                  onChange={(e) => handleChange("data", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={lancesHook.formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="Enviado">Enviado</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Vencedor">Vencedor</option>
                  <option value="Não vencedor">Não vencedor</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assembleia_id">Assembleia</Label>
              <select
                id="assembleia_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={lancesHook.formData.assembleia_id || ""}
                onChange={(e) => handleChange("assembleia_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {assembleias.map((assembleia) => (
                  <option key={assembleia.id} value={assembleia.id}>
                    {assembleia.grupo} - {formatDate(assembleia.data)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={lancesHook.formData.cliente_id || ""}
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
              <Label htmlFor="resultado">Resultado</Label>
              <Input
                id="resultado"
                value={lancesHook.formData.resultado}
                onChange={(e) => handleChange("resultado", e.target.value)}
                placeholder="Resultado do lance"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  lancesHook.setIsFormOpen(false);
                  lancesHook.setFormData(emptyForm);
                  lancesHook.setSelectedLance(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={lancesHook.isSaving}>
                {lancesHook.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : lancesHook.selectedLance ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lancesHook.isDeleteOpen} onOpenChange={lancesHook.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir lance</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lance? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => lancesHook.setIsDeleteOpen(false)}>
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


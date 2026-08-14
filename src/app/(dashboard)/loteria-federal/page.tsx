"use client";

import { useEffect, useState } from "react";
import { useLoteriaFederal } from "@/hooks/use-loteria-federal";
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
import { Plus, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import type { LoteriaFederalInsert } from "@/repositories/client/loteria-lances.repository";

const emptyForm: LoteriaFederalInsert = {
  numero_extracao: 0,
  data: "",
  resultado: "",
  grupo: "",
  cota: 0,
  cliente_id: null,
  usuario_id: "",
};

type LoteriaFederalFormData = LoteriaFederalInsert;

export default function LoteriaFederalPage() {
  const loteria = useLoteriaFederal();
  const { list: listClientes } = useClientes();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  const handleChange = (field: keyof LoteriaFederalFormData, value: string | number | boolean | null) => {
    loteria.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loteria.formData.numero_extracao && !loteria.selectedExtraction) return;

    await loteria.handleSubmit(event);
  };

  const handleDelete = async () => {
    await loteria.handleDelete();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loteria Federal</h1>
          <p className="text-sm text-muted-foreground">Resultados de extração e gerenciamento</p>
        </div>
      </div>

      {loteria.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{loteria.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Extrações</CardTitle>
            <CardDescription>
              {loteria.extractions.length > 0
                ? `${loteria.extractions.length} extração(ões) encontrada(s)`
                : "Nenhuma extração cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={loteria.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Extração
          </Button>
        </CardHeader>
        <CardContent>
          {loteria.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loteria.extractions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma extração cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Cota</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loteria.extractions.map((extraction) => {
                    const cliente = clientes.find((c) => c.id === extraction.cliente_id);
                    return (
                      <TableRow key={extraction.id}>
                        <TableCell className="font-medium">{extraction.numero_extracao}</TableCell>
                        <TableCell>{formatDate(extraction.data)}</TableCell>
                        <TableCell>{extraction.grupo || "—"}</TableCell>
                        <TableCell>{extraction.cota}</TableCell>
                        <TableCell>{cliente?.nome ?? "—"}</TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => loteria.openEdit(extraction)}
                            aria-label="Editar extração"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => loteria.openDelete(extraction)}
                            aria-label="Excluir extração"
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

      <Dialog open={loteria.isFormOpen} onOpenChange={loteria.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{loteria.selectedExtraction ? "Editar extração" : "Nova extração"}</DialogTitle>
            <DialogDescription>
              {loteria.selectedExtraction
                ? "Atualize as informações da extração."
                : "Cadastre uma nova extração da Loteria Federal."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numero_extracao">Número da Extração</Label>
                <Input
                  id="numero_extracao"
                  type="number"
                  value={loteria.formData.numero_extracao}
                  onChange={(e) => handleChange("numero_extracao", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={loteria.formData.data}
                  onChange={(e) => handleChange("data", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <Input
                id="resultado"
                value={loteria.formData.resultado}
                onChange={(e) => handleChange("resultado", e.target.value)}
                placeholder="Ex: 123456"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grupo">Grupo</Label>
                <Input
                  id="grupo"
                  value={loteria.formData.grupo}
                  onChange={(e) => handleChange("grupo", e.target.value)}
                  placeholder="Nome do grupo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cota">Cota</Label>
                <Input
                  id="cota"
                  type="number"
                  value={loteria.formData.cota}
                  onChange={(e) => handleChange("cota", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={loteria.formData.cliente_id || ""}
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  loteria.setIsFormOpen(false);
                  loteria.setFormData(emptyForm);
                  loteria.setSelectedExtraction(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loteria.isSaving}>
                {loteria.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : loteria.selectedExtraction ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={loteria.isDeleteOpen} onOpenChange={loteria.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir extração</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta extração? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => loteria.setIsDeleteOpen(false)}>
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

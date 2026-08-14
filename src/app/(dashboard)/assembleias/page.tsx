"use client";

import { useEffect, useState } from "react";
import { useAssembleias } from "@/hooks/use-assembleias";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Calendar, Bell, Send } from "lucide-react";
import type { AssembleiaInsert } from "@/repositories/client/assembleias.repository";
import { AnexosUpload } from "@/components/anexos/anexos-upload";
import { AnexosList } from "@/components/anexos/anexos-list";

const emptyForm: AssembleiaInsert = {
  cliente_id: null,
  grupo: "",
  cota: 0,
  data: "",
  numero_assembleia: 1,
  situacao: "Pendente",
  usuario_id: "",
};

type AssembleiaFormData = AssembleiaInsert;

export default function AssembleiasPage() {
  const assembleias = useAssembleias();
  const { list: listClientes } = useClientes();
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [avisoForm, setAvisoForm] = useState({ tipo: "aviso" as "aviso" | "lembrete" | "envio", descricao: "" });
  const [isAvisoSaving, setIsAvisoSaving] = useState(false);
  const [historicoForm, setHistoricoForm] = useState({ tipo: "envio", descricao: "" });
  const [isHistoricoSaving, setIsHistoricoSaving] = useState(false);

  useEffect(() => {
    void listClientes().then((data) => {
      setClientes(data.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })));
    });
  }, [listClientes]);

  const handleChange = (field: keyof AssembleiaFormData, value: string | number | boolean | null) => {
    assembleias.setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assembleias.formData.grupo?.trim() && !assembleias.selectedAssembleia) return;

    await assembleias.handleSubmit(event);
  };

  const handleDelete = async () => {
    await assembleias.handleDelete();
  };

  const handleAddAviso = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assembleias.selectedAssembleia || !avisoForm.descricao.trim()) return;
    setIsAvisoSaving(true);
    try {
      await assembleias.addAviso({
        assembleia_id: assembleias.selectedAssembleia.id,
        tipo: avisoForm.tipo,
        descricao: avisoForm.descricao.trim(),
        enviado: false,
        usuario_id: assembleias.selectedAssembleia.usuario_id,
      });
      setAvisoForm({ tipo: "aviso", descricao: "" });
      await assembleias.loadAvisos(assembleias.selectedAssembleia.id);
    } catch {
      // erro tratado no hook
    } finally {
      setIsAvisoSaving(false);
    }
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assembleias.selectedAssembleia || !historicoForm.descricao.trim()) return;
    setIsHistoricoSaving(true);
    try {
      await assembleias.addHistorico(assembleias.selectedAssembleia.id, historicoForm);
      setHistoricoForm({ tipo: "envio", descricao: "" });
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistoricoSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getSituacaoBadge = (situacao: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      Pendente: "secondary",
      Realizada: "success",
      Cancelada: "destructive",
    };
    return map[situacao] || "secondary";
  };

  const getAvisoIcon = (tipo: string) => {
    switch (tipo) {
      case "aviso":
        return <Bell className="h-4 w-4" />;
      case "lembrete":
        return <Calendar className="h-4 w-4" />;
      case "envio":
        return <Send className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assembleias</h1>
          <p className="text-sm text-muted-foreground">Gestão de assembleias, avisos e histórico</p>
        </div>
      </div>

      {assembleias.errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{assembleias.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Assembleias</CardTitle>
            <CardDescription>
              {assembleias.assembleias.length > 0
                ? `${assembleias.assembleias.length} assembleia(s) encontrada(s)`
                : "Nenhuma assembleia cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={assembleias.openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Assembleia
          </Button>
        </CardHeader>
        <CardContent>
          {assembleias.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : assembleias.assembleias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma assembleia cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Cota</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assembleias.assembleias.map((assembleia) => {
                    const cliente = clientes.find((c) => c.id === assembleia.cliente_id);
                    return (
                      <TableRow key={assembleia.id}>
                        <TableCell className="font-medium">{cliente?.nome ?? "—"}</TableCell>
                        <TableCell>{assembleia.grupo || "—"}</TableCell>
                        <TableCell>{assembleia.cota}</TableCell>
                        <TableCell>{formatDate(assembleia.data)}</TableCell>
                        <TableCell>{assembleia.numero_assembleia}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSituacaoBadge(assembleia.situacao)}`}>
                            {assembleia.situacao}
                          </span>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => assembleias.openEdit(assembleia)}
                            aria-label="Editar assembleia"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => assembleias.openDelete(assembleia)}
                            aria-label="Excluir assembleia"
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

      <Dialog open={assembleias.isFormOpen} onOpenChange={assembleias.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{assembleias.selectedAssembleia ? "Editar assembleia" : "Nova assembleia"}</DialogTitle>
            <DialogDescription>
              {assembleias.selectedAssembleia
                ? "Atualize as informações da assembleia."
                : "Cadastre uma nova assembleia."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assembleias.formData.cliente_id || ""}
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
              <Label htmlFor="grupo">Grupo</Label>
              <Input
                id="grupo"
                value={assembleias.formData.grupo}
                onChange={(e) => handleChange("grupo", e.target.value)}
                placeholder="Nome do grupo"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cota">Cota</Label>
                <Input
                  id="cota"
                  type="number"
                  value={assembleias.formData.cota}
                  onChange={(e) => handleChange("cota", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_assembleia">Número da Assembleia</Label>
                <Input
                  id="numero_assembleia"
                  type="number"
                  value={assembleias.formData.numero_assembleia}
                  onChange={(e) => handleChange("numero_assembleia", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={assembleias.formData.data}
                  onChange={(e) => handleChange("data", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="situacao">Situação</Label>
                <select
                  id="situacao"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assembleias.formData.situacao}
                  onChange={(e) => handleChange("situacao", e.target.value)}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Realizada">Realizada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  assembleias.setIsFormOpen(false);
                  assembleias.setFormData(emptyForm);
                  assembleias.setSelectedAssembleia(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={assembleias.isSaving}>
                {assembleias.isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : assembleias.selectedAssembleia ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {assembleias.selectedAssembleia && (
        <Dialog open={assembleias.isFormOpen} onOpenChange={assembleias.setIsFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Assembleia</DialogTitle>
              <DialogDescription>
                {assembleias.selectedAssembleia.grupo} - {formatDate(assembleias.selectedAssembleia.data)}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="avisos" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="avisos">Avisos</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="documentos">Docs</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
              </TabsList>

              <TabsContent value="avisos" className="space-y-4">
                <div className="space-y-2">
                  {assembleias.avisos.map((aviso) => (
                    <div key={aviso.id} className="flex items-start justify-between rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {getAvisoIcon(aviso.tipo)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{aviso.tipo}</p>
                          <p className="text-sm">{aviso.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {aviso.data_envio ? formatDate(aviso.data_envio) : "Não enviado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {assembleias.avisos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum aviso cadastrado.</p>
                  )}
                </div>

                <form onSubmit={handleAddAviso} className="space-y-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={avisoForm.tipo}
                    onChange={(e) => setAvisoForm((f) => ({ ...f, tipo: e.target.value as "aviso" | "lembrete" | "envio" }))}
                  >
                    <option value="aviso">Aviso</option>
                    <option value="lembrete">Lembrete</option>
                    <option value="envio">Envio</option>
                  </select>
                  <Input
                    value={avisoForm.descricao}
                    onChange={(e) => setAvisoForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descrição do aviso..."
                  />
                  <Button type="submit" size="sm" disabled={isAvisoSaving}>
                    {isAvisoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Aviso"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4">
                <div className="space-y-2">
                  {assembleias.historico.map((h) => (
                    <div key={h.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{h.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                  {assembleias.historico.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
                  )}
                </div>

                <form onSubmit={handleAddHistorico} className="flex gap-2">
                  <Input
                    value={historicoForm.descricao}
                    onChange={(e) => setHistoricoForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Adicionar ao histórico..."
                  />
                  <Button type="submit" size="sm" disabled={isHistoricoSaving}>
                    {isHistoricoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="documentos" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relacionamentos com Loteria Federal, Lances e Contemplação serão implementados em breve.
                </p>
              </TabsContent>

              <TabsContent value="anexos" className="space-y-4">
                {assembleias.selectedAssembleia && (
                  <>
                    <AnexosUpload
                      entityType="assembleias"
                      entityId={assembleias.selectedAssembleia.id}
                    />
                    <AnexosList
                      entityType="assembleias"
                      entityId={assembleias.selectedAssembleia.id}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={assembleias.isDeleteOpen} onOpenChange={assembleias.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir assembleia</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta assembleia? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => assembleias.setIsDeleteOpen(false)}>
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

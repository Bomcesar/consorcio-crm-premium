"use client";

import { useEffect, useState } from "react";
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
import { toast } from "@/components/ui/toast";
import {
  getMensagensWhatsApp,
  createMensagemWhatsApp,
  updateMensagemWhatsApp,
  deleteMensagemWhatsApp,
  type MensagemWhatsApp,
  type MensagemWhatsAppInsert,
} from "@/repositories/client/whatsapp.repository";
import { Plus, Pencil, Trash2, Loader2, MessageCircle } from "lucide-react";

const emptyForm = {
  telefone: "",
  mensagem: "",
  tipo: "texto" as MensagemWhatsApp["tipo"],
  status: "pendente" as MensagemWhatsApp["status"],
  lead_id: "",
  cliente_id: "",
  usuario_id: "",
};

type WhatsAppFormData = typeof emptyForm;

export default function WhatsAppPage() {
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMensagem, setSelectedMensagem] = useState<MensagemWhatsApp | null>(null);
  const [formData, setFormData] = useState<WhatsAppFormData>(emptyForm);

  const loadMensagens = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMensagensWhatsApp();
      setMensagens(data);
    } catch {
      setErrorMessage("Não foi possível carregar as mensagens de WhatsApp.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMensagens();
  }, []);

  const handleChange = (field: keyof WhatsAppFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setSelectedMensagem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (mensagem: MensagemWhatsApp) => {
    setSelectedMensagem(mensagem);
    setFormData({
      telefone: mensagem.telefone,
      mensagem: mensagem.mensagem,
      tipo: mensagem.tipo,
      status: mensagem.status,
      lead_id: mensagem.lead_id ?? "",
      cliente_id: mensagem.cliente_id ?? "",
      usuario_id: mensagem.usuario_id,
    });
    setIsFormOpen(true);
  };

  const openDelete = (mensagem: MensagemWhatsApp) => {
    setSelectedMensagem(mensagem);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.mensagem.trim()) return;

    setIsSaving(true);
    try {
      const payload: MensagemWhatsAppInsert = {
        telefone: formData.telefone.trim(),
        mensagem: formData.mensagem.trim(),
        tipo: formData.tipo,
        status: formData.status,
        lead_id: formData.lead_id || null,
        cliente_id: formData.cliente_id || null,
        usuario_id: formData.usuario_id,
      };

      if (selectedMensagem) {
        const updated = await updateMensagemWhatsApp(selectedMensagem.id, payload);
        setMensagens((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success("Mensagem atualizada com sucesso.");
      } else {
        const created = await createMensagemWhatsApp(payload);
        setMensagens((prev) => [created, ...prev]);
        toast.success("Mensagem cadastrada com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedMensagem(null);
    } catch {
      toast.error("Não foi possível salvar a mensagem. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMensagem) return;
    try {
      await deleteMensagemWhatsApp(selectedMensagem.id);
      setMensagens((prev) => prev.filter((m) => m.id !== selectedMensagem.id));
      toast.success("Mensagem excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelectedMensagem(null);
    } catch {
      toast.error("Não foi possível excluir a mensagem.");
    }
  };

  const pendentes = mensagens.filter((m) => m.status === "pendente").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Central de mensagens e atendimento</p>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mensagens.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mensagens.filter((m) => m.status === "enviada" || m.status === "entregue" || m.status === "lida").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mensagens.filter((m) => m.status === "erro").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Mensagens</CardTitle>
            <CardDescription>
              {mensagens.length > 0
                ? `${mensagens.length} mensagem(ns) encontrada(s)`
                : "Nenhuma mensagem cadastrada ainda."}
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Mensagem
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mensagens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem cadastrada ainda. Clique em &quot;Nova Mensagem&quot; para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensagens.map((mensagem) => (
                    <TableRow key={mensagem.id}>
                      <TableCell>{mensagem.telefone}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {mensagem.mensagem}
                      </TableCell>
                      <TableCell>{mensagem.tipo}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            mensagem.status === "pendente"
                              ? "bg-yellow-100 text-yellow-800"
                              : mensagem.status === "enviada" || mensagem.status === "entregue" || mensagem.status === "lida"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {mensagem.status}
                        </span>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(mensagem)}
                          aria-label="Editar mensagem"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(mensagem)}
                          aria-label="Excluir mensagem"
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMensagem ? "Editar mensagem" : "Nova mensagem"}</DialogTitle>
            <DialogDescription>
              {selectedMensagem
                ? "Atualize a mensagem selecionada."
                : "Registre uma nova mensagem de WhatsApp."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(event) => handleChange("telefone", event.target.value)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tipo}
                  onChange={(event) => handleChange("tipo", event.target.value)}
                >
                  <option value="texto">Texto</option>
                  <option value="imagem">Imagem</option>
                  <option value="audio">Áudio</option>
                  <option value="documento">Documento</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(event) => handleChange("status", event.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="enviada">Enviada</option>
                  <option value="entregue">Entregue</option>
                  <option value="lida">Lida</option>
                  <option value="erro">Erro</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensagem">Mensagem</Label>
              <Textarea
                id="mensagem"
                value={formData.mensagem}
                onChange={(event) => handleChange("mensagem", event.target.value)}
                placeholder="Digite a mensagem"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormData(emptyForm);
                  setSelectedMensagem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : selectedMensagem ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir mensagem</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
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

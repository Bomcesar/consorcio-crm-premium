"use client";

import { useEffect, useState, useMemo } from "react";
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
import { useClientes } from "@/hooks/use-clientes";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Phone,
  MessageCircle,
  History,
  Users,
  FileText,
  X,
  UserPlus,
} from "lucide-react";
import type { Cliente, ClienteHistorico, ClienteContato } from "@/repositories/client/clientes.repository";

const emptyForm = {
  nome: "",
  email: "",
  telefone: "",
  cpf_cnpj: "",
  cidade: "",
  estado: "",
  status: "Ativo" as Cliente["status"],
  origem: "",
  observacoes: "",
};

type ClienteFormData = typeof emptyForm;

const emptyHistoricoForm = {
  tipo: "observacao" as ClienteHistorico["tipo"],
  descricao: "",
};

type HistoricoFormData = typeof emptyHistoricoForm;

const emptyContatoForm = {
  nome: "",
  telefone: "",
  email: "",
  tipo: "principal" as ClienteContato["tipo"],
  observacoes: "",
};

type ContatoFormData = typeof emptyContatoForm;

export default function ClientesPage() {
  const { success, error } = useToast();
  const { list, create, update, remove, search, filterByStatus, getHistorico, addHistorico, getContatos, addContato, updateContato, removeContato } = useClientes();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [historico, setHistorico] = useState<ClienteHistorico[]>([]);
  const [contatos, setContatos] = useState<ClienteContato[]>([]);
  const [historicoForm, setHistoricoForm] = useState<HistoricoFormData>(emptyHistoricoForm);
  const [contatoForm, setContatoForm] = useState<ContatoFormData>(emptyContatoForm);
  const [editingContatoId, setEditingContatoId] = useState<string | null>(null);
  const [isHistoricoSaving, setIsHistoricoSaving] = useState(false);
  const [isContatoSaving, setIsContatoSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isContatosLoading, setIsContatosLoading] = useState(false);
  const [tab, setTab] = useState("info");

  const loadClientes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await list();
      setClientes(data);
      setFilteredClientes(data);
    } catch {
      setErrorMessage("Não foi possível carregar os clientes no momento.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClientes();
  }, []);

  useEffect(() => {
    let result = clientes;
    if (statusFilter !== "todos") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.telefone.toLowerCase().includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          c.origem.toLowerCase().includes(q) ||
          c.observacoes.toLowerCase().includes(q),
      );
    }
    setFilteredClientes(result);
  }, [searchQuery, statusFilter, clientes]);

  const handleChange = (field: keyof ClienteFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setSelectedCliente(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      cpf_cnpj: cliente.cpf_cnpj,
      cidade: cliente.cidade,
      estado: cliente.estado,
      status: cliente.status,
      origem: cliente.origem,
      observacoes: cliente.observacoes,
    });
    setIsFormOpen(true);
  };

  const openDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteOpen(true);
  };

  const openDetail = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setTab("info");
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    setIsHistoryLoading(true);
    setIsContatosLoading(true);
    try {
      const [hist, cont] = await Promise.all([getHistorico(cliente.id), getContatos(cliente.id)]);
      setHistorico(hist);
      setContatos(cont);
    } catch {
      setHistorico([]);
      setContatos([]);
    } finally {
      setIsLoadingDetail(false);
      setIsHistoryLoading(false);
      setIsContatosLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.nome.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim(),
        cpf_cnpj: formData.cpf_cnpj.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim(),
        status: formData.status,
        origem: formData.origem.trim(),
        observacoes: formData.observacoes.trim(),
      };
      if (selectedCliente) {
        const updated = await update(selectedCliente.id, payload);
        setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (isDetailOpen && selectedCliente.id === updated.id) {
          setSelectedCliente(updated);
        }
      } else {
        const created = await create(payload);
        setClientes((prev) => [created, ...prev]);
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedCliente(null);
    } catch {
      // erro já tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;
    try {
      await remove(selectedCliente.id);
      setClientes((prev) => prev.filter((c) => c.id !== selectedCliente.id));
      setFilteredClientes((prev) => prev.filter((c) => c.id !== selectedCliente.id));
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedCliente(null);
    } catch {
      // erro já tratado no hook
    }
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCliente || !historicoForm.descricao.trim()) return;
    setIsHistoricoSaving(true);
    try {
      const item = await addHistorico(selectedCliente.id, historicoForm);
      setHistorico((prev) => [item, ...prev]);
      setHistoricoForm(emptyHistoricoForm);
    } catch {
      // erro tratado no hook
    } finally {
      setIsHistoricoSaving(false);
    }
  };

  const handleAddContato = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCliente || !contatoForm.nome.trim()) return;
    setIsContatoSaving(true);
    try {
      if (editingContatoId) {
        const updated = await updateContato(editingContatoId, contatoForm);
        setContatos((prev) => prev.map((c) => (c.id === editingContatoId ? { ...c, ...updated } : c)));
      } else {
        const created = await addContato(selectedCliente.id, contatoForm);
        setContatos((prev) => [created, ...prev]);
      }
      setContatoForm(emptyContatoForm);
      setEditingContatoId(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsContatoSaving(false);
    }
  };

  const handleRemoveContato = async (id: string) => {
    try {
      await removeContato(id);
      setContatos((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // erro tratado no hook
    }
  };

  const handleWhatsApp = (cliente: Cliente) => {
    const phone = (cliente.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para WhatsApp.");
      return;
    }
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  const handleCall = (cliente: Cliente) => {
    const phone = (cliente.telefone || "").replace(/\D/g, "");
    if (!phone) {
      error("Telefone inválido para ligação.");
      return;
    }
    window.location.href = `tel:+55${phone}`;
  };

  const statusOptions = useMemo(() => {
    const statuses = new Set(clientes.map((c) => c.status));
    return Array.from(statuses);
  }, [clientes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">Base completa de clientes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
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
          <CardTitle>Clientes cadastrados</CardTitle>
          <CardDescription>
            {filteredClientes.length > 0 ? `${filteredClientes.length} cliente(s) encontrado(s)` : "Nenhum cliente cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email, telefone..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.email || "—"}</TableCell>
                      <TableCell>{cliente.cidade || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.status === "Ativo" ? "success" : cliente.status === "Inativo" ? "secondary" : "destructive"}>
                          {cliente.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{cliente.origem || "—"}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(cliente)} aria-label="Ver detalhes">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(cliente)} aria-label="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCall(cliente)} aria-label="Ligar">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cliente)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(cliente)} aria-label="Excluir">
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
            <DialogTitle>{selectedCliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>{selectedCliente ? "Atualize as informações do cliente." : "Cadastre um novo cliente."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input id="cpf_cnpj" value={formData.cpf_cnpj} onChange={(e) => handleChange("cpf_cnpj", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Input id="origem" value={formData.origem} onChange={(e) => handleChange("origem", e.target.value)} placeholder="Ex: Indicação, Site, etc." />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} onChange={(e) => handleChange("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={formData.estado} onChange={(e) => handleChange("estado", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedCliente(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedCliente ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedCliente?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={(open) => { if (!open) { setIsDetailOpen(false); setSelectedCliente(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {isLoadingDetail || !selectedCliente ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Cliente</DialogTitle>
                <DialogDescription>{selectedCliente.nome}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 border-b">
                <Button variant={tab === "info" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("info")}>Informações</Button>
                <Button variant={tab === "historico" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("historico")}>Histórico</Button>
                <Button variant={tab === "contatos" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("contatos")}>Contatos</Button>
                <Button variant={tab === "acoes" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("acoes")}>Ações</Button>
              </div>
              {tab === "info" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Nome</p>
                    <p className="text-sm">{selectedCliente.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedCliente.status === "Ativo" ? "success" : selectedCliente.status === "Inativo" ? "secondary" : "destructive"}>{selectedCliente.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedCliente.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Telefone</p>
                    <p className="text-sm">{selectedCliente.telefone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">CPF/CNPJ</p>
                    <p className="text-sm">{selectedCliente.cpf_cnpj || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cidade</p>
                    <p className="text-sm">{selectedCliente.cidade || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm">{selectedCliente.estado || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Origem</p>
                    <p className="text-sm">{selectedCliente.origem || "—"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedCliente.observacoes || "—"}</p>
                  </div>
                </div>
              )}
              {tab === "historico" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddHistorico} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tipo-historico">Tipo</Label>
                        <select id="tipo-historico" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={historicoForm.tipo} onChange={(e) => setHistoricoForm({ ...historicoForm, tipo: e.target.value as ClienteHistorico["tipo"] })}>
                          <option value="observacao">Observação</option>
                          <option value="ligacao">Ligação</option>
                          <option value="reuniao">Reunião</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricao-historico">Descrição</Label>
                        <Input id="descricao-historico" value={historicoForm.descricao} onChange={(e) => setHistoricoForm({ ...historicoForm, descricao: e.target.value })} required />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={isHistoricoSaving}>
                      {isHistoricoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                      Adicionar
                    </Button>
                  </form>
                  {isHistoryLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {historico.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs capitalize">{item.tipo}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                          <p className="mt-2 text-sm">{item.descricao}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "contatos" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddContato} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contato_nome">Nome</Label>
                        <Input id="contato_nome" value={contatoForm.nome} onChange={(e) => setContatoForm({ ...contatoForm, nome: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato_telefone">Telefone</Label>
                        <Input id="contato_telefone" value={contatoForm.telefone} onChange={(e) => setContatoForm({ ...contatoForm, telefone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contato_email">Email</Label>
                        <Input id="contato_email" type="email" value={contatoForm.email} onChange={(e) => setContatoForm({ ...contatoForm, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato_tipo">Tipo</Label>
                        <select id="contato_tipo" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={contatoForm.tipo} onChange={(e) => setContatoForm({ ...contatoForm, tipo: e.target.value as ClienteContato["tipo"] })}>
                          <option value="principal">Principal</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="tecnico">Técnico</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contato_observacoes">Observações</Label>
                      <Textarea id="contato_observacoes" value={contatoForm.observacoes} onChange={(e) => setContatoForm({ ...contatoForm, observacoes: e.target.value })} />
                    </div>
                    <Button type="submit" size="sm" disabled={isContatoSaving}>
                      {isContatoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      {editingContatoId ? "Atualizar" : "Adicionar"}
                    </Button>
                  </form>
                  {isContatosLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : contatos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contatos.map((contato) => (
                            <TableRow key={contato.id}>
                              <TableCell className="font-medium">{contato.nome}</TableCell>
                              <TableCell>{contato.telefone || "—"}</TableCell>
                              <TableCell>{contato.email || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">{contato.tipo}</Badge>
                              </TableCell>
                              <TableCell className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingContatoId(contato.id); setContatoForm({ nome: contato.nome, telefone: contato.telefone, email: contato.email, tipo: contato.tipo as ClienteContato["tipo"], observacoes: contato.observacoes }); }} aria-label="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveContato(contato.id)} aria-label="Excluir">
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              {tab === "acoes" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => handleWhatsApp(selectedCliente)}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => handleCall(selectedCliente)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Ligar
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

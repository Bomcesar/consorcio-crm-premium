"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClientes } from "@/hooks/use-clientes";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, Loader2, Upload, Download, Users, Phone, Mail, FileText, UserPlus } from "lucide-react";
import type { Cliente } from "@/repositories/client/clientes.repository";
import type { Contato, ContatoImportPreview } from "@/lib/contatos";
import { exportCSV, exportVCF, exportTXT, downloadFile, parseCSV, parseVCF, parseTXT, detectDuplicates } from "@/lib/contatos";

const emptyForm = {
  nome: "",
  telefone: "",
  observacoes: "",
};

export default function ContatosPage() {
  const clientesHook = useClientes();
  const clientesHookRef = useRef(clientesHook);
  clientesHookRef.current = clientesHook;
  const { error } = useToast();
  const errorRef = useRef(error);
  errorRef.current = error;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "vcf" | "txt">("csv");
  const [exportFormat, setExportFormat] = useState<"csv" | "vcf" | "txt">("csv");
  const [importPreview, setImportPreview] = useState<ContatoImportPreview[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<"new" | "update" | "all">("new");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clientesRef = useRef(clientes);
  clientesRef.current = clientes;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setImportError(null);
    clientesHook
      .list()
      .then((data) => {
        if (!cancelled) {
          setClientes(data);
          setFiltered(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Não foi possível carregar os contatos.";
          errorRef.current(message);
          setImportError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setFiltered(clientesRef.current);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await clientesHookRef.current.search(trimmed);
        if (!cancelled) {
          setFiltered(results);
        }
      } catch {
        if (!cancelled) {
          errorRef.current("Não foi possível pesquisar clientes.");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      cancelled = true;
    };
  }, [searchQuery]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.nome.trim()) return;
    setIsSaving(true);
    try {
      if (selectedCliente) {
        await clientesHook.update(selectedCliente.id, formData);
      } else {
        await clientesHook.create(formData);
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedCliente(null);
      setSearchQuery("");
      const updated = await clientesHook.list();
      setClientes(updated);
      setFiltered(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;
    await clientesHook.remove(selectedCliente.id);
    setIsDeleteOpen(false);
    setSelectedCliente(null);
    setSearchQuery("");
    const updated = await clientesHook.list();
    setClientes(updated);
    setFiltered(updated);
  };

  const handleExport = () => {
    const contatos: Contato[] = filtered.map((c) => ({
      nome: c.nome,
      telefone: c.telefone,
      observacao: c.observacoes || "",
    }));
    if (contatos.length === 0) {
      error("Nenhum contato para exportar.");
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    if (exportFormat === "csv") {
      downloadFile(exportCSV(contatos), `contatos_${timestamp}.csv`, "text/csv");
    } else if (exportFormat === "vcf") {
      downloadFile(exportVCF(contatos), `contatos_${timestamp}.vcf`, "text/vcard");
    } else {
      downloadFile(exportTXT(contatos), `contatos_${timestamp}.txt`, "text/plain");
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    try {
      const text = await file.text();
      let contatos: Contato[] = [];
      if (importFormat === "csv") contatos = parseCSV(text);
      else if (importFormat === "vcf") contatos = parseVCF(text);
      else contatos = parseTXT(text);
      const preview = detectDuplicates(contatos, clientes.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })));
      setImportPreview(preview);
    } catch {
      setImportError("Não foi possível ler o arquivo selecionado.");
      setImportPreview([]);
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) {
      error("Nenhum contato para importar.");
      return;
    }
    setIsImporting(true);
    try {
      const novos = importPreview.filter((p) => p.status === "Novo");
      const naoNovos = importPreview.filter((p) => p.status !== "Novo");
      if (importMode === "new" && naoNovos.length > 0) {
        const confirmar = window.confirm(`${naoNovos.length} contato(s) já existem e serão ignorados. Deseja continuar?`);
        if (!confirmar) {
          setIsImporting(false);
          return;
        }
      }
      if (importMode === "update" && naoNovos.length > 0) {
        for (const c of naoNovos) {
          const existente = clientes.find((cl) => cl.telefone.replace(/\D/g, "") === c.telefone.replace(/\D/g, ""));
          if (existente) {
            await clientesHook.update(existente.id, { nome: c.nome, telefone: c.telefone, observacoes: c.observacao || "" });
          }
        }
      }
      for (const c of novos) {
        await clientesHook.create({ nome: c.nome, telefone: c.telefone, observacoes: c.observacao || "", status: "Ativo" });
      }
      const updated = await clientesHook.list();
      setClientes(updated);
      setFiltered(updated);
      setIsImportOpen(false);
      setImportPreview([]);
      setImportFile(null);
      setImportError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsImporting(false);
    }
  };

  const openCreate = () => {
    setSelectedCliente(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({ nome: cliente.nome, telefone: cliente.telefone, observacoes: cliente.observacoes || "" });
    setIsFormOpen(true);
  };

  const openDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteOpen(true);
  };

  const contatos = useMemo(() => filtered.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })), [filtered]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const accepted = [".csv", ".vcf", ".txt"];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!accepted.includes(extension)) {
      setImportError("Formato não suportado. Use CSV, VCF ou TXT.");
      return;
    }
    const format = extension === ".csv" ? "csv" : extension === ".vcf" ? "vcf" : "txt";
    setImportFormat(format);
    setImportFile(file);
    setImportError(null);
    try {
      const text = await file.text();
      let parsed: Contato[] = [];
      if (format === "csv") parsed = parseCSV(text);
      else if (format === "vcf") parsed = parseVCF(text);
      else parsed = parseTXT(text);
      const preview = detectDuplicates(parsed, clientes.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })));
      setImportPreview(preview);
      setIsImportOpen(true);
    } catch {
      setImportError("Não foi possível ler o arquivo arrastado.");
      setImportPreview([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Central de contatos, importação e exportação</p>
        </div>
      </div>

      {importError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{importError}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Contatos cadastrados</CardTitle>
            <CardDescription>
              {filtered.length > 0 ? `${filtered.length} contato(s) encontrado(s)` : "Nenhum contato cadastrado ainda."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "csv" | "vcf" | "txt")}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="csv">CSV</option>
                <option value="vcf">VCF/vCard</option>
                <option value="txt">TXT UTF-8</option>
              </select>
              <Button size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo contato
            </Button>
          </div>
        </CardHeader>
        <CardContent onDragOver={handleDragOver} onDrop={handleDrop}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contato cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {cliente.telefone}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{cliente.observacoes || "—"}</TableCell>
                      <TableCell className="flex justify-end gap-2">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCliente ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription>{selectedCliente ? "Atualize os dados do contato." : "Cadastre um novo contato."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observação</Label>
              <Input id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : selectedCliente ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contato</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.</DialogDescription>
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

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar contatos</DialogTitle>
            <DialogDescription>Selecione o formato e o arquivo para importar.</DialogDescription>
          </DialogHeader>
            <Tabs value={importFormat} defaultValue="csv" onValueChange={(v) => setImportFormat(v as "csv" | "vcf" | "txt")} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="vcf">VCF/vCard</TabsTrigger>
              <TabsTrigger value="txt">TXT UTF-8</TabsTrigger>
            </TabsList>
            <TabsContent value={importFormat} className="space-y-4">
              <div className="space-y-2">
                <Label>Formato selecionado: {importFormat.toUpperCase()}</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={importFormat === "csv" ? ".csv" : importFormat === "vcf" ? ".vcf" : ".txt"}
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">Você também pode arrastar e soltar o arquivo nesta área.</p>
              </div>

              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Prévia da importação</Label>
                  <div className="max-h-60 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.nome || "—"}</TableCell>
                            <TableCell>{item.telefone || "—"}</TableCell>
                            <TableCell>{item.email || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === "Novo" ? "success" : item.status === "Já cadastrado" ? "secondary" : "outline"}>
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setImportMode("new")}>
                      Importar somente novos
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImportMode("update")}>
                      Atualizar existentes
                    </Button>
                    <Button type="button" onClick={() => setImportMode("all")}>
                      Importar todos
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleImport} disabled={isImporting || importPreview.length === 0}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

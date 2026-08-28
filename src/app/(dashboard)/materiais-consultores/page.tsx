"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useMateriaisConsultores } from "@/hooks/use-materiais-consultores";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Download,
  ExternalLink,
  Eye,
  X,
  EyeOff,
} from "lucide-react";
import type { MaterialConsultor, MaterialConsultorInsert } from "@/repositories/client/materiais-consultores.repository";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

const emptyForm: MaterialConsultorInsert = {
  titulo: "",
  descricao: "",
  categoria: "",
  arquivo_url: "",
  arquivo_nome: "",
  arquivo_tamanho: 0,
  arquivo_mime_type: "",
  tipo: "Documento",
  status: "Ativo",
  permite_download: true,
  usuario_id: "",
};

type MaterialFormData = typeof emptyForm;

export default function MateriaisConsultoresPage() {
  const { success, error } = useToast();
  const { materiais, isLoading, isSaving, errorMessage, formData, setFormData, selectedMaterial, setSelectedMaterial, isFormOpen, setIsFormOpen, isDeleteOpen, setIsDeleteOpen, searchQuery, setSearchQuery, filterCategoria, setFilterCategoria, categorias, openCreate, openEdit, openDelete, handleSubmit, handleDelete, toggleVisibilidade, refresh } = useMateriaisConsultores();
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterTipo, setFilterTipo] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialConsultor | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (!cancelled) {
          setIsAdmin(isAdminOrGestor(user));
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    };
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const tipos = ["PDF", "Imagem", "Vídeo", "Áudio", "Documento", "Texto"];

  const filteredMateriais = useMemo(() => {
    return materiais.filter((m) => {
      const matchesSearch = m.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.descricao.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategoria = filterCategoria === "" || m.categoria === filterCategoria;
      const matchesTipo = filterTipo === "" || m.tipo === filterTipo;
      return matchesSearch && matchesCategoria && matchesTipo;
    });
  }, [materiais, searchQuery, filterCategoria, filterTipo]);

  const handleChange = (field: keyof MaterialFormData, value: string | number | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleToggleVisibility = async (material: MaterialConsultor) => {
    await toggleVisibilidade(material);
    await refresh();
  };

  const openView = (material: MaterialConsultor) => {
    setViewingMaterial(material);
    setIsViewOpen(true);
  };

  const handleDownload = async (material: MaterialConsultor) => {
    if (!material.permite_download || !material.arquivo_url) return;
    try {
      const response = await fetch(material.arquivo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = material.arquivo_nome || `material-${material.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success("Download iniciado com sucesso.");
    } catch {
      error("Não foi possível fazer o download do arquivo.");
    }
  };

  const handleOpenFile = (material: MaterialConsultor) => {
    if (!material.arquivo_url) return;
    window.open(material.arquivo_url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Materiais para Consultores</h2>
          <p className="text-sm text-muted-foreground">Gerencie materiais de apoio para consultores</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Material
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
          <CardTitle>Materiais cadastrados</CardTitle>
          <CardDescription>
            {filteredMateriais.length > 0 ? `${filteredMateriais.length} material(is) encontrado(s)` : "Nenhum material cadastrado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título ou descrição..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterCategoria}
                onChange={(event) => setFilterCategoria(event.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas categorias</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              <select
                value={filterTipo}
                onChange={(event) => setFilterTipo(event.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos tipos</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMateriais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriais.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.titulo}</TableCell>
                      <TableCell>{material.categoria || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={material.status === "Ativo" ? "success" : "secondary"}>
                          {material.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={material.permite_download ? "success" : "secondary"}>
                          {material.permite_download ? "Permitido" : "Bloqueado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openView(material)} aria-label="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenFile(material)} aria-label="Abrir">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(material)} disabled={!material.permite_download} aria-label="Baixar">
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(material)} aria-label={material.visivel ? "Ocultar" : "Mostrar"}>
                            {material.visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(material)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(material)} aria-label="Excluir">
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
            <DialogTitle>{selectedMaterial ? "Editar material" : "Novo material"}</DialogTitle>
            <DialogDescription>{selectedMaterial ? "Atualize as informações do material." : "Cadastre um novo material para consultores."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={formData.titulo} onChange={(e) => handleChange("titulo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => handleChange("descricao", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={formData.categoria} onChange={(e) => handleChange("categoria", e.target.value)} placeholder="Ex: Treinamento, Proposta, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                  {tipos.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arquivo_url">URL do Arquivo</Label>
              <Input id="arquivo_url" value={formData.arquivo_url} onChange={(e) => handleChange("arquivo_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="arquivo_nome">Nome do Arquivo</Label>
                <Input id="arquivo_nome" value={formData.arquivo_nome} onChange={(e) => handleChange("arquivo_nome", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arquivo_mime_type">MIME Type</Label>
                <Input id="arquivo_mime_type" value={formData.arquivo_mime_type} onChange={(e) => handleChange("arquivo_mime_type", e.target.value)} placeholder="application/pdf" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permite_download">Permite Download</Label>
                <select id="permite_download" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.permite_download ? "true" : "false"} onChange={(e) => handleChange("permite_download", e.target.value === "true")}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelectedMaterial(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedMaterial ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir material</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o material <strong>{selectedMaterial?.titulo}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={(open) => { if (!open) { setIsViewOpen(false); setViewingMaterial(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {!viewingMaterial ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{viewingMaterial.titulo}</DialogTitle>
                <DialogDescription>{viewingMaterial.descricao}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Categoria</p>
                  <p className="text-sm">{viewingMaterial.categoria || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{viewingMaterial.tipo}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <Badge variant={viewingMaterial.status === "Ativo" ? "success" : "secondary"}>{viewingMaterial.status}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Permite Download</p>
                  <Badge variant={viewingMaterial.permite_download ? "success" : "secondary"}>
                    {viewingMaterial.permite_download ? "Sim" : "Não"}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Arquivo</p>
                  <p className="text-sm break-all">{viewingMaterial.arquivo_nome || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">URL</p>
                  <p className="text-sm break-all text-blue-600 underline">{viewingMaterial.arquivo_url || "—"}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
                <Button variant="secondary" onClick={() => handleOpenFile(viewingMaterial)} disabled={!viewingMaterial.arquivo_url}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir Arquivo
                </Button>
                <Button onClick={() => handleDownload(viewingMaterial)} disabled={!viewingMaterial.permite_download || !viewingMaterial.arquivo_url}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useTreinamentos } from "@/hooks/use-treinamentos";
import { useLinksUteis } from "@/hooks/use-links-uteis";
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
} from "lucide-react";
import type { MaterialConsultor, MaterialConsultorInsert } from "@/repositories/client/materiais-consultores.repository";
import type { Treinamento, TreinamentoInsert } from "@/repositories/client/treinamentos.repository";
import type { LinkUtil, LinkUtilInsert } from "@/repositories/client/links-uteis.repository";

const emptyMaterial: MaterialConsultorInsert = {
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

const emptyTreinamento: TreinamentoInsert = {
  nome: "",
  descricao: "",
  categoria: "",
  link: "",
  status: "Ativo",
  usuario_id: "",
};

const emptyLink: LinkUtilInsert = {
  nome: "",
  descricao: "",
  categoria: "",
  url: "",
  status: "Ativo",
  usuario_id: "",
};

type MaterialFormData = typeof emptyMaterial;
type TreinamentoFormData = typeof emptyTreinamento;
type LinkFormData = typeof emptyLink;

type TabValue = "materiais" | "treinamentos" | "links";

export default function BibliotecaPage() {
  const { success: successMaterial, error: errorMaterial } = useToast();
  const { success: successTreinamento, error: errorTreinamento } = useToast();
  const { error: errorLink } = useToast();

  const {
    materiais,
    isLoading: isLoadingMateriais,
    isSaving: isSavingMaterial,
    errorMessage: errorMessageMaterial,
    formData: formMaterial,
    setFormData: setFormMaterial,
    selectedMaterial,
    setSelectedMaterial,
    isFormOpen: isFormMaterialOpen,
    setIsFormOpen: setIsFormMaterialOpen,
    isDeleteOpen: isDeleteMaterialOpen,
    setIsDeleteOpen: setIsDeleteMaterialOpen,
    searchQuery: searchMaterial,
    setSearchQuery: setSearchMaterial,
    filterCategoria: filterCategoriaMaterial,
    setFilterCategoria: setFilterCategoriaMaterial,
    categorias: categoriasMaterial,
    openCreate: openCreateMaterial,
    openEdit: openEditMaterial,
    openDelete: openDeleteMaterial,
    handleSubmit: handleSubmitMaterial,
    handleDelete: handleDeleteMaterial,
  } = useMateriaisConsultores();

  const {
    treinamentos,
    isLoading: isLoadingTreinamentos,
    isSaving: isSavingTreinamento,
    errorMessage: errorMessageTreinamento,
    formData: formTreinamento,
    setFormData: setFormTreinamento,
    selectedTreinamento,
    setSelectedTreinamento,
    isFormOpen: isFormTreinamentoOpen,
    setIsFormOpen: setIsFormTreinamentoOpen,
    isDeleteOpen: isDeleteTreinamentoOpen,
    setIsDeleteOpen: setIsDeleteTreinamentoOpen,
    searchQuery: searchTreinamento,
    setSearchQuery: setSearchTreinamento,
    filterCategoria: filterCategoriaTreinamento,
    setFilterCategoria: setFilterCategoriaTreinamento,
    categorias: categoriasTreinamento,
    openCreate: openCreateTreinamento,
    openEdit: openEditTreinamento,
    openDelete: openDeleteTreinamento,
    handleSubmit: handleSubmitTreinamento,
    handleDelete: handleDeleteTreinamento,
  } = useTreinamentos();

  const {
    links,
    isLoading: isLoadingLinks,
    isSaving: isSavingLink,
    errorMessage: errorMessageLink,
    formData: formLink,
    setFormData: setFormLink,
    selectedLink,
    setSelectedLink,
    isFormOpen: isFormLinkOpen,
    setIsFormOpen: setIsFormLinkOpen,
    isDeleteOpen: isDeleteLinkOpen,
    setIsDeleteOpen: setIsDeleteLinkOpen,
    searchQuery: searchLink,
    setSearchQuery: setSearchLink,
    filterCategoria: filterCategoriaLink,
    setFilterCategoria: setFilterCategoriaLink,
    categorias: categoriasLink,
    openCreate: openCreateLink,
    openEdit: openEditLink,
    openDelete: openDeleteLink,
    handleSubmit: handleSubmitLink,
    handleDelete: handleDeleteLink,
  } = useLinksUteis();

  const [activeTab, setActiveTab] = useState<TabValue>("materiais");

  const [isViewMaterialOpen, setIsViewMaterialOpen] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<MaterialConsultor | null>(null);

  const tipos = ["PDF", "Imagem", "Vídeo", "Áudio", "Documento", "Texto"];

  const filteredMateriais = materiais.filter((m) => {
    const matchesSearch = m.titulo.toLowerCase().includes(searchMaterial.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchMaterial.toLowerCase());
    const matchesCategoria = filterCategoriaMaterial === "" || m.categoria === filterCategoriaMaterial;
    return matchesSearch && matchesCategoria;
  });

  const filteredTreinamentos = treinamentos.filter((t) => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTreinamento.toLowerCase()) ||
      t.descricao.toLowerCase().includes(searchTreinamento.toLowerCase());
    const matchesCategoria = filterCategoriaTreinamento === "" || t.categoria === filterCategoriaTreinamento;
    return matchesSearch && matchesCategoria;
  });

  const filteredLinks = links.filter((l) => {
    const matchesSearch = l.nome.toLowerCase().includes(searchLink.toLowerCase()) ||
      l.descricao.toLowerCase().includes(searchLink.toLowerCase());
    const matchesCategoria = filterCategoriaLink === "" || l.categoria === filterCategoriaLink;
    return matchesSearch && matchesCategoria;
  });

  const handleChangeMaterial = (field: keyof MaterialFormData, value: string | number | boolean) => {
    setFormMaterial((current) => ({ ...current, [field]: value }));
  };

  const handleChangeTreinamento = (field: keyof TreinamentoFormData, value: string) => {
    setFormTreinamento((current) => ({ ...current, [field]: value }));
  };

  const handleChangeLink = (field: keyof LinkFormData, value: string) => {
    setFormLink((current) => ({ ...current, [field]: value }));
  };

  const handleOpenFile = (material: MaterialConsultor) => {
    if (!material.arquivo_url) return;
    window.open(material.arquivo_url, "_blank");
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
      successMaterial("Download iniciado com sucesso.");
    } catch {
      errorMaterial("Não foi possível fazer o download do arquivo.");
    }
  };

  const handleAccessTreinamento = (treinamento: Treinamento) => {
    if (!treinamento.link) {
      errorTreinamento("Este treinamento não possui um link válido.");
      return;
    }
    window.open(treinamento.link, "_blank");
    successTreinamento("Abrindo treinamento em uma nova aba.");
  };

  const handleAccessLink = (link: LinkUtil) => {
    if (!link.url) {
      errorLink("Este link não possui uma URL válida.");
      return;
    }
    window.open(link.url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Biblioteca</h2>
          <p className="text-sm text-muted-foreground">Materiais, templates, treinamentos e documentos de apoio</p>
        </div>
      </div>

      {(errorMessageMaterial || errorMessageTreinamento || errorMessageLink) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessageMaterial || errorMessageTreinamento || errorMessageLink}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} defaultValue="materiais" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
          <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
          <TabsTrigger value="links">Links úteis</TabsTrigger>
        </TabsList>

        <TabsContent value="materiais" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Materiais cadastrados</CardTitle>
                  <CardDescription>
                    {filteredMateriais.length > 0 ? `${filteredMateriais.length} material(is) encontrado(s)` : "Nenhum material cadastrado ainda."}
                  </CardDescription>
                </div>
                <Button onClick={openCreateMaterial}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Material
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por título ou descrição..."
                    value={searchMaterial}
                    onChange={(event) => setSearchMaterial(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterCategoriaMaterial}
                  onChange={(event) => setFilterCategoriaMaterial(event.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todas categorias</option>
                  {categoriasMaterial.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>

              {isLoadingMateriais ? (
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
                            <Button variant="ghost" size="icon" onClick={() => { setViewingMaterial(material); setIsViewMaterialOpen(true); }} aria-label="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenFile(material)} aria-label="Abrir">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(material)} disabled={!material.permite_download} aria-label="Baixar">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditMaterial(material)} aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteMaterial(material)} aria-label="Excluir">
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
        </TabsContent>

        <TabsContent value="treinamentos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Treinamentos cadastrados</CardTitle>
                  <CardDescription>
                    {filteredTreinamentos.length > 0 ? `${filteredTreinamentos.length} treinamento(s) encontrado(s)` : "Nenhum treinamento cadastrado ainda."}
                  </CardDescription>
                </div>
                <Button onClick={openCreateTreinamento}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Treinamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou descrição..."
                    value={searchTreinamento}
                    onChange={(event) => setSearchTreinamento(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterCategoriaTreinamento}
                  onChange={(event) => setFilterCategoriaTreinamento(event.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todas categorias</option>
                  {categoriasTreinamento.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>

              {isLoadingTreinamentos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTreinamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[180px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTreinamentos.map((treinamento) => (
                        <TableRow key={treinamento.id}>
                          <TableCell className="font-medium">{treinamento.nome}</TableCell>
                          <TableCell>{treinamento.categoria || "—"}</TableCell>
                          <TableCell>
                            {treinamento.link ? (
                              <a href={treinamento.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                Abrir link
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={treinamento.status === "Ativo" ? "success" : "secondary"}>
                              {treinamento.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleAccessTreinamento(treinamento)} aria-label="Acessar treinamento">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditTreinamento(treinamento)} aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteTreinamento(treinamento)} aria-label="Excluir">
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
        </TabsContent>

        <TabsContent value="links" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Links cadastrados</CardTitle>
                  <CardDescription>
                    {filteredLinks.length > 0 ? `${filteredLinks.length} link(s) encontrado(s)` : "Nenhum link cadastrado ainda."}
                  </CardDescription>
                </div>
                <Button onClick={openCreateLink}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Link
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou descrição..."
                    value={searchLink}
                    onChange={(event) => setSearchLink(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterCategoriaLink}
                  onChange={(event) => setFilterCategoriaLink(event.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todas categorias</option>
                  {categoriasLink.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>

              {isLoadingLinks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum link cadastrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[180px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">{link.nome}</TableCell>
                          <TableCell>{link.categoria || "—"}</TableCell>
                          <TableCell>
                            {link.url ? (
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                Abrir link
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={link.status === "Ativo" ? "success" : "secondary"}>
                              {link.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleAccessLink(link)} aria-label="Acessar link">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditLink(link)} aria-label="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteLink(link)} aria-label="Excluir">
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
        </TabsContent>
      </Tabs>

      <Dialog open={isFormMaterialOpen} onOpenChange={setIsFormMaterialOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMaterial ? "Editar material" : "Novo material"}</DialogTitle>
            <DialogDescription>{selectedMaterial ? "Atualize as informações do material." : "Cadastre um novo material para consultores."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitMaterial}>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={formMaterial.titulo} onChange={(e) => handleChangeMaterial("titulo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formMaterial.descricao} onChange={(e) => handleChangeMaterial("descricao", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={formMaterial.categoria} onChange={(e) => handleChangeMaterial("categoria", e.target.value)} placeholder="Ex: Treinamento, Proposta, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formMaterial.tipo} onChange={(e) => handleChangeMaterial("tipo", e.target.value)}>
                  {tipos.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arquivo_url">URL do Arquivo</Label>
              <Input id="arquivo_url" value={formMaterial.arquivo_url} onChange={(e) => handleChangeMaterial("arquivo_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="arquivo_nome">Nome do Arquivo</Label>
                <Input id="arquivo_nome" value={formMaterial.arquivo_nome} onChange={(e) => handleChangeMaterial("arquivo_nome", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arquivo_mime_type">MIME Type</Label>
                <Input id="arquivo_mime_type" value={formMaterial.arquivo_mime_type} onChange={(e) => handleChangeMaterial("arquivo_mime_type", e.target.value)} placeholder="application/pdf" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formMaterial.status} onChange={(e) => handleChangeMaterial("status", e.target.value)}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permite_download">Permite Download</Label>
                <select id="permite_download" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formMaterial.permite_download ? "true" : "false"} onChange={(e) => handleChangeMaterial("permite_download", e.target.value === "true")}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormMaterialOpen(false); setFormMaterial(emptyMaterial); setSelectedMaterial(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingMaterial}>
                {isSavingMaterial ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedMaterial ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteMaterialOpen} onOpenChange={setIsDeleteMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir material</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o material <strong>{selectedMaterial?.titulo}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteMaterialOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteMaterial}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewMaterialOpen} onOpenChange={(open) => { if (!open) { setIsViewMaterialOpen(false); setViewingMaterial(null); } }}>
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
                <Button variant="outline" onClick={() => setIsViewMaterialOpen(false)}>
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

      <Dialog open={isFormTreinamentoOpen} onOpenChange={setIsFormTreinamentoOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTreinamento ? "Editar treinamento" : "Novo treinamento"}</DialogTitle>
            <DialogDescription>{selectedTreinamento ? "Atualize as informações do treinamento." : "Cadastre um novo treinamento para consultores."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitTreinamento}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formTreinamento.nome} onChange={(e) => handleChangeTreinamento("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formTreinamento.descricao} onChange={(e) => handleChangeTreinamento("descricao", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={formTreinamento.categoria} onChange={(e) => handleChangeTreinamento("categoria", e.target.value)} placeholder="Ex: Vendas, Técnico, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formTreinamento.status} onChange={(e) => handleChangeTreinamento("status", e.target.value)}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link do Treinamento</Label>
              <Input id="link" value={formTreinamento.link} onChange={(e) => handleChangeTreinamento("link", e.target.value)} placeholder="Cole o link aqui (ex: YouTube, Vimeo, Google Drive, etc.)" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormTreinamentoOpen(false); setFormTreinamento(emptyTreinamento); setSelectedTreinamento(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingTreinamento}>
                {isSavingTreinamento ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedTreinamento ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteTreinamentoOpen} onOpenChange={setIsDeleteTreinamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir treinamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o treinamento <strong>{selectedTreinamento?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteTreinamentoOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTreinamento}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormLinkOpen} onOpenChange={setIsFormLinkOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLink ? "Editar link" : "Novo link"}</DialogTitle>
            <DialogDescription>{selectedLink ? "Atualize as informações do link." : "Cadastre um novo link útil para consultores."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitLink}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formLink.nome} onChange={(e) => handleChangeLink("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formLink.descricao} onChange={(e) => handleChangeLink("descricao", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={formLink.categoria} onChange={(e) => handleChangeLink("categoria", e.target.value)} placeholder="Ex: Portal, Suporte, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formLink.status} onChange={(e) => handleChangeLink("status", e.target.value)}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={formLink.url} onChange={(e) => handleChangeLink("url", e.target.value)} placeholder="https://..." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormLinkOpen(false); setFormLink(emptyLink); setSelectedLink(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingLink}>
                {isSavingLink ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selectedLink ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteLinkOpen} onOpenChange={setIsDeleteLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir link</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o link <strong>{selectedLink?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteLinkOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteLink}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

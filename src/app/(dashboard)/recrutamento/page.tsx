"use client";

import { useState, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecrutamento } from "@/hooks/use-recrutamento";
import { useToast } from "@/hooks/use-toast";
import type { RecrutamentoInsert } from "@/repositories/client/recrutamento.repository";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Linkedin,
  Send,
  Download,
  Upload,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  exportRecrutamentoCSV,
  exportRecrutamentoXLSX,
  exportRecrutamentoPDF,
  downloadFile,
  parseRecrutamentoCSV,
  parseRecrutamentoXLSX,
  type RecrutamentoCandidato,
} from "@/lib/recrutamento";

const emptyForm: RecrutamentoInsert = {
  nome: "",
  email: "",
  telefone: "",
  origem: "",
  status: "Novo",
  observacoes: "",
  usuario_id: "",
  tipo: "convite",
  genero: "",
  idade: null,
  cpf: "",
  rg: "",
  endereco: "",
  cidade: "",
  equipe: "",
  veio_por: "",
  indicacao: false,
  catho: false,
  instagram: false,
  linkedin: "",
  telegram: "",
  outros: "",
  trabalhou_vendas: false,
  trabalhou_comissionado: false,
  clt: false,
  conhecimento_office: false,
  entende_prospeccao: false,
  facilidade_equipe: false,
  disponibilidade_integral: false,
  disponibilidade_finais_semana: false,
  conhece_consorcios: false,
  conhece_ademicon: false,
  por_onde_conheceu: "",
};

export default function RecrutamentoPage() {
  const { success, error } = useToast();
  const {
    candidatos,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selected,
    setSelected,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    searchQuery,
    setSearchQuery,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh,
  } = useRecrutamento();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "xlsx">("csv");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<RecrutamentoCandidato[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleChange = (field: keyof RecrutamentoInsert, value: string | boolean | number | null) => {
    setFormData((current: RecrutamentoInsert) => ({ ...current, [field]: value }));
  };

  const filtered = candidatos.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.origem.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const selectedCandidatos = useMemo(() => {
    if (selectedIds.size === 0) return filtered;
    return filtered.filter((c) => selectedIds.has(c.id));
  }, [filtered, selectedIds]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = selectedCandidatos;
      const timestamp = new Date().toISOString().slice(0, 10);

      if (exportFormat === "csv") {
        const csv = exportRecrutamentoCSV(data);
        downloadFile(csv, `recrutamento_${timestamp}.csv`, "text/csv");
      } else if (exportFormat === "xlsx") {
        const content = await exportRecrutamentoXLSX(data);
        downloadFile(content, `recrutamento_${timestamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else if (exportFormat === "pdf") {
        const content = await exportRecrutamentoPDF(data);
        downloadFile(content, `recrutamento_${timestamp}.pdf`, "application/pdf");
      }

      success(`Exportado ${data.length} registro(s) em ${exportFormat.toUpperCase()}.`);
    } catch {
      error("Não foi possível exportar os cadastros.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    try {
      const text = await file.text();
      if (importFormat === "csv") {
        const parsed = parseRecrutamentoCSV(text);
        setImportPreview(parsed);
      } else {
        const buffer = await file.arrayBuffer();
        const parsed = await parseRecrutamentoXLSX(buffer);
        setImportPreview(parsed);
      }
    } catch {
      setImportPreview([]);
      error("Não foi possível ler o arquivo.");
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      const { createRecrutamento } = await import("@/repositories/client/recrutamento.repository");
      let imported = 0;
      for (const item of importPreview) {
        const payload: RecrutamentoInsert = {
          nome: item.nome,
          email: item.email,
          telefone: item.telefone,
          origem: item.origem,
          status: item.status,
          observacoes: item.observacoes,
          tipo: item.tipo,
          genero: item.genero,
          idade: item.idade,
          cpf: item.cpf,
          rg: item.rg,
          endereco: item.endereco,
          cidade: item.cidade,
          equipe: item.equipe,
          veio_por: item.veio_por,
          indicacao: item.indicacao,
          catho: item.catho,
          instagram: item.instagram,
          outros: item.outros,
          trabalhou_vendas: item.trabalhou_vendas,
          trabalhou_comissionado: item.trabalhou_comissionado,
          clt: item.clt,
          conhecimento_office: item.conhecimento_office,
          entende_prospeccao: item.entende_prospeccao,
          facilidade_equipe: item.facilidade_equipe,
          disponibilidade_integral: item.disponibilidade_integral,
          disponibilidade_finais_semana: item.disponibilidade_finais_semana,
          conhece_consorcios: item.conhece_consorcios,
          conhece_ademicon: item.conhece_ademicon,
          por_onde_conheceu: item.por_onde_conheceu,
          linkedin: item.linkedin,
          telegram: item.telegram,
        };
        await createRecrutamento(payload);
        imported++;
      }

      await refresh();
      setIsImportOpen(false);
      setImportPreview([]);
      setImportFile(null);
      success(`${imported} candidato(s) importado(s) com sucesso.`);
    } catch {
      error("Não foi possível importar os cadastros.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recrutamento</h2>
          <p className="text-sm text-muted-foreground">Gestão de candidatos e equipe comercial</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between">
                {exportFormat === "csv" ? "CSV" : exportFormat === "xlsx" ? "XLSX" : "PDF"}
                <Download className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setExportFormat("csv"); handleExport(); }}>
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setExportFormat("xlsx"); handleExport(); }}>
                Exportar XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setExportFormat("pdf"); handleExport(); }}>
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Candidato
          </Button>
        </div>
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
          <CardTitle>Candidatos cadastrados</CardTitle>
          <CardDescription>
            {filtered.length > 0 ? `${filtered.length} candidato(s) encontrado(s)` : "Nenhum candidato cadastrado ainda."}
            {selectedIds.size > 0 ? ` • ${selectedIds.size} selecionado(s)` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, e-mail ou origem..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum candidato cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Button variant="ghost" size="icon" onClick={toggleSelectAll} aria-label="Selecionar todos">
                        {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((candidato) => (
                    <TableRow key={candidato.id}>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => toggleSelect(candidato.id)} aria-label="Selecionar">
                          {selectedIds.has(candidato.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{candidato.nome}</TableCell>
                      <TableCell>{candidato.tipo === "ficha_completa" ? "Ficha completa" : "Convite"}</TableCell>
                      <TableCell>{candidato.genero || "—"}</TableCell>
                      <TableCell>{candidato.equipe || "—"}</TableCell>
                      <TableCell>{candidato.trabalhou_vendas ? "Sim" : "Não"}</TableCell>
                      <TableCell>{candidato.origem || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={candidato.status === "Novo" ? "secondary" : "success"}>
                          {candidato.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.open(`https://wa.me/55${candidato.telefone.replace(/\D/g, "")}`, "_blank")} aria-label="WhatsApp">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.location.href = `sms:+55${candidato.telefone.replace(/\D/g, "")}`} aria-label="SMS">
                          <Phone className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.location.href = `mailto:${candidato.email}`} aria-label="E-mail">
                          <Mail className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => candidato.linkedin ? window.open(candidato.linkedin, "_blank") : undefined} aria-label="LinkedIn" disabled={!candidato.linkedin}>
                          <Linkedin className="h-4 w-4 text-blue-700" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => candidato.telegram ? window.open(`https://t.me/${candidato.telegram.replace(/^@/, "")}`, "_blank") : undefined} aria-label="Telegram" disabled={!candidato.telegram}>
                          <Send className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(candidato)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(candidato)} aria-label="Excluir">
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
            <DialogTitle>{selected ? "Editar candidato" : "Novo candidato"}</DialogTitle>
            <DialogDescription>{selected ? "Atualize as informações do candidato." : "Cadastre um novo candidato para o processo seletivo."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Tipo de cadastro</Label>
              <select
                value={formData.tipo || "convite"}
                onChange={(e) => handleChange("tipo", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="convite">Convite para apresentação</option>
                <option value="ficha_completa">Ficha cadastral completa</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>

            {formData.tipo === "ficha_completa" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="genero">Gênero</Label>
                    <Input id="genero" value={formData.genero} onChange={(e) => handleChange("genero", e.target.value)} placeholder="Ex: Masculino, Feminino" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idade">Idade</Label>
                    <Input id="idade" type="number" value={formData.idade ?? ""} onChange={(e) => handleChange("idade", e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={formData.cpf} onChange={(e) => handleChange("cpf", e.target.value)} placeholder="000.000.000-00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input id="rg" value={formData.rg} onChange={(e) => handleChange("rg", e.target.value)} placeholder="Número do RG" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={formData.endereco} onChange={(e) => handleChange("endereco", e.target.value)} placeholder="Rua, número, bairro, cidade" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formData.cidade} onChange={(e) => handleChange("cidade", e.target.value)} placeholder="Ex: São Paulo" />
                </div>

                <div className="space-y-2">
                  <Label>Veio por</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.indicacao} onChange={(e) => handleChange("indicacao", e.target.checked)} />
                      Indicação
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.catho} onChange={(e) => handleChange("catho", e.target.checked)} />
                      Catho
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.instagram} onChange={(e) => handleChange("instagram", e.target.checked)} />
                      Instagram
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.linkedin === "true"} onChange={(e) => handleChange("linkedin", e.target.checked ? "true" : "")} />
                      LinkedIn
                    </label>
                    {formData.linkedin === "true" && (
                      <Input value={formData.linkedin || ""} onChange={(e) => handleChange("linkedin", e.target.value)} placeholder="URL do LinkedIn" className="mt-2" />
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.telegram === "true"} onChange={(e) => handleChange("telegram", e.target.checked ? "true" : "")} />
                      Telegram
                    </label>
                  </div>
                  <Input value={formData.outros} onChange={(e) => handleChange("outros", e.target.value)} placeholder="Outros" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipe">Equipe</Label>
                  <Input id="equipe" value={formData.equipe} onChange={(e) => handleChange("equipe", e.target.value)} placeholder="Ex: Equipe de Vendas" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Já trabalhou com vendas?</Label>
                    <select value={formData.trabalhou_vendas ? "sim" : "nao"} onChange={(e) => handleChange("trabalhou_vendas", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Já trabalhou comissionado?</Label>
                    <select value={formData.trabalhou_comissionado ? "sim" : formData.clt ? "clt" : "nao"} onChange={(e) => { handleChange("trabalhou_comissionado", e.target.value === "sim"); handleChange("clt", e.target.value === "clt"); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                      <option value="clt">CLT</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Conhece o produto consórcios?</Label>
                    <select value={formData.conhece_consorcios ? "sim" : "nao"} onChange={(e) => handleChange("conhece_consorcios", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conhece a Ademicon?</Label>
                    <select value={formData.conhece_ademicon ? "sim" : "nao"} onChange={(e) => handleChange("conhece_ademicon", e.target.value === "sim")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="por_onde_conheceu">Por onde conheceu a empresa?</Label>
                  <Input id="por_onde_conheceu" value={formData.por_onde_conheceu} onChange={(e) => handleChange("por_onde_conheceu", e.target.value)} placeholder="Ex: Internet, indicação, evento" />
                </div>
              </>
            )}

            {formData.tipo === "convite" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setFormData(emptyForm); setSelected(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : selected ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir candidato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o candidato <strong>{selected?.nome}</strong>? Esta ação não pode ser desfeita.
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

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar candidatos</DialogTitle>
            <DialogDescription>Selecione um arquivo CSV ou XLSX para importar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <select value={importFormat} onChange={(e) => { setImportFormat(e.target.value as "csv" | "xlsx"); setImportPreview([]); setImportFile(null); }} className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-file">Arquivo</Label>
              <Input id="import-file" type="file" accept={importFormat === "csv" ? ".csv" : ".xlsx"} onChange={handleFileChange} />
            </div>
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Pré-visualização ({importPreview.length} registro(s))</Label>
                <div className="max-h-[260px] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.telefone}</TableCell>
                          <TableCell>{item.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportPreview([]); setImportFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importPreview.length === 0 || isImporting}>
              {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</> : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

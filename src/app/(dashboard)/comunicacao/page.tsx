"use client";

import { useEffect, useState, useMemo } from "react";
import { useComunicacao } from "@/hooks/use-comunicacao";
import { useLeads } from "@/hooks/use-leads";
import { useClientes } from "@/hooks/use-clientes";
import { useCentralIndicadores } from "@/hooks/use-central-indicadores";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageCircle,
  Phone,
  ClipboardList,
  History,
  Send,
} from "lucide-react";
import type {
  Comunicacao,
  ComunicacaoInsert,
  ComunicacaoTemplate,
  ComunicacaoTemplateInsert,
} from "@/repositories/client/comunicacao.repository";

const emptyComunicacaoForm: ComunicacaoInsert = {
  tipo: "WhatsApp",
  contato: "",
  observacao: "",
  resultado: "",
  data: new Date().toISOString().slice(0, 10),
  horario: new Date().toISOString().slice(11, 16),
  lead_id: null,
  cliente_id: null,
  indicador_id: null,
  usuario_id: "",
};

const emptyTemplateForm: ComunicacaoTemplateInsert = {
  titulo: "",
  conteudo: "",
  tipo: "WhatsApp",
  usuario_id: "",
};

type ComunicacaoFormData = ComunicacaoInsert;
type TemplateFormData = ComunicacaoTemplateInsert;

export default function ComunicacaoPage() {
  const { success, error } = useToast();
  const comunicacao = useComunicacao();
  const { list: listLeads } = useLeads();
  const { list: listClientes } = useClientes();
  const { indicators: indicadores } = useCentralIndicadores();

  const [activeTab, setActiveTab] = useState<"comunicacoes" | "templates">("comunicacoes");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([]);
  const [templates, setTemplates] = useState<ComunicacaoTemplate[]>([]);

  const [leads, setLeads] = useState<{ id: string; nome: string; telefone?: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; telefone?: string }[]>([]);
  const [indicadoresList, setIndicadoresList] = useState<{ id: string; nome: string; telefone?: string }[]>([]);

  const [isComunicacaoFormOpen, setIsComunicacaoFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedComunicacao, setSelectedComunicacao] = useState<Comunicacao | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ComunicacaoTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  const [comunicacaoForm, setComunicacaoForm] = useState<ComunicacaoFormData>(emptyComunicacaoForm);
  const [templateForm, setTemplateForm] = useState<TemplateFormData>(emptyTemplateForm);

  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [comunicacoesData, templatesData, leadsData, clientesData] = await Promise.all([
        comunicacao.listComunicacoes(),
        comunicacao.listTemplates(),
        listLeads(),
        listClientes(),
      ]);
      setComunicacoes(comunicacoesData);
      setTemplates(templatesData);
      setLeads(leadsData.map((l: { id: string; nome: string; telefone?: string }) => ({ id: l.id, nome: l.nome, telefone: l.telefone })));
      setClientes(clientesData.map((c: { id: string; nome: string; telefone?: string }) => ({ id: c.id, nome: c.nome, telefone: c.telefone })));
      setIndicadoresList(indicadores.map((i) => ({ id: i.id, nome: i.nome, telefone: i.telefone })));
    } catch {
      setErrorMessage("Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredComunicacoes = useMemo(() => {
    let result = comunicacoes;
    if (filterTipo !== "todos") {
      result = result.filter((c) => c.tipo === filterTipo);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.contato.toLowerCase().includes(q) ||
          c.observacao.toLowerCase().includes(q) ||
          c.resultado.toLowerCase().includes(q)
      );
    }
    return result;
  }, [comunicacoes, searchQuery, filterTipo]);

  const handleOpenComunicacaoForm = (comunicacao?: Comunicacao) => {
    if (comunicacao) {
      setSelectedComunicacao(comunicacao);
      setComunicacaoForm({
        id: comunicacao.id,
        tipo: comunicacao.tipo,
        contato: comunicacao.contato,
        observacao: comunicacao.observacao,
        resultado: comunicacao.resultado,
        data: comunicacao.data,
        horario: comunicacao.horario,
        lead_id: comunicacao.lead_id,
        cliente_id: comunicacao.cliente_id,
        indicador_id: comunicacao.indicador_id,
        usuario_id: comunicacao.usuario_id,
        created_at: comunicacao.created_at,
        updated_at: comunicacao.updated_at,
      });
    } else {
      setSelectedComunicacao(null);
      setComunicacaoForm(emptyComunicacaoForm);
    }
    setIsComunicacaoFormOpen(true);
  };

  const handleOpenTemplateForm = (template?: ComunicacaoTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setTemplateForm({
        id: template.id,
        titulo: template.titulo,
        conteudo: template.conteudo,
        tipo: template.tipo,
        usuario_id: template.usuario_id,
        created_at: template.created_at,
        updated_at: template.updated_at,
      });
    } else {
      setSelectedTemplate(null);
      setTemplateForm(emptyTemplateForm);
    }
    setIsTemplateFormOpen(true);
  };

  const handleSubmitComunicacao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comunicacaoForm.contato?.trim()) return;

    setIsSaving(true);
    try {
      const payload: ComunicacaoInsert = {
        tipo: comunicacaoForm.tipo || "WhatsApp",
        contato: comunicacaoForm.contato.trim(),
        observacao: comunicacaoForm.observacao?.trim() || "",
        resultado: comunicacaoForm.resultado?.trim() || "",
        data: comunicacaoForm.data || new Date().toISOString().slice(0, 10),
        horario: comunicacaoForm.horario || new Date().toISOString().slice(11, 16),
        lead_id: comunicacaoForm.lead_id || null,
        cliente_id: comunicacaoForm.cliente_id || null,
        indicador_id: comunicacaoForm.indicador_id || null,
        usuario_id: comunicacaoForm.usuario_id || "",
      };

      if (selectedComunicacao) {
        const updated = await comunicacao.updateComunicacao(selectedComunicacao.id, payload);
        setComunicacoes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await comunicacao.createComunicacao(payload);
        setComunicacoes((prev) => [...prev, created]);
      }
      setIsComunicacaoFormOpen(false);
      setComunicacaoForm(emptyComunicacaoForm);
      setSelectedComunicacao(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!templateForm.titulo?.trim() || !templateForm.conteudo?.trim()) return;

    setIsSaving(true);
    try {
      const payload: ComunicacaoTemplateInsert = {
        titulo: templateForm.titulo.trim(),
        conteudo: templateForm.conteudo.trim(),
        tipo: templateForm.tipo || "WhatsApp",
        usuario_id: templateForm.usuario_id || "",
      };

      if (selectedTemplate) {
        const updated = await comunicacao.updateTemplate(selectedTemplate.id, payload);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await comunicacao.createTemplate(payload);
        setTemplates((prev) => [...prev, created]);
      }
      setIsTemplateFormOpen(false);
      setTemplateForm(emptyTemplateForm);
      setSelectedTemplate(null);
    } catch {
      // erro tratado no hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "comunicacao") {
        await comunicacao.removeComunicacao(deleteTarget.id);
        setComunicacoes((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else if (deleteTarget.type === "template") {
        await comunicacao.removeTemplate(deleteTarget.id);
        setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // erro tratado no hook
    }
  };

  const handleUseTemplate = (template: ComunicacaoTemplate) => {
    setComunicacaoForm((prev) => ({
      ...prev,
      tipo: template.tipo as ComunicacaoFormData["tipo"],
      observacao: template.conteudo,
    }));
    setActiveTab("comunicacoes");
    setIsComunicacaoFormOpen(true);
    success("Template carregado. Complete os dados da comunicação.");
  };

  const getTipoBadge = (tipo: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "outline"> = {
      WhatsApp: "success",
      Ligação: "default",
    };
    return map[tipo] || "secondary";
  };

  const getStatusBadge = (resultado: string) => {
    const map: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
      "Contato realizado": "success",
      "Não atendido": "destructive",
      "Caixa postal": "secondary",
      "Agendado": "default",
      "Concluído": "success",
      "Cancelado": "destructive",
    };
    return map[resultado] || "outline";
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const gerarLinkWhatsApp = (telefone: string, mensagem?: string) => {
    const numero = telefone.replace(/\D/g, "");
    const texto = mensagem ? encodeURIComponent(mensagem) : "";
    return `https://wa.me/55${numero}${texto ? `?text=${texto}` : ""}`;
  };

  const gerarLinkLigacao = (telefone: string) => {
    const numero = telefone.replace(/\D/g, "");
    return `tel:+55${numero}`;
  };

  const getContatoInfo = (comunicacao: Comunicacao) => {
    if (comunicacao.lead_id) {
      const lead = leads.find((l) => l.id === comunicacao.lead_id);
      return lead ? { nome: lead.nome, telefone: lead.telefone, tipo: "Lead" } : null;
    }
    if (comunicacao.cliente_id) {
      const cliente = clientes.find((c) => c.id === comunicacao.cliente_id);
      return cliente ? { nome: cliente.nome, telefone: cliente.telefone, tipo: "Cliente" } : null;
    }
    if (comunicacao.indicador_id) {
      const indicador = indicadoresList.find((i) => i.id === comunicacao.indicador_id);
      return indicador ? { nome: indicador.nome, telefone: indicador.telefone, tipo: "Indicador" } : null;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Comunicação</h1>
          <p className="text-sm text-muted-foreground">Histórico de comunicações, templates e ações rápidas</p>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "comunicacoes" ? "default" : "outline"}
            onClick={() => setActiveTab("comunicacoes")}
          >
            <History className="mr-2 h-4 w-4" />
            Comunicações
          </Button>
          <Button
            variant={activeTab === "templates" ? "default" : "outline"}
            onClick={() => setActiveTab("templates")}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Templates
          </Button>
        </div>
        <div className="flex gap-2">
          {activeTab === "comunicacoes" && (
            <Button onClick={() => handleOpenComunicacaoForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Comunicação
            </Button>
          )}
          {activeTab === "templates" && (
            <Button onClick={() => handleOpenTemplateForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "comunicacoes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Comunicações</CardTitle>
            <CardDescription>
              {filteredComunicacoes.length > 0
                ? `${filteredComunicacoes.length} comunicação(ões) encontrada(s)`
                : "Nenhuma comunicação registrada ainda."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Input
                  placeholder="Pesquisar por contato, observação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Ligação">Ligação</option>
              </select>
            </div>

            {filteredComunicacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma comunicação encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComunicacoes.map((comunicacao) => {
                      const contatoInfo = getContatoInfo(comunicacao);
                      return (
                        <TableRow key={comunicacao.id}>
                          <TableCell>{formatarData(comunicacao.data)}</TableCell>
                          <TableCell>
                            <Badge variant={getTipoBadge(comunicacao.tipo)}>
                              <div className="flex items-center gap-1">
                                {comunicacao.tipo === "WhatsApp" ? (
                                  <MessageCircle className="h-3 w-3" />
                                ) : (
                                  <Phone className="h-3 w-3" />
                                )}
                                {comunicacao.tipo}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{comunicacao.contato}</p>
                              {contatoInfo && (
                                <p className="text-xs text-muted-foreground">{contatoInfo.nome} ({contatoInfo.tipo})</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contatoInfo ? (
                              <span className="text-xs text-muted-foreground">{contatoInfo.tipo}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(comunicacao.resultado)}>
                              {comunicacao.resultado || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex justify-end gap-2">
                            {contatoInfo?.telefone && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(gerarLinkWhatsApp(contatoInfo.telefone!), "_blank")}
                                  aria-label="Abrir WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(gerarLinkLigacao(contatoInfo.telefone!), "_blank")}
                                  aria-label="Ligar"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedComunicacao(comunicacao);
                                setDeleteTarget({ type: "comunicacao", id: comunicacao.id });
                                setIsDeleteOpen(true);
                              }}
                              aria-label="Excluir"
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Templates de Mensagens</CardTitle>
            <CardDescription>
              {templates.length > 0
                ? `${templates.length} template(s) disponível(is)`
                : "Nenhum template cadastrado ainda."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum template cadastrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.titulo}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadge(template.tipo)}>{template.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 max-w-md">{template.conteudo}</p>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUseTemplate(template)}
                            aria-label="Usar template"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTemplateForm(template)}
                            aria-label="Editar template"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setDeleteTarget({ type: "template", id: template.id });
                              setIsDeleteOpen(true);
                            }}
                            aria-label="Excluir template"
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
      )}

      <Dialog open={isComunicacaoFormOpen} onOpenChange={setIsComunicacaoFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedComunicacao ? "Editar comunicação" : "Nova comunicação"}</DialogTitle>
            <DialogDescription>
              {selectedComunicacao
                ? "Atualize as informações da comunicação."
                : "Registre uma nova comunicação no histórico."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitComunicacao}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={comunicacaoForm.tipo}
                  onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, tipo: e.target.value as ComunicacaoFormData["tipo"] })}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Ligação">Ligação</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato">Contato</Label>
                <Input
                  id="contato"
                  value={comunicacaoForm.contato}
                  onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, contato: e.target.value })}
                  placeholder="Nome ou número"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={comunicacaoForm.data}
                  onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, data: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Horário</Label>
                <Input
                  id="horario"
                  type="time"
                  value={comunicacaoForm.horario}
                  onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, horario: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={comunicacaoForm.observacao}
                onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, observacao: e.target.value })}
                placeholder="Detalhes da comunicação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <select
                id="resultado"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={comunicacaoForm.resultado}
                onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, resultado: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="Contato realizado">Contato realizado</option>
                <option value="Não atendido">Não atendido</option>
                <option value="Caixa postal">Caixa postal</option>
                <option value="Agendado">Agendado</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Relacionar com</Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="lead_id" className="text-xs">Lead</Label>
                  <select
                    id="lead_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={comunicacaoForm.lead_id || ""}
                    onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, lead_id: e.target.value || null, cliente_id: null, indicador_id: null })}
                  >
                    <option value="">Selecione</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="cliente_id" className="text-xs">Cliente</Label>
                  <select
                    id="cliente_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={comunicacaoForm.cliente_id || ""}
                    onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, cliente_id: e.target.value || null, lead_id: null, indicador_id: null })}
                  >
                    <option value="">Selecione</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="indicador_id" className="text-xs">Indicador</Label>
                  <select
                    id="indicador_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={comunicacaoForm.indicador_id || ""}
                    onChange={(e) => setComunicacaoForm({ ...comunicacaoForm, indicador_id: e.target.value || null, lead_id: null, cliente_id: null })}
                  >
                    <option value="">Selecione</option>
                    {indicadoresList.map((indicador) => (
                      <option key={indicador.id} value={indicador.id}>
                        {indicador.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsComunicacaoFormOpen(false);
                  setComunicacaoForm(emptyComunicacaoForm);
                  setSelectedComunicacao(null);
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
                ) : selectedComunicacao ? (
                  "Salvar alterações"
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Editar template" : "Novo template"}</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Atualize as informações do template."
                : "Cadastre um novo template de mensagem."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitTemplate}>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={templateForm.titulo}
                onChange={(e) => setTemplateForm({ ...templateForm, titulo: e.target.value })}
                placeholder="Ex: Follow-up inicial"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={templateForm.tipo}
                onChange={(e) => setTemplateForm({ ...templateForm, tipo: e.target.value })}
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Ligação">Ligação</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo</Label>
              <Textarea
                id="conteudo"
                value={templateForm.conteudo}
                onChange={(e) => setTemplateForm({ ...templateForm, conteudo: e.target.value })}
                placeholder="Cole ou escreva a mensagem template..."
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTemplateFormOpen(false);
                  setTemplateForm(emptyTemplateForm);
                  setSelectedTemplate(null);
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
                ) : selectedTemplate ? (
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
            <DialogTitle>Excluir</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
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

"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Handshake, Percent, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParceiros } from "@/hooks/use-parceiros";
import type { Parceiro } from "@/types/crm";

const emptyForm = {
  nome: "",
  empresa: "",
  segmento: "Administradora",
  telefone: "",
  email: "",
  cidade: "",
  status: "Ativo",
  nivel_parceria: "Bronze",
  comissao_percentual: "0",
  ultimo_contato: "",
  observacoes: "",
};

const segmentoOptions = ["Administradora", "Imobiliaria", "Corretora", "Financeira", "Outro"];
const statusOptions = ["Ativo", "Em homologacao", "Inativo"];
const nivelOptions = ["Bronze", "Prata", "Ouro", "Platinum"];

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function ParceirosPage() {
  const { listParceiros, createParceiro, updateParceiro, deleteParceiro } = useParceiros();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParceiroId, setEditingParceiroId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterSegmento, setFilterSegmento] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loadParceiros = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listParceiros();
      setParceiros(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar os parceiros.";
      setErrorMessage(message);
      setParceiros([]);
    } finally {
      setIsLoading(false);
    }
  }, [listParceiros]);

  useEffect(() => {
    void loadParceiros();
  }, [loadParceiros]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSegmento, filterStatus, searchTerm]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim() || !formData.empresa.trim()) {
      setErrorMessage("Nome e empresa sao obrigatorios.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        nome: formData.nome.trim(),
        empresa: formData.empresa.trim(),
        segmento: formData.segmento,
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        cidade: formData.cidade.trim(),
        status: formData.status,
        nivel_parceria: formData.nivel_parceria,
        comissao_percentual: Number(formData.comissao_percentual || "0"),
        ultimo_contato: formData.ultimo_contato ? new Date(formData.ultimo_contato).toISOString() : null,
        observacoes: formData.observacoes.trim(),
      };

      if (editingParceiroId) {
        const updated = await updateParceiro(editingParceiroId, payload);
        setParceiros((current) => current.map((parceiro) => (parceiro.id === editingParceiroId ? updated : parceiro)));
      } else {
        const created = await createParceiro(payload);
        setParceiros((current) => [created, ...current]);
      }

      setFormData(emptyForm);
      setEditingParceiroId(null);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o parceiro.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingParceiroId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (parceiro: Parceiro) => {
    setFormData({
      nome: parceiro.nome,
      empresa: parceiro.empresa,
      segmento: parceiro.segmento,
      telefone: parceiro.telefone,
      email: parceiro.email,
      cidade: parceiro.cidade,
      status: parceiro.status,
      nivel_parceria: parceiro.nivel_parceria,
      comissao_percentual: String(parceiro.comissao_percentual ?? 0),
      ultimo_contato: toDatetimeLocal(parceiro.ultimo_contato),
      observacoes: parceiro.observacoes,
    });
    setEditingParceiroId(parceiro.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleDelete = async (parceiroId: string) => {
    setIsDeletingId(parceiroId);
    setErrorMessage(null);

    try {
      await deleteParceiro(parceiroId);
      setParceiros((current) => current.filter((parceiro) => parceiro.id !== parceiroId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o parceiro.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredParceiros = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return parceiros.filter((parceiro) => {
      const passSearch =
        !q ||
        [
          parceiro.nome,
          parceiro.empresa,
          parceiro.segmento,
          parceiro.cidade,
          parceiro.telefone,
          parceiro.email,
          parceiro.status,
          parceiro.nivel_parceria,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const passStatus = filterStatus === "Todos" || parceiro.status === filterStatus;
      const passSegmento = filterSegmento === "Todos" || parceiro.segmento === filterSegmento;
      return passSearch && passStatus && passSegmento;
    });
  }, [filterSegmento, filterStatus, parceiros, searchTerm]);

  const summary = useMemo(() => {
    const ativos = parceiros.filter((parceiro) => parceiro.status === "Ativo").length;
    const premium = parceiros.filter((parceiro) => ["Ouro", "Platinum"].includes(parceiro.nivel_parceria)).length;
    const mediaComissao =
      parceiros.length > 0
        ? parceiros.reduce((sum, parceiro) => sum + Number(parceiro.comissao_percentual || 0), 0) / parceiros.length
        : 0;

    return {
      total: parceiros.length,
      ativos,
      premium,
      mediaComissao,
    };
  }, [parceiros]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredParceiros.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedParceiros = filteredParceiros.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Parceiros</h1>
            <p className="text-sm text-muted-foreground">Sprint 2: gestão operacional da rede de parceiros</p>
          </div>
        </div>
        <Badge variant="success" className="w-fit">Operacional</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total parceiros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Handshake className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{summary.ativos}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{summary.premium}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissão média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.mediaComissao.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isFormOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingParceiroId ? "Editar parceiro" : "Novo parceiro"}</CardTitle>
            <CardDescription>
              {editingParceiroId ? "Atualize os dados do parceiro selecionado." : "Cadastre um novo parceiro para sua rede comercial."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do contato</Label>
                <Input id="nome" value={formData.nome} onChange={(event) => handleChange("nome", event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input id="empresa" value={formData.empresa} onChange={(event) => handleChange("empresa", event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="segmento">Segmento</Label>
                <select id="segmento" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.segmento} onChange={(event) => handleChange("segmento", event.target.value)}>
                  {segmentoOptions.map((segmento) => (
                    <option key={segmento} value={segmento}>{segmento}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(event) => handleChange("status", event.target.value)}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(event) => handleChange("telefone", event.target.value)} placeholder="(00) 00000-0000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={(event) => handleChange("email", event.target.value)} placeholder="contato@empresa.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} onChange={(event) => handleChange("cidade", event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel_parceria">Nível de parceria</Label>
                <select id="nivel_parceria" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.nivel_parceria} onChange={(event) => handleChange("nivel_parceria", event.target.value)}>
                  {nivelOptions.map((nivel) => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comissao_percentual">Comissão (%)</Label>
                <Input id="comissao_percentual" type="number" min={0} step="0.1" value={formData.comissao_percentual} onChange={(event) => handleChange("comissao_percentual", event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ultimo_contato">Último contato</Label>
                <Input id="ultimo_contato" type="datetime-local" value={formData.ultimo_contato} onChange={(event) => handleChange("ultimo_contato", event.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea id="observacoes" className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.observacoes} onChange={(event) => handleChange("observacoes", event.target.value)} placeholder="Acordos comerciais, metas, comissionamento, etc." />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : editingParceiroId ? "Atualizar" : "Salvar"}</Button>
                <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Parceiros cadastrados</CardTitle>
              <CardDescription>Rede de parceiros e administradoras integrada ao CRM.</CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>+ Novo Parceiro</Button>
          </div>
          <div className="pt-2">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Pesquisar por nome, empresa, segmento, cidade, status ou nível" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="Todos">Todos os status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterSegmento} onChange={(event) => setFilterSegmento(event.target.value)}>
                <option value="Todos">Todos os segmentos</option>
                {segmentoOptions.map((segmento) => (
                  <option key={segmento} value={segmento}>{segmento}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando parceiros...</p> : null}
          {!isLoading && !errorMessage && filteredParceiros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro encontrado para os filtros aplicados.</p>
          ) : null}

          {filteredParceiros.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Contato</th>
                      <th className="px-3 py-2 font-medium">Empresa</th>
                      <th className="px-3 py-2 font-medium">Segmento</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Nível</th>
                      <th className="px-3 py-2 font-medium">Comissão</th>
                      <th className="px-3 py-2 font-medium">Cidade</th>
                      <th className="px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedParceiros.map((parceiro) => (
                      <tr key={parceiro.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium">{parceiro.nome}</p>
                            <p className="text-xs text-muted-foreground">{parceiro.telefone || parceiro.email || "Sem contato"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2">{parceiro.empresa}</td>
                        <td className="px-3 py-2">{parceiro.segmento}</td>
                        <td className="px-3 py-2">{parceiro.status}</td>
                        <td className="px-3 py-2">{parceiro.nivel_parceria}</td>
                        <td className="px-3 py-2">{Number(parceiro.comissao_percentual || 0).toFixed(1)}%</td>
                        <td className="px-3 py-2">{parceiro.cidade || "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(parceiro)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingId === parceiro.id}
                              onClick={() => void handleDelete(parceiro.id)}
                            >
                              {isDeletingId === parceiro.id ? "Excluindo..." : "Excluir"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Exibindo {paginatedParceiros.length} de {filteredParceiros.length} parceiros</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {safeCurrentPage} de {totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

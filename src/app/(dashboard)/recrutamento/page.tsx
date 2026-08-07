"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgeCheck, UserCheck, UserSearch, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecrutamento } from "@/hooks/use-recrutamento";
import type { RecrutamentoCandidato } from "@/types/crm";

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  vaga_interesse: "Consultor de Consorcio",
  etapa: "Triagem",
  fonte: "Indicacao",
  score_aderencia: "0",
  disponibilidade_inicio: "",
  status: "Ativo",
  observacoes: "",
};

const etapaOptions = ["Triagem", "Entrevista RH", "Entrevista Gestor", "Proposta", "Contratado", "Reprovado"];
const statusOptions = ["Ativo", "Em espera", "Encerrado"];
const fonteOptions = ["Indicacao", "LinkedIn", "Site", "Banco interno", "Outro"];

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function RecrutamentoPage() {
  const { listRecrutamento, createRecrutamento, updateRecrutamento, deleteRecrutamento } = useRecrutamento();
  const [candidatos, setCandidatos] = useState<RecrutamentoCandidato[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCandidatoId, setEditingCandidatoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loadCandidatos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await listRecrutamento();
      setCandidatos(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar o recrutamento.";
      setErrorMessage(message);
      setCandidatos([]);
    } finally {
      setIsLoading(false);
    }
  }, [listRecrutamento]);

  useEffect(() => {
    void loadCandidatos();
  }, [loadCandidatos]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEtapa, filterStatus, searchTerm]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim()) {
      setErrorMessage("Nome do candidato e obrigatorio.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        cidade: formData.cidade.trim(),
        vaga_interesse: formData.vaga_interesse.trim(),
        etapa: formData.etapa,
        fonte: formData.fonte,
        score_aderencia: Number(formData.score_aderencia || "0"),
        disponibilidade_inicio: formData.disponibilidade_inicio
          ? new Date(formData.disponibilidade_inicio).toISOString()
          : null,
        status: formData.status,
        observacoes: formData.observacoes.trim(),
      };

      if (editingCandidatoId) {
        const updated = await updateRecrutamento(editingCandidatoId, payload);
        setCandidatos((current) =>
          current.map((candidato) => (candidato.id === editingCandidatoId ? updated : candidato)),
        );
      } else {
        const created = await createRecrutamento(payload);
        setCandidatos((current) => [created, ...current]);
      }

      setFormData(emptyForm);
      setEditingCandidatoId(null);
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o candidato.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingCandidatoId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (candidato: RecrutamentoCandidato) => {
    setFormData({
      nome: candidato.nome,
      telefone: candidato.telefone,
      email: candidato.email,
      cidade: candidato.cidade,
      vaga_interesse: candidato.vaga_interesse,
      etapa: candidato.etapa,
      fonte: candidato.fonte,
      score_aderencia: String(candidato.score_aderencia ?? 0),
      disponibilidade_inicio: toDatetimeLocal(candidato.disponibilidade_inicio),
      status: candidato.status,
      observacoes: candidato.observacoes,
    });
    setEditingCandidatoId(candidato.id);
    setIsFormOpen(true);
    setErrorMessage(null);
  };

  const handleDelete = async (candidatoId: string) => {
    setIsDeletingId(candidatoId);
    setErrorMessage(null);

    try {
      await deleteRecrutamento(candidatoId);
      setCandidatos((current) => current.filter((candidato) => candidato.id !== candidatoId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o candidato.";
      setErrorMessage(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredCandidatos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return candidatos.filter((candidato) => {
      const passSearch =
        !q ||
        [
          candidato.nome,
          candidato.telefone,
          candidato.email,
          candidato.cidade,
          candidato.vaga_interesse,
          candidato.etapa,
          candidato.fonte,
          candidato.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const passEtapa = filterEtapa === "Todos" || candidato.etapa === filterEtapa;
      const passStatus = filterStatus === "Todos" || candidato.status === filterStatus;
      return passSearch && passEtapa && passStatus;
    });
  }, [candidatos, filterEtapa, filterStatus, searchTerm]);

  const summary = useMemo(() => {
    const emProcesso = candidatos.filter(
      (candidato) => !["Contratado", "Reprovado"].includes(candidato.etapa) && candidato.status === "Ativo",
    ).length;
    const contratados = candidatos.filter((candidato) => candidato.etapa === "Contratado").length;
    const mediaScore =
      candidatos.length > 0
        ? candidatos.reduce((sum, candidato) => sum + Number(candidato.score_aderencia || 0), 0) / candidatos.length
        : 0;

    return {
      total: candidatos.length,
      emProcesso,
      contratados,
      mediaScore,
    };
  }, [candidatos]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCandidatos.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCandidatos = filteredCandidatos.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

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
            <UserSearch className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recrutamento</h1>
            <p className="text-sm text-muted-foreground">Sprint 2: operacao completa de selecao comercial</p>
          </div>
        </div>
        <Badge variant="success" className="w-fit">Operacional</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UserSearch className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{summary.emProcesso}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{summary.contratados}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score medio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.mediaScore.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isFormOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingCandidatoId ? "Editar candidato" : "Novo candidato"}</CardTitle>
            <CardDescription>
              {editingCandidatoId
                ? "Atualize os dados do candidato selecionado."
                : "Cadastre um novo candidato para o funil comercial."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={formData.nome} onChange={(event) => handleChange("nome", event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vaga_interesse">Vaga de interesse</Label>
                <Input id="vaga_interesse" value={formData.vaga_interesse} onChange={(event) => handleChange("vaga_interesse", event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(event) => handleChange("telefone", event.target.value)} placeholder="(00) 00000-0000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={(event) => handleChange("email", event.target.value)} placeholder="candidato@email.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={formData.cidade} onChange={(event) => handleChange("cidade", event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonte">Fonte</Label>
                <select id="fonte" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.fonte} onChange={(event) => handleChange("fonte", event.target.value)}>
                  {fonteOptions.map((fonte) => (
                    <option key={fonte} value={fonte}>{fonte}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etapa">Etapa</Label>
                <select id="etapa" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.etapa} onChange={(event) => handleChange("etapa", event.target.value)}>
                  {etapaOptions.map((etapa) => (
                    <option key={etapa} value={etapa}>{etapa}</option>
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
                <Label htmlFor="score_aderencia">Score de aderencia (%)</Label>
                <Input id="score_aderencia" type="number" min={0} max={100} step="0.1" value={formData.score_aderencia} onChange={(event) => handleChange("score_aderencia", event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disponibilidade_inicio">Disponivel a partir de</Label>
                <Input id="disponibilidade_inicio" type="datetime-local" value={formData.disponibilidade_inicio} onChange={(event) => handleChange("disponibilidade_inicio", event.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observacoes</Label>
                <textarea id="observacoes" className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.observacoes} onChange={(event) => handleChange("observacoes", event.target.value)} placeholder="Feedback das entrevistas, perfil comportamental e observacoes gerais." />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : editingCandidatoId ? "Atualizar" : "Salvar"}</Button>
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
              <CardTitle>Candidatos cadastrados</CardTitle>
              <CardDescription>Gestao completa do pipeline de recrutamento comercial.</CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>+ Novo Candidato</Button>
          </div>
          <div className="pt-2">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Pesquisar por nome, vaga, etapa, fonte, status, cidade ou contato" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterEtapa} onChange={(event) => setFilterEtapa(event.target.value)}>
                <option value="Todos">Todas as etapas</option>
                {etapaOptions.map((etapa) => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </select>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="Todos">Todos os status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-4 text-sm text-red-600">{errorMessage}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando candidatos...</p> : null}
          {!isLoading && !errorMessage && filteredCandidatos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum candidato encontrado para os filtros aplicados.</p>
          ) : null}

          {filteredCandidatos.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Vaga</th>
                      <th className="px-3 py-2 font-medium">Etapa</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">Cidade</th>
                      <th className="px-3 py-2 font-medium">Contato</th>
                      <th className="px-3 py-2 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidatos.map((candidato) => (
                      <tr key={candidato.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">{candidato.nome}</td>
                        <td className="px-3 py-2">{candidato.vaga_interesse}</td>
                        <td className="px-3 py-2">{candidato.etapa}</td>
                        <td className="px-3 py-2">{candidato.status}</td>
                        <td className="px-3 py-2">{Number(candidato.score_aderencia || 0).toFixed(1)}%</td>
                        <td className="px-3 py-2">{candidato.cidade || "-"}</td>
                        <td className="px-3 py-2">{candidato.telefone || candidato.email || "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(candidato)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingId === candidato.id}
                              onClick={() => void handleDelete(candidato.id)}
                            >
                              {isDeletingId === candidato.id ? "Excluindo..." : "Excluir"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Exibindo {paginatedCandidatos.length} de {filteredCandidatos.length} candidatos</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Pagina {safeCurrentPage} de {totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    Proxima
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

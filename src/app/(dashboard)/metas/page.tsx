"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Loader2, Plus, Edit, Trash2, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { getMetas, createMeta, updateMeta, deleteMeta, type Meta } from "@/repositories/client/metas.repository";

const PERFIS_COMBO = ["Consultor", "Assistente", "Equipe"] as const;
const PERFIL_LABEL: Record<string, string> = {
  Consultor: "Consultor",
  Assistente: "Assistente",
  Equipe: "Equipe",
};

export default function MetasPage() {
  const { success, error } = useToast();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo: "individual" as "individual" | "equipe",
    valor_alvo: "",
    valor_realizado: "",
    periodo_inicio: "",
    periodo_fim: "",
    perfil_aplicavel: "Consultor" as (typeof PERFIS_COMBO)[number],
    ativo: true,
  });

  useEffect(() => {
    loadMetas();
  }, []);

  async function loadMetas() {
    setIsLoading(true);
    try {
      const data = await getMetas();
      setMetas(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível carregar as metas.";
      error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const openCreate = () => {
    setEditingMeta(null);
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "individual",
      valor_alvo: "",
      valor_realizado: "",
      periodo_inicio: new Date().toISOString().split("T")[0],
      periodo_fim: "",
      perfil_aplicavel: "Consultor",
      ativo: true,
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEdit = (meta: Meta) => {
    setEditingMeta(meta);
    setFormData({
      titulo: meta.titulo || "",
      descricao: meta.descricao || "",
      tipo: (meta.tipo as "individual" | "equipe") || "individual",
      valor_alvo: String(meta.valor_alvo || 0),
      valor_realizado: String(meta.valor_realizado || 0),
      periodo_inicio: meta.periodo_inicio || "",
      periodo_fim: meta.periodo_fim || "",
      perfil_aplicavel: (meta.perfil_aplicavel as (typeof PERFIS_COMBO)[number]) || "Consultor",
      ativo: meta.ativo ?? true,
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (meta: Meta) => {
    const confirmar = window.confirm(`Tem certeza que deseja excluir a meta "${meta.titulo}"?`);
    if (!confirmar) return;
    try {
      await deleteMeta(meta.id);
      setMetas((prev) => prev.filter((m) => m.id !== meta.id));
      success("Meta excluída com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível excluir a meta.";
      error(msg);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await getAuthenticatedUser();
    } catch {
      setFormError("Você precisa estar autenticado.");
      return;
    }

    const valorAlvo = Number(formData.valor_alvo) || 0;
    if (valorAlvo <= 0) {
      setFormError("O valor alvo deve ser maior que zero.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingMeta) {
        const updated = await updateMeta(editingMeta.id, {
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo,
          valor_alvo: valorAlvo,
          valor_realizado: Number(formData.valor_realizado) || 0,
          periodo_inicio: formData.periodo_inicio,
          periodo_fim: formData.periodo_fim,
          perfil_aplicavel: formData.perfil_aplicavel,
          ativo: formData.ativo,
        });
        setMetas((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        success("Meta atualizada com sucesso.");
      } else {
        const created = await createMeta({
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo,
          valor_alvo: valorAlvo,
          valor_realizado: 0,
          periodo_inicio: formData.periodo_inicio,
          periodo_fim: formData.periodo_fim,
          usuario_id: null,
          perfil_aplicavel: formData.perfil_aplicavel,
          ativo: formData.ativo,
        });
        setMetas((prev) => [created, ...prev]);
        success("Meta criada com sucesso.");
      }
      setIsDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar a meta.";
      error(msg);
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
          <p className="text-sm text-muted-foreground">
            Defina e acompanhe metas de venda para a equipe e consultores.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : metas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em + Nova Meta para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {metas.map((meta) => {
            const alvo = Number(meta.valor_alvo) || 0;
            const realizado = Number(meta.valor_realizado) || 0;
            const porcentagem = alvo > 0 ? Math.min((realizado / alvo) * 100, 100) : 0;
            return (
              <Card key={meta.id} className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{meta.titulo || "Sem título"}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={meta.ativo ? "default" : "secondary"}>
                        {meta.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline">
                        {PERFIL_LABEL[meta.perfil_aplicavel] || meta.perfil_aplicavel}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{meta.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>Realizado: <strong>{formatCurrency(realizado)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>Meta: <strong>{formatCurrency(alvo)}</strong></span>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(porcentagem)}% concluído</span>
                    <span>Tipo: {meta.tipo || "individual"}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Início: {meta.periodo_inicio || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Fim: {meta.periodo_fim || "-"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(meta)}>
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(meta)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeta ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              {editingMeta ? "Atualize os dados da meta." : "Cadastre uma nova meta de vendas."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleChange("titulo", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor_alvo">Valor Alvo (R$)</Label>
                <Input
                  id="valor_alvo"
                  type="number"
                  step="0.01"
                  value={formData.valor_alvo}
                  onChange={(e) => handleChange("valor_alvo", e.target.value)}
                  placeholder="20000,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_realizado">Valor Realizado (R$)</Label>
                <Input
                  id="valor_realizado"
                  type="number"
                  step="0.01"
                  value={formData.valor_realizado}
                  onChange={(e) => handleChange("valor_realizado", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                >
                  <option value="individual">Individual</option>
                  <option value="equipe">Equipe</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil_aplicavel">Perfil Aplicável</Label>
                <select
                  id="perfil_aplicavel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.perfil_aplicavel}
                  onChange={(e) => handleChange("perfil_aplicavel", e.target.value)}
                >
                  {PERFIS_COMBO.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="periodo_inicio">Data Início</Label>
                <Input
                  id="periodo_inicio"
                  type="date"
                  value={formData.periodo_inicio}
                  onChange={(e) => handleChange("periodo_inicio", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo_fim">Data Fim</Label>
                <Input
                  id="periodo_fim"
                  type="date"
                  value={formData.periodo_fim}
                  onChange={(e) => handleChange("periodo_fim", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <select
                id="ativo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.ativo ? "true" : "false"}
                onChange={(e) => handleChange("ativo", e.target.value === "true")}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingMeta ? "Atualizar" : "Criar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

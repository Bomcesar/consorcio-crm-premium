"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIndicadores } from "@/hooks/use-indicadores";
import { useAuth } from "@/hooks/use-auth";
import type { Indicator } from "@/types/crm";

type IndicatorDetailActionsProps = {
  indicator: Indicator;
};

type IndicatorFormData = {
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  cpf: string;
  pix: string;
  origem: string;
  profissao: string;
  data_entrada: string;
  status: string;
  observacoes: string;
  ativo: boolean;
};

const statusOptions = ["Novo", "Em contato", "Ativo", "Inativo", "Parceiro Premium"];

function toFormData(indicator: Indicator): IndicatorFormData {
  return {
    nome: indicator.nome ?? "",
    telefone: indicator.telefone ?? "",
    whatsapp: indicator.whatsapp ?? "",
    email: indicator.email ?? "",
    cidade: indicator.cidade ?? "",
    estado: indicator.estado ?? "",
    cpf: indicator.cpf ?? "",
    pix: indicator.pix ?? "",
    origem: indicator.origem ?? "",
    profissao: indicator.profissao ?? "",
    data_entrada: indicator.data_entrada ?? new Date().toISOString().slice(0, 10),
    status: indicator.status ?? "Novo",
    observacoes: indicator.observacoes ?? "",
    ativo: indicator.ativo ?? true,
  };
}

export function IndicatorDetailActions({ indicator }: IndicatorDetailActionsProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { getAuthenticatedUser, saveIndicator, deleteIndicator } = useIndicadores();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<IndicatorFormData>(() => toFormData(indicator));

  const handleChange = (field: keyof IndicatorFormData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleOpenEdit = () => {
    setFormData(toFormData(indicator));
    setErrorMessage(null);
    setIsEditOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nome.trim() || !formData.telefone.trim()) {
      setErrorMessage("Nome e telefone sao obrigatorios.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let userId = authUser?.id;
      try {
        const user = await getAuthenticatedUser();
        userId = user?.id ?? userId;
      } catch {
        // Mantém fallback para contexto de autenticação já carregado.
      }

      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim(),
        cpf: formData.cpf.trim(),
        pix: formData.pix.trim(),
        origem: formData.origem.trim(),
        profissao: formData.profissao.trim(),
        data_entrada: formData.data_entrada,
        status: formData.status,
        observacoes: formData.observacoes.trim(),
        ativo: formData.ativo,
        usuario_id: userId ?? indicator.usuario_id,
      };

      await saveIndicator(payload, indicator.id);
      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o indicador.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Deseja realmente excluir este indicador?")) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteIndicator(indicator.id);
      router.push("/central-de-indicadores");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o indicador.";
      setErrorMessage(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/agenda?indicatorId=${indicator.id}&openForm=1`)}
        >
          Cadastrar compromisso
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/central-de-indicadores?openContacts=${indicator.id}`)}
        >
          Abrir contatos do indicador
        </Button>
        <Button type="button" variant="outline" onClick={handleOpenEdit}>
          Editar cadastro
        </Button>
        <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void handleDelete()}>
          {isDeleting ? "Excluindo..." : "Excluir cadastro"}
        </Button>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl border-border/50 bg-card shadow-2xl">
            <CardHeader>
              <CardTitle>Editar indicador</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(event) => handleChange("nome", event.target.value)}
                    placeholder="Digite o nome"
                    required
                  />
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(event) => handleChange("whatsapp", event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(event) => handleChange("cidade", event.target.value)}
                    placeholder="Digite a cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(event) => handleChange("estado", event.target.value)}
                    placeholder="Digite o estado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(event) => handleChange("cpf", event.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pix">PIX</Label>
                  <Input
                    id="pix"
                    value={formData.pix}
                    onChange={(event) => handleChange("pix", event.target.value)}
                    placeholder="Chave PIX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="origem">Origem</Label>
                  <Input
                    id="origem"
                    value={formData.origem}
                    onChange={(event) => handleChange("origem", event.target.value)}
                    placeholder="Origem do contato"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissao</Label>
                  <Input
                    id="profissao"
                    value={formData.profissao}
                    onChange={(event) => handleChange("profissao", event.target.value)}
                    placeholder="Profissao"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_entrada">Data de entrada</Label>
                  <Input
                    id="data_entrada"
                    type="date"
                    value={formData.data_entrada}
                    onChange={(event) => handleChange("data_entrada", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(event) => handleChange("status", event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ativo">Ativo</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                    <input
                      id="ativo"
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(event) => handleChange("ativo", event.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">Marcado como ativo</span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoes">Observacoes</Label>
                  <textarea
                    id="observacoes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.observacoes}
                    onChange={(event) => handleChange("observacoes", event.target.value)}
                    placeholder="Adicione observacoes relevantes"
                  />
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

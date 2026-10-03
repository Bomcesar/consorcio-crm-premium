"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Loader2, Plus, Settings2, Upload } from "lucide-react";
import { useLiveToast } from "./use-live-toast";
import {
  atualizarCategoria,
  atualizarPresente,
  criarCategoria,
  criarPresente,
  getCategorias,
  getPresentes,
  uploadImagemPresente,
  type CategoriaComSubcategorias,
} from "@/repositories/client/live/live-presentes.repository";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";
import { formatCreditoBRL } from "@/lib/live/format";
import type { LivePresente } from "@/lib/live/types";

/**
 * 🎁 CONFIGURAÇÃO DE PRESENTES
 *
 * Área administrativa (somente Administrador — garantido pela RLS e
 * pela permissão live.presentes.gerenciar). Nada aqui é fixo no
 * código: categorias, valores e imagens são cadastrados e podem
 * ser criados, editados, ativados, desativados e ordenados.
 *
 * Desativar um presente NÃO apaga o histórico: os envios guardam
 * o snapshot do nome, da categoria e do valor.
 */
export function LiveGiftAdmin() {
  const toast = useLiveToast();

  const [podeGerenciar, setPodeGerenciar] = React.useState(false);
  const [categorias, setCategorias] = React.useState<CategoriaComSubcategorias[]>([]);
  const [presentes, setPresentes] = React.useState<LivePresente[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);

  const [categoriaDialog, setCategoriaDialog] = React.useState<{
    aberto: boolean;
    editando: CategoriaComSubcategorias | null;
  }>({ aberto: false, editando: null });
  const [presenteDialog, setPresenteDialog] = React.useState<{
    aberto: boolean;
    editando: LivePresente | null;
  }>({ aberto: false, editando: null });

  const carregar = React.useCallback(async () => {
    try {
      const [c, p] = await Promise.all([getCategorias(true), getPresentes()]);
      setCategorias(c);
      setPresentes(p);
    } catch (e) {
      console.error("[LiveGiftAdmin]:", e);
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    getAuthenticatedUser()
      .then((u) => setPodeGerenciar(hasPermission(u, "live.presentes.gerenciar")))
      .catch(() => setPodeGerenciar(false));
    void carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração de presentes...
      </p>
    );
  }

  if (!podeGerenciar) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🎁 Configuração de Presentes</CardTitle>
          <CardDescription>Somente Administradores têm acesso a esta área.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings2 className="h-6 w-6 text-primary" /> Configuração de Presentes
        </h1>
        <p className="text-sm text-muted-foreground">
          O presente representa uma faixa de crédito na Live. Não é pagamento, não gera saldo e
          não movimenta dinheiro.
        </p>
      </div>

      <Tabs defaultValue="presentes">
        <TabsList>
          <TabsTrigger value="presentes">Presentes</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="presentes" className="space-y-3">
          <Button onClick={() => setPresenteDialog({ aberto: true, editando: null })}>
            <Plus className="mr-2 h-4 w-4" /> Novo presente
          </Button>

          <div className="space-y-2">
            {presentes.map((p) => {
              const categoria = categorias.find((c) => c.id === p.categoria_id);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <Gift className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {p.nome}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({formatCreditoBRL(p.valor_credito)})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {categoria?.emoji} {categoria?.nome ?? "sem categoria"} · ordem {p.ordem}
                      {p.imagem_path ? " · com imagem" : ""}
                    </p>
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"} className="text-[10px]">
                    {p.ativo ? "ativo" : "inativo"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void alternarAtivo(p)}
                  >
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPresenteDialog({ aberto: true, editando: p })}
                  >
                    Editar
                  </Button>
                </div>
              );
            })}
            {presentes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum presente cadastrado.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-3">
          <Button onClick={() => setCategoriaDialog({ aberto: true, editando: null })}>
            <Plus className="mr-2 h-4 w-4" /> Nova categoria
          </Button>

          <div className="space-y-2">
            {categorias.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="text-xl">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    ordem {c.ordem}
                    {c.subcategorias.length > 0
                      ? ` · ${c.subcategorias.map((s) => s.nome).join(", ")}`
                      : ""}
                  </p>
                </div>
                <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">
                  {c.ativo ? "ativa" : "inativa"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void atualizarCategoria(c.id, { ativo: !c.ativo })
                      .then(carregar)
                      .catch(() => toast({ title: "Falha ao atualizar", variant: "destructive" }))
                  }
                >
                  {c.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoriaDialog({ aberto: true, editando: c })}
                >
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <DialogCategoria
        aberto={categoriaDialog.aberto}
        editando={categoriaDialog.editando}
        salvando={salvando}
        aoFechar={() => setCategoriaDialog({ aberto: false, editando: null })}
        aoSalvar={async (dados) => {
          setSalvando(true);
          try {
            if (categoriaDialog.editando) {
              await atualizarCategoria(categoriaDialog.editando.id, dados);
            } else {
              await criarCategoria({
                nome: dados.nome,
                emoji: dados.emoji,
                ordem: dados.ordem,
              });
            }
            await carregar();
            setCategoriaDialog({ aberto: false, editando: null });
            toast({ title: "Categoria salva" });
          } catch (e) {
            toast({
              title: "Não foi possível salvar",
              description: e instanceof Error ? e.message : undefined,
              variant: "destructive",
            });
          } finally {
            setSalvando(false);
          }
        }}
      />

      <DialogPresente
        aberto={presenteDialog.aberto}
        editando={presenteDialog.editando}
        categorias={categorias}
        salvando={salvando}
        aoFechar={() => setPresenteDialog({ aberto: false, editando: null })}
        aoSalvar={async (dados) => {
          setSalvando(true);
          try {
            if (presenteDialog.editando) {
              await atualizarPresente(presenteDialog.editando.id, dados);
            } else {
              await criarPresente({
                categoria_id: dados.categoria_id as string,
                nome: dados.nome as string,
                valor_credito: Number(dados.valor_credito),
                ordem: Number(dados.ordem ?? 0),
                imagem_path: "",
              });
            }
            await carregar();
            setPresenteDialog({ aberto: false, editando: null });
            toast({ title: "Presente salvo" });
          } catch (e) {
            toast({
              title: "Não foi possível salvar",
              description: e instanceof Error ? e.message : undefined,
              variant: "destructive",
            });
          } finally {
            setSalvando(false);
          }
        }}
        aoEnviarImagem={async (arquivo) => {
          if (!presenteDialog.editando) return;
          try {
            await uploadImagemPresente(presenteDialog.editando.id, arquivo);
            await carregar();
            toast({ title: "Imagem atualizada" });
          } catch (e) {
            toast({
              title: "Falha no upload",
              description: e instanceof Error ? e.message : undefined,
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );

  async function alternarAtivo(p: LivePresente) {
    try {
      await atualizarPresente(p.id, { ativo: !p.ativo });
      await carregar();
    } catch {
      toast({ title: "Falha ao atualizar", variant: "destructive" });
    }
  }
}

/* ----------------------------- Diálogos ----------------------------- */

function DialogCategoria({
  aberto,
  editando,
  salvando,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  editando: CategoriaComSubcategorias | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: { nome: string; emoji: string; ordem: number }) => Promise<void>;
}) {
  const [nome, setNome] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [ordem, setOrdem] = React.useState("0");

  React.useEffect(() => {
    setNome(editando?.nome ?? "");
    setEmoji(editando?.emoji ?? "");
    setOrdem(String(editando?.ordem ?? 0));
  }, [editando, aberto]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nome-cat">Nome</Label>
            <Input id="nome-cat" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="emoji-cat">Emoji</Label>
              <Input id="emoji-cat" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ordem-cat">Ordem</Label>
              <Input
                id="ordem-cat"
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              void aoSalvar({ nome, emoji, ordem: Number(ordem) || 0 })
            }
            disabled={!nome.trim() || salvando}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogPresente({
  aberto,
  editando,
  categorias,
  salvando,
  aoFechar,
  aoSalvar,
  aoEnviarImagem,
}: {
  aberto: boolean;
  editando: LivePresente | null;
  categorias: CategoriaComSubcategorias[];
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: Record<string, unknown>) => Promise<void>;
  aoEnviarImagem: (arquivo: File) => Promise<void>;
}) {
  const [nome, setNome] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [categoriaId, setCategoriaId] = React.useState("");
  const [ordem, setOrdem] = React.useState("0");

  React.useEffect(() => {
    setNome(editando?.nome ?? "");
    setValor(editando ? String(editando.valor_credito) : "");
    setCategoriaId(editando?.categoria_id ?? categorias[0]?.id ?? "");
    setOrdem(String(editando?.ordem ?? 0));
  }, [editando, aberto, categorias]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar presente" : "Novo presente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nome-pres">Nome</Label>
            <Input
              id="nome-pres"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="R$ 50.000"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="valor-pres">Valor de crédito (R$)</Label>
              <Input
                id="valor-pres"
                type="number"
                min={0}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ordem-pres">Ordem</Label>
              <Input
                id="ordem-pres"
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cat-pres">Categoria</Label>
            <select
              id="cat-pres"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </div>
          {editando && (
            <div>
              <Label htmlFor="img-pres">Imagem</Label>
              <div className="flex items-center gap-2">
                <Input id="img-pres" type="file" accept="image/*" disabled />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById("img-pres") as HTMLInputElement | null;
                    const arquivo = input?.files?.[0];
                    if (arquivo) void aoEnviarImagem(arquivo);
                  }}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" /> Enviar
                </Button>
              </div>
              {editando.imagem_path && (
                <p className="mt-1 text-xs text-muted-foreground">Imagem já cadastrada.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              void aoSalvar({
                nome,
                valor_credito: Number(valor) || 0,
                categoria_id: categoriaId,
                ordem: Number(ordem) || 0,
              })
            }
            disabled={!nome.trim() || !categoriaId || salvando}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

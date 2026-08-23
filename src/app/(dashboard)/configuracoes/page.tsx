"use client";

import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, User, Shield, Users as UsersIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser, hasPermission, canAssignProfile, canEditUserProfile } from "@/lib/auth-user";
import { getProfiles, updateProfile, createProfile } from "@/repositories/client/profiles.repository";
import type { Perfil } from "@/repositories/client/profiles.repository";

type TabValue = "perfil" | "usuarios" | "permissoes";

type UsuarioForm = {
  nome: string;
  email: string;
  perfil: "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador";
  ativo: boolean;
  senha?: string;
};

export default function ConfiguracoesPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>("perfil");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsuarioSaving, setIsUsuarioSaving] = useState(false);
  const [isCreatingUsuario, setIsCreatingUsuario] = useState(false);
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [isUsuarioDialogOpen, setIsUsuarioDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Perfil | null>(null);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>({
    nome: "",
    email: "",
    perfil: "Consultor",
    ativo: true,
  });

  const [permissoesUsuario, setPermissoesUsuario] = useState<string[]>([]);
  const [todasPermissoes, setTodasPermissoes] = useState<{ id: string; codigo: string; nome: string; categoria: string }[]>([]);
  const [isPermissoesLoading, setIsPermissoesLoading] = useState(false);
  const [usuarioPermissoesId, setUsuarioPermissoesId] = useState<string | null>(null);
  const errorRef = useRef(error);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const userRole = perfil?.perfil;
  const canManageUsers = userRole === "Administrador" || userRole === "Gestor";
  const canManagePermissions = userRole === "Administrador";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const authUser = await getAuthenticatedUser();
        console.log("[Configuracoes] authUser:", authUser);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        console.log("[Configuracoes] profile data:", data, "error:", fetchError);

        if (fetchError || !data) {
          if (mounted) setPerfil(null);
          return;
        }

        if (mounted) {
          setPerfil(data as Perfil);
          setNome(data.nome || "");
          setEmail(data.email || "");

          if (hasPermission(authUser, "usuarios.ver")) {
            const usuariosData = await getProfiles();
            if (mounted) setUsuarios(usuariosData);
          }
        }
      } catch (err) {
        console.error("[Configuracoes] erro:", err);
        if (mounted) error("Não foi possível carregar o perfil.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canManagePermissions || activeTab !== "permissoes") return;

    const loadPermissoes = async () => {
      setIsPermissoesLoading(true);
      try {
        const supabase = createClient();

        const { data: perms } = await supabase
          .from("user_permissions")
          .select("id, codigo, nome, categoria")
          .order("categoria", { ascending: true });

        setTodasPermissoes(perms ?? []);
      } catch {
        errorRef.current("Não foi possível carregar as permissões.");
      } finally {
        setIsPermissoesLoading(false);
      }
    };

    void loadPermissoes();
  }, [activeTab, canManagePermissions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const authUser = await getAuthenticatedUser();
      const updated = await updateProfile(authUser.id, { nome, email });
      setPerfil(updated);
      success("Perfil atualizado com sucesso.");
    } catch {
      error("Não foi possível atualizar o perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsuarioSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUsuarioSaving(true);
    try {
      const authUser = await getAuthenticatedUser();

      if (isCreatingUsuario) {
        if (!senha || senha.length < 6) {
          error("A senha deve ter pelo menos 6 caracteres.");
          return;
        }

        const created = await createProfile({
          nome: usuarioForm.nome,
          email: usuarioForm.email,
          perfil: usuarioForm.perfil,
          senha,
        });

        setUsuarios((prev) => [...prev, created]);
        success("Usuário criado com sucesso.");
      } else {
        if (!editingUsuario) return;

        if (!canEditUserProfile(authUser, editingUsuario)) {
          error("Sem permissão para editar este usuário.");
          return;
        }

        const selectedProfile = usuarioForm.perfil;
        if (!canAssignProfile(authUser, selectedProfile)) {
          error("Sem permissão para atribuir este perfil.");
          return;
        }

        const updated = await updateProfile(editingUsuario.id, {
          nome: usuarioForm.nome,
          email: usuarioForm.email,
          perfil: selectedProfile,
          ativo: usuarioForm.ativo,
        });

        setUsuarios((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );
        success("Usuário atualizado com sucesso.");
      }

      setIsUsuarioDialogOpen(false);
      setEditingUsuario(null);
      setIsCreatingUsuario(false);
      setSenha("");
      setUsuarioForm({ nome: "", email: "", perfil: "Consultor", ativo: true });
    } catch {
      error(isCreatingUsuario ? "Não foi possível criar o usuário." : "Não foi possível atualizar o usuário.");
    } finally {
      setIsUsuarioSaving(false);
    }
  };

  const openEditUsuario = (usuario?: Perfil) => {
    if (usuario) {
      const authUserPromise = getAuthenticatedUser();
      authUserPromise.then((authUser) => {
        if (authUser.perfil === "Gestor" && usuario.perfil === "Administrador") {
          error("Gestores não podem editar Administradores.");
          return;
        }
        if (authUser.id === usuario.id) {
          error("Você não pode editar seu próprio perfil por aqui.");
          return;
        }
        setEditingUsuario(usuario);
        setIsCreatingUsuario(false);
        setUsuarioForm({
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
        });
        setIsUsuarioDialogOpen(true);
      }).catch(() => {
        error("Não foi possível verificar permissões.");
      });
    } else {
      setEditingUsuario(null);
      setIsCreatingUsuario(true);
      setUsuarioForm({ nome: "", email: "", perfil: "Consultor", ativo: true });
      setSenha("");
      setIsUsuarioDialogOpen(true);
    }
  };

  const abrirPermissoes = async (usuario: Perfil) => {
    if (userRole !== "Administrador") return;
    setIsPermissoesLoading(true);
    try {
      const supabase = createClient();
      const { data: grants } = await supabase
        .from("user_permission_grants")
        .select("permissao_id")
        .eq("usuario_id", usuario.id);

      setUsuarioPermissoesId(usuario.id);
      setPermissoesUsuario(grants?.map((g) => g.permissao_id) ?? []);
    } catch {
      error("Não foi possível carregar as permissões do usuário.");
    } finally {
      setIsPermissoesLoading(false);
    }
  };

  const togglePermissao = async (permissaoId: string) => {
    if (!usuarioPermissoesId || userRole !== "Administrador") return;

    try {
      const supabase = createClient();
      const jaTem = permissoesUsuario.includes(permissaoId);

      if (jaTem) {
        await supabase
          .from("user_permission_grants")
          .delete()
          .eq("usuario_id", usuarioPermissoesId)
          .eq("permissao_id", permissaoId);

        setPermissoesUsuario((prev) => prev.filter((id) => id !== permissaoId));
      } else {
        await supabase
          .from("user_permission_grants")
          .insert({ usuario_id: usuarioPermissoesId, permissao_id: permissaoId });

        setPermissoesUsuario((prev) => [...prev, permissaoId]);
      }
    } catch {
      error("Não foi possível atualizar a permissão.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-sm text-muted-foreground">Perfil, integrações e preferências do sistema</p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === "perfil" ? "default" : "ghost"}
              onClick={() => setActiveTab("perfil")}
              className="rounded-none border-b-2 border-transparent"
            >
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </Button>
            {canManageUsers && (
              <Button
                variant={activeTab === "usuarios" ? "default" : "ghost"}
                onClick={() => setActiveTab("usuarios")}
                className="rounded-none border-b-2 border-transparent"
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                Usuários
              </Button>
            )}
            {canManagePermissions && (
              <Button
                variant={activeTab === "permissoes" ? "default" : "ghost"}
                onClick={() => setActiveTab("permissoes")}
                className="rounded-none border-b-2 border-transparent"
              >
                <Shield className="mr-2 h-4 w-4" />
                Permissões
              </Button>
            )}
          </div>

          {activeTab === "perfil" && (
            <Card>
              <CardHeader>
                <CardTitle>Perfil do usuário</CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                {!perfil ? (
                  <p className="text-sm text-muted-foreground">Usuário não autenticado.</p>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{perfil.nome || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{perfil.perfil || "Sem perfil"}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Settings className="h-4 w-4" />
                      <span>Alterações são salvas diretamente no seu perfil do Supabase.</span>
                    </div>

                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar alterações"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "usuarios" && canManageUsers && (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Usuários cadastrados</CardTitle>
                  <CardDescription>
                    {usuarios.length > 0 ? `${usuarios.length} usuário(s) encontrado(s)` : "Nenhum usuário cadastrado ainda."}
                  </CardDescription>
                </div>
                <Button onClick={() => openEditUsuario()} size="sm">+ Novo usuário</Button>
              </CardHeader>
              <CardContent>
                {usuarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[160px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map((usuario) => {
                          const canEdit = usuario.perfil !== "Administrador" && userRole === "Administrador";
                          return (
                            <TableRow key={usuario.id}>
                              <TableCell className="font-medium">{usuario.nome}</TableCell>
                              <TableCell>{usuario.email}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium">
                                  <Shield className="h-3 w-3" />
                                  {usuario.perfil}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                    usuario.ativo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {usuario.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </TableCell>
                              <TableCell className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditUsuario(usuario)}
                                  aria-label="Editar"
                                  disabled={!canEdit}
                                >
                                  <span className="sr-only">Editar</span>
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => abrirPermissoes(usuario)}
                                  aria-label="Permissões"
                                  disabled={userRole !== "Administrador"}
                                >
                                  <Shield className="h-4 w-4" />
                                  <span className="sr-only">Permissões</span>
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
          )}

          {activeTab === "permissoes" && canManagePermissions && (
            <Card>
              <CardHeader>
                <CardTitle>Permissões dos usuários</CardTitle>
                <CardDescription>
                  {usuarioPermissoesId
                    ? "Alterne as permissões para o usuário selecionado."
                    : "Selecione um usuário na lista de Usuários para gerenciar suas permissões."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPermissoesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : usuarioPermissoesId ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const todas = todasPermissoes.map((p) => p.id);
                          setPermissoesUsuario(todas);
                        }}
                      >
                        Selecionar todas
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPermissoesUsuario([])}
                      >
                        Limpar todas
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {todasPermissoes.map((permissao) => {
                        const ativa = permissoesUsuario.includes(permissao.id);
                        return (
                          <button
                            key={permissao.id}
                            type="button"
                            onClick={() => togglePermissao(permissao.id)}
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                              ativa ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                            }`}
                          >
                            <p className="font-medium">{permissao.nome}</p>
                            <p className="text-xs text-muted-foreground">{permissao.codigo}</p>
                            <p className="text-xs text-muted-foreground">{permissao.categoria}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vá até a aba <strong>Usuários</strong>, clique em <strong>Permissões</strong> ao lado de um usuário para editar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={isUsuarioDialogOpen} onOpenChange={setIsUsuarioDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreatingUsuario ? "Novo usuário" : editingUsuario ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {isCreatingUsuario ? "Cadastre um novo usuário no sistema." : editingUsuario ? "Atualize as informações do usuário." : "Cadastre um novo usuário no sistema."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUsuarioSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={usuarioForm.nome}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={usuarioForm.email}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, email: e.target.value })}
                required
              />
            </div>
            {isCreatingUsuario && (
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="perfil">Perfil</Label>
              <select
                id="perfil"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={usuarioForm.perfil}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, perfil: e.target.value as "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador" })}
                disabled={userRole === "Gestor"}
              >
                <option value="Administrador" disabled={userRole === "Gestor"}>Administrador</option>
                <option value="Gestor" disabled={userRole === "Gestor"}>Gestor</option>
                <option value="Consultor">Consultor</option>
                <option value="Trainee">Trainee</option>
                <option value="Secretaria">Secretaria</option>
                <option value="Indicador">Indicador</option>
              </select>
              {userRole === "Gestor" && (
                <p className="text-xs text-muted-foreground">Gestores não podem atribuir perfis de Administrador ou Gestor.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <select
                id="ativo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={usuarioForm.ativo ? "true" : "false"}
                onChange={(e) => setUsuarioForm({ ...usuarioForm, ativo: e.target.value === "true" })}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsUsuarioDialogOpen(false); setEditingUsuario(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUsuarioSaving}>
                {isUsuarioSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

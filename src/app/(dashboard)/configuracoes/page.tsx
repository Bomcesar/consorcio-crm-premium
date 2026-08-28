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
import { Loader2, Settings, User, Shield, Users as UsersIcon, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser, hasPermission, canAssignProfile, canEditUserProfile } from "@/lib/auth-user";
import { getProfiles, updateProfile } from "@/repositories/client/profiles.repository";
import type { Perfil } from "@/repositories/client/profiles.repository";
import { createUsuarioAction, resetSenhaUsuarioAction, deleteUsuarioAction } from "@/app/actions/usuarios.actions";
import { ALL_NAV_ITEMS } from "@/config/navigation";

type TabValue = "perfil" | "usuarios" | "permissoes" | "visibilidade";

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
  const [isResetSenhaOpen, setIsResetSenhaOpen] = useState(false);
  const [resetSenhaUsuario, setResetSenhaUsuario] = useState<Perfil | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [isResetSenhaSaving, setIsResetSenhaSaving] = useState(false);
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
  const [modulosVisibilidade, setModulosVisibilidade] = useState<{ id?: string; perfil: string; modulo: string; href: string; titulo: string; visivel: boolean }[]>([]);
  const [isVisibilidadeLoading, setIsVisibilidadeLoading] = useState(false);
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

  useEffect(() => {
    if (activeTab !== "visibilidade" || userRole !== "Administrador") return;

    const loadVisibilidade = async () => {
      setIsVisibilidadeLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("module_visibility")
          .select("*")
          .order("perfil")
          .order("titulo");

        if (error) {
          console.error("[Visibilidade] Erro ao carregar module_visibility:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          errorRef.current("Não foi possível carregar a visibilidade dos módulos.");
          setModulosVisibilidade([]);
          return;
        }

        const existing = data ?? [];
        const perfis = ["Administrador", "Gestor", "Consultor", "Trainee", "Secretaria", "Indicador"];
        const merged: typeof modulosVisibilidade = [];

        for (const item of ALL_NAV_ITEMS) {
          for (const perfil of perfis) {
            const found = existing.find((row) => row.perfil === perfil && row.modulo === item.title);
            if (found) {
              merged.push(found);
            } else {
              merged.push({
                id: undefined,
                perfil,
                modulo: item.title,
                href: item.href,
                titulo: item.title,
                visivel: true,
              });
            }
          }
        }

        setModulosVisibilidade(merged);
      } catch (err) {
        console.error("[Visibilidade] Falha inesperada:", err);
        errorRef.current("Não foi possível carregar a visibilidade dos módulos.");
        setModulosVisibilidade([]);
      } finally {
        setIsVisibilidadeLoading(false);
      }
    };

    void loadVisibilidade();
  }, [activeTab, userRole]);

  const toggleVisibilidade = async (perfil: string, modulo: string) => {
    if (userRole !== "Administrador") {
      console.warn("[Visibilidade] Tentativa de alterar visibilidade sem permissão:", userRole);
      return;
    }

    const current = modulosVisibilidade.find((item) => item.perfil === perfil && item.modulo === modulo);
    const newVisivel = current ? !current.visivel : true;

    setModulosVisibilidade((prev) =>
      prev.map((item) =>
        item.perfil === perfil && item.modulo === modulo ? { ...item, visivel: newVisivel } : item,
      ),
    );

    try {
      const supabase = createClient();
      console.log("[Visibilidade] Atualizando:", { perfil, modulo, newVisivel });
      const navItem = ALL_NAV_ITEMS.find((item) => item.title === modulo);
      const payload = {
        perfil,
        modulo,
        href: navItem?.href ?? "/",
        titulo: navItem?.title ?? modulo,
        visivel: newVisivel,
      };

      if (current?.id && !current.id.startsWith("default-")) {
        const { error } = await supabase
          .from("module_visibility")
          .update({ visivel: newVisivel })
          .eq("perfil", perfil)
          .eq("modulo", modulo);

        if (error) {
          console.error("[Visibilidade] Erro ao atualizar:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("module_visibility")
          .upsert(payload, { onConflict: "perfil,modulo" });

        if (error) {
          console.error("[Visibilidade] Erro ao criar visibilidade:", error);
          throw error;
        }
      }

      success("Visibilidade atualizada.");
    } catch (err) {
      console.error("[Visibilidade] Falha ao atualizar visibilidade:", err);
      errorRef.current("Não foi possível atualizar a visibilidade.");
      if (current) {
        setModulosVisibilidade((prev) =>
          prev.map((item) =>
            item.perfil === perfil && item.modulo === modulo ? { ...item, visivel: !newVisivel } : item,
          ),
        );
      }
    }
  };

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

        const created = await createUsuarioAction(
          usuarioForm.email,
          senha,
          usuarioForm.nome,
          usuarioForm.perfil,
        );

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

  const abrirResetSenha = (usuario: Perfil) => {
    if (userRole !== "Administrador") return;
    setResetSenhaUsuario(usuario);
    setNovaSenha("");
    setIsResetSenhaOpen(true);
  };

  const handleDeleteUsuario = async (usuario: Perfil) => {
    if (userRole !== "Administrador") return;
    if (usuario.perfil === "Administrador") {
      error("Não é possível excluir um usuário Administrador por aqui.");
      return;
    }
    const confirmar = window.confirm(`Tem certeza que deseja excluir o usuário ${usuario.nome}?`);
    if (!confirmar) return;
    try {
      await deleteUsuarioAction(usuario.id);
      success("Usuário excluído com sucesso.");
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch {
      error("Não foi possível excluir o usuário.");
    }
  };

  const handleResetSenha = async () => {
    if (!resetSenhaUsuario || !novaSenha || novaSenha.length < 6) {
      error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setIsResetSenhaSaving(true);
    try {
      await resetSenhaUsuarioAction(resetSenhaUsuario.id, novaSenha);
      success("Senha redefinida com sucesso.");
      setIsResetSenhaOpen(false);
      setResetSenhaUsuario(null);
      setNovaSenha("");
    } catch {
      error("Não foi possível redefinir a senha.");
    } finally {
      setIsResetSenhaSaving(false);
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
        success("Permissão removida.");
      } else {
        await supabase
          .from("user_permission_grants")
          .insert({ usuario_id: usuarioPermissoesId, permissao_id: permissaoId });

        setPermissoesUsuario((prev) => [...prev, permissaoId]);
        success("Permissão adicionada.");
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
            {userRole === "Administrador" && (
              <Button
                variant={activeTab === "visibilidade" ? "default" : "ghost"}
                onClick={() => setActiveTab("visibilidade")}
                className="rounded-none border-b-2 border-transparent"
              >
                <Eye className="mr-2 h-4 w-4" />
                Visibilidade dos módulos
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => abrirResetSenha(usuario)}
                                    aria-label="Redefinir senha"
                                    disabled={userRole !== "Administrador"}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                    <span className="sr-only">Redefinir senha</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteUsuario(usuario)}
                                    aria-label="Excluir usuário"
                                    disabled={userRole !== "Administrador" || usuario.perfil === "Administrador"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Excluir</span>
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
                            <span className={`mt-2 inline-flex items-center text-xs font-medium ${ativa ? "text-green-700" : "text-muted-foreground"}`}>
                              {ativa ? "Selecionado" : "Não selecionado"}
                            </span>
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

          {activeTab === "visibilidade" && userRole === "Administrador" && (
            <Card>
              <CardHeader>
                <CardTitle>Visibilidade dos módulos</CardTitle>
                <CardDescription>
                  Controle quais módulos aparecem no menu para cada perfil. O Administrador sempre tem acesso total.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isVisibilidadeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : modulosVisibilidade.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <p className="text-sm text-muted-foreground">
                      Não foi possível carregar a visibilidade dos módulos. Verifique se a migration foi aplicada no Supabase.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab("visibilidade");
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Rota</TableHead>
                          {["Administrador", "Gestor", "Consultor", "Trainee", "Secretaria", "Indicador"].map((perfil) => (
                            <TableHead key={perfil} className="text-center">{perfil}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set(modulosVisibilidade.map((item) => item.modulo))).map((modulo) => {
                          const item = modulosVisibilidade.find((i) => i.modulo === modulo);
                          if (!item) return null;
                          return (
                            <TableRow key={modulo}>
                              <TableCell className="font-medium">{item.titulo}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.href}</TableCell>
                              {["Administrador", "Gestor", "Consultor", "Trainee", "Secretaria", "Indicador"].map((perfil) => {
                                const visibilidade = modulosVisibilidade.find((i) => i.perfil === perfil && i.modulo === modulo);
                                const isVisible = visibilidade?.visivel ?? false;
                                return (
                                  <TableCell key={perfil} className="text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleVisibilidade(perfil, modulo)}
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition ${
                                        isVisible
                                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                                          : "bg-red-50 text-red-700 hover:bg-red-100"
                                      }`}
                                    >
                                      {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                      {isVisible ? "Mostrar" : "Ocultar"}
                                    </button>
                                  </TableCell>
                                );
                              })}
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

      <Dialog open={isResetSenhaOpen} onOpenChange={setIsResetSenhaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {resetSenhaUsuario?.nome || "este usuário"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetSenhaOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleResetSenha} disabled={isResetSenhaSaving}>
              {isResetSenhaSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

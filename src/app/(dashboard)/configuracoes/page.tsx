"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Perfil = {
  nome: string;
  email: string;
  perfil: string;
  avatar_url: string | null;
};

export default function ConfiguracoesPage() {
  const { success, error } = useToast();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          setPerfil(null);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError || !data) {
          setPerfil(null);
          return;
        }

        setPerfil({
          nome: data.nome || "",
          email: data.email || user.email || "",
          perfil: data.perfil || "",
          avatar_url: data.avatar_url,
        });
        setNome(data.nome || "");
        setEmail(data.email || user.email || "");
      } catch {
        error("Não foi possível carregar o perfil.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [error]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        error("Usuário não autenticado.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ nome, email })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setPerfil((current) => (current ? { ...current, nome, email } : current));
      success("Perfil atualizado com sucesso.");
    } catch {
      error("Não foi possível atualizar o perfil.");
    } finally {
      setIsSaving(false);
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

      <Card>
        <CardHeader>
          <CardTitle>Perfil do usuário</CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !perfil ? (
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
    </div>
  );
}

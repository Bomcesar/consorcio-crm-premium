"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ResetPasswordForm() {
  const router = useRouter();
  const { success, error } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionError("O Supabase não está configurado neste ambiente.");
      setIsCheckingSession(false);
      return;
    }

    const supabase = createClient();

    const checkSession = async () => {
      const hash = window.location.hash;
      console.log("[reset-password] hash:", hash);
      console.log("[reset-password] href:", window.location.href);

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      if (errorParam) {
        setSessionError(errorDescription || errorParam);
        setDiagnostic("O Supabase retornou erro na URL de recuperação.");
        setIsCheckingSession(false);
        return;
      }

      if (code) {
        console.log("[reset-password] code PKCE:", code);
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        console.log("[reset-password] exchangeCodeForSession:", exchangeError);

        if (exchangeError) {
          setSessionError("Não foi possível validar o código de recuperação.");
          setDiagnostic(exchangeError.message || "Código inválido ou expirado.");
          setIsCheckingSession(false);
          return;
        }
      }

      if (!hash) {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          setIsValidSession(true);
          setIsCheckingSession(false);
          return;
        }

        setSessionError("Link sem código de recuperação.");
        setDiagnostic("Nem token no hash nem código PKCE foram encontrados.");
        setIsCheckingSession(false);
        return;
      }

      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      console.log("[reset-password] access_token:", accessToken ? "presente" : "ausente");
      console.log("[reset-password] refresh_token:", refreshToken ? "presente" : "ausente");

      if (!accessToken || !refreshToken) {
        setSessionError("Link de recuperação inválido. Solicite um novo link.");
        setDiagnostic("O link não contém access_token ou refresh_token.");
        setIsCheckingSession(false);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      console.log("[reset-password] setSession resultado:", sessionError);

      if (sessionError) {
        setSessionError("Link de recuperação inválido ou expirado.");
        setDiagnostic(sessionError.message || "Não foi possível validar o token.");
      } else {
        setIsValidSession(true);
        setDiagnostic(null);
      }

      setIsCheckingSession(false);
    };

    void checkSession();
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (password !== confirmPassword) {
        error("As senhas não coincidem.");
        return;
      }

      if (password.length < 6) {
        error("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        error(updateError.message || "Não foi possível atualizar a senha.");
        return;
      }

      setIsComplete(true);
      success("Senha atualizada com sucesso.");
    } catch {
      error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sessionError || !isValidSession) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
            <Gem className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">CRM Consórcio Premium</CardTitle>
            <CardDescription>Link inválido</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-destructive">{sessionError || "Este link de recuperação é inválido ou já expirou."}</p>
          {diagnostic && (
            <p className="text-xs text-muted-foreground">Diagnóstico: {diagnostic}</p>
          )}
          <Button type="button" className="w-full" onClick={() => router.push("/forgot-password")}>
            Solicitar novo link
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Voltar para o login
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
            <Gem className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">CRM Consórcio Premium</CardTitle>
            <CardDescription>Senha atualizada</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sua senha foi alterada com sucesso. Faça login com a nova senha.
          </p>
          <Button type="button" className="w-full" onClick={() => router.push("/login")}>
            Ir para o login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
          <Gem className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">CRM Consórcio Premium</CardTitle>
          <CardDescription>Defina uma nova senha</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              "Atualizar senha"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Voltar para o login
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

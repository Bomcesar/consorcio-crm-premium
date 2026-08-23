"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setStatusMessage(null);

    try {
      if (!isSupabaseConfigured()) {
        setStatus("error");
        setStatusMessage("O Supabase não está configurado neste ambiente.");
        return;
      }

      const supabase = createClient();
      console.log("[forgot-password] enviando reset para:", email);

      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });

      console.log("[forgot-password] resposta Supabase:", { data, error: resetError });

      if (resetError) {
        setStatus("error");
        setStatusMessage(resetError.message || "Não foi possível enviar o e-mail de recuperação.");
        return;
      }

      setStatus("sent");
      setStatusMessage(`Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em: ${email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado. Tente novamente.";
      setStatus("error");
      setStatusMessage(message);
      console.error("[forgot-password] erro:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30">
          <Gem className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">CRM Consórcio Premium</CardTitle>
          <CardDescription>Recupere o acesso à sua conta</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {status === "sent" ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
            <p className="text-xs text-muted-foreground">
              Não recebeu? Verifique a pasta de spam ou tente novamente em alguns instantes.
            </p>
            <Button type="button" className="w-full" onClick={() => router.push("/login")}>
              Voltar para o login
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {status === "error" && statusMessage && (
              <p className="text-sm text-destructive">{statusMessage}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || status === "loading"}>
              {isSubmitting || status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
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
        )}
      </CardContent>
    </Card>
  );
}

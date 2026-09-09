"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPresence } from "@/components/user-presence";
import { Loader2, Users } from "lucide-react";

type UsuarioStatus = {
  id: string;
  usuario_id: string;
  status: "online" | "offline";
  last_seen: string;
};

export default function UsuariosOnlinePage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsuarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("usuario_status")
        .select("id, usuario_id, status, last_seen")
        .order("last_seen", { ascending: false });

      if (error) throw error;
      setUsuarios((data || []) as UsuarioStatus[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os usuários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsuarios();
    const interval = setInterval(loadUsuarios, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários Online</h1>
          <p className="text-muted-foreground">Monitore o status de presença da equipe em tempo real.</p>
        </div>
        <Button onClick={loadUsuarios} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status da equipe</CardTitle>
          <CardDescription>Total: {usuarios.length} usuários monitorados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && usuarios.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {usuarios.map((u) => (
                <Card key={u.id} className="border-border/60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <UserPresence userId={u.usuario_id} name={u.usuario_id} size="md" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.usuario_id}</p>
                      <Badge variant={u.status === "online" ? "success" : "secondary"} className="mt-1">
                        {u.status === "online" ? "Online" : "Offline"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(u.last_seen).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

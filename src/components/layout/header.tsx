"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu, Search, Settings, User } from "lucide-react";
import { mainNavItems } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { usePresence } from "@/hooks/use-presence";
import { usePresenceNotifications } from "@/hooks/use-presence-notifications";
import { Users } from "lucide-react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const { user, isAuthenticated, refresh } = useAuth();
  const { status, lastSeen, updateStatus } = usePresence(isAuthenticated ? user?.id : undefined);
  const { onlineUsers } = usePresenceNotifications(user);

  const currentNav = mainNavItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  const title = currentNav?.title ?? "Dashboard";

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const perfil = typeof window !== "undefined" ? localStorage.getItem("user_perfil") : null;
  const perfilLabel = perfil || "Usuário";

  const statusBadge = status === "online"
    ? { label: "Online", variant: "success" as const }
    : { label: `Offline • ${lastSeen?.toLocaleString("pt-BR") ?? ""}`, variant: "secondary" as const };

  async function handleLogout() {
    try {
      await updateStatus("offline");
    } catch {
      // silent
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    localStorage.removeItem("user_perfil");
    localStorage.removeItem("user_permissoes");
    document.cookie = "crm-bypass-session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "crm-demo-session=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center gap-4">
        <h1 className="hidden text-lg font-semibold tracking-tight sm:block">{title}</h1>
        <div className="relative ml-auto max-w-md flex-1 sm:ml-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes, leads..."
            className="h-9 w-full pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {isAuthenticated && (
        <div className="flex items-center gap-2">
          <DropdownMenu open={presenceOpen} onOpenChange={setPresenceOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Users className="h-4 w-4" />
                {onlineUsers.length > 0 && (
                  <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                )}
                <span className="sr-only">Usuários online</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Usuários online</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onlineUsers.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  Nenhum outro usuário online no momento.
                </div>
              ) : (
                onlineUsers.map((u) => (
                  <DropdownMenuItem key={u.id} className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{u.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.perfil ? `${u.perfil} online` : u.email ? `${u.email}` : "Sem e-mail"}
                    </span>
                    <span className="text-[10px] text-green-600">
                      Online • {new Date(u.last_seen).toLocaleString("pt-BR")}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">{displayName}</span>
                  <Badge variant={statusBadge.variant} className="mt-1 h-4 px-1 text-[10px]">
                    {statusBadge.label}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}

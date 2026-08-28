"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItemsForRole, type NavItem } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { Gem } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/client";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const authUser = await getAuthenticatedUser();
        const supabase = createClient();
        const { data, error } = await supabase
          .from("module_visibility")
          .select("href, visivel")
          .eq("perfil", authUser.perfil)
          .eq("visivel", true);

        if (error) {
          console.error("[Sidebar] Erro ao carregar module_visibility:", error);
          const items = getNavItemsForRole(authUser.perfil);
          setNavItems(items);
          return;
        }

        const visibleModules = new Set((data ?? []).map((row) => row.href));
        const items = getNavItemsForRole(authUser.perfil, visibleModules);
        setNavItems(items);
      } catch (err) {
        console.error("[Sidebar] Falha ao carregar menu:", err);
        const authUser = await getAuthenticatedUser().catch(() => null);
        if (authUser) {
          const items = getNavItemsForRole(authUser.perfil);
          setNavItems(items);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
          <Gem className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight text-sidebar-foreground">
            CRM Consórcio
          </span>
          <span className="text-xs text-muted-foreground">Premium</span>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="flex-1 truncate">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent/50 p-3">
          <p className="text-xs font-medium text-sidebar-foreground">Plano Premium</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Gestão completa de consórcios
          </p>
        </div>
      </div>
    </aside>
  );
}

import {
  LayoutDashboard,
  UserPlus,
  Users,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  Handshake,
  Headphones,
  Building2,
  UserSearch,
  BookOpen,
  BarChart3,
  Settings,
  TrendingUp,
  FileText,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiredPermission?: string;
  allowedRoles?: string[];
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: UserPlus, badge: "12", allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Central de Indicadores", href: "/central-de-indicadores", icon: TrendingUp, allowedRoles: ["Administrador", "Gestor", "Consultor", "Indicador"] },
  { title: "Clientes", href: "/clientes", icon: Users, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Contatos", href: "/contatos", icon: Mail, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Agenda", href: "/agenda", icon: Calendar, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "WhatsApp", href: "/whatsapp", icon: MessageCircle, badge: "3", allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Comunicação", href: "/comunicacao", icon: Phone, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Negociações", href: "/negociacoes", icon: Handshake, allowedRoles: ["Administrador", "Gestor", "Consultor", "Indicador"] },
  { title: "Pós-venda", href: "/pos-venda", icon: Headphones, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Parceiros", href: "/parceiros", icon: Building2, allowedRoles: ["Administrador", "Gestor"] },
  { title: "Recrutamento", href: "/recrutamento", icon: UserSearch, allowedRoles: ["Administrador", "Gestor"] },
  { title: "Biblioteca", href: "/biblioteca", icon: BookOpen, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Treinamentos", href: "/treinamentos", icon: BookOpen, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Materiais para Consultores", href: "/materiais-consultores", icon: FileText, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Links úteis", href: "/links-uteis", icon: Link2, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
  { title: "Configurações", href: "/configuracoes", icon: Settings, allowedRoles: ["Administrador", "Gestor", "Consultor", "Assistente", "Indicador"] },
];

export const mainNavItems = ALL_NAV_ITEMS.filter((item) => !item.allowedRoles || item.allowedRoles.length === 0);

export function getNavItemsForRole(perfil: string | undefined, visibleModules: Set<string> = new Set()): NavItem[] {
  const effectivePerfil = perfil ?? "Consultor";

  return ALL_NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!item.allowedRoles.includes(effectivePerfil)) return false;
    if (visibleModules.size > 0 && !visibleModules.has(item.href)) return false;
    return true;
  });
}

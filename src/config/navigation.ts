import {
  LayoutDashboard,
  UserPlus,
  Users,
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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: UserPlus },
  { title: "Central de Indicadores", href: "/central-de-indicadores", icon: TrendingUp },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
  { title: "Negociações", href: "/negociacoes", icon: Handshake },
  { title: "Pós-venda", href: "/pos-venda", icon: Headphones },
  { title: "Parceiros", href: "/parceiros", icon: Building2 },
  { title: "Recrutamento", href: "/recrutamento", icon: UserSearch },
  { title: "Biblioteca", href: "/biblioteca", icon: BookOpen },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

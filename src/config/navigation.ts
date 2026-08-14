import {
  LayoutDashboard,
  UserPlus,
  Users,
  Calendar,
  MessageCircle,
  Phone,
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
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: UserPlus, badge: "12" },
  { title: "Central de Indicadores", href: "/central-de-indicadores", icon: TrendingUp },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "WhatsApp", href: "/whatsapp", icon: MessageCircle, badge: "3" },
  { title: "Comunicação", href: "/comunicacao", icon: Phone },
  { title: "Negociações", href: "/negociacoes", icon: Handshake },
  { title: "Pós-venda", href: "/pos-venda", icon: Headphones },
  { title: "Parceiros", href: "/parceiros", icon: Building2 },
  { title: "Recrutamento", href: "/recrutamento", icon: UserSearch },
  { title: "Biblioteca", href: "/biblioteca", icon: BookOpen },
  { title: "Treinamentos", href: "/treinamentos", icon: BookOpen },
  { title: "Materiais para Consultores", href: "/materiais-consultores", icon: FileText },
  { title: "Links úteis", href: "/links-uteis", icon: Link2 },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

export const dashboardStats = [
  {
    title: "Leads Ativos",
    value: 128,
    change: "+12%",
    trend: "up" as const,
    description: "vs. mês anterior",
  },
  {
    title: "Clientes",
    value: 847,
    change: "+8%",
    trend: "up" as const,
    description: "base total",
  },
  {
    title: "Negociações",
    value: 34,
    change: "+5",
    trend: "up" as const,
    description: "em andamento",
  },
  {
    title: "Volume (R$)",
    value: 2450000,
    change: "+18%",
    trend: "up" as const,
    description: "carteira ativa",
    isCurrency: true,
  },
];

export const recentActivities = [
  {
    id: "1",
    client: "Maria Silva",
    action: "Proposta enviada",
    type: "Imóvel",
    value: "R$ 350.000",
    time: "Há 15 min",
  },
  {
    id: "2",
    client: "João Santos",
    action: "Reunião agendada",
    type: "Automóvel",
    value: "R$ 85.000",
    time: "Há 1 hora",
  },
  {
    id: "3",
    client: "Ana Costa",
    action: "Lead qualificado",
    type: "Serviços",
    value: "R$ 120.000",
    time: "Há 2 horas",
  },
  {
    id: "4",
    client: "Pedro Oliveira",
    action: "Contrato assinado",
    type: "Imóvel",
    value: "R$ 520.000",
    time: "Há 3 horas",
  },
  {
    id: "5",
    client: "Carla Mendes",
    action: "Follow-up WhatsApp",
    type: "Automóvel",
    value: "R$ 65.000",
    time: "Há 4 horas",
  },
];

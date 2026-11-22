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
   Wifi,
   Target,
   type LucideIcon,
  Megaphone,
  Radio,
  Receipt,
  DollarSign,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
  allowedRoles?: string[];
}

export const PERFIS_VISIBILIDADE = [
  "Administrador",
  "Gestor Pleno",
  "Gestor",
  "Consultor Pleno",
  "Consultor",
  "Consultor em prévia",
  "Líder em treinamento",
  "Indicador",
  "Trainee",
  "Secretaria",
] as const;

export const ALL_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: UserPlus, badge: "12", allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Trainee"] },
  { title: "Central de Indicadores", href: "/central-de-indicadores", icon: TrendingUp, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Indicador", "Trainee"] },
  { title: "Usuários Online", href: "/uarios-online", icon: Wifi, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Clientes", href: "/clientes", icon: Users, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Trainee"] },
  { title: "Contatos", href: "/contatos", icon: Mail, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Agenda", href: "/agenda", icon: Calendar, requiredPermission: "agenda.visualizar", allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Trainee"] },
  { title: "WhatsApp", href: "/whatsapp", icon: MessageCircle, badge: "3", allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Comunicação", href: "/comunicacao", icon: Phone, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Negociações", href: "/negociacoes", icon: Handshake, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Indicador", "Trainee"] },
  { title: "Cobranças", href: "/cobranca", icon: Receipt, requiredPermission: "cobranca.ver", allowedRoles: [...PERFIS_VISIBILIDADE] },
  { title: "Comissões", href: "/comissoes", icon: DollarSign, requiredPermissions: ["comissoes.ver_proprias", "comissoes.ver_todas"], allowedRoles: [...PERFIS_VISIBILIDADE] },
  { title: "Pós-venda", href: "/pos-venda", icon: Headphones, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Parceiros", href: "/parceiros", icon: Building2, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Trainee"] },
  { title: "Recrutamento", href: "/recrutamento", icon: UserSearch, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Trainee"] },
  { title: "Biblioteca", href: "/biblioteca", icon: BookOpen, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Treinamentos", href: "/treinamentos", icon: BookOpen, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Consultor em prévia", "Líder em treinamento", "Indicador", "Trainee"] },
  { title: "Materiais para Consultores", href: "/materiais-consultores", icon: FileText, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Links úteis", href: "/links-uteis", icon: Link2, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Configurações", href: "/configuracoes", icon: Settings, allowedRoles: ["Administrador"] },
  { title: "Metas", href: "/metas", icon: Target, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor"] },
  { title: "Mensagens Dinâmicas", href: "/mensagens-dinamicas", icon: Megaphone, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Live de Voz", href: "/live-voz", icon: Radio, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
  { title: "Credito Investimento", href: "/credito-investimento", icon: TrendingUp, allowedRoles: ["Administrador", "Gestor Pleno", "Gestor", "Consultor Pleno", "Consultor", "Secretaria", "Indicador", "Trainee"] },
];

export const mainNavItems = ALL_NAV_ITEMS.filter((item) => !item.allowedRoles || item.allowedRoles.length === 0);

export function getNavItemsForRole(perfil: string | undefined, visibleModules: Set<string> = new Set()): NavItem[] {
  const effectivePerfil = perfil ?? "Consultor";
  // O Administrador tem acesso total: a visibilidade configurada não restringe o menu.
  const ignoreVisibility = effectivePerfil === "Administrador";

  return ALL_NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!item.allowedRoles.includes(effectivePerfil)) return false;
    if (!ignoreVisibility && visibleModules.size > 0 && !visibleModules.has(item.href)) return false;
    return true;
  });
}

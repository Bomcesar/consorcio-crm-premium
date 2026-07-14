import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Perfil, integrações e preferências do sistema"
      icon={Settings}
    />
  );
}

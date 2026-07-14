import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { MessageCircle } from "lucide-react";

export default function WhatsAppPage() {
  return (
    <PagePlaceholder
      title="WhatsApp"
      description="Central de mensagens e atendimento via WhatsApp"
      icon={MessageCircle}
      badge="3 pendentes"
    />
  );
}

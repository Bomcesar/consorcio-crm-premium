import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Calendar } from "lucide-react";

export default function AgendaPage() {
  return (
    <PagePlaceholder
      title="Agenda"
      description="Compromissos, reuniões e integração com Google Calendar"
      icon={Calendar}
    />
  );
}

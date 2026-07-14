import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { BookOpen } from "lucide-react";

export default function BibliotecaPage() {
  return (
    <PagePlaceholder
      title="Biblioteca"
      description="Materiais, templates e documentos de apoio"
      icon={BookOpen}
    />
  );
}

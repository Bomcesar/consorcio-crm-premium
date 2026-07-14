import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Handshake } from "lucide-react";

export default function NegociacoesPage() {
  return (
    <PagePlaceholder
      title="Negociações"
      description="Pipeline de vendas e propostas em andamento"
      icon={Handshake}
    />
  );
}

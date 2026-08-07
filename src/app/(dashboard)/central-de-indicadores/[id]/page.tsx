import { IndicatorDetailView } from "@/components/central-de-indicadores/indicator-detail-view";
import { getIndicatorByIdService } from "@/services/indicadores.server.service";
import type { Indicator } from "@/types/crm";

export const dynamic = "force-dynamic";

export default async function IndicatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getIndicatorByIdService(id);

  return <IndicatorDetailView indicatorId={id} initialIndicator={(data as Indicator | null) ?? null} />;
}

import { getIndicatorByIdRepository } from "@/repositories/indicadores.server.repository";
import type { Indicator } from "@/types/crm";

export async function getIndicatorByIdService(id: string): Promise<Indicator | null> {
  return getIndicatorByIdRepository(id);
}

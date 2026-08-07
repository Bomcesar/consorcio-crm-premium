import { useMemo } from "react";
import { getDashboardDataService } from "@/services/dashboard.service";

export function useDashboard() {
  return useMemo(
    () => ({
      getDashboardData: getDashboardDataService,
    }),
    [],
  );
}

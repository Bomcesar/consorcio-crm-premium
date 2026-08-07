import { useMemo } from "react";
import {
  deleteContactService,
  deleteIndicatorService,
  getDashboardSummarySourceService,
  getAuthenticatedUserService,
  listCommissionsService,
  listContactsService,
  listIndicatorsService,
  moveIndicatorStageService,
  markCommissionAsPaidService,
  saveContactService,
  saveIndicatorService,
  subscribeIndicatorsRealtimeService,
} from "@/services/indicadores.service";

export function useIndicadores() {
  return useMemo(
    () => ({
      getAuthenticatedUser: getAuthenticatedUserService,
      listIndicators: listIndicatorsService,
      getDashboardSummarySource: getDashboardSummarySourceService,
      saveIndicator: saveIndicatorService,
      deleteIndicator: deleteIndicatorService,
      listContacts: listContactsService,
      saveContact: saveContactService,
      deleteContact: deleteContactService,
      listCommissions: listCommissionsService,
      markCommissionAsPaid: markCommissionAsPaidService,
      moveIndicatorStage: moveIndicatorStageService,
      subscribeIndicatorsRealtime: subscribeIndicatorsRealtimeService,
    }),
    [],
  );
}

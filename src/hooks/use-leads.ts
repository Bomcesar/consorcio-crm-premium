import { useMemo } from "react";
import { createLeadService, deleteLeadService, listLeadsService, updateLeadService } from "@/services/leads.service";

export function useLeads() {
  return useMemo(
    () => ({
      listLeads: listLeadsService,
      createLead: createLeadService,
      updateLead: updateLeadService,
      deleteLead: deleteLeadService,
    }),
    [],
  );
}

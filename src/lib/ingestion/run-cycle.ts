import "server-only";

import { isSupabaseConfigured } from "@/lib/env/server";

import { getOrganization } from "@/lib/portal/organization-service";

import { loadConnectorsForIngestion } from "./connector-loader";
import { ingestLooker } from "./looker-ingest";
import { ingestTableau } from "./tableau-ingest";
import { memoryReportMetadataCount, persistReportMetadataDrafts } from "./persist-reports";

export type IngestionCycleResult = {
  connectorsProcessed: number;
  rowsWritten: number;
  memoryRowCount: number | null;
  errors: string[];
};

export async function runIngestionCycle(): Promise<IngestionCycleResult> {
  const connectors = await loadConnectorsForIngestion();
  const errors: string[] = [];
  let rowsWritten = 0;

  const org = await getOrganization();
  const policy = { inactivityThresholdDays: org.inactivityThresholdDays };

  for (const c of connectors) {
    try {
      const drafts =
        c.connectorType === "looker" ? await ingestLooker(c) : await ingestTableau(c);
      rowsWritten += await persistReportMetadataDrafts(drafts, policy);
    } catch (e) {
      errors.push(`${c.displayName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    connectorsProcessed: connectors.length,
    rowsWritten,
    memoryRowCount: isSupabaseConfigured() ? null : memoryReportMetadataCount(),
    errors,
  };
}

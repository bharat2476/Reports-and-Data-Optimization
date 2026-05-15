import type { StoredCredentialPayload } from "@/lib/vault/credential-payload";

export type DefinitionKind = "sql" | "lookml" | "tableau_xml";

/** Row shape aligned with public.report_metadata (before insert). */
export type ReportMetadataDraft = {
  organizationId: string;
  connectorId: string;
  externalId: string;
  title: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  lastAccessedAt: string | null;
  runFrequencyBucket: string | null;
  parentReportIds: string[];
  definitionKind: DefinitionKind | null;
  definitionBody: string | null;
  astStructuralHash: string | null;
  rawMetadata: Record<string, unknown>;
};

export type IngestionConnectorContext = {
  organizationId: string;
  connectorId: string;
  connectorType: "looker" | "tableau";
  displayName: string;
  metadata: Record<string, string>;
};

export type LoadedConnector = IngestionConnectorContext & {
  credentials: StoredCredentialPayload;
};

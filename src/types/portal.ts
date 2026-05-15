export type ConnectorType = "looker" | "tableau";

export type ConnectionStatus = "pending" | "valid" | "invalid";

export type PortalOrganization = {
  id: string;
  name: string;
  slug: string;
  inactivityThresholdDays: 30 | 60 | 90 | 180 | 360;
  /** Days before shadow when stakeholders receive notice (DB: 1–90). */
  shadowNoticeDays: number;
  updatedAt: string;
};

export type PortalConnector = {
  id: string;
  organizationId: string;
  connectorType: ConnectorType;
  displayName: string;
  connectionStatus: ConnectionStatus;
  metadata: Record<string, string>;
  createdAt: string;
  lastValidatedAt?: string | null;
  validationError?: string | null;
  /** True when ciphertext exists in Supabase or local vault map (secrets never returned to the client). */
  credentialsStored?: boolean;
};

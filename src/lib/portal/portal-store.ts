import "server-only";

import type {
  ConnectionStatus,
  PortalConnector,
  PortalOrganization,
} from "@/types/portal";

import { hasEncryptedConnectorCredentials } from "./credential-memory";

/**
 * In-process portal store for local development when Supabase env is not set.
 */
const g = globalThis as unknown as {
  __biPrunerPortal?: {
    org: PortalOrganization;
    connectors: PortalConnector[];
  };
};

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001";

function seed(): { org: PortalOrganization; connectors: PortalConnector[] } {
  const now = new Date().toISOString();
  return {
    org: {
      id: DEMO_ORG_ID,
      name: "Demo Enterprise",
      slug: "demo-enterprise",
      inactivityThresholdDays: 90,
      shadowNoticeDays: 14,
      updatedAt: now,
    },
    connectors: [],
  };
}

function store() {
  if (!g.__biPrunerPortal) {
    g.__biPrunerPortal = seed();
  }
  return g.__biPrunerPortal;
}

export function getOrganization(): PortalOrganization {
  const o = store().org;
  return {
    ...o,
    shadowNoticeDays: o.shadowNoticeDays ?? 14,
  };
}

export function updateOrganization(
  patch: Partial<
    Pick<PortalOrganization, "name" | "slug" | "inactivityThresholdDays" | "shadowNoticeDays">
  >,
): PortalOrganization {
  const s = store();
  const now = new Date().toISOString();
  s.org = {
    ...s.org,
    ...patch,
    updatedAt: now,
  };
  return { ...s.org };
}

export function listConnectors(): PortalConnector[] {
  return store().connectors.map((c) => ({
    ...c,
    credentialsStored: hasEncryptedConnectorCredentials(c.id),
  }));
}

export function addConnector(input: {
  displayName: string;
  connectorType: PortalConnector["connectorType"];
  metadata: Record<string, string>;
  connectionStatus: ConnectionStatus;
  lastValidatedAt: string | null;
  validationError: string | null;
}): PortalConnector {
  const s = store();
  const row: PortalConnector = {
    id: crypto.randomUUID(),
    organizationId: s.org.id,
    connectorType: input.connectorType,
    displayName: input.displayName.trim(),
    connectionStatus: input.connectionStatus,
    metadata: { ...input.metadata },
    createdAt: new Date().toISOString(),
    lastValidatedAt: input.lastValidatedAt,
    validationError: input.validationError,
    credentialsStored: false,
  };
  s.connectors = [row, ...s.connectors];
  return { ...row };
}

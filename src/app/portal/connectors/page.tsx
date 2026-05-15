import { listConnectors } from "@/lib/portal/connector-service";

import { ConnectorsView } from "@/components/portal/connectors-view";

export default async function ConnectorsPage() {
  const connectors = await listConnectors();
  return <ConnectorsView initial={connectors} />;
}

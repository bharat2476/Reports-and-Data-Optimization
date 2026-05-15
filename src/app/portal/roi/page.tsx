import { getOrganization } from "@/lib/portal/organization-service";
import { computeRoiDashboard } from "@/lib/roi/compute-metrics";

import { RoiDashboard } from "@/components/portal/roi-dashboard";

export default async function RoiPage() {
  const org = await getOrganization();
  const data = await computeRoiDashboard(org.id);
  return <RoiDashboard data={data} />;
}

import { NextResponse } from "next/server";

import { computeRoiDashboard } from "@/lib/roi/compute-metrics";
import { getOrganization } from "@/lib/portal/organization-service";

export async function GET() {
  try {
    const org = await getOrganization();
    const payload = await computeRoiDashboard(org.id);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

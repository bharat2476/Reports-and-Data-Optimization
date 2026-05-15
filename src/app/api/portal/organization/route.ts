import { NextResponse } from "next/server";

import { getOrganization, updateOrganization } from "@/lib/portal/organization-service";
import type { PortalOrganization } from "@/types/portal";

const thresholds = new Set([30, 60, 90, 180, 360]);

export async function GET() {
  try {
    const organization = await getOrganization();
    return NextResponse.json({ organization });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected object body" }, { status: 400 });
  }

  const { name, slug, inactivityThresholdDays, shadowNoticeDays } = body as Record<string, unknown>;
  const patch: Partial<
    Pick<PortalOrganization, "name" | "slug" | "inactivityThresholdDays" | "shadowNoticeDays">
  > = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "name must be a string with min length 2" }, { status: 400 });
    }
    patch.name = name.trim();
  }

  if (slug !== undefined) {
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "slug must be lowercase letters, numbers, and single hyphens" },
        { status: 400 },
      );
    }
    patch.slug = slug;
  }

  if (inactivityThresholdDays !== undefined) {
    if (typeof inactivityThresholdDays !== "number" || !thresholds.has(inactivityThresholdDays)) {
      return NextResponse.json(
        { error: "inactivityThresholdDays must be one of 30, 60, 90, 180, 360" },
        { status: 400 },
      );
    }
    patch.inactivityThresholdDays = inactivityThresholdDays as PortalOrganization["inactivityThresholdDays"];
  }

  if (shadowNoticeDays !== undefined) {
    if (
      typeof shadowNoticeDays !== "number" ||
      !Number.isInteger(shadowNoticeDays) ||
      shadowNoticeDays < 1 ||
      shadowNoticeDays > 90
    ) {
      return NextResponse.json(
        { error: "shadowNoticeDays must be an integer from 1 to 90" },
        { status: 400 },
      );
    }
    patch.shadowNoticeDays = shadowNoticeDays;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const organization = await updateOrganization(patch);
    return NextResponse.json({ organization });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

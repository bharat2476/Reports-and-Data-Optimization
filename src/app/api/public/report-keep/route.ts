import { NextResponse } from "next/server";

import { applyReportKeep } from "@/lib/lifecycle/apply-keep";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rid = url.searchParams.get("rid");
  const oid = url.searchParams.get("oid");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!rid || !oid || !exp || !sig) {
    return NextResponse.json({ error: "Missing rid, oid, exp, or sig" }, { status: 400 });
  }

  const expUnix = Number.parseInt(exp, 10);
  if (!Number.isFinite(expUnix)) {
    return NextResponse.json({ error: "Invalid exp" }, { status: 400 });
  }

  const result = await applyReportKeep({
    reportId: rid,
    organizationId: oid,
    expUnixSec: expUnix,
    sigHex: sig,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(new URL("/portal?kept=1", request.url));
}

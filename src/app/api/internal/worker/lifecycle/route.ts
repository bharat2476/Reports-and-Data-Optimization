import { NextResponse } from "next/server";

import { runLifecycleCycle } from "@/lib/lifecycle/run-lifecycle-cycle";

export async function POST(request: Request) {
  const secret = process.env.WORKER_CRON_SECRET?.trim();
  const header = request.headers.get("x-bi-pruner-worker-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLifecycleCycle();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

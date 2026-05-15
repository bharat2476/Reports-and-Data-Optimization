import type { ReactNode } from "react";

import { PortalSidebar } from "@/components/portal/portal-sidebar";

/** Reads Supabase when configured — avoid static prerender at build time. */
export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      {/* headers() not used — sidebar highlights via client wrapper */}
      <PortalSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

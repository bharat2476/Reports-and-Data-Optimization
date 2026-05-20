import Link from "next/link";

import { listConnectors } from "@/lib/portal/connector-service";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProductGuideWidget } from "@/components/portal/product-guide-widget";

export default async function PortalHomePage() {
  const connectors = await listConnectors();
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Register your organization and connect Looker or Tableau. Credentials are validated against
          each vendor API, encrypted with AES-256-GCM (Vault), and stored in Supabase when database
          environment variables are configured; otherwise they stay in an in-memory vault for local
          development.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BI connectors</CardTitle>
            <CardDescription>
              {connectors.length === 0
                ? "No connectors yet. Add your first Looker or Tableau connection."
                : `${connectors.length} connector${connectors.length === 1 ? "" : "s"} registered.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/connectors"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Manage connectors
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
            <CardDescription>Name, slug, and default inactivity thresholds for lifecycle policies.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/settings"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Organization settings
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ROI & performance</CardTitle>
            <CardDescription>
              Estimated savings, lifecycle mix, duplicate logic score, and department cleanup leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/roi" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Open ROI dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
      <ProductGuideWidget />
    </div>
  );
}

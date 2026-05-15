import { getOrganization } from "@/lib/portal/organization-service";

import { OrgSettingsForm } from "@/components/portal/org-settings-form";

export default async function PortalSettingsPage() {
  const organization = await getOrganization();
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tenant display name, URL slug, and default inactivity threshold. When{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPABASE_URL</code> is set, reads and
          writes go to the <code className="rounded bg-muted px-1 py-0.5 text-xs">organizations</code>{" "}
          table; otherwise this uses the local demo store.
        </p>
      </div>
      <OrgSettingsForm organization={organization} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PortalOrganization } from "@/types/portal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const THRESHOLDS = [30, 60, 90, 180, 360] as const;

export function OrgSettingsForm({ organization }: { organization: PortalOrganization }) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [inactivityThresholdDays, setInactivityThresholdDays] = useState(
    organization.inactivityThresholdDays,
  );
  const [shadowNoticeDays, setShadowNoticeDays] = useState(organization.shadowNoticeDays);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, inactivityThresholdDays, shadowNoticeDays }),
      });
      const data = (await res.json()) as { error?: string; organization?: PortalOrganization };
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      if (data.organization) {
        setName(data.organization.name);
        setSlug(data.organization.slug);
        setInactivityThresholdDays(data.organization.inactivityThresholdDays);
        setShadowNoticeDays(data.organization.shadowNoticeDays);
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Tenant profile</CardTitle>
        <CardDescription>
          Tenant name, slug, idle threshold, and how far ahead to warn owners before Shadow. Persists to
          Supabase when configured.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              Saved.
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="orgSlug">URL slug</Label>
            <Input
              id="orgSlug"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Lowercase letters, numbers, single hyphens"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
            />
            <p className="text-muted-foreground text-xs">Used in future multi-tenant URLs and API scopes.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="threshold">Default inactivity threshold (days)</Label>
            <select
              id="threshold"
              className="border-input bg-background h-8 w-full max-w-xs rounded-lg border px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              value={inactivityThresholdDays}
              onChange={(e) =>
                setInactivityThresholdDays(Number(e.target.value) as PortalOrganization["inactivityThresholdDays"])
              }
            >
              {THRESHOLDS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Reports idle longer than this can move toward Flagged and Shadow lifecycle states.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shadowNotice">Stakeholder notice lead time (days)</Label>
            <Input
              id="shadowNotice"
              type="number"
              min={1}
              max={90}
              required
              value={shadowNoticeDays}
              onChange={(e) => setShadowNoticeDays(Number.parseInt(e.target.value, 10) || 14)}
            />
            <p className="text-muted-foreground text-xs">
              Department heads receive Email/Slack with a one-click keep link during this window.
            </p>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PortalConnector } from "@/types/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: PortalConnector["connectionStatus"]) {
  switch (status) {
    case "valid":
      return "default" as const;
    case "invalid":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function ConnectorsView({ initial }: { initial: PortalConnector[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [connectorType, setConnectorType] = useState<"looker" | "tableau">("looker");
  const [baseUrl, setBaseUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [lookerClientId, setLookerClientId] = useState("");
  const [lookerClientSecret, setLookerClientSecret] = useState("");
  const [tableauPatName, setTableauPatName] = useState("");
  const [tableauPatSecret, setTableauPatSecret] = useState("");

  function resetSecrets() {
    setLookerClientId("");
    setLookerClientSecret("");
    setTableauPatName("");
    setTableauPatSecret("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const metadata: Record<string, string> = { baseUrl: baseUrl.trim() };
      if (connectorType === "looker" && projectId.trim()) {
        metadata.projectId = projectId.trim();
      }
      if (connectorType === "tableau" && siteName.trim()) {
        metadata.siteName = siteName.trim();
      }

      const credentials =
        connectorType === "looker"
          ? {
              looker: {
                clientId: lookerClientId.trim(),
                clientSecret: lookerClientSecret.trim(),
              },
            }
          : {
              tableau: {
                patName: tableauPatName.trim(),
                patSecret: tableauPatSecret.trim(),
              },
            };

      const res = await fetch("/api/portal/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          connectorType,
          metadata,
          credentials,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setOpen(false);
      setDisplayName("");
      setBaseUrl("");
      setProjectId("");
      setSiteName("");
      resetSecrets();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">BI connectors</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each connector is checked against the vendor API (Looker login + user read, or Tableau REST
            PAT sign-in). Secrets are encrypted with AES-256-GCM and persisted to Supabase when
            configured, or held in an in-memory vault for local development.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Add connector
          </Button>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add BI connector</DialogTitle>
                <DialogDescription>
                  Validation runs before anything is stored. Production requires{" "}
                  <code className="text-xs">BI_PRUNER_VAULT_KEY</code>; local dev can use{" "}
                  <code className="text-xs">BI_PRUNER_VAULT_DEV_PHRASE</code> instead.
                </DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[min(70vh,520px)] gap-4 overflow-y-auto py-2 pr-1">
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    required
                    autoComplete="off"
                    placeholder="Production Looker"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="connectorType">Platform</Label>
                  <select
                    id="connectorType"
                    className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    value={connectorType}
                    onChange={(e) => setConnectorType(e.target.value as "looker" | "tableau")}
                  >
                    <option value="looker">Looker</option>
                    <option value="tableau">Tableau</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baseUrl">Server base URL</Label>
                  <Input
                    id="baseUrl"
                    required
                    type="url"
                    placeholder={
                      connectorType === "looker"
                        ? "https://looker.example.com"
                        : "https://tableau.example.com"
                    }
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                {connectorType === "looker" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="projectId">Default project ID (optional)</Label>
                    <Input
                      id="projectId"
                      autoComplete="off"
                      placeholder="e.g. analytics"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="siteName">Tableau site content URL (optional)</Label>
                    <Input
                      id="siteName"
                      autoComplete="off"
                      placeholder="Leave blank for default site"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                    />
                  </div>
                )}
                {connectorType === "looker" ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="clientId">Looker API3 client ID</Label>
                      <Input
                        id="clientId"
                        required
                        autoComplete="off"
                        value={lookerClientId}
                        onChange={(e) => setLookerClientId(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clientSecret">Looker API3 client secret</Label>
                      <Input
                        id="clientSecret"
                        required
                        type="password"
                        autoComplete="new-password"
                        value={lookerClientSecret}
                        onChange={(e) => setLookerClientSecret(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="patName">Personal access token name</Label>
                      <Input
                        id="patName"
                        required
                        autoComplete="off"
                        value={tableauPatName}
                        onChange={(e) => setTableauPatName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="patSecret">Personal access token secret</Label>
                      <Input
                        id="patSecret"
                        required
                        type="password"
                        autoComplete="new-password"
                        value={tableauPatSecret}
                        onChange={(e) => setTableauPatSecret(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Validating & saving…" : "Validate & save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered connectors</CardTitle>
          <CardDescription>
            API responses never include secrets. “Vault” indicates ciphertext exists in the database or
            local vault map.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {initial.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">No connectors yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Vault</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validated</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initial.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.displayName}</TableCell>
                    <TableCell className="capitalize">{c.connectorType}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">
                      {c.metadata.baseUrl ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.credentialsStored ? "secondary" : "outline"}>
                        {c.credentialsStored ? "stored" : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.connectionStatus)}>{c.connectionStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {c.lastValidatedAt
                        ? new Date(c.lastValidatedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {new Date(c.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

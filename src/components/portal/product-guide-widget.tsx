import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PRODUCT_NAME = "BI Reports and Data Optimization";

const outcomes = [
  { title: "Less BI clutter", detail: "Retire unused reports safely" },
  { title: "Lower cloud cost", detail: "Fewer duplicate queries" },
  { title: "Faster dashboards", detail: "Less metadata bloat" },
  { title: "Clear ownership", detail: "Know who owns each report" },
];

const workflowSteps = [
  {
    id: "overview",
    title: "Step 1: Start on Overview",
    portalLabel: "Overview (this page)",
    href: "/portal",
    body: (
      <>
        <p>
          <strong>What you do:</strong> Read this Product Guide, then use the cards above to jump to
          connectors, organization policy, or ROI metrics.
        </p>
        <p>
          <strong>What it represents:</strong> An executive landing page — like a control tower for
          your BI estate before you connect tools or change lifecycle rules.
        </p>
        <p>
          <strong>Why it matters:</strong> Everyone on the team can see the same story without
          opening Looker or Tableau first.
        </p>
      </>
    ),
  },
  {
    id: "connectors",
    title: "Step 2: Connect Looker or Tableau",
    portalLabel: "BI connectors",
    href: "/portal/connectors",
    body: (
      <>
        <p>
          <strong>What you do:</strong> Register your organization&apos;s BI server and add a
          Looker or Tableau connector with API credentials.
        </p>
        <p>
          <strong>What it represents:</strong> Plugging the product into the systems where reports
          actually live — the same way finance connects an ERP.
        </p>
        <p>
          <strong>Why it matters:</strong> Without a connection, the platform cannot see which
          reports exist, who owns them, or when they were last opened.
        </p>
        <p className="text-muted-foreground text-sm">
          Credentials are validated, encrypted in the Vault, and never shown again in the browser.
        </p>
      </>
    ),
  },
  {
    id: "settings",
    title: "Step 3: Set organization rules",
    portalLabel: "Organization",
    href: "/portal/settings",
    body: (
      <>
        <p>
          <strong>What you do:</strong> Name your organization and choose inactivity thresholds
          (for example, flag reports after 90 days without views, shadow after 120 days).
        </p>
        <p>
          <strong>What it represents:</strong> Your company&apos;s policy for when a report moves from{" "}
          <strong>Active</strong> → <strong>Flagged</strong> → <strong>Shadow</strong> →{" "}
          <strong>Sunset</strong>.
        </p>
        <p>
          <strong>Why it matters:</strong> Cleanup is disciplined, not random — stakeholders get
          notice before anything is hidden or retired.
        </p>
      </>
    ),
  },
  {
    id: "roi",
    title: "Step 4: Review ROI & performance",
    portalLabel: "ROI & performance",
    href: "/portal/roi",
    body: (
      <>
        <p>
          <strong>What you do:</strong> Open the ROI dashboard to see estimated savings, duplicate
          logic score, lifecycle mix, and which departments have the most cleanup opportunity.
        </p>
        <p>
          <strong>What it represents:</strong> The business case for BI hygiene — like a monthly
          operations review for report sprawl and warehouse cost.
        </p>
        <p>
          <strong>Why it matters:</strong> Leaders need numbers, not anecdotes, to fund consolidation
          and retire low-value dashboards.
        </p>
      </>
    ),
  },
];

function GuideSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-lg border border-border bg-muted/30 px-4 py-3 open:bg-muted/50"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none font-medium text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span
            className="text-muted-foreground text-xs font-normal group-open:rotate-180 transition-transform"
            aria-hidden
          >
            ▼
          </span>
        </span>
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </details>
  );
}

export function ProductGuideWidget() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <BookOpen className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Product Guide</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              What {PRODUCT_NAME} does — explained without technical jargon. Use this while you
              explore the other portal areas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">{PRODUCT_NAME} — explained simply</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            Think of this as a <strong className="text-foreground">health checkup for your BI reports</strong>.
            It connects to Looker or Tableau, finds reports nobody uses or that duplicate the same
            logic, and helps your team retire clutter safely — before it slows dashboards and raises
            cloud bills.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-sm">What is the objective?</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Main goal:</strong> Reduce BI technical debt while
            keeping stakeholders informed — not surprise them with deleted dashboards.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">The product answers three questions:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Which reports matter?</strong> — Usage, owners, last
              accessed
            </li>
            <li>
              <strong className="text-foreground">Which reports duplicate each other?</strong> —
              Same logic, different formatting
            </li>
            <li>
              <strong className="text-foreground">What should we retire?</strong> — Lifecycle with
              notice and one-click &quot;keep&quot; links
            </li>
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map(({ title, detail }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-background/80 px-3 py-2.5"
            >
              <p className="font-medium text-sm">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-medium text-sm">What business problem does it solve?</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Enterprise BI teams often have hundreds of Looker looks or Tableau workbooks. Over time,
            reports pile up, queries repeat the same joins, and warehouse cost grows — while owners
            are unsure which assets are still needed.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Audit usage and definitions from connected BI tools</li>
            <li>Flag semantically duplicate SQL / logic</li>
            <li>Run a lifecycle: Active → Flagged → Shadow → Sunset</li>
            <li>Show ROI: savings, bloat reduction, and department leaderboard</li>
          </ul>
        </div>

        <div>
          <h3 className="font-medium text-sm">Portal workflow — step by step</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Connect BI → Set policy → Ingest &amp; compare → Measure ROI
          </p>
          <div className="mt-3 space-y-2">
            {workflowSteps.map((step, index) => (
              <GuideSection key={step.id} title={step.title} defaultOpen={index === 0}>
                {step.body}
                <p className="pt-1">
                  <Link
                    href={step.href}
                    className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                  >
                    Open {step.portalLabel} →
                  </Link>
                </p>
              </GuideSection>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-sm">The big picture</h3>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {`BI tools (Looker / Tableau)
        ↓
Ingest usage + report definitions
        ↓
Detect duplicates (same logic, different SQL)
        ↓
Apply lifecycle rules (inactive → flagged → shadow → sunset)
        ↓
Notify owners (email / Slack) + one-click keep
        ↓
ROI dashboard — savings, bloat, department leaderboard`}
          </pre>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border px-4 py-3 text-sm">
            <p className="font-medium">It is</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>A BI observability and cleanup platform</li>
              <li>Built for analytics / data platform teams</li>
              <li>Connector-based (Looker &amp; Tableau)</li>
              <li>Policy-driven retirement, not bulk delete</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border px-4 py-3 text-sm">
            <p className="font-medium">It is not</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>A replacement for Looker or Tableau</li>
              <li>Automatic deletion without stakeholder notice</li>
              <li>Only a static report inventory spreadsheet</li>
              <li>Finished warehouse cost attribution (roadmap item)</li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm leading-relaxed">
          <strong className="text-foreground">One-sentence summary:</strong>{" "}
          <span className="text-muted-foreground">
            {PRODUCT_NAME} helps teams find unused and duplicate BI reports, retire them through a
            clear lifecycle, and prove savings with an ROI dashboard.
          </span>
        </div>

        <div>
          <h3 className="font-medium text-sm">Try it now (5-minute path)</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <Link href="/portal/connectors" className="text-foreground underline-offset-4 hover:underline">
                BI connectors
              </Link>{" "}
              — add a Looker or Tableau connection (or use mock data locally)
            </li>
            <li>
              <Link href="/portal/settings" className="text-foreground underline-offset-4 hover:underline">
                Organization
              </Link>{" "}
              — set name and inactivity thresholds
            </li>
            <li>
              <Link href="/portal/roi" className="text-foreground underline-offset-4 hover:underline">
                ROI &amp; performance
              </Link>{" "}
              — review savings and duplicate-logic score
            </li>
            <li>Return here anytime for context on what each area means</li>
          </ol>
          <p className="mt-3 text-muted-foreground text-xs">
            For setup, API keys, and architecture details, see{" "}
            <a
              href="https://github.com/bharat2476/Reports-and-Data-Optimization/blob/main/README.md"
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              README.md
            </a>{" "}
            on GitHub.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

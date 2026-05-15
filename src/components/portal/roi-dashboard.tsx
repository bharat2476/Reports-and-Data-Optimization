"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RoiDashboardPayload } from "@/lib/roi/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LIFECYCLE_COLORS: Record<string, string> = {
  active: "oklch(0.65 0.15 145)",
  flagged: "oklch(0.75 0.15 85)",
  shadow: "oklch(0.55 0.12 260)",
  sunset: "oklch(0.5 0.02 0)",
};

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function RoiDashboard({ data }: { data: RoiDashboardPayload }) {
  const lifecycleChart = (
    ["active", "flagged", "shadow", "sunset"] as const
  ).map((k) => ({
    name: k,
    value: data.lifecycle[k],
    fill: LIFECYCLE_COLORS[k] ?? "#888",
  }));

  const leaderboard = data.departmentLeaderboard.slice(0, 10).map((d) => ({
    name: d.department.length > 24 ? `${d.department.slice(0, 22)}…` : d.department,
    score: d.cleanupScore,
    sunset: d.sunset,
    shadow: d.shadow,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">ROI & performance</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Modeled savings from sunsetted assets, inventory hygiene, and duplicate logic pressure derived
          from <code className="rounded bg-muted px-1 py-0.5 text-xs">report_metadata</code>. Connecting
          Snowflake or BigQuery query logs for dollar-accurate attribution is a follow-on integration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Est. monthly savings</CardTitle>
            <CardDescription>Sunset × configured $ / asset</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {currency.format(data.estimatedMonthlySavingsUsd)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Metadata bloat reduction</CardTitle>
            <CardDescription>Share in shadow or sunset</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.efficiency.metadataBloatReductionPct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latency improvement (model)</CardTitle>
            <CardDescription>Weighted non-active share</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.efficiency.latencyImprovementPct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logic consolidation score</CardTitle>
            <CardDescription>From AST duplicate slots</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.efficiency.logicConsolidationScore}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifecycle mix</CardTitle>
            <CardDescription>{data.totals.reports} tracked reports</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lifecycleChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {lifecycleChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings trend (illustrative)</CardTitle>
            <CardDescription>Scaled from current snapshot until warehouse logs land</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.savingsTrendUsd} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip
                  formatter={(v) =>
                    typeof v === "number" ? currency.format(v) : String(v ?? "")
                  }
                />
                <Line type="monotone" dataKey="value" stroke="oklch(0.45 0.2 260)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department leaderboard</CardTitle>
          <CardDescription>
            Grouped by owner email domain; score weights sunset, shadow, and flagged cleanup.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-sm">No owner emails yet — leaderboard fills after ingestion.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaderboard}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Cleanup score" fill="oklch(0.5 0.15 200)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sunset" name="Sunset" fill="oklch(0.45 0.02 0)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Generated {new Date(data.generatedAt).toLocaleString()} · {data.totals.reportsWithAstHash} reports
        with AST hash · {data.totals.duplicateLogicSlots} duplicate logic slots (
        {data.totals.reports > 0
          ? Math.round((100 * data.totals.duplicateLogicSlots) / data.totals.reports)
          : 0}
        % of inventory).
      </p>
    </div>
  );
}

import type { LifecycleState } from "@/lib/lifecycle/types";

export type RoiLifecycleBreakdown = Record<LifecycleState, number>;

export type DepartmentLeaderboardRow = {
  department: string;
  active: number;
  flagged: number;
  shadow: number;
  sunset: number;
  /** Higher = more aggressive cleanup (weighted lifecycle tail). */
  cleanupScore: number;
};

export type RoiDashboardPayload = {
  generatedAt: string;
  organizationId: string;
  totals: {
    reports: number;
    reportsWithAstHash: number;
    duplicateLogicSlots: number;
  };
  lifecycle: RoiLifecycleBreakdown;
  /** Modeled from sunset count × env cost (warehouse log join is a future enhancement). */
  estimatedMonthlySavingsUsd: number;
  efficiency: {
    metadataBloatReductionPct: number;
    latencyImprovementPct: number;
    logicConsolidationScore: number;
  };
  departmentLeaderboard: DepartmentLeaderboardRow[];
  /** Six placeholder months for charting when no warehouse history exists yet. */
  savingsTrendUsd: { label: string; value: number }[];
};

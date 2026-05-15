export type LifecycleState = "active" | "flagged" | "shadow" | "sunset";

export type OrgLifecyclePolicy = {
  organizationId: string;
  inactivityThresholdDays: number;
  shadowNoticeDays: number;
};

export type ReportLifecycleRow = {
  id: string;
  organizationId: string;
  connectorId: string;
  externalId: string;
  title: string | null;
  ownerEmail: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  lifecycleState: LifecycleState;
  shadowAt: string | null;
  lastShadowNoticeSentAt: string | null;
  keepOverrideUntil: string | null;
};

export type LifecycleCycleResult = {
  reportsScanned: number;
  stateUpdates: number;
  noticesSent: number;
  errors: string[];
};

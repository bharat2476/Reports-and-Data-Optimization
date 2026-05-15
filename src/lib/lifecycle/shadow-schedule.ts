import type { LifecycleState } from "./types";

/**
 * Reference activity for idle calculation: last BI access, else row creation time.
 */
export function referenceActivityAt(
  lastAccessedAt: string | null,
  createdAt: string,
): Date {
  if (lastAccessedAt) {
    const d = new Date(lastAccessedAt);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  return new Date(createdAt);
}

/** First instant the asset is eligible for Shadow (idle since reference + threshold). */
export function computeShadowAt(
  lastAccessedAt: string | null,
  createdAt: string,
  inactivityThresholdDays: number,
): Date {
  const ref = referenceActivityAt(lastAccessedAt, createdAt);
  const ms = ref.getTime() + inactivityThresholdDays * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

export function desiredLifecycleState(
  now: Date,
  shadowAt: Date,
  shadowNoticeDays: number,
  keepOverrideUntil: Date | null,
): LifecycleState {
  if (keepOverrideUntil && now.getTime() < keepOverrideUntil.getTime()) {
    return "active";
  }
  const noticeStart = shadowAt.getTime() - shadowNoticeDays * 24 * 60 * 60 * 1000;
  if (now.getTime() < noticeStart) {
    return "active";
  }
  if (now.getTime() < shadowAt.getTime()) {
    return "flagged";
  }
  return "shadow";
}

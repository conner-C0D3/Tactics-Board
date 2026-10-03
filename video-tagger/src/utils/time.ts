import type { Match } from "../types";

export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.floor(Math.abs(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${sign}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export interface MatchClock {
  period: number;
  minute: number;
  second: number;
  /** True when the period's kickoff hasn't been marked yet, so minute/second are just the raw video time. */
  unsynced: boolean;
}

/**
 * Converts a raw video timestamp into a match-clock reading for the given
 * period, using the analyst-marked kickoff time for that period. Minutes
 * accumulate across periods the way a broadcast clock does (second half
 * starts at 45:00, not 00:00), based on the configured length of each prior
 * period.
 */
export function videoTimeToMatchClock(match: Match, period: number, videoTimeSeconds: number): MatchClock {
  const kickoff = match.periodKickoffVideoSeconds[period];
  if (kickoff === undefined) {
    const m = Math.floor(videoTimeSeconds / 60);
    const s = Math.floor(videoTimeSeconds % 60);
    return { period, minute: m, second: s, unsynced: true };
  }
  const elapsed = Math.max(0, videoTimeSeconds - kickoff);
  const priorMinutes = match.periods
    .filter((p) => p.number < period)
    .reduce((sum, p) => sum + p.lengthMinutes, 0);
  const minute = priorMinutes + Math.floor(elapsed / 60);
  const second = Math.floor(elapsed % 60);
  return { period, minute, second, unsynced: false };
}

export function matchClockLabel(clock: MatchClock): string {
  const mm = String(clock.minute).padStart(2, "0");
  const ss = String(clock.second).padStart(2, "0");
  return clock.unsynced ? `${mm}:${ss} (video time)` : `${mm}:${ss}`;
}

/** Infers which period a video timestamp falls into, based on marked kickoffs. Defaults to the last period marked at or before this time, or period 1. */
export function periodForVideoTime(match: Match, videoTimeSeconds: number): number {
  const entries = Object.entries(match.periodKickoffVideoSeconds)
    .map(([p, t]) => [Number(p), t] as const)
    .sort((a, b) => a[1] - b[1]);
  let current = match.periods[0]?.number ?? 1;
  for (const [period, kickoff] of entries) {
    if (videoTimeSeconds >= kickoff) current = period;
  }
  return current;
}

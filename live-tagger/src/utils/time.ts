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
}

/**
 * Converts seconds elapsed within a period's live clock into a match-clock
 * reading. Minutes accumulate across periods the way a broadcast clock does
 * (second half starts at 45:00, not 00:00), based on the configured length
 * of each prior period.
 */
export function elapsedToMatchClock(match: Match, period: number, elapsedSeconds: number): MatchClock {
  const priorMinutes = match.periods.filter((p) => p.number < period).reduce((sum, p) => sum + p.lengthMinutes, 0);
  const minute = priorMinutes + Math.floor(elapsedSeconds / 60);
  const second = Math.floor(elapsedSeconds % 60);
  return { period, minute, second };
}

export function matchClockLabel(clock: MatchClock): string {
  const mm = String(clock.minute).padStart(2, "0");
  const ss = String(clock.second).padStart(2, "0");
  return `${mm}:${ss}`;
}

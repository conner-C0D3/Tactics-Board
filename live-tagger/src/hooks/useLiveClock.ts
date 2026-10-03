import { useEffect, useState } from "react";
import type { Match, PeriodClockState } from "../types";
import { updateMatch } from "../db/matchRepo";

function elapsedFor(clock: PeriodClockState | undefined, nowMs: number): number {
  if (!clock) return 0;
  if (clock.status === "running" && clock.startedAtEpochMs !== undefined) {
    return clock.accumulatedSeconds + (nowMs - clock.startedAtEpochMs) / 1000;
  }
  return clock.accumulatedSeconds;
}

/**
 * Drives the live match clock. Elapsed time is computed from a stored start
 * timestamp plus real wall-clock time, not from a ticking in-memory counter,
 * so a page refresh mid-period doesn't lose time or reset the clock.
 */
export function useLiveClock(match: Match | undefined) {
  const [now, setNow] = useState(() => Date.now());

  const periodClocks = match?.periodClocks ?? {};
  const anyRunning = Object.values(periodClocks).some((c) => c.status === "running");

  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [anyRunning]);

  function elapsedSecondsFor(period: number): number {
    return elapsedFor(periodClocks[period], now);
  }

  function statusFor(period: number): PeriodClockState["status"] {
    return periodClocks[period]?.status ?? "pending";
  }

  // The period currently relevant for new events: the last one that's been
  // started, running or not. Defaults to the first configured period.
  let activePeriod = match?.periods[0]?.number ?? 1;
  for (const p of match?.periods ?? []) {
    if (periodClocks[p.number]) activePeriod = p.number;
  }

  async function startPeriod(period: number) {
    if (!match) return;
    const existing = periodClocks[period];
    const next: PeriodClockState = {
      status: "running",
      accumulatedSeconds: existing?.accumulatedSeconds ?? 0,
      startedAtEpochMs: Date.now(),
    };
    await updateMatch(match.id, { periodClocks: { ...periodClocks, [period]: next } });
  }

  async function pausePeriod(period: number) {
    if (!match) return;
    const existing = periodClocks[period];
    if (!existing || existing.status !== "running") return;
    const next: PeriodClockState = { status: "paused", accumulatedSeconds: elapsedFor(existing, Date.now()) };
    await updateMatch(match.id, { periodClocks: { ...periodClocks, [period]: next } });
  }

  async function resumePeriod(period: number) {
    if (!match) return;
    const existing = periodClocks[period];
    const next: PeriodClockState = {
      status: "running",
      accumulatedSeconds: existing?.accumulatedSeconds ?? 0,
      startedAtEpochMs: Date.now(),
    };
    await updateMatch(match.id, { periodClocks: { ...periodClocks, [period]: next } });
  }

  async function endPeriod(period: number) {
    if (!match) return;
    const existing = periodClocks[period];
    const next: PeriodClockState = { status: "ended", accumulatedSeconds: elapsedFor(existing, Date.now()) };
    await updateMatch(match.id, { periodClocks: { ...periodClocks, [period]: next } });
  }

  return { elapsedSecondsFor, statusFor, activePeriod, startPeriod, pausePeriod, resumePeriod, endPeriod };
}

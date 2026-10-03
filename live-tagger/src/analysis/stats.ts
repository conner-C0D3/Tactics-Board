import type { Match, MatchEvent, PassEvent, ShotEvent, ShotOutcome } from "../types";

export type TeamFilter = "all" | "home" | "away";

export interface EventFilters {
  team: TeamFilter;
  period: number | "all";
}

export function teamIdForFilter(match: Match, filter: TeamFilter): string | null {
  if (filter === "home") return match.homeTeam.id;
  if (filter === "away") return match.awayTeam.id;
  return null;
}

export function filterEvents(events: MatchEvent[], match: Match, filters: EventFilters): MatchEvent[] {
  const teamId = teamIdForFilter(match, filters.team);
  return events.filter((e) => {
    if (teamId && e.teamId !== teamId) return false;
    if (filters.period !== "all" && e.period !== filters.period) return false;
    return true;
  });
}

export function isPass(e: MatchEvent): e is PassEvent {
  return e.type === "pass";
}
export function isShot(e: MatchEvent): e is ShotEvent {
  return e.type === "shot";
}

export interface TeamPassSummary {
  teamId: string;
  teamName: string;
  color: string;
  attempted: number;
  completed: number;
  completionPct: number;
}

export function passSummaryByTeam(events: MatchEvent[], match: Match): TeamPassSummary[] {
  return [match.homeTeam, match.awayTeam].map((team) => {
    const passes = events.filter(isPass).filter((e) => e.teamId === team.id);
    const completed = passes.filter((p) => p.pass.outcome === "Complete").length;
    return {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      attempted: passes.length,
      completed,
      completionPct: passes.length ? Math.round((completed / passes.length) * 100) : 0,
    };
  });
}

export interface PlayerPassSummary {
  playerId: string;
  playerName: string;
  teamId: string;
  color: string;
  attempted: number;
  completed: number;
  incomplete: number;
  completionPct: number;
}

export function passSummaryByPlayer(events: MatchEvent[], match: Match): PlayerPassSummary[] {
  const result: PlayerPassSummary[] = [];
  for (const team of [match.homeTeam, match.awayTeam]) {
    for (const player of team.players) {
      const passes = events.filter(isPass).filter((e) => e.teamId === team.id && e.playerId === player.id);
      if (passes.length === 0) continue;
      const completed = passes.filter((p) => p.pass.outcome === "Complete").length;
      result.push({
        playerId: player.id,
        playerName: `#${player.shirtNumber} ${player.name}`,
        teamId: team.id,
        color: team.color,
        attempted: passes.length,
        completed,
        incomplete: passes.length - completed,
        completionPct: Math.round((completed / passes.length) * 100),
      });
    }
  }
  return result.sort((a, b) => b.attempted - a.attempted);
}

export interface TeamShotSummary {
  teamId: string;
  teamName: string;
  color: string;
  total: number;
  goals: number;
  onTarget: number;
  onTargetPct: number;
  outcomes: Record<ShotOutcome, number>;
}

const ALL_SHOT_OUTCOMES: ShotOutcome[] = ["Goal", "Saved", "Off Target", "Blocked", "Post", "Wayward"];
const ON_TARGET_OUTCOMES: ShotOutcome[] = ["Goal", "Saved"];

export function shotSummaryByTeam(events: MatchEvent[], match: Match): TeamShotSummary[] {
  return [match.homeTeam, match.awayTeam].map((team) => {
    const shots = events.filter(isShot).filter((e) => e.teamId === team.id);
    const outcomes = Object.fromEntries(ALL_SHOT_OUTCOMES.map((o) => [o, 0])) as Record<ShotOutcome, number>;
    for (const s of shots) outcomes[s.shot.outcome]++;
    const onTarget = shots.filter((s) => ON_TARGET_OUTCOMES.includes(s.shot.outcome)).length;
    return {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      total: shots.length,
      goals: outcomes.Goal,
      onTarget,
      onTargetPct: shots.length ? Math.round((onTarget / shots.length) * 100) : 0,
      outcomes,
    };
  });
}

export interface PlayerShotSummary {
  playerId: string;
  playerName: string;
  teamId: string;
  color: string;
  total: number;
  goals: number;
}

export function shotSummaryByPlayer(events: MatchEvent[], match: Match): PlayerShotSummary[] {
  const result: PlayerShotSummary[] = [];
  for (const team of [match.homeTeam, match.awayTeam]) {
    for (const player of team.players) {
      const shots = events.filter(isShot).filter((e) => e.teamId === team.id && e.playerId === player.id);
      if (shots.length === 0) continue;
      result.push({
        playerId: player.id,
        playerName: `#${player.shirtNumber} ${player.name}`,
        teamId: team.id,
        color: team.color,
        total: shots.length,
        goals: shots.filter((s) => s.shot.outcome === "Goal").length,
      });
    }
  }
  return result.sort((a, b) => b.total - a.total);
}

export const SHOT_OUTCOME_COLORS: Record<ShotOutcome, string> = {
  Goal: "#facc15",
  Saved: "#38bdf8",
  "Off Target": "#94a3b8",
  Blocked: "#f97316",
  Post: "#a855f7",
  Wayward: "#64748b",
};

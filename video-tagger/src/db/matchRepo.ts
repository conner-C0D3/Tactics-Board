import { db } from "./db";
import { newId } from "../utils/id";
import type { Match, Team, Period, TaggingScope } from "../types";

export interface NewMatchInput {
  name: string;
  date: string;
  competition: string;
  venue: string;
  homeTeam: Omit<Team, "id"> & { id?: string };
  awayTeam: Omit<Team, "id"> & { id?: string };
  periods: Period[];
  taggingScope: TaggingScope;
}

export function emptyTeam(name = "", color = "#2563eb"): Team {
  return { id: newId(), name, color, players: [] };
}

export function defaultPeriods(lengthMinutes = 45): Period[] {
  return [
    { number: 1, lengthMinutes },
    { number: 2, lengthMinutes },
  ];
}

export async function createMatch(input: NewMatchInput): Promise<Match> {
  const now = Date.now();
  const match: Match = {
    id: newId(),
    name: input.name,
    date: input.date,
    competition: input.competition,
    venue: input.venue,
    homeTeam: { ...input.homeTeam, id: input.homeTeam.id ?? newId() },
    awayTeam: { ...input.awayTeam, id: input.awayTeam.id ?? newId() },
    periods: input.periods,
    taggingScope: input.taggingScope,
    periodKickoffVideoSeconds: {},
    createdAt: now,
    updatedAt: now,
  };
  await db.matches.add(match);
  return match;
}

export async function listMatches(): Promise<Match[]> {
  const matches = await db.matches.toArray();
  return matches.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMatch(id: string): Promise<Match | undefined> {
  return db.matches.get(id);
}

export async function updateMatch(id: string, patch: Partial<Match>): Promise<void> {
  await db.matches.update(id, { ...patch, updatedAt: Date.now() });
}

export async function renameMatch(id: string, name: string): Promise<void> {
  await updateMatch(id, { name });
}

export async function deleteMatch(id: string): Promise<void> {
  await db.transaction("rw", db.matches, db.events, db.videoHandles, async () => {
    await db.events.where("matchId").equals(id).delete();
    await db.videoHandles.delete(id);
    await db.matches.delete(id);
  });
}

export async function setPeriodKickoff(matchId: string, period: number, videoSeconds: number): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;
  const next = { ...match.periodKickoffVideoSeconds, [period]: videoSeconds };
  await updateMatch(matchId, { periodKickoffVideoSeconds: next });
}

export async function clearPeriodKickoff(matchId: string, period: number): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;
  const next = { ...match.periodKickoffVideoSeconds };
  delete next[period];
  await updateMatch(matchId, { periodKickoffVideoSeconds: next });
}

import { db } from "../db/db";
import { newId } from "./id";
import type { Match, MatchEvent, Team } from "../types";

export interface MatchBackup {
  formatVersion: 1;
  exportedAt: string;
  match: Match;
  events: MatchEvent[];
}

/**
 * A full, re-importable snapshot of one match: setup, lineups and every
 * recorded event. This is the app's own backup format (not the StatsBomb
 * export, which is a one-way, documented subset - see src/statsbomb/).
 */
export async function exportMatchBackup(matchId: string): Promise<MatchBackup> {
  const match = await db.matches.get(matchId);
  if (!match) throw new Error("Match not found");
  const events = await db.events.where("matchId").equals(matchId).toArray();
  return { formatVersion: 1, exportedAt: new Date().toISOString(), match, events };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function remapEvent(event: MatchEvent, newMatchId: string, idMap: Map<string, string>): MatchEvent {
  const mapOpt = (id: string | undefined) => (id ? (idMap.get(id) ?? id) : undefined);
  const base = {
    ...event,
    id: newId(),
    matchId: newMatchId,
    teamId: idMap.get(event.teamId) ?? event.teamId,
    playerId: mapOpt(event.playerId),
  };
  if (base.type === "pass") {
    return { ...base, pass: { ...base.pass, recipientId: mapOpt(base.pass.recipientId) } };
  }
  return base;
}

export async function importMatchBackup(raw: unknown): Promise<Match> {
  const backup = raw as Partial<MatchBackup> | null;
  if (!backup || backup.formatVersion !== 1 || !backup.match || !backup.events) {
    throw new Error("This file is not a recognized match backup.");
  }
  const oldMatch = backup.match;
  const idMap = new Map<string, string>();
  const remapId = (id: string) => {
    if (!idMap.has(id)) idMap.set(id, newId());
    return idMap.get(id)!;
  };
  const remapTeam = (team: Team): Team => ({
    ...team,
    id: remapId(team.id),
    players: team.players.map((p) => ({ ...p, id: remapId(p.id) })),
  });

  const newMatchId = newId();
  const newMatch: Match = {
    ...oldMatch,
    id: newMatchId,
    name: `${oldMatch.name} (imported)`,
    homeTeam: remapTeam(oldMatch.homeTeam),
    awayTeam: remapTeam(oldMatch.awayTeam),
    periodClocks: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const newEvents = backup.events.map((e) => remapEvent(e, newMatchId, idMap));

  await db.transaction("rw", db.matches, db.events, async () => {
    await db.matches.add(newMatch);
    await db.events.bulkAdd(newEvents);
  });

  return newMatch;
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

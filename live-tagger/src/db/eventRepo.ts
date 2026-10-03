import { db } from "./db";
import { newId } from "../utils/id";
import type { MatchEvent, NewMatchEvent } from "../types";

export async function listEventsForMatch(matchId: string): Promise<MatchEvent[]> {
  const events = await db.events.where("matchId").equals(matchId).toArray();
  return events.sort((a, b) => a.index - b.index);
}

export async function addEvent(event: NewMatchEvent): Promise<MatchEvent> {
  const existing = await db.events.where("matchId").equals(event.matchId).count();
  const withIds = { ...event, id: newId(), index: existing } as MatchEvent;
  await db.events.add(withIds);
  return withIds;
}

export async function updateEvent(id: string, patch: NewMatchEvent): Promise<void> {
  await db.events.update(id, patch);
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}

/** Re-sequences the `index` field to chronological order, called after edits that might reorder events. */
export async function resequenceEvents(matchId: string): Promise<void> {
  const events = await listEventsForMatch(matchId);
  const sorted = [...events].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
  await db.transaction("rw", db.events, async () => {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].index !== i) {
        await db.events.update(sorted[i].id, { index: i });
      }
    }
  });
}

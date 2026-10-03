import Dexie, { type Table } from "dexie";
import type { Match, MatchEvent } from "../types";

/**
 * A FileSystemFileHandle stored outside the Match record. Keeping it in its
 * own table means the Match object (and therefore JSON backups/exports of
 * it) never needs to deal with a non-JSON-serializable value - handles are
 * structured-clone-able for IndexedDB in Chromium browsers, but they are not
 * JSON.stringify-able, and they don't exist at all in Firefox/Safari.
 */
export interface VideoHandleRecord {
  matchId: string;
  handle: FileSystemFileHandle;
}

class TaggerDB extends Dexie {
  matches!: Table<Match, string>;
  events!: Table<MatchEvent, string>;
  videoHandles!: Table<VideoHandleRecord, string>;

  constructor() {
    super("soccer-video-tagger");
    this.version(1).stores({
      matches: "id, name, date, updatedAt",
      events: "id, matchId, [matchId+index], [matchId+type], period",
      videoHandles: "matchId",
    });
  }
}

export const db = new TaggerDB();

import Dexie, { type Table } from "dexie";
import type { Match, MatchEvent } from "../types";

class TaggerDB extends Dexie {
  matches!: Table<Match, string>;
  events!: Table<MatchEvent, string>;

  constructor() {
    super("soccer-live-tagger");
    this.version(1).stores({
      matches: "id, name, date, updatedAt",
      events: "id, matchId, [matchId+index], [matchId+type], period",
    });
  }
}

export const db = new TaggerDB();

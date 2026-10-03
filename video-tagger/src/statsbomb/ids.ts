/**
 * Local id tables used only to give every StatsBomb-style `{ id, name }`
 * object a stable integer id within this app's exports.
 *
 * IMPORTANT: these integers are NOT guaranteed to match StatsBomb's own
 * internal numbering (that registry isn't fully published and can change).
 * The `name` strings are the real StatsBomb vocabulary and are what
 * third-party tools (kloppy, mplsoccer, socceraction, ...) key off in
 * practice - match on `name`, not `id`, if you consume this export
 * elsewhere. See src/statsbomb/README.md for the full caveat.
 */

export const EVENT_TYPE_IDS: Record<string, number> = {
  Pass: 30,
  Shot: 16,
  "Ball Recovery": 2,
  Dispossessed: 3,
  Duel: 4,
  Block: 6,
  Clearance: 9,
  Interception: 10,
  Dribble: 14,
  Pressure: 17,
  "Foul Won": 21,
  "Foul Committed": 22,
  Miscontrol: 38,
  Other: 9999,
};

export const PLAY_PATTERN_IDS: Record<string, number> = {
  "Regular Play": 1,
  "From Corner": 2,
  "From Free Kick": 3,
  "From Throw In": 4,
  Other: 5,
  "From Counter": 6,
  "From Goal Kick": 7,
  "From Keeper": 8,
  "From Kick Off": 9,
};

export const PASS_HEIGHT_IDS: Record<string, number> = {
  "Ground Pass": 1,
  "Low Pass": 2,
  "High Pass": 3,
};

export const BODY_PART_IDS: Record<string, number> = {
  "Right Foot": 40,
  "Left Foot": 38,
  Head: 37,
  "Other Body Part": 70,
};

export const PASS_TYPE_IDS: Record<string, number> = {
  Corner: 61,
  "Free Kick": 62,
  "Kick Off": 65,
  "Throw-in": 67,
  "Goal Kick": 63,
};

export const PASS_OUTCOME_IDS: Record<string, number> = {
  Incomplete: 9,
  Out: 75,
  Unknown: 74,
};

export const SHOT_TYPE_IDS: Record<string, number> = {
  "Open Play": 87,
  "Free Kick": 62,
  Penalty: 88,
};

export const SHOT_OUTCOME_IDS: Record<string, number> = {
  Goal: 97,
  Saved: 100,
  "Off T": 98,
  Blocked: 96,
  Post: 99,
  Wayward: 101,
};

export function idName(table: Record<string, number>, name: string): { id: number; name: string } {
  return { id: table[name] ?? 0, name };
}

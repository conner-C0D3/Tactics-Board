// Core data model for the live match tagging app.
//
// Pitch coordinates follow StatsBomb's convention so that export is a direct
// mapping instead of a conversion: x in [0, 120] along the length of the
// pitch, y in [0, 80] across the width, origin (0,0) at the top-left corner
// as viewed from the sideline you're standing on. See src/statsbomb/README.md.

export type ID = string;

export type TaggingScope = "both" | "home" | "away";

export interface Period {
  /** 1 = first half, 2 = second half, 3/4 = extra time, 5 = penalties */
  number: number;
  lengthMinutes: number;
}

export interface Player {
  id: ID;
  name: string;
  shirtNumber: number;
  position?: string;
  isStarter: boolean;
}

export interface Team {
  id: ID;
  name: string;
  /** Hex color used for pitch markers, timeline chips and charts. */
  color: string;
  players: Player[];
}

export type PeriodClockStatus = "pending" | "running" | "paused" | "ended";

/**
 * Live wall-clock state for one period. While `status` is "running",
 * elapsed time keeps counting using real time (`startedAtEpochMs`), so the
 * clock stays correct even across a page reload - there is no video to
 * pause. `accumulatedSeconds` banks the time from any earlier run/pause
 * cycles (e.g. a stoppage) for that period.
 */
export interface PeriodClockState {
  status: PeriodClockStatus;
  accumulatedSeconds: number;
  startedAtEpochMs?: number;
}

export interface Match {
  id: ID;
  name: string;
  date: string; // ISO yyyy-mm-dd
  competition: string;
  venue: string;
  homeTeam: Team;
  awayTeam: Team;
  periods: Period[];
  taggingScope: TaggingScope;
  /** Live clock state per period number. Missing entry = not started yet. */
  periodClocks: Record<number, PeriodClockState>;
  createdAt: number;
  updatedAt: number;
}

export interface PitchLocation {
  x: number; // 0-120
  y: number; // 0-80
}

export type PlayPattern =
  | "Regular Play"
  | "From Corner"
  | "From Free Kick"
  | "From Throw In"
  | "From Kick Off"
  | "From Goal Kick"
  | "From Counter";

export type BodyPart = "Right Foot" | "Left Foot" | "Head" | "Other";

export interface BaseEvent {
  id: ID;
  matchId: ID;
  /** Sequence order within the match; assigned on save. Maps to StatsBomb "index". */
  index: number;
  period: number;
  /** Seconds elapsed in that period's live clock at the moment the event was tagged. */
  elapsedSeconds: number;
  /** Match-clock minute/second, accumulated across periods. */
  minute: number;
  second: number;
  teamId: ID;
  playerId?: ID;
  location?: PitchLocation;
  playPattern: PlayPattern;
  underPressure: boolean;
  notes?: string;
}

export type PassHeight = "Ground Pass" | "Low Pass" | "High Pass";
export type PassOutcome = "Complete" | "Incomplete" | "Out" | "Unknown";
export type PassType = "Open Play" | "Corner" | "Free Kick" | "Throw-in" | "Kick Off" | "Goal Kick";

export interface PassDetails {
  endLocation: PitchLocation;
  recipientId?: ID;
  outcome: PassOutcome;
  height?: PassHeight;
  bodyPart?: BodyPart;
  passType: PassType;
}

export interface PassEvent extends BaseEvent {
  type: "pass";
  pass: PassDetails;
}

export type ShotOutcome = "Goal" | "Saved" | "Off Target" | "Blocked" | "Post" | "Wayward";
export type ShotType = "Open Play" | "Free Kick" | "Penalty";

export interface ShotDetails {
  endLocation: PitchLocation;
  outcome: ShotOutcome;
  bodyPart?: BodyPart;
  shotType: ShotType;
  firstTime: boolean;
}

export interface ShotEvent extends BaseEvent {
  type: "shot";
  shot: ShotDetails;
}

/**
 * Placeholder for future event types (interceptions, duels, fouls, ...).
 * Kept minimal on purpose: the discriminated union below is the extension
 * point. Adding a new on-ball action means adding one interface + one union
 * member + the corresponding cases in the event form, timeline and export.
 */
export interface OtherEvent extends BaseEvent {
  type: "other";
  other: {
    label: string;
  };
}

export type MatchEvent = PassEvent | ShotEvent | OtherEvent;

export type EventType = MatchEvent["type"];

/** Omit that distributes over a union, so discriminated members keep their distinct shapes. */
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type NewMatchEvent = DistributiveOmit<MatchEvent, "id" | "index">;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  pass: "Pass",
  shot: "Shot",
  other: "Other",
};

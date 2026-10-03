import type { EventType, PitchLocation } from "../../types";

export interface PendingDraft {
  type: EventType;
  period: number;
  videoTimeSeconds: number;
  location?: PitchLocation;
  endLocation?: PitchLocation;
}

/** How many pitch clicks each event type needs before the form opens. */
export const CLICKS_REQUIRED: Record<EventType, number> = {
  pass: 2,
  shot: 2,
  other: 1,
};

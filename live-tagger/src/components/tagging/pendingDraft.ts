import type { EventType } from "../../types";

/**
 * What's known about an event the moment the analyst taps "Tag pass" /
 * "Tag shot" live: just the type, period and the clock reading at that
 * instant. Everything else (player, location, outcome...) is filled in on
 * the form itself - unlike the video workflow, there's no pre-form pitch
 * click sequence, since on the sideline you want the form open immediately.
 */
export interface PendingDraft {
  type: EventType;
  period: number;
  elapsedSeconds: number;
}

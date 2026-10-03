import { useState } from "react";
import type {
  BodyPart,
  Match,
  MatchEvent,
  NewMatchEvent,
  PassDetails,
  PassHeight,
  PassOutcome,
  PassType,
  PlayPattern,
  ShotDetails,
  ShotOutcome,
  ShotType,
} from "../../types";
import type { PendingDraft } from "./pendingDraft";
import { videoTimeToMatchClock } from "../../utils/time";

const PLAY_PATTERNS: PlayPattern[] = [
  "Regular Play",
  "From Corner",
  "From Free Kick",
  "From Throw In",
  "From Kick Off",
  "From Goal Kick",
  "From Counter",
];
const BODY_PARTS: BodyPart[] = ["Right Foot", "Left Foot", "Head", "Other"];
const PASS_OUTCOMES: PassOutcome[] = ["Complete", "Incomplete", "Out", "Unknown"];
const PASS_HEIGHTS: PassHeight[] = ["Ground Pass", "Low Pass", "High Pass"];
const PASS_TYPES: PassType[] = ["Open Play", "Corner", "Free Kick", "Throw-in", "Kick Off", "Goal Kick"];
const SHOT_OUTCOMES: ShotOutcome[] = ["Goal", "Saved", "Off Target", "Blocked", "Post", "Wayward"];
const SHOT_TYPES: ShotType[] = ["Open Play", "Free Kick", "Penalty"];

interface Props {
  match: Match;
  draft: PendingDraft;
  existingEvent?: MatchEvent;
  onSave: (event: NewMatchEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function EventForm({ match, draft, existingEvent, onSave, onCancel, onDelete }: Props) {
  const defaultTeamId =
    existingEvent?.teamId ?? (match.taggingScope === "away" ? match.awayTeam.id : match.homeTeam.id);

  const [teamId, setTeamId] = useState(defaultTeamId);
  const [playerId, setPlayerId] = useState(existingEvent?.playerId ?? "");
  const [period, setPeriod] = useState(existingEvent?.period ?? draft.period);
  const [playPattern, setPlayPattern] = useState<PlayPattern>(existingEvent?.playPattern ?? "Regular Play");
  const [underPressure, setUnderPressure] = useState(existingEvent?.underPressure ?? false);
  const [notes, setNotes] = useState(existingEvent?.notes ?? "");

  const [passOutcome, setPassOutcome] = useState<PassOutcome>(
    existingEvent?.type === "pass" ? existingEvent.pass.outcome : "Complete",
  );
  const [passHeight, setPassHeight] = useState<PassHeight | "">(
    existingEvent?.type === "pass" ? (existingEvent.pass.height ?? "") : "",
  );
  const [passBodyPart, setPassBodyPart] = useState<BodyPart | "">(
    existingEvent?.type === "pass" ? (existingEvent.pass.bodyPart ?? "") : "",
  );
  const [passType, setPassType] = useState<PassType>(
    existingEvent?.type === "pass" ? existingEvent.pass.passType : "Open Play",
  );
  const [recipientId, setRecipientId] = useState(
    existingEvent?.type === "pass" ? (existingEvent.pass.recipientId ?? "") : "",
  );

  const [shotOutcome, setShotOutcome] = useState<ShotOutcome>(
    existingEvent?.type === "shot" ? existingEvent.shot.outcome : "Off Target",
  );
  const [shotType, setShotType] = useState<ShotType>(
    existingEvent?.type === "shot" ? existingEvent.shot.shotType : "Open Play",
  );
  const [shotBodyPart, setShotBodyPart] = useState<BodyPart | "">(
    existingEvent?.type === "shot" ? (existingEvent.shot.bodyPart ?? "") : "",
  );
  const [firstTime, setFirstTime] = useState(existingEvent?.type === "shot" ? existingEvent.shot.firstTime : false);

  const [otherLabel, setOtherLabel] = useState(existingEvent?.type === "other" ? existingEvent.other.label : "");

  const team = teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
  const clock = videoTimeToMatchClock(match, period, existingEvent?.videoTimeSeconds ?? draft.videoTimeSeconds);

  const location = existingEvent?.location ?? draft.location;
  const endLocation =
    existingEvent?.type === "pass"
      ? existingEvent.pass.endLocation
      : existingEvent?.type === "shot"
        ? existingEvent.shot.endLocation
        : draft.endLocation;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return;

    const base = {
      matchId: match.id,
      period,
      videoTimeSeconds: existingEvent?.videoTimeSeconds ?? draft.videoTimeSeconds,
      minute: clock.minute,
      second: clock.second,
      teamId,
      playerId,
      location,
      playPattern,
      underPressure,
      notes: notes.trim() || undefined,
    };

    if (draft.type === "pass") {
      const pass: PassDetails = {
        endLocation: endLocation ?? { x: 60, y: 40 },
        recipientId: recipientId || undefined,
        outcome: passOutcome,
        height: passHeight || undefined,
        bodyPart: passBodyPart || undefined,
        passType,
      };
      onSave({ ...base, type: "pass", pass });
    } else if (draft.type === "shot") {
      const shot: ShotDetails = {
        endLocation: endLocation ?? { x: 120, y: 40 },
        outcome: shotOutcome,
        bodyPart: shotBodyPart || undefined,
        shotType,
        firstTime,
      };
      onSave({ ...base, type: "shot", shot });
    } else {
      onSave({ ...base, type: "other", other: { label: otherLabel.trim() || "Event" } });
    }
  }

  return (
    <form className="card col" onSubmit={handleSubmit} style={{ gap: "var(--space-3)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>
          {existingEvent ? "Edit" : "New"} {draft.type === "pass" ? "pass" : draft.type === "shot" ? "shot" : "event"}
        </h3>
        <span className="badge">
          Period {period} &middot; {String(clock.minute).padStart(2, "0")}:{String(clock.second).padStart(2, "0")}
        </span>
      </div>

      <div className="grid-2">
        <div>
          <label>Team</label>
          <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPlayerId(""); setRecipientId(""); }}>
            <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
            <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
          </select>
        </div>
        <div>
          <label>Player</label>
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
            <option value="" disabled>
              Select player...
            </option>
            {team.players.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.shirtNumber} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {draft.type === "pass" && (
        <div className="grid-2">
          <div>
            <label>Outcome</label>
            <select value={passOutcome} onChange={(e) => setPassOutcome(e.target.value as PassOutcome)}>
              {PASS_OUTCOMES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Recipient (optional)</label>
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              <option value="">None / unknown</option>
              {team.players
                .filter((p) => p.id !== playerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.shirtNumber} {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label>Height</label>
            <select value={passHeight} onChange={(e) => setPassHeight(e.target.value as PassHeight)}>
              <option value="">Unspecified</option>
              {PASS_HEIGHTS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Body part</label>
            <select value={passBodyPart} onChange={(e) => setPassBodyPart(e.target.value as BodyPart)}>
              <option value="">Unspecified</option>
              {BODY_PARTS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Pass type</label>
            <select value={passType} onChange={(e) => setPassType(e.target.value as PassType)}>
              {PASS_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {draft.type === "shot" && (
        <div className="grid-2">
          <div>
            <label>Outcome</label>
            <select value={shotOutcome} onChange={(e) => setShotOutcome(e.target.value as ShotOutcome)}>
              {SHOT_OUTCOMES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Shot type</label>
            <select value={shotType} onChange={(e) => setShotType(e.target.value as ShotType)}>
              {SHOT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Body part</label>
            <select value={shotBodyPart} onChange={(e) => setShotBodyPart(e.target.value as BodyPart)}>
              <option value="">Unspecified</option>
              {BODY_PARTS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <label className="row" style={{ marginTop: 20, fontWeight: 500 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} />
            First-time shot
          </label>
        </div>
      )}

      {draft.type === "other" && (
        <div>
          <label>Event label</label>
          <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="e.g. Interception" />
        </div>
      )}

      <div className="grid-2">
        <div>
          <label>Play pattern</label>
          <select value={playPattern} onChange={(e) => setPlayPattern(e.target.value as PlayPattern)}>
            {PLAY_PATTERNS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Period</label>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {match.periods.map((p) => (
              <option key={p.number} value={p.number}>
                Period {p.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="row" style={{ fontWeight: 500 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={underPressure} onChange={(e) => setUnderPressure(e.target.checked)} />
        Under pressure
      </label>

      <div>
        <label>Notes (optional)</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <button type="submit" className="primary" disabled={!playerId}>
            Save event
          </button>
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
        {existingEvent && onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            Delete event
          </button>
        )}
      </div>
    </form>
  );
}

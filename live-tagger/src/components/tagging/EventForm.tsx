import { useEffect, useRef, useState } from "react";
import type {
  BodyPart,
  Match,
  MatchEvent,
  NewMatchEvent,
  PassDetails,
  PassHeight,
  PassOutcome,
  PassType,
  PitchLocation,
  PlayPattern,
  ShotDetails,
  ShotOutcome,
  ShotType,
  Team,
} from "../../types";
import type { PendingDraft } from "./pendingDraft";
import { elapsedToMatchClock } from "../../utils/time";
import SoccerPitch, { type PitchArrow, type PitchMarker } from "../pitch/SoccerPitch";

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

function TeamPicker({
  match,
  teamId,
  onPick,
}: {
  match: Match;
  teamId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="row" style={{ gap: "var(--space-2)" }}>
      {[match.homeTeam, match.awayTeam].map((team) => (
        <button
          key={team.id}
          type="button"
          onClick={() => onPick(team.id)}
          style={{
            flex: 1,
            borderColor: team.color,
            borderWidth: 2,
            background: teamId === team.id ? team.color : "var(--color-surface-raised)",
            color: teamId === team.id ? "#0b1220" : "var(--color-text)",
            fontWeight: 800,
          }}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}

function PlayerPicker({ team, playerId, onPick }: { team: Team; playerId: string; onPick: (id: string) => void }) {
  if (team.players.length === 0) {
    return <p className="muted">No players on this team's roster yet.</p>;
  }
  return (
    <div className="row wrap" style={{ gap: "var(--space-2)" }}>
      {team.players.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          style={{
            minWidth: 72,
            padding: "10px 12px",
            background: playerId === p.id ? team.color : "var(--color-surface-raised)",
            color: playerId === p.id ? "#0b1220" : "var(--color-text)",
            borderColor: team.color,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.2rem" }}>#{p.shirtNumber}</div>
          <div style={{ fontSize: "0.7rem", fontWeight: 600 }}>{p.name}</div>
        </button>
      ))}
    </div>
  );
}

function OutcomeButtons<T extends string>({
  options,
  value,
  onPick,
  colorFor,
}: {
  options: T[];
  value: T;
  onPick: (v: T) => void;
  colorFor?: (v: T) => string;
}) {
  return (
    <div className="row wrap" style={{ gap: "var(--space-2)" }}>
      {options.map((o) => {
        const active = value === o;
        const accent = colorFor?.(o);
        return (
          <button
            key={o}
            type="button"
            className="small"
            onClick={() => onPick(o)}
            style={{
              fontWeight: active ? 800 : 500,
              background: active ? (accent ?? "var(--color-accent)") : "var(--color-surface-raised)",
              color: active ? "#0b1220" : "var(--color-text)",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
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

  const [location, setLocation] = useState<PitchLocation | undefined>(existingEvent?.location);
  const [endLocation, setEndLocation] = useState<PitchLocation | undefined>(
    existingEvent?.type === "pass" ? existingEvent.pass.endLocation : existingEvent?.type === "shot" ? existingEvent.shot.endLocation : undefined,
  );

  const team = teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
  const elapsedSeconds = existingEvent?.elapsedSeconds ?? draft.elapsedSeconds;
  const clock = elapsedToMatchClock(match, period, elapsedSeconds);
  const needsEndLocation = draft.type === "pass" || draft.type === "shot";

  // Fast sideline input: type a shirt number to jump straight to that player
  // (like entering a channel number on a TV remote), or H/A to swap teams,
  // without touching the mouse/touchscreen. Disabled while typing into a
  // text field (Notes, the "other" event label).
  //
  // The buffer lives in a ref, not state: state is only for the on-screen
  // "typing: 9_" hint. If the buffer were a dependency of this effect, every
  // keystroke would re-run the effect, and its own cleanup would immediately
  // clear the timeout that same keystroke just scheduled - silently
  // swallowing every digit.
  const [numberBuffer, setNumberBuffer] = useState("");
  const bufferRef = useRef("");
  const numberTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function commitBuffer(onTeam: Team) {
      const n = Number(bufferRef.current);
      const found = onTeam.players.find((p) => p.shirtNumber === n);
      if (found) setPlayerId(found.id);
      bufferRef.current = "";
      setNumberBuffer("");
    }

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;

      if (e.key === "h" || e.key === "H") {
        setTeamId(match.homeTeam.id);
        setPlayerId("");
        bufferRef.current = "";
        setNumberBuffer("");
        return;
      }
      if (e.key === "a" || e.key === "A") {
        setTeamId(match.awayTeam.id);
        setPlayerId("");
        bufferRef.current = "";
        setNumberBuffer("");
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const next = (bufferRef.current + e.key).slice(-2);
        bufferRef.current = next;
        setNumberBuffer(next);
        if (numberTimeoutRef.current) clearTimeout(numberTimeoutRef.current);
        // Commit immediately once a 2nd digit is typed; otherwise wait briefly
        // in case a second digit is coming (e.g. "1" then "0" for #10).
        const delay = next.length === 2 ? 0 : 550;
        numberTimeoutRef.current = setTimeout(() => commitBuffer(team), delay);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (numberTimeoutRef.current) clearTimeout(numberTimeoutRef.current);
    };
  }, [team, match.homeTeam.id, match.awayTeam.id]);

  function handlePitchClick(loc: PitchLocation) {
    if (!needsEndLocation) {
      setLocation(loc);
      return;
    }
    if (!location) setLocation(loc);
    else if (!endLocation) setEndLocation(loc);
    else {
      setLocation(loc);
      setEndLocation(undefined);
    }
  }

  function clearLocation() {
    setLocation(undefined);
    setEndLocation(undefined);
  }

  const pitchMarkers: PitchMarker[] = location
    ? [{ id: "start", location, color: team.color, shape: "ring", radius: 1.8 }]
    : [];
  const pitchArrows: PitchArrow[] =
    location && endLocation ? [{ id: "arrow", from: location, to: endLocation, color: team.color }] : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return;

    const base = {
      matchId: match.id,
      period,
      elapsedSeconds,
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

      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <label style={{ marginBottom: 0 }}>Team</label>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Shortcut: <span className="kbd">H</span> home / <span className="kbd">A</span> away
          </span>
        </div>
        <TeamPicker match={match} teamId={teamId} onPick={(id) => { setTeamId(id); setPlayerId(""); setRecipientId(""); }} />
      </div>

      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <label style={{ marginBottom: 0 }}>Player</label>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Shortcut: type a shirt number {numberBuffer && <span className="kbd">{numberBuffer}</span>}
          </span>
        </div>
        <PlayerPicker team={team} playerId={playerId} onPick={setPlayerId} />
      </div>

      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <label style={{ marginBottom: 0 }}>
            Pitch location (optional) {needsEndLocation ? "- tap start, then end" : "- tap to set"}
          </label>
          {(location || endLocation) && (
            <button type="button" className="small ghost" onClick={clearLocation}>
              Clear
            </button>
          )}
        </div>
        <div style={{ maxWidth: 360 }}>
          <SoccerPitch onPitchClick={handlePitchClick} markers={pitchMarkers} arrows={pitchArrows} />
        </div>
      </div>

      {draft.type === "pass" && (
        <div>
          <label>Outcome</label>
          <OutcomeButtons options={PASS_OUTCOMES} value={passOutcome} onPick={setPassOutcome} />
        </div>
      )}
      {draft.type === "shot" && (
        <div>
          <label>Outcome</label>
          <OutcomeButtons
            options={SHOT_OUTCOMES}
            value={shotOutcome}
            onPick={setShotOutcome}
            colorFor={(o) => (o === "Goal" ? "#facc15" : "var(--color-accent)")}
          />
        </div>
      )}

      {draft.type === "pass" && (
        <div className="grid-2">
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

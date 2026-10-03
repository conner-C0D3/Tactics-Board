import { useEffect, useRef, useState } from "react";
import type { EventType, Match, PassOutcome, PassType, PitchLocation, ShotOutcome, Team } from "../../types";
import type { useLiveClock } from "../../hooks/useLiveClock";
import { addEvent } from "../../db/eventRepo";
import { elapsedToMatchClock } from "../../utils/time";
import SoccerPitch, { type PitchMarker } from "../pitch/SoccerPitch";

const SHOT_OUTCOMES: ShotOutcome[] = ["Goal", "Saved", "Off Target", "Blocked", "Post", "Wayward"];
const SHOT_OUTCOME_COLOR: Record<ShotOutcome, string> = {
  Goal: "#facc15",
  Saved: "var(--color-accent)",
  "Off Target": "var(--color-surface-raised)",
  Blocked: "#f97316",
  Post: "#a855f7",
  Wayward: "var(--color-surface-raised)",
};
// Labels matching a name in EVENT_TYPE_IDS (src/statsbomb/ids.ts) export with
// that real StatsBomb type; anything else still works, just as a clearly
// non-standard type - see src/statsbomb/README.md.
const QUICK_OTHER_LABELS = [
  "Foul Committed",
  "Foul Won",
  "Interception",
  "Clearance",
  "Ball Recovery",
  "Dispossessed",
  "Offside",
  "Card",
  "Substitution",
];

interface Props {
  match: Match;
  clock: ReturnType<typeof useLiveClock>;
}

/**
 * Tags a live action without ever hiding the pitch. Every control - player,
 * location, action type, and the type-specific finish - is on screen at
 * once, so the analyst can tap them in whatever order matches what they just
 * saw happen, instead of stepping through screens. The in-progress event's
 * clock reading is locked in on the FIRST tap of a new cycle (player,
 * pitch, or type - whichever comes first), so filling in the rest at a
 * calmer pace afterward never shifts its timestamp.
 */
export default function QuickTagFlow({ match, clock }: Props) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [location, setLocation] = useState<PitchLocation | undefined>(undefined);
  const [type, setType] = useState<EventType | null>(null);
  const [passType, setPassType] = useState<PassType>("Open Play");
  const [period, setPeriod] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const team = teamId ? (teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam) : null;
  const player = team?.players.find((p) => p.id === playerId);

  function ensureStarted() {
    if (period !== null) return;
    setPeriod(clock.activePeriod);
    setElapsedSeconds(clock.elapsedSecondsFor(clock.activePeriod));
  }

  function resetAll() {
    setTeamId(null);
    setPlayerId(null);
    setLocation(undefined);
    setType(null);
    setPassType("Open Play");
    setPeriod(null);
    setElapsedSeconds(null);
  }

  function pickPlayer(pid: string, tid: string) {
    ensureStarted();
    setPlayerId(pid);
    setTeamId(tid);
  }

  function pickLocation(loc: PitchLocation) {
    ensureStarted();
    setLocation(loc);
  }

  function pickType(t: EventType, corner = false) {
    ensureStarted();
    setType(t);
    setPassType(corner ? "Corner" : "Open Play");
  }

  function baseFields() {
    const p = period ?? clock.activePeriod;
    const e = elapsedSeconds ?? clock.elapsedSecondsFor(p);
    const clockReading = elapsedToMatchClock(match, p, e);
    return { period: p, elapsedSeconds: e, minute: clockReading.minute, second: clockReading.second };
  }

  async function finishPass(outcome: PassOutcome, recipientId?: string) {
    if (!playerId || !teamId) return;
    await addEvent({
      ...baseFields(),
      matchId: match.id,
      teamId,
      playerId,
      location,
      playPattern: passType === "Corner" ? "From Corner" : "Regular Play",
      underPressure: false,
      type: "pass",
      pass: { endLocation: location ?? { x: 60, y: 40 }, outcome, recipientId, passType },
    });
    setLastSaved(`${passType === "Corner" ? "Corner" : "Pass"} - ${outcome}`);
    resetAll();
  }

  async function finishShot(outcome: ShotOutcome) {
    if (!playerId || !teamId) return;
    await addEvent({
      ...baseFields(),
      matchId: match.id,
      teamId,
      playerId,
      location,
      playPattern: "Regular Play",
      underPressure: false,
      type: "shot",
      shot: { endLocation: location ?? { x: 120, y: 40 }, outcome, shotType: "Open Play", firstTime: false },
    });
    setLastSaved(`Shot - ${outcome}`);
    resetAll();
  }

  async function finishOther(label: string) {
    if (!playerId || !teamId) return;
    await addEvent({
      ...baseFields(),
      matchId: match.id,
      teamId,
      playerId,
      location,
      playPattern: "Regular Play",
      underPressure: false,
      type: "other",
      other: { label },
    });
    setLastSaved(label);
    resetAll();
  }

  // Keyboard shortcuts: H/A picks a team, then a shirt number jumps straight
  // to that player - active any time this component is mounted, since
  // picking the player can happen in any order now.
  const bufferRef = useRef("");
  const [numberBuffer, setNumberBuffer] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyTeamRef = useRef<Team | null>(null);

  useEffect(() => {
    function commit(onTeam: Team) {
      const n = Number(bufferRef.current);
      const found = onTeam.players.find((p) => p.shirtNumber === n);
      if (found) pickPlayer(found.id, onTeam.id);
      bufferRef.current = "";
      setNumberBuffer("");
    }

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "h" || e.key === "H") keyTeamRef.current = match.homeTeam;
      else if (e.key === "a" || e.key === "A") keyTeamRef.current = match.awayTeam;
      else if (/^[0-9]$/.test(e.key) && keyTeamRef.current) {
        const next = (bufferRef.current + e.key).slice(-2);
        bufferRef.current = next;
        setNumberBuffer(next);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const delay = next.length === 2 ? 0 : 550;
        timeoutRef.current = setTimeout(() => keyTeamRef.current && commit(keyTeamRef.current), delay);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.homeTeam, match.awayTeam]);

  const pitchMarkers: PitchMarker[] = location && team ? [{ id: "loc", location, color: team.color, radius: 2 }] : [];

  return (
    <div className="card col" style={{ gap: "var(--space-3)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Tag an action</h4>
        {lastSaved && <span className="badge">Saved: {lastSaved}</span>}
      </div>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <span>
          {player && team ? (
            <>
              <span className="team-swatch" style={{ background: team.color }} /> #{player.shirtNumber}{" "}
              {player.name}
            </>
          ) : (
            <span className="muted">No player yet</span>
          )}
          {location && <span className="badge" style={{ marginLeft: 8 }}>Location set</span>}
          {type && <span className="badge" style={{ marginLeft: 8 }}>{type === "pass" && passType === "Corner" ? "Corner" : type}</span>}
        </span>
        {(player || location || type) && (
          <button type="button" className="small ghost" onClick={resetAll}>
            Clear
          </button>
        )}
      </div>

      <div style={{ maxWidth: 520 }}>
        <SoccerPitch onPitchClick={pickLocation} markers={pitchMarkers} />
      </div>

      <div className="col" style={{ gap: "var(--space-2)" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <label style={{ marginBottom: 0 }}>Who</label>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Shortcut: <span className="kbd">H</span>/<span className="kbd">A</span> then a shirt number
            {numberBuffer && <span className="kbd" style={{ marginLeft: 4 }}>{numberBuffer}</span>}
          </span>
        </div>
        <div className="grid-2">
          {[match.homeTeam, match.awayTeam].map((t) => (
            <div className="row wrap" key={t.id} style={{ gap: 6 }}>
              {t.players.map((p) => {
                const selected = p.id === playerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="small"
                    onClick={() => pickPlayer(p.id, t.id)}
                    style={{
                      borderColor: t.color,
                      background: selected ? t.color : "var(--color-surface-raised)",
                      color: selected ? "#0b1220" : "var(--color-text)",
                      fontWeight: 700,
                    }}
                  >
                    #{p.shirtNumber} {p.name}
                  </button>
                );
              })}
              {t.players.length === 0 && <span className="muted">No roster yet.</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="col" style={{ gap: "var(--space-2)" }}>
        <label style={{ marginBottom: 0 }}>What</label>
        <div className="row wrap">
          <button
            type="button"
            className={type === "pass" && passType === "Open Play" ? "primary" : undefined}
            style={{ fontSize: "1.05rem", padding: "14px 24px" }}
            onClick={() => pickType("pass")}
          >
            Pass
          </button>
          <button
            type="button"
            className={type === "shot" ? "primary" : undefined}
            style={{ fontSize: "1.05rem", padding: "14px 24px" }}
            onClick={() => pickType("shot")}
          >
            Shot
          </button>
          <button
            type="button"
            className={type === "pass" && passType === "Corner" ? "primary" : undefined}
            style={{ padding: "14px 24px" }}
            onClick={() => pickType("pass", true)}
          >
            Corner
          </button>
          <button
            type="button"
            className={type === "other" ? "primary" : undefined}
            style={{ padding: "14px 24px" }}
            onClick={() => pickType("other")}
          >
            Other
          </button>
        </div>
      </div>

      {type === "pass" && (
        <div className="col" style={{ gap: "var(--space-2)" }}>
          <label style={{ marginBottom: 0 }}>Finish: who received it?</label>
          {!player && <p className="muted" style={{ margin: 0 }}>Pick the player above first.</p>}
          <div className="row wrap">
            {team?.players
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <button key={p.id} type="button" className="small" disabled={!player} onClick={() => finishPass("Complete", p.id)}>
                  #{p.shirtNumber} {p.name}
                </button>
              ))}
          </div>
          <div className="row wrap">
            <button type="button" className="small" disabled={!player} onClick={() => finishPass("Incomplete")}>
              Incomplete
            </button>
            <button type="button" className="small" disabled={!player} onClick={() => finishPass("Out")}>
              Out of play
            </button>
          </div>
        </div>
      )}

      {type === "shot" && (
        <div className="col" style={{ gap: "var(--space-2)" }}>
          <label style={{ marginBottom: 0 }}>Finish: what was the outcome?</label>
          {!player && <p className="muted" style={{ margin: 0 }}>Pick the player above first.</p>}
          <div className="row wrap">
            {SHOT_OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                disabled={!player}
                style={{ fontSize: "1.05rem", padding: "14px 22px", background: SHOT_OUTCOME_COLOR[o], color: "#0b1220", fontWeight: 800 }}
                onClick={() => finishShot(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "other" && (
        <div className="col" style={{ gap: "var(--space-2)" }}>
          <label style={{ marginBottom: 0 }}>Finish: what happened?</label>
          {!player && <p className="muted" style={{ margin: 0 }}>Pick the player above first.</p>}
          <div className="row wrap">
            {QUICK_OTHER_LABELS.map((label) => (
              <button key={label} type="button" className="small" disabled={!player} onClick={() => finishOther(label)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { Match, PassOutcome, PassType, PitchLocation, ShotOutcome, Team } from "../../types";
import type { useLiveClock } from "../../hooks/useLiveClock";
import { addEvent } from "../../db/eventRepo";
import { elapsedToMatchClock } from "../../utils/time";
import SoccerPitch, { type PitchMarker } from "../pitch/SoccerPitch";

type Step = "player" | "location" | "type" | "pass-detail" | "shot-detail" | "other-detail";

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

export default function QuickTagFlow({ match, clock }: Props) {
  const [step, setStep] = useState<Step>("player");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [period, setPeriod] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [location, setLocation] = useState<PitchLocation | undefined>(undefined);
  const [passType, setPassType] = useState<PassType>("Open Play");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const team = teamId ? (teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam) : null;
  const player = team?.players.find((p) => p.id === playerId);

  function reset() {
    setStep("player");
    setTeamId(null);
    setPlayerId(null);
    setLocation(undefined);
    setPassType("Open Play");
  }

  function selectPlayer(pid: string, tid: string) {
    setTeamId(tid);
    setPlayerId(pid);
    setPeriod(clock.activePeriod);
    setElapsedSeconds(clock.elapsedSecondsFor(clock.activePeriod));
    setStep("location");
  }

  function confirmLocation(loc?: PitchLocation) {
    setLocation(loc);
    setStep("type");
  }

  async function finishPass(outcome: PassOutcome, recipientId?: string) {
    if (!playerId || !teamId) return;
    const clockReading = elapsedToMatchClock(match, period, elapsedSeconds);
    await addEvent({
      matchId: match.id,
      period,
      elapsedSeconds,
      minute: clockReading.minute,
      second: clockReading.second,
      teamId,
      playerId,
      location,
      playPattern: passType === "Corner" ? "From Corner" : "Regular Play",
      underPressure: false,
      type: "pass",
      pass: { endLocation: location ?? { x: 60, y: 40 }, outcome, recipientId, passType },
    });
    setLastSaved(`${passType === "Corner" ? "Corner" : "Pass"} - ${outcome}`);
    reset();
  }

  async function finishShot(outcome: ShotOutcome) {
    if (!playerId || !teamId) return;
    const clockReading = elapsedToMatchClock(match, period, elapsedSeconds);
    await addEvent({
      matchId: match.id,
      period,
      elapsedSeconds,
      minute: clockReading.minute,
      second: clockReading.second,
      teamId,
      playerId,
      location,
      playPattern: "Regular Play",
      underPressure: false,
      type: "shot",
      shot: { endLocation: location ?? { x: 120, y: 40 }, outcome, shotType: "Open Play", firstTime: false },
    });
    setLastSaved(`Shot - ${outcome}`);
    reset();
  }

  async function finishOther(label: string) {
    if (!playerId || !teamId) return;
    const clockReading = elapsedToMatchClock(match, period, elapsedSeconds);
    await addEvent({
      matchId: match.id,
      period,
      elapsedSeconds,
      minute: clockReading.minute,
      second: clockReading.second,
      teamId,
      playerId,
      location,
      playPattern: "Regular Play",
      underPressure: false,
      type: "other",
      other: { label },
    });
    setLastSaved(label);
    reset();
  }

  // Keyboard shortcuts for the player step: H/A pick a team, then a shirt
  // number jumps straight to that player - same "channel number" pattern as
  // the detailed edit form, but scoped to this step only.
  const bufferRef = useRef("");
  const [numberBuffer, setNumberBuffer] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyTeamRef = useRef<Team | null>(null);

  useEffect(() => {
    if (step !== "player") return;

    function commit(onTeam: Team) {
      const n = Number(bufferRef.current);
      const found = onTeam.players.find((p) => p.shirtNumber === n);
      if (found) selectPlayer(found.id, onTeam.id);
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
  }, [step, match.homeTeam, match.awayTeam]);

  const pitchMarkers: PitchMarker[] = location && team ? [{ id: "loc", location, color: team.color, radius: 2 }] : [];

  return (
    <div className="card col" style={{ gap: "var(--space-3)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Tag an action</h4>
        {lastSaved && <span className="badge">Saved: {lastSaved}</span>}
      </div>

      {step === "player" && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p className="muted" style={{ margin: 0 }}>
              Tap the player who did it.
            </p>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              Shortcut: <span className="kbd">H</span>/<span className="kbd">A</span> then a shirt number
              {numberBuffer && <span className="kbd" style={{ marginLeft: 4 }}>{numberBuffer}</span>}
            </span>
          </div>
          <div className="grid-2">
            {[match.homeTeam, match.awayTeam].map((t) => (
              <div className="col" key={t.id} style={{ gap: "var(--space-2)" }}>
                <span className="team-chip">
                  <span className="team-swatch" style={{ background: t.color }} />
                  {t.name}
                </span>
                <div className="row wrap" style={{ gap: "var(--space-2)" }}>
                  {t.players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPlayer(p.id, t.id)}
                      style={{
                        minWidth: 72,
                        padding: "10px 12px",
                        background: "var(--color-surface-raised)",
                        borderColor: t.color,
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.2rem" }}>#{p.shirtNumber}</div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600 }}>{p.name}</div>
                    </button>
                  ))}
                  {t.players.length === 0 && <span className="muted">No roster yet.</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "location" && team && player && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p style={{ margin: 0 }}>
              <span className="team-swatch" style={{ background: team.color }} /> #{player.shirtNumber}{" "}
              {player.name} - tap where it happened
            </p>
            <div className="row">
              <button type="button" className="small ghost" onClick={() => confirmLocation(undefined)}>
                Skip location
              </button>
              <button type="button" className="small ghost" onClick={reset}>
                Cancel
              </button>
            </div>
          </div>
          <div style={{ maxWidth: 480 }}>
            <SoccerPitch onPitchClick={confirmLocation} markers={pitchMarkers} />
          </div>
        </div>
      )}

      {step === "type" && team && player && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p style={{ margin: 0 }}>
              #{player.shirtNumber} {player.name} - what happened?
            </p>
            <button type="button" className="small ghost" onClick={() => setStep("location")}>
              Back
            </button>
          </div>
          <div className="row wrap">
            <button
              type="button"
              className="primary"
              style={{ fontSize: "1.1rem", padding: "16px 28px" }}
              onClick={() => {
                setPassType("Open Play");
                setStep("pass-detail");
              }}
            >
              Pass
            </button>
            <button
              type="button"
              className="primary"
              style={{ fontSize: "1.1rem", padding: "16px 28px" }}
              onClick={() => setStep("shot-detail")}
            >
              Shot
            </button>
            <button
              type="button"
              style={{ padding: "16px 28px" }}
              onClick={() => {
                setPassType("Corner");
                setStep("pass-detail");
              }}
            >
              Corner
            </button>
            <button type="button" style={{ padding: "16px 28px" }} onClick={() => setStep("other-detail")}>
              Other
            </button>
          </div>
        </div>
      )}

      {step === "pass-detail" && team && player && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p style={{ margin: 0 }}>Who received it?</p>
            <button type="button" className="small ghost" onClick={() => setStep("type")}>
              Back
            </button>
          </div>
          <div className="row wrap">
            {team.players
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <button key={p.id} type="button" className="small" onClick={() => finishPass("Complete", p.id)}>
                  #{p.shirtNumber} {p.name}
                </button>
              ))}
          </div>
          <div className="row wrap">
            <button type="button" className="small" onClick={() => finishPass("Incomplete")}>
              Incomplete
            </button>
            <button type="button" className="small" onClick={() => finishPass("Out")}>
              Out of play
            </button>
          </div>
        </div>
      )}

      {step === "shot-detail" && team && player && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p style={{ margin: 0 }}>What was the outcome?</p>
            <button type="button" className="small ghost" onClick={() => setStep("type")}>
              Back
            </button>
          </div>
          <div className="row wrap">
            {SHOT_OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                style={{ fontSize: "1.05rem", padding: "14px 22px", background: SHOT_OUTCOME_COLOR[o], color: "#0b1220", fontWeight: 800 }}
                onClick={() => finishShot(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "other-detail" && player && (
        <div className="col">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p style={{ margin: 0 }}>What happened?</p>
            <button type="button" className="small ghost" onClick={() => setStep("type")}>
              Back
            </button>
          </div>
          <div className="row wrap">
            {QUICK_OTHER_LABELS.map((label) => (
              <button key={label} type="button" className="small" onClick={() => finishOther(label)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

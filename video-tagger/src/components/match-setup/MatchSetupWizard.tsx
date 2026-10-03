import { useState } from "react";
import type { Period, Player, TaggingScope } from "../../types";
import { createMatch } from "../../db/matchRepo";
import PlayerListEditor from "./PlayerListEditor";

interface Props {
  onCreated: (matchId: string) => void;
  onCancel: () => void;
}

const PERIOD_PRESETS: { label: string; periods: Period[] }[] = [
  { label: "2 x 45 (standard)", periods: [{ number: 1, lengthMinutes: 45 }, { number: 2, lengthMinutes: 45 }] },
  { label: "2 x 40", periods: [{ number: 1, lengthMinutes: 40 }, { number: 2, lengthMinutes: 40 }] },
  { label: "2 x 35 (youth)", periods: [{ number: 1, lengthMinutes: 35 }, { number: 2, lengthMinutes: 35 }] },
  { label: "2 x 25 (youth)", periods: [{ number: 1, lengthMinutes: 25 }, { number: 2, lengthMinutes: 25 }] },
  {
    label: "4 x 20 (quarters)",
    periods: [
      { number: 1, lengthMinutes: 20 },
      { number: 2, lengthMinutes: 20 },
      { number: 3, lengthMinutes: 20 },
      { number: 4, lengthMinutes: 20 },
    ],
  },
];

const STEPS = ["Match info", "Teams", "Lineups", "Review"] as const;

export default function MatchSetupWizard({ onCreated, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [competition, setCompetition] = useState("");
  const [venue, setVenue] = useState("");
  const [periods, setPeriods] = useState<Period[]>(PERIOD_PRESETS[0].periods);
  const [taggingScope, setTaggingScope] = useState<TaggingScope>("both");

  const [homeName, setHomeName] = useState("Home");
  const [homeColor, setHomeColor] = useState("#2563eb");
  const [awayName, setAwayName] = useState("Away");
  const [awayColor, setAwayColor] = useState("#dc2626");

  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

  function updatePeriodLength(index: number, minutes: number) {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, lengthMinutes: minutes } : p)));
  }

  function addPeriod() {
    setPeriods((prev) => [...prev, { number: prev.length + 1, lengthMinutes: 10 }]);
  }

  function removePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, number: i + 1 })));
  }

  const canAdvance = (() => {
    if (step === 0) return name.trim().length > 0 && date.length > 0 && periods.length > 0;
    if (step === 1) return homeName.trim().length > 0 && awayName.trim().length > 0;
    return true;
  })();

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const match = await createMatch({
        name: name.trim(),
        date,
        competition: competition.trim(),
        venue: venue.trim(),
        taggingScope,
        periods,
        homeTeam: { name: homeName.trim(), color: homeColor, players: homePlayers },
        awayTeam: { name: awayName.trim(), color: awayColor, players: awayPlayers },
      });
      onCreated(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the match.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>New match</h2>
          <button type="button" className="ghost small" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="row" style={{ marginBottom: "var(--space-4)" }}>
          {STEPS.map((label, i) => (
            <span key={label} className="badge" style={{ opacity: i === step ? 1 : 0.5 }}>
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="col">
            <div>
              <label>Match name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="U14 Girls vs Riverside" />
            </div>
            <div className="grid-2">
              <div>
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label>Competition</label>
                <input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="League, friendly, cup..." />
              </div>
            </div>
            <div>
              <label>Venue</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Home ground" />
            </div>

            <div>
              <label>Period structure</label>
              <div className="row wrap">
                {PERIOD_PRESETS.map((preset) => (
                  <button key={preset.label} type="button" className="small" onClick={() => setPeriods(preset.periods)}>
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="col" style={{ marginTop: "var(--space-2)" }}>
                {periods.map((p, i) => (
                  <div className="row" key={i}>
                    <span style={{ width: 80 }}>Period {p.number}</span>
                    <input
                      type="number"
                      min={1}
                      value={p.lengthMinutes}
                      onChange={(e) => updatePeriodLength(i, Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                    <span className="muted">minutes</span>
                    {periods.length > 1 && (
                      <button type="button" className="small danger" onClick={() => removePeriod(i)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="small ghost" onClick={addPeriod} style={{ alignSelf: "flex-start" }}>
                  + Add period (e.g. extra time)
                </button>
              </div>
            </div>

            <div>
              <label>Who are you tagging?</label>
              <div className="row">
                {(["both", "home", "away"] as TaggingScope[]).map((scope) => (
                  <label key={scope} className="row" style={{ fontWeight: 500 }}>
                    <input
                      type="radio"
                      style={{ width: "auto" }}
                      checked={taggingScope === scope}
                      onChange={() => setTaggingScope(scope)}
                    />
                    {scope === "both" ? "Both teams" : scope === "home" ? "Home team only" : "Away team only"}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid-2">
            <div className="col">
              <label>Home team name</label>
              <input value={homeName} onChange={(e) => setHomeName(e.target.value)} />
              <label>Home team color</label>
              <input type="color" value={homeColor} onChange={(e) => setHomeColor(e.target.value)} style={{ padding: 4, height: 44 }} />
            </div>
            <div className="col">
              <label>Away team name</label>
              <input value={awayName} onChange={(e) => setAwayName(e.target.value)} />
              <label>Away team color</label>
              <input type="color" value={awayColor} onChange={(e) => setAwayColor(e.target.value)} style={{ padding: 4, height: 44 }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="col">
            <PlayerListEditor teamLabel={homeName || "Home"} color={homeColor} players={homePlayers} onChange={setHomePlayers} />
            <hr style={{ borderColor: "var(--color-border)", width: "100%" }} />
            <PlayerListEditor teamLabel={awayName || "Away"} color={awayColor} players={awayPlayers} onChange={setAwayPlayers} />
            <p className="muted">You can add or edit players later from the tagging workspace.</p>
          </div>
        )}

        {step === 3 && (
          <div className="col">
            <div className="card">
              <h3>{name || "(untitled match)"}</h3>
              <p className="muted">
                {date} &middot; {competition || "No competition set"} &middot; {venue || "No venue set"}
              </p>
              <div className="row">
                <span className="team-chip">
                  <span className="team-swatch" style={{ background: homeColor }} />
                  {homeName} ({homePlayers.length} players)
                </span>
                <span className="muted">vs</span>
                <span className="team-chip">
                  <span className="team-swatch" style={{ background: awayColor }} />
                  {awayName} ({awayPlayers.length} players)
                </span>
              </div>
              <p className="muted">
                {periods.length} period(s): {periods.map((p) => `${p.lengthMinutes}m`).join(", ")} &middot; Tagging:{" "}
                {taggingScope}
              </p>
            </div>
            <p className="muted">
              Next you'll connect the video file from inside the tagging workspace, so it stays linked only to this
              browser profile and is never uploaded anywhere.
            </p>
            {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between", marginTop: "var(--space-5)" }}>
          <button type="button" className="ghost" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="primary" disabled={!canAdvance} onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button type="button" className="primary" disabled={saving} onClick={handleCreate}>
              {saving ? "Creating..." : "Create match"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db/db";
import { listEventsForMatch } from "../db/eventRepo";
import { exportMatchBackup, downloadJson } from "../utils/backup";
import { buildStatsBombExport } from "../statsbomb/export";
import SoccerPitch, { type PitchArrow, type PitchMarker } from "../components/pitch/SoccerPitch";
import {
  SHOT_OUTCOME_COLORS,
  filterEvents,
  isPass,
  isShot,
  passSummaryByPlayer,
  passSummaryByTeam,
  shotSummaryByPlayer,
  shotSummaryByTeam,
  type EventFilters,
  type TeamFilter,
} from "../analysis/stats";
import type { ShotOutcome } from "../types";

export default function AnalysisDashboardPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId]);
  const allEvents = useLiveQuery(() => (matchId ? listEventsForMatch(matchId) : []), [matchId]) ?? [];

  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<number | "all">("all");
  const [passPlayerFilter, setPassPlayerFilter] = useState<string>("all");

  const filters: EventFilters = { team: teamFilter, period: periodFilter };
  const events = match ? filterEvents(allEvents, match, filters) : [];

  const passTeamSummary = match ? passSummaryByTeam(events, match) : [];
  const shotTeamSummary = match ? shotSummaryByTeam(events, match) : [];
  const passPlayerSummary = match ? passSummaryByPlayer(events, match) : [];
  const shotPlayerSummary = match ? shotSummaryByPlayer(events, match) : [];

  const shotOutcomeOrder: ShotOutcome[] = ["Goal", "Saved", "Off Target", "Blocked", "Post", "Wayward"];
  const shotOutcomeChartData = match
    ? shotOutcomeOrder.map((outcome) => ({
        outcome,
        [match.homeTeam.name]: shotTeamSummary[0]?.outcomes[outcome] ?? 0,
        [match.awayTeam.name]: shotTeamSummary[1]?.outcomes[outcome] ?? 0,
      }))
    : [];

  const shotMarkers: PitchMarker[] = events.filter(isShot).map((e) => ({
    id: e.id,
    location: e.location ?? { x: 110, y: 40 },
    color: SHOT_OUTCOME_COLORS[e.shot.outcome],
    shape: e.shot.outcome === "Goal" ? "dot" : "ring",
    radius: e.shot.outcome === "Goal" ? 1.8 : 1.3,
  }));

  const passesForMap = events.filter(isPass).filter((e) => passPlayerFilter === "all" || e.playerId === passPlayerFilter);
  const passArrows: PitchArrow[] = passesForMap
    .filter((e) => e.location)
    .map((e) => ({
      id: e.id,
      from: e.location!,
      to: e.pass.endLocation,
      color: e.pass.outcome === "Complete" ? "#22c55e" : "#ef4444",
      dashed: e.pass.outcome !== "Complete",
    }));

  async function handleBackup() {
    if (!match) return;
    const backup = await exportMatchBackup(match.id);
    downloadJson(`${match.name.replace(/[^a-z0-9-_]+/gi, "_")}-backup.json`, backup);
  }

  function handleStatsBombExport() {
    if (!match) return;
    const result = buildStatsBombExport(match, allEvents);
    const safeName = match.name.replace(/[^a-z0-9-_]+/gi, "_");
    downloadJson(`${safeName}-statsbomb-events.json`, result.events);
    downloadJson(`${safeName}-statsbomb-lineups.json`, result.lineups);
    downloadJson(`${safeName}-statsbomb-match.json`, result.matchInfo);
  }

  if (matchId && match === undefined) return <p className="muted">Loading match...</p>;
  if (!match) return <p>Match not found.</p>;

  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];

  return (
    <div className="col" style={{ gap: "var(--space-5)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{match.name} - Analysis</h1>
          <p className="muted" style={{ margin: 0 }}>
            {allEvents.length} total events recorded
          </p>
        </div>
        <div className="row">
          <button className="ghost" onClick={handleBackup}>
            Back up match
          </button>
          <button className="primary" onClick={handleStatsBombExport}>
            Export StatsBomb JSON
          </button>
        </div>
      </div>

      <div className="row wrap card">
        <div>
          <label>Team</label>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}>
            <option value="all">Both teams</option>
            <option value="home">{match.homeTeam.name}</option>
            <option value="away">{match.awayTeam.name}</option>
          </select>
        </div>
        <div>
          <label>Period</label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All periods</option>
            {match.periods.map((p) => (
              <option key={p.number} value={p.number}>
                Period {p.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        {passTeamSummary.map((team) => {
          const shotTeam = shotTeamSummary.find((s) => s.teamId === team.teamId)!;
          return (
            <div className="card" key={team.teamId}>
              <div className="row">
                <span className="team-swatch" style={{ background: team.color }} />
                <h3 style={{ margin: 0 }}>{team.teamName}</h3>
              </div>
              <div className="row wrap" style={{ marginTop: "var(--space-3)" }}>
                <Stat label="Passes" value={team.attempted} />
                <Stat label="Pass completion" value={`${team.completionPct}%`} />
                <Stat label="Shots" value={shotTeam.total} />
                <Stat label="Goals" value={shotTeam.goals} />
                <Stat label="Shots on target" value={`${shotTeam.onTargetPct}%`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Passes by player (completed vs incomplete)</h4>
          {passPlayerSummary.length === 0 ? (
            <p className="muted">No passes recorded for this filter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, passPlayerSummary.length * 32)}>
              <BarChart data={passPlayerSummary} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" allowDecimals={false} />
                <YAxis type="category" dataKey="playerName" stroke="#94a3b8" width={110} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Legend />
                <Bar dataKey="completed" stackId="p" name="Completed" fill="#22c55e" />
                <Bar dataKey="incomplete" stackId="p" name="Incomplete" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Shot outcomes by team</h4>
          {events.filter(isShot).length === 0 ? (
            <p className="muted">No shots recorded for this filter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={shotOutcomeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="outcome" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Legend />
                <Bar dataKey={match.homeTeam.name} fill={match.homeTeam.color} />
                <Bar dataKey={match.awayTeam.name} fill={match.awayTeam.color} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {shotPlayerSummary.length > 0 && (
            <div className="col" style={{ marginTop: "var(--space-3)" }}>
              <h4 style={{ marginBottom: 4 }}>Shots by player</h4>
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Shots</th>
                    <th>Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {shotPlayerSummary.map((p) => (
                    <tr key={p.playerId}>
                      <td>
                        <span className="team-swatch" style={{ background: p.color, marginRight: 6 }} />
                        {p.playerName}
                      </td>
                      <td>{p.total}</td>
                      <td>{p.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Shot map</h4>
          <SoccerPitch markers={shotMarkers} />
          <div className="row wrap" style={{ marginTop: "var(--space-2)" }}>
            {Object.entries(SHOT_OUTCOME_COLORS).map(([outcome, color]) => (
              <span key={outcome} className="row" style={{ gap: 4 }}>
                <span className="team-swatch" style={{ background: color }} />
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {outcome}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h4 style={{ margin: 0 }}>Pass map</h4>
            <select value={passPlayerFilter} onChange={(e) => setPassPlayerFilter(e.target.value)} style={{ width: 180 }}>
              <option value="all">All players</option>
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.shirtNumber} {p.name}
                </option>
              ))}
            </select>
          </div>
          <SoccerPitch arrows={passArrows} />
          <p className="muted" style={{ marginTop: "var(--space-2)" }}>
            <span style={{ color: "#22c55e" }}>&#9644;</span> Complete &nbsp;
            <span style={{ color: "#ef4444" }}>&#9644;</span> Incomplete / out
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="col" style={{ gap: 2, minWidth: 100 }}>
      <span className="muted" style={{ fontSize: "0.8rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.4rem", fontWeight: 800 }}>{value}</span>
    </div>
  );
}

import type { Match, MatchEvent } from "../../types";
import { formatClock } from "../../utils/time";

interface Props {
  match: Match;
  events: MatchEvent[];
  onSeek: (videoTimeSeconds: number) => void;
  onEdit: (event: MatchEvent) => void;
  selectedEventId?: string;
}

function teamFor(match: Match, teamId: string) {
  return teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
}

function playerName(match: Match, teamId: string, playerId?: string) {
  if (!playerId) return "-";
  const team = teamFor(match, teamId);
  const player = team.players.find((p) => p.id === playerId);
  return player ? `#${player.shirtNumber} ${player.name}` : "Unknown player";
}

function describe(match: Match, event: MatchEvent): string {
  if (event.type === "pass") {
    const recipient = event.pass.recipientId ? playerName(match, event.teamId, event.pass.recipientId) : "unknown";
    return `Pass to ${recipient} - ${event.pass.outcome}`;
  }
  if (event.type === "shot") {
    return `Shot - ${event.shot.outcome}`;
  }
  return event.other.label;
}

export default function EventTimeline({ match, events, onSeek, onEdit, selectedEventId }: Props) {
  if (events.length === 0) {
    return <p className="muted">No events recorded yet. Tag a pass or shot to see it listed here.</p>;
  }

  return (
    <div className="col" style={{ gap: 2, maxHeight: 420, overflowY: "auto" }}>
      {events.map((event) => {
        const team = teamFor(match, event.teamId);
        const active = event.id === selectedEventId;
        return (
          <div
            key={event.id}
            className="row"
            style={{
              padding: "6px 8px",
              borderRadius: "var(--radius)",
              background: active ? "var(--color-surface-raised)" : "transparent",
              cursor: "pointer",
            }}
            onClick={() => onEdit(event)}
          >
            <button
              type="button"
              className="small ghost"
              style={{ minWidth: 64 }}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(event.videoTimeSeconds);
              }}
              title="Jump video to this moment"
            >
              {formatClock(event.videoTimeSeconds)}
            </button>
            <span className="team-swatch" style={{ background: team.color }} />
            <span className="badge">{event.type}</span>
            <span style={{ flex: 1 }}>{playerName(match, event.teamId, event.playerId)}</span>
            <span className="muted" style={{ flex: 2, textAlign: "right" }}>
              {describe(match, event)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

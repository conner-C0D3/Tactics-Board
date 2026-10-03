import { useState } from "react";
import type { Match } from "../../types";
import { clearPeriodKickoff, setPeriodKickoff } from "../../db/matchRepo";
import { formatClock, videoTimeToMatchClock, matchClockLabel } from "../../utils/time";

interface Props {
  match: Match;
  currentVideoTime: number;
  displayPeriod: number;
}

export default function ClockSyncPanel({ match, currentVideoTime, displayPeriod }: Props) {
  const [markPeriod, setMarkPeriod] = useState(displayPeriod);
  const clock = videoTimeToMatchClock(match, displayPeriod, currentVideoTime);
  const kickoff = match.periodKickoffVideoSeconds[markPeriod];

  return (
    <div className="card col" style={{ gap: "var(--space-2)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h4 style={{ margin: 0 }}>Match clock</h4>
        <span className="badge">{matchClockLabel(clock)}</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        New events default to period {displayPeriod}, inferred from the kickoffs you've marked. You can change the
        period on any individual event too.
      </p>
      <div className="row wrap">
        <span className="muted">Mark kickoff for</span>
        {match.periods.map((p) => (
          <button
            key={p.number}
            type="button"
            className="small"
            style={{ fontWeight: markPeriod === p.number ? 800 : 500 }}
            onClick={() => setMarkPeriod(p.number)}
          >
            Period {p.number}
          </button>
        ))}
      </div>
      <div className="row wrap">
        {kickoff !== undefined ? (
          <>
            <span className="muted">
              Period {markPeriod} kickoff set at video {formatClock(kickoff)}
            </span>
            <button type="button" className="small ghost" onClick={() => clearPeriodKickoff(match.id, markPeriod)}>
              Clear
            </button>
          </>
        ) : (
          <button
            type="button"
            className="small primary"
            onClick={() => setPeriodKickoff(match.id, markPeriod, currentVideoTime)}
          >
            Mark kickoff at current video time ({formatClock(currentVideoTime)})
          </button>
        )}
      </div>
    </div>
  );
}

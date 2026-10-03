import type { Match } from "../../types";
import type { useLiveClock } from "../../hooks/useLiveClock";
import { formatClock } from "../../utils/time";

interface Props {
  match: Match;
  clock: ReturnType<typeof useLiveClock>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Not started",
  running: "Running",
  paused: "Paused",
  ended: "Ended",
};

export default function LiveClockPanel({ match, clock }: Props) {
  const activeElapsed = clock.elapsedSecondsFor(clock.activePeriod);
  const activeStatus = clock.statusFor(clock.activePeriod);

  return (
    <div className="card col" style={{ gap: "var(--space-3)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h4 style={{ margin: 0 }}>Live match clock</h4>
        <span className="badge">{STATUS_LABEL[activeStatus]}</span>
      </div>

      <div style={{ fontSize: "3rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {formatClock(activeElapsed)}
        <span className="muted" style={{ fontSize: "1.2rem", marginLeft: 12 }}>
          Period {clock.activePeriod}
        </span>
      </div>

      <div className="col" style={{ gap: "var(--space-2)" }}>
        {match.periods.map((p) => {
          const status = clock.statusFor(p.number);
          const elapsed = clock.elapsedSecondsFor(p.number);
          return (
            <div key={p.number} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                Period {p.number} <span className="muted">({formatClock(elapsed)})</span>
              </span>
              <div className="row">
                {status === "pending" && (
                  <button type="button" className="small primary" onClick={() => clock.startPeriod(p.number)}>
                    Start period {p.number}
                  </button>
                )}
                {status === "running" && (
                  <>
                    <button type="button" className="small" onClick={() => clock.pausePeriod(p.number)}>
                      Pause
                    </button>
                    <button type="button" className="small ghost" onClick={() => clock.endPeriod(p.number)}>
                      End period {p.number}
                    </button>
                  </>
                )}
                {status === "paused" && (
                  <>
                    <button type="button" className="small primary" onClick={() => clock.resumePeriod(p.number)}>
                      Resume
                    </button>
                    <button type="button" className="small ghost" onClick={() => clock.endPeriod(p.number)}>
                      End period {p.number}
                    </button>
                  </>
                )}
                {status === "ended" && <span className="muted">Final: {formatClock(elapsed)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

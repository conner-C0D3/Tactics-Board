import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { useLiveClock } from "../hooks/useLiveClock";
import LiveClockPanel from "../components/live/LiveClockPanel";
import ShortcutsHelp from "../components/live/ShortcutsHelp";
import EventForm from "../components/tagging/EventForm";
import EventTimeline from "../components/tagging/EventTimeline";
import type { PendingDraft } from "../components/tagging/pendingDraft";
import { addEvent, deleteEvent, listEventsForMatch, updateEvent } from "../db/eventRepo";
import type { EventType, MatchEvent, NewMatchEvent } from "../types";

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId]);
  const events = useLiveQuery(() => (matchId ? listEventsForMatch(matchId) : []), [matchId]) ?? [];
  const clock = useLiveClock(match);

  const [draft, setDraft] = useState<PendingDraft | null>(null);
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const tagNow = useCallback(
    (type: EventType) => {
      setEditingEvent(null);
      setDraft({ type, period: clock.activePeriod, elapsedSeconds: clock.elapsedSecondsFor(clock.activePeriod) });
    },
    [clock],
  );

  const cancelAll = useCallback(() => {
    setDraft(null);
    setEditingEvent(null);
    setShowHelp(false);
  }, []);

  // Keyboard shortcuts for starting a tag, disabled while typing into a field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "p" || e.key === "P") tagNow("pass");
      else if (e.key === "s" || e.key === "S") tagNow("shot");
      else if (e.key === "?") setShowHelp((v) => !v);
      else if (e.key === "Escape") cancelAll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tagNow, cancelAll]);

  const editDraft: PendingDraft | null = editingEvent
    ? { type: editingEvent.type, period: editingEvent.period, elapsedSeconds: editingEvent.elapsedSeconds }
    : null;

  async function handleSaveNew(event: NewMatchEvent) {
    await addEvent(event);
    setDraft(null);
  }

  async function handleSaveEdit(event: NewMatchEvent) {
    if (!editingEvent) return;
    await updateEvent(editingEvent.id, event);
    setEditingEvent(null);
  }

  async function handleDeleteEdit() {
    if (!editingEvent) return;
    await deleteEvent(editingEvent.id);
    setEditingEvent(null);
  }

  if (matchId && match === undefined) {
    return <p className="muted">Loading match...</p>;
  }
  if (!match) {
    return <p>Match not found.</p>;
  }

  return (
    <div className="col" style={{ gap: "var(--space-4)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{match.name}</h1>
        <button className="ghost" onClick={() => setShowHelp(true)}>
          Keyboard shortcuts (?)
        </button>
      </div>

      <LiveClockPanel match={match} clock={clock} />

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Tag an action</h4>
        <div className="row wrap">
          <button className="primary" onClick={() => tagNow("pass")} style={{ fontSize: "1.1rem", padding: "16px 28px" }}>
            Tag pass <span className="kbd">P</span>
          </button>
          <button className="primary" onClick={() => tagNow("shot")} style={{ fontSize: "1.1rem", padding: "16px 28px" }}>
            Tag shot <span className="kbd">S</span>
          </button>
          <button onClick={() => tagNow("other")} style={{ padding: "16px 28px" }}>
            Tag other event
          </button>
        </div>
      </div>

      {draft && (
        <EventForm
          match={match}
          draft={draft}
          onSave={handleSaveNew}
          onCancel={() => setDraft(null)}
        />
      )}
      {editDraft && editingEvent && (
        <EventForm
          match={match}
          draft={editDraft}
          existingEvent={editingEvent}
          onSave={handleSaveEdit}
          onCancel={() => setEditingEvent(null)}
          onDelete={handleDeleteEdit}
        />
      )}

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Event timeline</h4>
        <EventTimeline
          match={match}
          events={events}
          selectedEventId={editingEvent?.id}
          onEdit={(e) => {
            setDraft(null);
            setEditingEvent(e);
          }}
        />
      </div>

      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

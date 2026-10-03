import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { useLiveClock } from "../hooks/useLiveClock";
import LiveClockPanel from "../components/live/LiveClockPanel";
import ShortcutsHelp from "../components/live/ShortcutsHelp";
import QuickTagFlow from "../components/tagging/QuickTagFlow";
import EventForm from "../components/tagging/EventForm";
import EventTimeline from "../components/tagging/EventTimeline";
import type { PendingDraft } from "../components/tagging/pendingDraft";
import { deleteEvent, listEventsForMatch, updateEvent } from "../db/eventRepo";
import type { MatchEvent, NewMatchEvent } from "../types";

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId]);
  const events = useLiveQuery(() => (matchId ? listEventsForMatch(matchId) : []), [matchId]) ?? [];
  const clock = useLiveClock(match);

  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const cancelAll = useCallback(() => {
    setEditingEvent(null);
    setShowHelp(false);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "?") setShowHelp((v) => !v);
      else if (e.key === "Escape") cancelAll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelAll]);

  const editDraft: PendingDraft | null = editingEvent
    ? { type: editingEvent.type, period: editingEvent.period, elapsedSeconds: editingEvent.elapsedSeconds }
    : null;

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

      {editDraft && editingEvent ? (
        <EventForm
          match={match}
          draft={editDraft}
          existingEvent={editingEvent}
          onSave={handleSaveEdit}
          onCancel={() => setEditingEvent(null)}
          onDelete={handleDeleteEdit}
        />
      ) : (
        <QuickTagFlow match={match} clock={clock} />
      )}

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Event timeline</h4>
        <EventTimeline
          match={match}
          events={events}
          selectedEventId={editingEvent?.id}
          onEdit={(e) => setEditingEvent(e)}
        />
        {events.length > 0 && <p className="muted">Click an event to edit its details (body part, notes, play pattern, and more).</p>}
      </div>

      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

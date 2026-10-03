import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { useMatchVideo } from "../hooks/useMatchVideo";
import { useVideoController } from "../hooks/useVideoController";
import VideoPlayer from "../components/video/VideoPlayer";
import VideoConnectPanel from "../components/video/VideoConnectPanel";
import ClockSyncPanel from "../components/video/ClockSyncPanel";
import ShortcutsHelp from "../components/video/ShortcutsHelp";
import SoccerPitch, { type PitchArrow, type PitchMarker } from "../components/pitch/SoccerPitch";
import EventForm from "../components/tagging/EventForm";
import EventTimeline from "../components/tagging/EventTimeline";
import { CLICKS_REQUIRED, type PendingDraft } from "../components/tagging/pendingDraft";
import { addEvent, deleteEvent, listEventsForMatch, updateEvent } from "../db/eventRepo";
import { periodForVideoTime } from "../utils/time";
import type { EventType, MatchEvent, NewMatchEvent, PitchLocation } from "../types";

interface PlacingState {
  type: EventType;
  clicks: PitchLocation[];
  startVideoTime: number;
}

export default function TaggingWorkspacePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId]);
  const events = useLiveQuery(() => (matchId ? listEventsForMatch(matchId) : []), [matchId]) ?? [];

  const videoRef = useRef<HTMLVideoElement>(null);
  const controller = useVideoController(videoRef);
  const video = useMatchVideo(match);

  const [placing, setPlacing] = useState<PlacingState | null>(null);
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const currentPeriod = match ? periodForVideoTime(match, controller.currentTime) : 1;

  const startPlacing = useCallback(
    (type: EventType) => {
      controller.pause();
      setEditingEvent(null);
      setPlacing({ type, clicks: [], startVideoTime: controller.currentTime });
    },
    [controller],
  );

  const cancelAll = useCallback(() => {
    setPlacing(null);
    setEditingEvent(null);
    setShowHelp(false);
  }, []);

  // Keyboard shortcuts, disabled while typing into a form field.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          controller.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          controller.seekRelative(e.shiftKey ? -1 : -5);
          break;
        case "ArrowRight":
          e.preventDefault();
          controller.seekRelative(e.shiftKey ? 1 : 5);
          break;
        case ",":
          controller.stepFrame(-1);
          break;
        case ".":
          controller.stepFrame(1);
          break;
        case "ArrowUp": {
          e.preventDefault();
          const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
          const idx = speeds.indexOf(controller.playbackRate);
          controller.setPlaybackRate(speeds[Math.min(speeds.length - 1, idx + 1)]);
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
          const idx = speeds.indexOf(controller.playbackRate);
          controller.setPlaybackRate(speeds[Math.max(0, idx - 1)]);
          break;
        }
        case "p":
        case "P":
          startPlacing("pass");
          break;
        case "s":
        case "S":
          startPlacing("shot");
          break;
        case "?":
          setShowHelp((v) => !v);
          break;
        case "Escape":
          cancelAll();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controller, startPlacing, cancelAll]);

  function handlePitchClick(loc: PitchLocation) {
    if (!placing) return;
    const clicks = [...placing.clicks, loc];
    setPlacing({ ...placing, clicks });
  }

  const draft: PendingDraft | null =
    placing && placing.clicks.length >= CLICKS_REQUIRED[placing.type]
      ? {
          type: placing.type,
          period: currentPeriod,
          videoTimeSeconds: placing.startVideoTime,
          location: placing.clicks[0],
          endLocation: placing.clicks[1],
        }
      : null;

  const editDraft: PendingDraft | null = editingEvent
    ? {
        type: editingEvent.type,
        period: editingEvent.period,
        videoTimeSeconds: editingEvent.videoTimeSeconds,
        location: editingEvent.location,
        endLocation:
          editingEvent.type === "pass"
            ? editingEvent.pass.endLocation
            : editingEvent.type === "shot"
              ? editingEvent.shot.endLocation
              : undefined,
      }
    : null;

  async function handleSaveNew(event: NewMatchEvent) {
    await addEvent(event);
    setPlacing(null);
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

  const markers: PitchMarker[] = !match
    ? []
    : events
        .filter((e) => e.location && e.id !== editingEvent?.id)
        .map((e) => {
          const team = e.teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
          return { id: e.id, location: e.location!, color: team.color, radius: 0.8 };
        });

  if (match && placing) {
    placing.clicks.forEach((loc, i) => {
      markers.push({ id: `pending-${i}`, location: loc, color: "#facc15", shape: "ring", radius: 1.6 });
    });
  }
  if (match && editingEvent?.location) {
    const team = editingEvent.teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
    markers.push({ id: "editing-start", location: editingEvent.location, color: team.color, shape: "ring", radius: 2 });
  }

  const arrows: PitchArrow[] = [];
  if (placing && placing.clicks.length === 2) {
    arrows.push({ id: "pending-arrow", from: placing.clicks[0], to: placing.clicks[1], color: "#facc15" });
  }
  if (editingEvent) {
    const end =
      editingEvent.type === "pass"
        ? editingEvent.pass.endLocation
        : editingEvent.type === "shot"
          ? editingEvent.shot.endLocation
          : undefined;
    if (editingEvent.location && end) {
      arrows.push({ id: "editing-arrow", from: editingEvent.location, to: end, color: "#38bdf8", dashed: true });
    }
  }

  if (matchId && match === undefined) {
    return <p className="muted">Loading match...</p>;
  }
  if (!match) {
    return <p>Match not found.</p>;
  }

  const placingClicksNeeded = placing ? CLICKS_REQUIRED[placing.type] - placing.clicks.length : 0;

  return (
    <div className="col" style={{ gap: "var(--space-4)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{match.name}</h1>
        <button className="ghost" onClick={() => setShowHelp(true)}>
          Keyboard shortcuts (?)
        </button>
      </div>

      {video.status !== "connected" && (
        <VideoConnectPanel
          match={match}
          status={video.status}
          errorMessage={video.errorMessage}
          onSelect={video.selectNewVideo}
          onGrantPermission={video.grantPermission}
          onReselect={video.reselectManually}
        />
      )}

      <div className="card">
        <VideoPlayer objectUrl={video.objectUrl} videoRef={videoRef} controller={controller} />
      </div>

      {video.status === "connected" && (
        <>
          <div className="row" style={{ alignItems: "stretch" }}>
            <div className="card" style={{ flex: 1 }}>
              <h4 style={{ marginTop: 0 }}>Tag an action</h4>
              {!placing ? (
                <div className="row wrap">
                  <button className="primary" onClick={() => startPlacing("pass")}>
                    Tag pass <span className="kbd">P</span>
                  </button>
                  <button className="primary" onClick={() => startPlacing("shot")}>
                    Tag shot <span className="kbd">S</span>
                  </button>
                  <button onClick={() => startPlacing("other")}>Tag other event</button>
                </div>
              ) : (
                <div className="row wrap" style={{ justifyContent: "space-between" }}>
                  <span>
                    Click the pitch: {CLICKS_REQUIRED[placing.type] - placingClicksNeeded} of{" "}
                    {CLICKS_REQUIRED[placing.type]} point(s) placed
                    {placing.type !== "other" && placingClicksNeeded > 0
                      ? ` - now click the ${placing.clicks.length === 0 ? "start" : "end"} location`
                      : ""}
                  </span>
                  <button className="ghost" onClick={() => setPlacing(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <ClockSyncPanel match={match} currentVideoTime={controller.currentTime} displayPeriod={currentPeriod} />
          </div>

          <div className="grid-2">
            <SoccerPitch onPitchClick={placing ? handlePitchClick : undefined} markers={markers} arrows={arrows} />

            <div className="col">
              {draft && (
                <EventForm match={match} draft={draft} onSave={handleSaveNew} onCancel={() => setPlacing(null)} />
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
              {!draft && !editDraft && (
                <div className="card">
                  <h4 style={{ marginTop: 0 }}>Event timeline</h4>
                  <EventTimeline
                    match={match}
                    events={events}
                    onSeek={(t) => controller.seek(t)}
                    onEdit={(e) => {
                      setPlacing(null);
                      setEditingEvent(e);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

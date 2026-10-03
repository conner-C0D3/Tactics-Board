import { type RefObject, useState } from "react";
import type { VideoController } from "../../hooks/useVideoController";
import { formatClock } from "../../utils/time";

interface Props {
  objectUrl: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  controller: VideoController;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIPS = [-10, -5, -1, 1, 5, 10];

export default function VideoPlayer({ objectUrl, videoRef, controller }: Props) {
  const { currentTime, duration, playing, playbackRate, togglePlay, seek, seekRelative, stepFrame, setPlaybackRate } =
    controller;
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [seekInput, setSeekInput] = useState("");

  function handleSeekInputSubmit() {
    const parts = seekInput.split(":").map(Number);
    if (parts.some(Number.isNaN)) return;
    let seconds = 0;
    for (const part of parts) seconds = seconds * 60 + part;
    seek(seconds);
    setSeekInput("");
  }

  return (
    <div className="col" style={{ gap: "var(--space-2)" }}>
      <div style={{ background: "#000", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {objectUrl ? (
          <video
            ref={videoRef}
            src={objectUrl}
            style={{ width: "100%", display: "block", maxHeight: "60vh" }}
            onError={() =>
              setPlaybackError(
                "This browser could not play that video file. Try converting it to MP4 (H.264) or WebM, which play reliably in all browsers.",
              )
            }
          />
        ) : (
          <div style={{ aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="muted">No video connected</span>
          </div>
        )}
      </div>

      {playbackError && <p style={{ color: "var(--color-danger)" }}>{playbackError}</p>}

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        disabled={!objectUrl}
      />

      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <span className="kbd" style={{ minWidth: 140, textAlign: "center" }}>
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
          <input
            placeholder="mm:ss"
            value={seekInput}
            onChange={(e) => setSeekInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSeekInputSubmit()}
            style={{ width: 90 }}
          />
          <button type="button" className="small" onClick={handleSeekInputSubmit}>
            Go
          </button>
        </div>

        <div className="row">
          {SKIPS.slice(0, 3).map((s) => (
            <button type="button" key={s} className="small" onClick={() => seekRelative(s)} disabled={!objectUrl}>
              {s}s
            </button>
          ))}
          <button type="button" className="small" onClick={() => stepFrame(-1)} disabled={!objectUrl} title="Previous frame">
            ◁│
          </button>
          <button type="button" className="primary" onClick={togglePlay} disabled={!objectUrl} style={{ minWidth: 90 }}>
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="small" onClick={() => stepFrame(1)} disabled={!objectUrl} title="Next frame">
            │▷
          </button>
          {SKIPS.slice(3).map((s) => (
            <button type="button" key={s} className="small" onClick={() => seekRelative(s)} disabled={!objectUrl}>
              +{s}s
            </button>
          ))}
        </div>

        <div className="row">
          <span className="muted">Speed</span>
          {SPEEDS.map((s) => (
            <button
              type="button"
              key={s}
              className="small"
              style={{ fontWeight: playbackRate === s ? 800 : 500, opacity: playbackRate === s ? 1 : 0.6 }}
              onClick={() => setPlaybackRate(s)}
              disabled={!objectUrl}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

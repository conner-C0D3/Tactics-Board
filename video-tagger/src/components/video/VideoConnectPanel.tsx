import type { Match } from "../../types";
import type { VideoStatus } from "../../hooks/useMatchVideo";
import { isLikelyUnsupportedFormat, supportsFileSystemAccess } from "../../utils/videoFile";

interface Props {
  match: Match;
  status: VideoStatus;
  errorMessage: string | null;
  onSelect: () => void;
  onGrantPermission: () => void;
  onReselect: () => void;
}

export default function VideoConnectPanel({ match, status, errorMessage, onSelect, onGrantPermission, onReselect }: Props) {
  if (status === "connected") return null;

  const formatWarning = match.video && isLikelyUnsupportedFormat(match.video.name);

  return (
    <div className="card col" style={{ gap: "var(--space-3)" }}>
      {status === "no-video" && (
        <>
          <h3 style={{ margin: 0 }}>Connect this match's video</h3>
          <p className="muted">
            Choose the video file on your computer. It is never uploaded - the app only remembers its name and, where
            your browser supports it, a reference so it can be reopened automatically next time.
          </p>
          <button className="primary" onClick={onSelect} style={{ alignSelf: "flex-start" }}>
            Choose video file
          </button>
        </>
      )}

      {status === "checking" && <p className="muted">Reconnecting to {match.video?.name}...</p>}

      {status === "needs-permission" && (
        <>
          <h3 style={{ margin: 0 }}>Reconnect {match.video?.name}</h3>
          <p className="muted">Your browser needs you to confirm access to this file again after reloading the app.</p>
          <div className="row">
            <button className="primary" onClick={onGrantPermission}>
              Reconnect video
            </button>
            <button className="ghost" onClick={onReselect}>
              Choose a different file
            </button>
          </div>
        </>
      )}

      {status === "needs-reselect" && (
        <>
          <h3 style={{ margin: 0 }}>Reselect {match.video?.name ?? "the match video"}</h3>
          <p className="muted">
            {supportsFileSystemAccess()
              ? "This file wasn't found at its earlier location. Please locate it again."
              : "Your browser (Firefox/Safari) can't reopen local files automatically. Please pick the same file again - your annotations are unaffected."}
          </p>
          <button className="primary" onClick={onReselect} style={{ alignSelf: "flex-start" }}>
            Select video file
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <h3 style={{ margin: 0, color: "var(--color-danger)" }}>Couldn't open the video</h3>
          <p className="muted">{errorMessage}</p>
          <button className="primary" onClick={onSelect} style={{ alignSelf: "flex-start" }}>
            Try again
          </button>
        </>
      )}

      {formatWarning && status !== "error" && (
        <p style={{ color: "var(--color-warning)" }}>
          "{match.video?.name}" doesn't look like a browser-friendly format. If it fails to play, re-export it as MP4
          (H.264) or WebM.
        </p>
      )}
    </div>
  );
}

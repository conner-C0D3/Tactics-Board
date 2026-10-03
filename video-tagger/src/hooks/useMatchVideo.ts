import { useCallback, useEffect, useRef, useState } from "react";
import type { Match } from "../types";
import { updateMatch } from "../db/matchRepo";
import {
  pickVideoManually,
  pickVideoWithHandle,
  requestReconnectPermission,
  supportsFileSystemAccess,
  toVideoFileRef,
  trySilentReconnect,
} from "../utils/videoFile";

export type VideoStatus =
  | "no-video"
  | "checking"
  | "needs-permission"
  | "needs-reselect"
  | "connected"
  | "error";

export function useMatchVideo(match: Match | undefined) {
  const [status, setStatus] = useState<VideoStatus>("no-video");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const setFile = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setObjectUrl(url);
    setStatus("connected");
    setErrorMessage(null);
  }, []);

  // Attempt a silent reconnect once per match (on first load / switching matches).
  // Deliberately keyed on match id alone: selectNewVideo() and grantPermission()
  // already set status themselves once they succeed, and re-running this on every
  // match.video change (e.g. right after we just connected it ourselves) would
  // immediately flip a freshly-connected fallback-browser video back to
  // "needs-reselect", since there is nothing to silently reconnect to there.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!match) return;
      if (!match.video) {
        setStatus("no-video");
        return;
      }
      setStatus("checking");
      if (!supportsFileSystemAccess()) {
        setStatus("needs-reselect");
        return;
      }
      try {
        const result = await trySilentReconnect(match.id, match.video);
        if (cancelled) return;
        if (result.status === "granted") setFile(result.file);
        else if (result.status === "needs-permission") setStatus("needs-permission");
        else setStatus("needs-reselect");
      } catch {
        if (!cancelled) setStatus("needs-reselect");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const selectNewVideo = useCallback(async () => {
    if (!match) return;
    setErrorMessage(null);
    try {
      if (supportsFileSystemAccess()) {
        const picked = await pickVideoWithHandle(match.id);
        if (!picked) return;
        await updateMatch(match.id, { video: picked.ref });
        setFile(picked.file);
      } else {
        const file = await pickVideoManually();
        if (!file) return;
        await updateMatch(match.id, { video: toVideoFileRef(file, false) });
        setFile(file);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not open that video file.");
      setStatus("error");
    }
  }, [match, setFile]);

  const grantPermission = useCallback(async () => {
    if (!match?.video) return;
    try {
      const result = await requestReconnectPermission(match.id, match.video);
      if (result.status === "granted") setFile(result.file);
      else if (result.status === "mismatch") {
        setErrorMessage("The file at that location has changed. Please reselect the video.");
        setStatus("needs-reselect");
      } else {
        setErrorMessage("Permission to read the video file was not granted.");
        setStatus("needs-permission");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not reconnect the video file.");
      setStatus("error");
    }
  }, [match, setFile]);

  const reselectManually = useCallback(async () => {
    if (!match?.video) return;
    try {
      const file = await pickVideoManually();
      if (!file) return;
      await updateMatch(match.id, { video: toVideoFileRef(file, false) });
      setFile(file);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not open that video file.");
      setStatus("error");
    }
  }, [match, setFile]);

  return { status, objectUrl, errorMessage, selectNewVideo, grantPermission, reselectManually };
}

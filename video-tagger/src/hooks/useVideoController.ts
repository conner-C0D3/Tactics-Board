import { type RefObject, useCallback, useEffect, useState } from "react";

export interface VideoController {
  currentTime: number;
  duration: number;
  playing: boolean;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  stepFrame: (direction: 1 | -1) => void;
  setPlaybackRate: (rate: number) => void;
}

const ASSUMED_FPS = 25;

export function useVideoController(videoRef: RefObject<HTMLVideoElement | null>): VideoController {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onRateChange = () => setRate(video.playbackRate);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ratechange", onRateChange);

    if (video.readyState >= 1) onLoadedMetadata();

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ratechange", onRateChange);
    };
    // videoRef.current can change identity when a new file is loaded; re-attach then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current]);

  const play = useCallback(() => videoRef.current?.play(), [videoRef]);
  const pause = useCallback(() => videoRef.current?.pause(), [videoRef]);
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, [videoRef]);

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(seconds, video.duration || seconds));
    },
    [videoRef],
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seek(video.currentTime + delta);
    },
    [videoRef, seek],
  );

  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      seekRelative((1 / ASSUMED_FPS) * direction);
    },
    [seekRelative],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setRate(rate);
    },
    [videoRef],
  );

  return { currentTime, duration, playing, playbackRate, play, pause, togglePlay, seek, seekRelative, stepFrame, setPlaybackRate };
}

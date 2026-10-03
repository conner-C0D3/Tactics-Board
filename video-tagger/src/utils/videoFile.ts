import { db } from "../db/db";
import type { VideoFileRef } from "../types";

/**
 * Browser support for reconnecting a video file across reloads without
 * re-prompting the user is split in two tiers:
 *
 *  - Chromium browsers (Chrome, Edge, Opera, Brave) support the File System
 *    Access API. We keep a FileSystemFileHandle and can re-open the same
 *    file next time, after re-confirming permission (the browser requires a
 *    fresh user click for that, it cannot be silent).
 *  - Firefox and Safari do not implement that API. There is no way to
 *    reopen a local file there without the user picking it again; we store
 *    the file's name/size/modified-time and ask the analyst to pick the
 *    file again with a plain <input type="file">, then check it matches
 *    before trusting it.
 */
export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

const ACCEPTED_VIDEO_TYPES = {
  "video/mp4": [".mp4", ".m4v"],
  "video/webm": [".webm"],
  "video/ogg": [".ogv"],
  "video/quicktime": [".mov"],
} satisfies Record<`${string}/${string}`, `.${string}`[]>;

export function toVideoFileRef(file: File, hasStoredHandle: boolean): VideoFileRef {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    hasStoredHandle,
  };
}

export function fileMatchesRef(file: File, ref: VideoFileRef): boolean {
  return file.name === ref.name && file.size === ref.size;
}

/** Opens the native file picker (File System Access API) and stores the handle for next time. */
export async function pickVideoWithHandle(matchId: string): Promise<{ file: File; ref: VideoFileRef } | null> {
  if (!supportsFileSystemAccess()) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "Video files", accept: ACCEPTED_VIDEO_TYPES }],
    });
    const file = await handle.getFile();
    await db.videoHandles.put({ matchId, handle });
    return { file, ref: toVideoFileRef(file, true) };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }
}

export type ReconnectResult =
  | { status: "granted"; file: File }
  | { status: "needs-permission" }
  | { status: "no-handle" }
  | { status: "mismatch" };

/**
 * Checks (without prompting) whether we already have permission to reopen
 * the stored handle. Call this on page load / match open.
 */
export async function trySilentReconnect(matchId: string, expected: VideoFileRef): Promise<ReconnectResult> {
  if (!supportsFileSystemAccess()) return { status: "no-handle" };
  const record = await db.videoHandles.get(matchId);
  if (!record) return { status: "no-handle" };
  const granted = (await record.handle.queryPermission({ mode: "read" })) === "granted";
  if (!granted) return { status: "needs-permission" };
  const file = await record.handle.getFile();
  if (!fileMatchesRef(file, expected)) return { status: "mismatch" };
  return { status: "granted", file };
}

/**
 * Prompts the browser's permission dialog. Must be called from inside a
 * user-initiated event handler (a button click), otherwise the browser
 * silently rejects it.
 */
export async function requestReconnectPermission(matchId: string, expected: VideoFileRef): Promise<ReconnectResult> {
  if (!supportsFileSystemAccess()) return { status: "no-handle" };
  const record = await db.videoHandles.get(matchId);
  if (!record) return { status: "no-handle" };
  const granted = (await record.handle.requestPermission({ mode: "read" })) === "granted";
  if (!granted) return { status: "needs-permission" };
  const file = await record.handle.getFile();
  if (!fileMatchesRef(file, expected)) return { status: "mismatch" };
  return { status: "granted", file };
}

export async function pickVideoManually(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,.mp4,.webm,.mov,.m4v,.ogv";
    input.onchange = () => {
      resolve(input.files && input.files.length > 0 ? input.files[0] : null);
    };
    input.click();
  });
}

const BROWSER_PLAYABLE_HINTS = [".mp4", ".webm", ".ogv", ".ogg", ".m4v"];

/** Heuristic warning for formats that commonly fail to play back in-browser (e.g. raw .mov with uncommon codecs, .avi, .mkv). */
export function isLikelyUnsupportedFormat(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (BROWSER_PLAYABLE_HINTS.some((ext) => lower.endsWith(ext))) return false;
  return true;
}

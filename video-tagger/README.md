# Soccer Match Video Tagger

A local, single-analyst app for tagging your own match videos (passes and
shots to start with) and turning the tags into statistics, pitch
visualizations, and a documented subset of the StatsBomb open-data export
format.

Everything runs in your browser on your own computer:

- **No account, no backend, no paid service, no AI API.** Nothing is sent
  anywhere.
- **Your video file never leaves your computer.** The app only remembers
  its name and (in Chrome/Edge) a reference it can use to reopen it next
  time - never the video itself.
- **All match data (teams, players, events) is stored locally** in your
  browser's IndexedDB, so it survives closing the tab and restarting your
  computer. It does **not** sync between browsers or computers - use the
  built-in backup/import feature for that (see below).

## 1. Install and run it

You need [Node.js](https://nodejs.org/) 20 or newer installed. Then, from
this folder (`video-tagger/`):

```bash
npm install
npm run dev
```

This starts a local development server and prints a URL, typically
`http://localhost:5173/`. Open that in **Chrome or Microsoft Edge** (see
"Browser choice" below). Leave the terminal window open while you use the
app - closing it stops the server.

To stop the app, go back to the terminal and press `Ctrl+C`.

### Browser choice

The app works in any modern browser, but **Chrome or Edge give you the
smoothest experience**: after picking your video file once, the app can
silently reconnect to it every time you reopen the match (you'll just need
to click one "Reconnect" button after a browser restart, since browsers
require that confirmation click for security).

**Firefox and Safari** don't support that reconnect feature at all (it's a
browser limitation, not something this app can work around). In those
browsers you'll need to click your video file again each time you reopen a
match - your tagged events are never affected, only the video link.

### Running it again later

Every time you want to use the app, open a terminal in this folder and run
`npm run dev` again, then open the printed URL. Your matches and tagged
events are still there from last time (stored in that browser's IndexedDB)
- you do not need to redo `npm install` unless you deleted `node_modules`.

### Building a standalone version (optional)

If you'd rather not keep a terminal open, you can build a static version and
open it directly:

```bash
npm run build
npm run preview
```

`npm run preview` serves the built app and prints a URL - open that the same
way. The build output lands in `dist/`.

## 2. Using the app

### Match library

The home screen lists your matches. **+ New match** walks you through:
match info (name/date/competition/venue, period lengths, who you're
tagging), team names/colors, and starting lineups. You can edit lineups
later from the tagging screen's players, rename a match, **back it up** to a
JSON file (a full copy you can re-import, e.g. onto another computer or
after clearing browser data), or delete it.

### Tagging workspace

1. **Connect the video**: click "Choose video file" and pick the match
   recording from your computer.
2. **Mark each period's kickoff**: scrub the video to the exact moment of
   kickoff, then click "Mark kickoff" for that period in the "Match clock"
   panel. This is what lets the app show you a real match clock (e.g.
   "52:13") instead of just raw video time, and is used for every event's
   recorded time - do this before tagging for accurate timestamps,
   especially for the second half.
3. **Tag an action**: click "Tag pass" or "Tag shot" (or use the `P`/`S`
   keyboard shortcuts). The video pauses automatically. Click the pitch
   diagram where the action started, then where it ended (its target
   location). Fill in the player, outcome, and other details in the form
   that appears, then "Save event."
4. The **event timeline** on the right lists everything you've tagged.
   Click an event's time to jump the video there; click the row itself to
   edit or delete it.

Keyboard shortcuts (press `?` any time to see this list on-screen):

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` / `→` | Seek back / forward 5 seconds |
| `Shift` + `←`/`→` | Seek back / forward 1 second |
| `,` / `.` | Step one frame back / forward |
| `↑` / `↓` | Increase / decrease playback speed |
| `P` | Start tagging a pass |
| `S` | Start tagging a shot |
| `Esc` | Cancel tagging / close the open panel |

Shortcuts are automatically disabled while you're typing in a text field.

### Analysis dashboard

Filter by team and period, then review pass completion and shot stats per
team and per player, a shot map (color-coded by outcome), and a pass map
(green = completed, red = incomplete/out). From here you can also back up
the match or **export it in StatsBomb's open-data format** - see below.

## 3. Video file formats

Use **MP4 (H.264 video)** if you have a choice when exporting/converting
your match footage - it plays reliably in every browser. WebM also works
well. Formats like `.avi`, `.mkv`, or `.mov` with uncommon codecs often fail
to play in-browser; the app will warn you and tell you to re-export if that
happens. Re-encoding with a free tool like [HandBrake](https://handbrake.fr/)
(target "Fast 1080p30" MP4 preset) fixes almost any format issue.

## 4. Backing up your data

Your match data lives only in this browser's local storage. **Back up
matches regularly** (Match library → "Back up," or the dashboard's "Back up
match" button) if you'd be upset to lose your tagging work - e.g. before
clearing your browser's site data, switching computers, or updating your OS.
A backup is a single JSON file holding the match setup, lineups, and every
tagged event (not the video itself - you'll reconnect that separately after
importing). Restore it from the Match library's "Import backup" button.

## 5. StatsBomb export

The Analysis dashboard's "Export StatsBomb JSON" button produces three
files (events, lineups, and match info) shaped like a documented subset of
StatsBomb's open-data format, for loading into other analysis tools. Exactly
what's implemented, and where this export deviates from StatsBomb's real
schema, is written up in detail in
[`src/statsbomb/README.md`](src/statsbomb/README.md) - worth a read before
you rely on it.

## 6. How it's built (for reference)

React + TypeScript + Vite, IndexedDB (via Dexie) for storage, Recharts for
charts, and a hand-built SVG pitch using StatsBomb's own 120x80 coordinate
system (so event locations need no conversion on export). No backend, no
external services. The data model (`src/types/index.ts`) is intentionally
extensible: Pass and Shot are fully built out, and a generic event type
exists as a starting point for adding more (interceptions, duels, fouls,
...) later - see the "Extending this export" section of
`src/statsbomb/README.md` for what adding a new event type touches.

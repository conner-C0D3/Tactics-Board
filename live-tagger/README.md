# Live Soccer Match Tagger

A local, single-analyst app for tracking a match **live**, as it happens -
tap in passes and shots from the sideline, then turn them into statistics
and visualizations, with export to a documented subset of StatsBomb's
open-data format.

This is the live-tracking sibling of this repo's `video-tagger` app: same
data model and export, but no video player. Instead of scrubbing footage,
you run a real-time match clock and tap each action as it happens.

Everything runs in your browser on your own device:

- **No account, no backend, no paid service, no AI API.** Nothing is sent
  anywhere.
- **All match data (teams, players, events) is stored locally** in your
  browser's IndexedDB, so it survives closing the tab and restarting your
  device. It does **not** sync between browsers or devices - use the
  built-in backup/import feature for that (see below).
- **The live clock survives a reload.** It's driven by real wall-clock time,
  not a timer that resets if you refresh the page or your browser crashes.

## 1. Install and run it

You need [Node.js](https://nodejs.org/) 20 or newer. Then, from this folder
(`live-tagger/`):

```bash
npm install
npm run dev
```

This prints a URL, typically `http://localhost:5173/`. Open that on
whatever device you'll be tagging from - a laptop, tablet, or phone all
work, since it's just a web page. Leave the terminal open while you use the
app.

If you'll be tagging from a tablet or phone on the same network as the
computer running the server, run `npm run dev -- --host` instead, then use
the "Network" URL it prints (something like `http://192.168.1.23:5173/`) on
the other device.

### Running it again later

Open a terminal in this folder and run `npm run dev` again. Your matches and
tagged events are still there (stored in that browser) - you don't need to
redo `npm install` unless you deleted `node_modules`.

### Building a standalone version (optional)

```bash
npm run build
npm run preview
```

## 2. Using the app

### Match library

Create a match via **+ New match**: match info (name/date/competition/venue,
period lengths, who you're tagging), team names/colors, and starting
lineups. Rename, **back up** (a JSON file you can re-import), or delete a
match from here too.

### Live match page

1. **Start the clock** when the ref blows the whistle for kickoff: click
   "Start period 1" in the Live match clock panel. It keeps running in real
   time, even if you refresh the page.
2. **Pause** for a stoppage if you want the clock to hold (e.g. a long
   injury delay), **Resume** when play restarts, and **End period 1** /
   **Start period 2** at halftime.
3. **Tag an action**: click "Tag pass" or "Tag shot" (or press `P` / `S` on
   a keyboard) the moment it happens. A form opens with the time already
   locked in - take your time filling in the rest:
   - Tap the **team**, then the **player** (big buttons, not a dropdown -
     or just type the player's shirt number, see shortcuts below).
   - Optionally tap the small pitch diagram for where it started/ended -
     skip it if you don't have a free second, it's not required.
   - Pick the outcome and any other detail, then **Save event**.
4. The **event timeline** below lists everything you've tagged, most recent
   first. Click a row to edit or delete it.

**Keyboard shortcuts** (press `?` to see this on-screen), built for speed
when the game won't wait:

| Key | Action |
|---|---|
| `P` | Tag a pass right now |
| `S` | Tag a shot right now |
| `H` / `A` | While the form is open: jump straight to the home / away team |
| `0`-`9` | While the form is open: type a player's shirt number to select them instantly (type a 2nd digit quickly for numbers 10+) |
| `Esc` | Cancel tagging / close the open panel |

Shortcuts are automatically disabled while you're typing into a text field
(like the Notes box).

### Analysis dashboard

Filter by team and period, then review pass completion and shot stats per
team and per player, a shot map, and a pass map. From here you can also back
up the match or **export it in StatsBomb's open-data format**.

## 3. Tips for tagging live

- Recruit a second pair of hands if you can - one person watching play,
  one tagging - the form is built to be fast solo, but it's even easier
  split up.
- Don't worry about getting every field right in the moment. The event's
  time is locked in the instant you tap "Tag pass"/"Tag shot", so it's fine
  to take a few extra seconds filling in outcome/location after the ball has
  already moved on.
- Pitch location is optional on every event - use it when you have a beat
  to spare, skip it when you don't.

## 4. Backing up your data

Your match data lives only in this browser's local storage. **Back up
matches regularly** (Match library → "Back up," or the dashboard's "Back up
match" button) if you'd be upset to lose your tagging work. A backup is a
single JSON file holding the match setup, lineups, and every tagged event.
Restore it from the Match library's "Import backup" button.

## 5. StatsBomb export

The Analysis dashboard's "Export StatsBomb JSON" button produces three
files (events, lineups, and match info) shaped like a documented subset of
StatsBomb's open-data format. Exactly what's implemented, and where this
export deviates from StatsBomb's real schema, is written up in
[`src/statsbomb/README.md`](src/statsbomb/README.md).

## 6. How it's built (for reference)

React + TypeScript + Vite, IndexedDB (via Dexie) for storage, Recharts for
charts, and a hand-built SVG pitch using StatsBomb's own 120x80 coordinate
system. No backend, no external services. The live clock is driven by a
stored start timestamp plus real elapsed time (`src/hooks/useLiveClock.ts`),
not an in-memory countdown, so it can't drift or reset on a reload. The data
model (`src/types/index.ts`) is intentionally extensible: Pass and Shot are
fully built out, and a generic event type exists as a starting point for
adding more (interceptions, duels, fouls, ...) later - see "Extending this
export" in `src/statsbomb/README.md` for what adding a new event type
touches.

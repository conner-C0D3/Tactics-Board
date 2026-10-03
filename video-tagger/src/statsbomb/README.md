# StatsBomb open-data export: what's implemented

This app can export a tagged match as JSON shaped like a subset of
[StatsBomb's open-data format](https://github.com/statsbomb/open-data). It is
a one-way export for feeding other tools (pandas, `mplsoccer`,
`socceraction`, etc.) that already know how to read StatsBomb-shaped event
data. It is **not** a byte-for-byte reproduction of StatsBomb's schema and
makes no claim to be - see "Known deviations" below before relying on it for
anything that needs exact conformance.

Exporting a match produces three files:

- `<match>-statsbomb-events.json` - one object per tagged action, shaped like
  StatsBomb's `events/<match_id>.json`.
- `<match>-statsbomb-lineups.json` - one object per team, shaped like
  StatsBomb's `lineups/<match_id>.json`.
- `<match>-statsbomb-match.json` - a small match-info object, loosely shaped
  like one entry of StatsBomb's `matches/<competition>/<season>.json`.

## Event fields implemented

Every exported event includes:

| Field | Notes |
|---|---|
| `id` | This app's internal UUID for the event. |
| `index` | Sequence number within the match, in the order you tagged/sorted them. |
| `period` | Period number (1, 2, and beyond for extra time, as configured). |
| `timestamp` | `HH:MM:SS.mmm`, elapsed time **since that period's kickoff marker**. If you never marked the period's kickoff, this falls back to raw video time and will be inaccurate - mark kickoffs before exporting. |
| `minute`, `second` | Match-clock time, accumulating across periods (second half continues from 45:00), based on each period's configured length. |
| `type.{id,name}` | `"Pass"` or `"Shot"` for the two fully-modeled types. See "Other event types" below for anything else. |
| `possession` | A running integer that increments every time the team in possession changes between consecutive tagged events. **This is a simplification** - see deviations. |
| `possession_team.{id,name}` | The team of the current event (see deviation note). |
| `play_pattern.{id,name}` | One of: Regular Play, From Corner, From Free Kick, From Throw In, From Counter, From Goal Kick, From Keeper, From Kick Off, Other. |
| `team.{id,name}` | The tagged team. |
| `player.{id,name,jersey_number}` | The tagged player. Omitted if no player was selected. |
| `location` | `[x, y]` in StatsBomb's own coordinate space: pitch is 120 (length) x 80 (width), origin at the top-left as seen in your video. This app stores locations in this space natively - what you click is what gets exported, no conversion. |
| `under_pressure` | `true` when checked; the key is **omitted** (not `false`) when unchecked, matching StatsBomb's own convention of only emitting boolean flags when true. |

### Pass fields (`pass` object)

| Field | Notes |
|---|---|
| `end_location` | `[x, y]`, same coordinate space as `location`. |
| `recipient.{id,name,jersey_number}` | Optional; omitted if not set. |
| `height.{id,name}` | Ground Pass / Low Pass / High Pass; omitted if not set. |
| `body_part.{id,name}` | Right Foot / Left Foot / Head / **Other Body Part** (StatsBomb's exact wording - this app's UI just says "Other"). |
| `type.{id,name}` | Corner / Free Kick / Kick Off / Throw-in / Goal Kick. **Omitted for Open Play**, matching StatsBomb's convention that regular passes don't carry a `pass.type`. |
| `outcome.{id,name}` | Incomplete / Out / Unknown. **Omitted when the pass is complete** - a missing `outcome` key means "complete," exactly as in real StatsBomb data. |

### Shot fields (`shot` object)

| Field | Notes |
|---|---|
| `end_location` | `[x, y]` - **2D only**. Real StatsBomb shot end-locations are 3D (`[x, y, z]`, with `z` capturing the height of the ball, e.g. for a crossbar shot). This app only captures a 2D pitch click, so `z` is not available. This is a known deviation. |
| `type.{id,name}` | Open Play / Free Kick / Penalty. Always present (unlike `pass.type`, StatsBomb's `shot.type` is always included). |
| `outcome.{id,name}` | Goal / Saved / **Off T** / Blocked / Post / Wayward (StatsBomb abbreviates "Off Target" as `"Off T"` - this app's UI spells it out, and renames it on export). |
| `body_part.{id,name}` | Same options and "Other Body Part" renaming as passes. |
| `first_time` | `true` when checked; omitted otherwise (same boolean-flag convention as `under_pressure`). |

### Other event types

This app's data model is intentionally extensible beyond Pass/Shot (see
`src/types/index.ts`), but only Pass and Shot are fully built out in the
tagging UI for this version. Anything tagged as a generic "other" event
exports with whatever free-text label you gave it. If that label exactly
matches a name this app recognizes (`Ball Recovery`, `Dispossessed`, `Duel`,
`Block`, `Clearance`, `Interception`, `Dribble`, `Pressure`, `Foul Won`,
`Foul Committed`, `Miscontrol`), it is exported with that StatsBomb type
name. Otherwise it is exported as `{"id": 9999, "name": "<your label>"}`,
which is **not** a real StatsBomb type id - downstream tools that don't
recognize it should just ignore or pass through that event.

## Lineups

Each team exports as `{ team_id, team_name, lineup: [...] }`, where each
lineup entry has `player_id`, `player_name`, `jersey_number`, `position`
(free text, optional) and `is_starter`. This is a **simplified subset** of
StatsBomb's real lineup schema, which also tracks per-player card events and
a detailed timeline of position changes throughout the match
(`positions: [{ position, from, to, ... }]`). This app only tracks whether a
player started or was a substitute, not when substitutions happened.

## Match info

`match_id`, `match_date`, `competition_stage` (your free-text competition
name - not a real StatsBomb `competition`/`season` id pair), `venue`,
`home_team`/`away_team`, `home_score`/`away_score` (computed by counting
exported `Goal` shots), and `periods` (period number + length in minutes).

## Known deviations, in one place

- **Numeric `id` values are a local convention, not StatsBomb's real
  registry.** StatsBomb's internal numbering for things like
  `type.id`/`pass.height.id`/`shot.outcome.id` isn't part of their published
  open-data documentation as a stable contract, so the ids in this export are
  assigned locally in `src/statsbomb/ids.ts` for internal consistency only.
  **Match on `name` strings, not `id` numbers**, if you load this into other
  tooling. The `name` strings themselves are StatsBomb's real vocabulary.
- **No `statsbomb_xg`.** This app has no expected-goals model, so the `shot`
  object never includes an xG value.
- **No freeze frames or 360 data.** StatsBomb's optional freeze-frame/360
  products (defender positions at the moment of a shot) aren't modeled here.
- **2D shot end-location only** (no `z` height component).
- **Simplified `possession`.** Real StatsBomb possession numbering follows a
  detailed state machine (it tracks who regains the ball, out-of-play
  resets, etc). This export just increments a counter whenever the acting
  team changes between consecutive tagged events, which is a reasonable
  approximation for a pass/shot-focused tagging workflow but will not exactly
  match StatsBomb's own possession boundaries.
- **No `related_events`, `tactics`, `carry`, `ball_receipt`, `duration`,
  `off_camera`, `counterpress`, or `50/50` fields.** These StatsBomb event
  attributes aren't captured by this app's tagging workflow.
- **`timestamp` accuracy depends on marking period kickoffs.** If a period's
  kickoff was never marked in the tagging workspace, that period's event
  timestamps fall back to raw video time instead of true elapsed match time.

## Extending this export

Adding a new fully-modeled event type (e.g. Interceptions as their own
tagged form instead of the generic "other" bucket) means: add an interface
and union member in `src/types/index.ts`, a case in
`src/components/tagging/EventForm.tsx` and `EventTimeline.tsx`, and a
dedicated branch in `buildStatsBombExport` (`src/statsbomb/export.ts`)
instead of falling through to `mapOtherEventType`.

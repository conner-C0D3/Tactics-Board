# Soccer Field Planner — feature backlog

Everything from Conner's list, captured verbatim in intent and ordered easiest to
hardest. Nothing here has been built. IDs are stable — quote them ("let's do T1-3
and T2-1") and I'll know exactly what you mean.

Tiers are about **effort and risk**, not importance. T0 is an afternoon; T6 is a
product in its own right.

---

## Tier 0 — renames, constants and defaults (hours)

These touch a label or a number. No new machinery.

- **T0-1** Rename `Fit` → **Whole field**.
- **T0-2** Rename `Snap` → **Snap to grid**.
- **T0-3** Rename `Align` → `Align preview`.
- **T0-4** Players drawn 1/2 yard wide.
- **T0-5** Mannequins get a height like the poles — both 3/4 yard, so a Row of
  them placed a yard apart doesn't get joined up by a line.
- **T0-6** Select mode is the default on load, so you never have to choose it.
- **T0-7** Toggle to drop the grid entirely — a clean green field.
- **T0-8** Hover description on every tool button saying what it does (web).

## Tier 1 — small features on machinery that already exists

The box tool, the tape tool and the item model already do most of this; these are
extensions rather than new systems.

- **T1-1** Move the tape's yardage readout onto the field itself, the way the box
  tool already prints its dimensions.
- **T1-2** Measuring tool, in the top row between the undo buttons and the zoom
  buttons. Drags like tape; prints the yards on the field like the box.
- **T1-3** `Show yardage` toggle next to it — distances between items, on or off.
- **T1-4** Live distance readout between two of the same piece of equipment while
  you drag one of them.
- **T1-5** Colour picker for every player, not a fixed palette.
- **T1-6** New player type: **Server**. Marks who plays the ball in, and becomes
  the default start of the ball sim — press play and the ball comes from the
  server every time.
- **T1-7** Passing lines and shooting lines that are only drawn, never animated.
- **T1-8** Highlight a region like the box tool and tint the field under it, with
  a colour choice.
- **T1-9** Guides = the dashed marks. On a custom field they appear automatically
  and there is no button to take them away.
- **T1-10** Right sidebar panel: total equipment used, and what's still needed.

## Tier 2 — layout and information architecture

A restructure of the whole frame around the pitch. Best done in one pass rather
than piecemeal, because everything moves at once.

- **T2-1** **Two toolbar rows above the field.**
  - Upper row (modes): Select · Row · Tape · Ball Path · Runs · **Team Tactics**.
  - Lower row (actions), left to right: zoom · full-overview · undo/redo · clear ·
    snap *(renamed)* · boost · grid off · rotate · setup name, save, choose where
    it saves, and export.
  - **Mode options only appear for the mode you're in** — the "yd apart" control for
    Row shows only in Row mode, and so on.
- **T2-2** Equipment becomes a **left sidebar** that opens and closes.
- **T2-3** Favourites in that sidebar — pin what you use most instead of scrolling.
- **T2-4** Notes panel on the **right sidebar**.
- **T2-5** Nothing written or clickable below the field. *(The session strip moves
  to the right sidebar as a tab, alongside Notes and the equipment tally — D-C.)*
- **T2-6** General formatting cleanup.

## Tier 3 — the field and the objects on it

Real model changes. The pitch is currently a fixed set of named fields.

- **T3-1** **Custom field dimensions.** Type the yards you have (e.g. 40 × 30), or
  the real size of the pitch you're on, and the app draws it accurately.
- **T3-2** Dashed lines available on custom fields.
- **T3-3** Every remaining piece of equipment added to the library.
- **T3-4** **Mirror placement** — while dragging the second of a pair, offer a lock
  onto the mirrored position on the opposite side (goals being the obvious case).
- **T3-5** Copy and paste: drag a box round part of a field, copy it, paste onto
  another field.

## Tier 4 — simulation

Builds on the leg/timetable machinery that's already there, but each of these
changes what a "leg" can be.

- **T4-1** Ball in the air, not only along the ground.
- **T4-2** Shooting in the ball sim.
- **T4-3** Hide the ball-path and run lines during playback — just players moving.
- **T4-4** Dribbling, with individual touches you can actually see.
- **T4-5** Pre-assigned player movement.
- **T4-6** Shooting in the player sim.
- **T4-7** **Ball-order strip** showing the sequence the ball is played in, with
  players draggable into a different order — so a player already on the field can
  be dropped into the sequence instead of building every pass by hand.
- **T4-8** Defensive ranking levels, so the sim faces different standards of
  defending. (Applies to the tactics sim too.)

## Tier 5 — accounts, storage and the product around the planner

**These all need a backend, so they wait.** Today the app is one HTML file keeping
everything in browser storage — no sign-in, no server, no file store. Per D-A we
stay single-file and instead shape the save format into a proper data model, so
this tier can be built on a server later without a rewrite.

- **T5-1** Home dashboard after sign-in: your saved training plans.
- **T5-2** Folders for plans, organised by topic.
- **T5-3** Hover preview on a plan — a small picture of the field. (Needs a
  different gesture once it's a phone app.)
- **T5-4** **My Team** page: upload player names and small face photos, used
  instead of plain circles.
- **T5-5** Penny/bib on a player's photo, so everyone knows their team.
- **T5-6** Automatic lineup / starters, set once and recalled when you ask for a
  team setup.
- **T5-7** **Equipment** page beside My Team and System Settings: what you own,
  how many, and the sizes (goals 8 × 3 yd, and so on) — so none of that clutters
  the home page.
- **T5-8** Manual quantity entry per item, including an **unlimited** option.
- **T5-9** Home nav: My Team · Equipment · System Settings · Help · Home.
- **T5-10** **Subscription tiers**
  - *Free* — a 50 × 50 yd field, 2 goals, 10 cones in one colour, 2 player colours.
  - *Practice* — everything except Team Tactics (ball sim, runs, the lot).
  - *Full* — everything.
- **T5-11** Presentation mode: pick images, talk over them, ask questions, step to
  the next one to show what you actually want. *(Covers Team Tactics **and** the
  practice planner — D-D.)*
- **T5-12** Pre-designed setups droppable onto the field. *(Approach open.)*
- **T5-13** Set pieces — run through how you want them organised. *(Realistic
  figures or plain circles: see Q-E.)*

## Tier 6 — the hard ones

Each of these is a project. None of them is a change to the planner; they're new
engines sitting next to it.

- **T6-1** **Equipment photo count** — photograph your kit bag, get a count back,
  never count cones again.
- **T6-2** **Tactics Simulator.** The big one. Write out what's happening in plain
  words — "they're pressing 4-3-3, their 9 on our 6, wingers onto our centre
  backs" — and the scene generates itself. Then pick passing options off it, the
  way the ball sim works, to show how to break the press.
  - Must be **fast**. This gets used at half time.
  - Must look **realistic** — recognisable figures, not circles, accurate about
    which foot the ball is played to.
- **T6-3** Upload game film, reconstruct the exact moment, then run a sim of what
  should have happened instead.

---

## Decisions made

- **D-A — architecture: single file, backend-shaped.** The app stays one HTML
  file with browser storage. But the save format gets restructured into a clean
  data model — plans, drills, teams, equipment as proper records — so a real
  backend can drop in later without a rewrite. Tiers 0–4 all ship on this.
  Tier 5 waits for the server. *(Was Q-A.)*
- **D-B — the renames.** `Fit` → **Whole field**. `Snap` → **Snap to grid**.
  *(T0-1, T0-2. Was Q-B.)*
- **D-C — the session strip moves to the right sidebar** as a tab, sharing that
  sidebar with Notes (T2-4) and the equipment tally (T1-10). Stays visible while
  you build the drill. *(T2-5. Was Q-C.)*
- **D-D — presentation mode covers tactics *and* the practice planner.** Present
  drills to players at training as well as tactics in the room. *(T5-11. Was Q-D.)*
- **D-F — "boost" is one button**, said twice in the toolbar description.
  *(T2-1. Was Q-F.)*
- **D-G — grid and guides are two separate layers.** Grid = the square measuring
  mesh, removable for a clean green field (T0-7). Guides = the dashed pitch
  markings, drawn automatically on custom sizes with no off switch (T1-9, T3-2).
  *(Was Q-G.)*
- **D-I — the mannequin/pole height is about the Row tool's spacing.** Placing a
  row of them close together currently draws something joining them up; giving
  them a 3/4 yd height like the poles stops it. *(T0-5. Was Q-I.)*

## Open questions

- **Q-E — set pieces**: realistic figures, or the player circles we already have?
- **Q-H — free tier vs custom fields.** Free gets a fixed 50 × 50; does custom
  sizing (T3-1) start at Practice, or is it free too? **Deferred** — to be
  settled when we work through the tier logistics as a whole (T5-10).

import type { Match, MatchEvent, Player } from "../types";
import {
  BODY_PART_IDS,
  EVENT_TYPE_IDS,
  PASS_HEIGHT_IDS,
  PASS_OUTCOME_IDS,
  PASS_TYPE_IDS,
  PLAY_PATTERN_IDS,
  SHOT_OUTCOME_IDS,
  SHOT_TYPE_IDS,
  idName,
} from "./ids";
import type { SBEvent, SBLineupTeam, SBMatchInfo, SBPlayerRef, SBTeamRef } from "./types";

function teamRef(id: string, name: string): SBTeamRef {
  return { id, name };
}

function playerRef(player: Player | undefined): SBPlayerRef | undefined {
  if (!player) return undefined;
  return { id: player.id, name: player.name, jersey_number: player.shirtNumber };
}

function findPlayer(match: Match, teamId: string, playerId?: string): Player | undefined {
  if (!playerId) return undefined;
  const team = teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
  return team.players.find((p) => p.id === playerId);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function periodRelativeSeconds(match: Match, event: MatchEvent): number {
  const kickoff = match.periodKickoffVideoSeconds[event.period];
  if (kickoff === undefined) return event.videoTimeSeconds;
  return Math.max(0, event.videoTimeSeconds - kickoff);
}

function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/** Maps a free-text "other" event label onto a known StatsBomb event type when we recognize it, otherwise a clearly non-standard placeholder. See README's "Other event types" section. */
function mapOtherEventType(label: string) {
  const trimmed = label.trim();
  if (trimmed in EVENT_TYPE_IDS) return idName(EVENT_TYPE_IDS, trimmed);
  return { id: EVENT_TYPE_IDS.Other, name: trimmed || "Other" };
}

const SHOT_OUTCOME_EXPORT_NAME: Record<string, string> = { "Off Target": "Off T" };
const BODY_PART_EXPORT_NAME: Record<string, string> = { Other: "Other Body Part" };

export interface StatsBombExportResult {
  events: SBEvent[];
  lineups: SBLineupTeam[];
  matchInfo: SBMatchInfo;
}

export function buildStatsBombExport(match: Match, allEvents: MatchEvent[]): StatsBombExportResult {
  const sorted = [...allEvents].sort((a, b) => a.index - b.index);

  let possession = 0;
  let lastTeamId: string | null = null;

  const events: SBEvent[] = sorted.map((event) => {
    if (event.teamId !== lastTeamId) {
      possession += 1;
      lastTeamId = event.teamId;
    }
    const team = event.teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
    const player = findPlayer(match, event.teamId, event.playerId);

    const sbEvent: SBEvent = {
      id: event.id,
      index: event.index,
      period: event.period,
      timestamp: formatTimestamp(periodRelativeSeconds(match, event)),
      minute: event.minute,
      second: event.second,
      type: event.type === "pass" ? idName(EVENT_TYPE_IDS, "Pass") : event.type === "shot" ? idName(EVENT_TYPE_IDS, "Shot") : mapOtherEventType(event.other.label),
      possession,
      possession_team: teamRef(team.id, team.name),
      play_pattern: idName(PLAY_PATTERN_IDS, event.playPattern),
      team: teamRef(team.id, team.name),
      player: playerRef(player),
      location: event.location ? [round1(event.location.x), round1(event.location.y)] : undefined,
      under_pressure: event.underPressure ? true : undefined,
    };

    if (event.type === "pass") {
      const recipient = findPlayer(match, event.teamId, event.pass.recipientId);
      const bodyPartName = event.pass.bodyPart ? (BODY_PART_EXPORT_NAME[event.pass.bodyPart] ?? event.pass.bodyPart) : undefined;
      sbEvent.pass = {
        recipient: playerRef(recipient),
        height: event.pass.height ? idName(PASS_HEIGHT_IDS, event.pass.height) : undefined,
        end_location: [round1(event.pass.endLocation.x), round1(event.pass.endLocation.y)],
        type: event.pass.passType === "Open Play" ? undefined : idName(PASS_TYPE_IDS, event.pass.passType),
        body_part: bodyPartName ? idName(BODY_PART_IDS, bodyPartName) : undefined,
        outcome: event.pass.outcome === "Complete" ? undefined : idName(PASS_OUTCOME_IDS, event.pass.outcome),
      };
    } else if (event.type === "shot") {
      const outcomeName = SHOT_OUTCOME_EXPORT_NAME[event.shot.outcome] ?? event.shot.outcome;
      const bodyPartName = event.shot.bodyPart ? (BODY_PART_EXPORT_NAME[event.shot.bodyPart] ?? event.shot.bodyPart) : undefined;
      sbEvent.shot = {
        end_location: [round1(event.shot.endLocation.x), round1(event.shot.endLocation.y)],
        type: idName(SHOT_TYPE_IDS, event.shot.shotType),
        body_part: bodyPartName ? idName(BODY_PART_IDS, bodyPartName) : undefined,
        outcome: idName(SHOT_OUTCOME_IDS, outcomeName),
        first_time: event.shot.firstTime ? true : undefined,
      };
    }

    return sbEvent;
  });

  const lineups: SBLineupTeam[] = [match.homeTeam, match.awayTeam].map((team) => ({
    team_id: team.id,
    team_name: team.name,
    lineup: team.players.map((p) => ({
      player_id: p.id,
      player_name: p.name,
      jersey_number: p.shirtNumber,
      position: p.position,
      is_starter: p.isStarter,
    })),
  }));

  const countGoals = (teamId: string) =>
    sorted.filter((e) => e.type === "shot" && e.teamId === teamId && e.shot.outcome === "Goal").length;

  const matchInfo: SBMatchInfo = {
    match_id: match.id,
    match_date: match.date,
    competition_stage: match.competition,
    venue: match.venue,
    home_team: teamRef(match.homeTeam.id, match.homeTeam.name),
    away_team: teamRef(match.awayTeam.id, match.awayTeam.name),
    home_score: countGoals(match.homeTeam.id),
    away_score: countGoals(match.awayTeam.id),
    periods: match.periods.map((p) => ({ period: p.number, length_minutes: p.lengthMinutes })),
  };

  return { events, lineups, matchInfo };
}

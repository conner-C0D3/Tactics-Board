// Shapes of the exported JSON. This mirrors the subset of StatsBomb's
// open-data schema that this app implements - see README.md in this folder.

export interface SBIdName {
  id: number;
  name: string;
}

export interface SBPlayerRef {
  id: string;
  name: string;
  jersey_number?: number;
}

export interface SBTeamRef {
  id: string;
  name: string;
}

export interface SBPassFields {
  recipient?: SBPlayerRef;
  height?: SBIdName;
  end_location: [number, number];
  type?: SBIdName; // omitted for Open Play, matching StatsBomb convention
  body_part?: SBIdName;
  outcome?: SBIdName; // omitted when the pass is complete
}

export interface SBShotFields {
  end_location: [number, number];
  type: SBIdName;
  body_part?: SBIdName;
  outcome: SBIdName;
  first_time?: true; // omitted when false, matching StatsBomb's boolean-flag convention
}

export interface SBEvent {
  id: string;
  index: number;
  period: number;
  timestamp: string; // HH:MM:SS.mmm, relative to period start
  minute: number;
  second: number;
  type: SBIdName;
  possession: number;
  possession_team: SBTeamRef;
  play_pattern: SBIdName;
  team: SBTeamRef;
  player?: SBPlayerRef;
  location?: [number, number];
  under_pressure?: true; // omitted when false
  pass?: SBPassFields;
  shot?: SBShotFields;
}

export interface SBLineupPlayer {
  player_id: string;
  player_name: string;
  jersey_number: number;
  position?: string;
  is_starter: boolean;
}

export interface SBLineupTeam {
  team_id: string;
  team_name: string;
  lineup: SBLineupPlayer[];
}

export interface SBMatchInfo {
  match_id: string;
  match_date: string;
  competition_stage: string;
  venue: string;
  home_team: SBTeamRef;
  away_team: SBTeamRef;
  home_score: number;
  away_score: number;
  periods: { period: number; length_minutes: number }[];
}

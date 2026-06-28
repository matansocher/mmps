export type WcRound = 'R16' | 'QF' | 'SF' | 'FINAL';

// A team placed into an inner-round slot of the bracket.
//   gnum  - 365scores image-group number within the round (fixes the box)
//   slot  - participant index 0 (top) / 1 (bottom) within the box
//   group - the team's Round-of-32 origin group 1..16 (used to copy its flag)
//   pos   - 0 (top) / 1 (bottom) within its Round-of-32 group
export type WcPlacement = {
  readonly round: WcRound;
  readonly gnum: number;
  readonly slot: number;
  readonly name: string;
  readonly group: number;
  readonly pos: number;
};

export type RawBracketParticipant = {
  readonly competitorId?: number;
  readonly name: string;
};

export type RawBracketGroup = {
  readonly num: number;
  readonly participants?: RawBracketParticipant[];
};

export type RawBracketStage = {
  readonly num: number;
  readonly groups?: RawBracketGroup[];
};

export type RawBracket = {
  readonly stages?: RawBracketStage[];
};

export type WcTreeResult = {
  readonly path: string | null;
  readonly placedCount: number;
};

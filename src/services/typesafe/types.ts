export type JevNoulQuestion = {
  readonly type: 'noul';
  readonly instructions: string;
  readonly criteria?: {
    readonly true?: string;
    readonly false?: string;
  };
};

export type JevRequest = {
  readonly model: string;
  readonly state: string;
  readonly questions: Record<string, JevNoulQuestion>;
};

export type JevNoulAnswer = {
  readonly type: 'noul';
  readonly noul: number;
};

export type JevResponse = {
  readonly model: string;
  readonly answers: Record<string, JevNoulAnswer>;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
};

export type SupportedFileKind = 'pdf' | 'text' | 'image';

export type FileSummaryMetadata = {
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
};

export type ExtractedFileContent = {
  readonly kind: SupportedFileKind;
  readonly metadata: FileSummaryMetadata;
  readonly text?: string;
  readonly pageCount?: number;
  readonly truncated?: boolean;
  readonly images?: readonly string[];
};

export type PrepareFileSummaryInput = FileSummaryMetadata & {
  readonly localPath: string;
  readonly caption?: string;
};

export type PreparedFileSummary = {
  readonly prompt: string;
  readonly images?: readonly string[];
};

export type FileSummaryRejection = {
  readonly reason: 'too_large' | 'unsupported';
  readonly message: string;
};

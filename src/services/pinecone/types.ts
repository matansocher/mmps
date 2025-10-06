export type VectorMetadata = {
  courseId?: string;
  chunkIndex?: number;
  content?: string;
  summary?: string;
  [key: string]: string | number | boolean | undefined;
};

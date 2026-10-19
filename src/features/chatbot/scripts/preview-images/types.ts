export type ImagePreview = {
  readonly name: string;
  readonly render: () => Buffer | null | Promise<Buffer | null>;
};

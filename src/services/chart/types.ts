export type LineChartPoint = {
  readonly x: number; // Numeric position on the x-axis (e.g. an hour, or a timestamp)
  readonly y: number; // Value on the y-axis
  readonly label?: string; // Optional tick label rendered under this point on the x-axis
};

export type LineChartColors = {
  readonly background: string;
  readonly text: string;
  readonly muted: string;
  readonly grid: string;
  readonly line: string;
  readonly areaTop: string;
  readonly areaBottom: string;
  readonly peak: string;
  readonly low: string;
};

export type LineChartOptions = {
  readonly points: ReadonlyArray<LineChartPoint>;
  readonly title: string;
  readonly headline?: string; // Right-aligned headline next to the title (e.g. a range or total)
  readonly yAxisFormatter?: (value: number) => string; // Formats y gridline labels and marker labels
  readonly colors?: Partial<LineChartColors>;
  readonly fileNamePrefix?: string; // Output file name prefix; defaults to "chart"
};

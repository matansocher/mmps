import { IMS_BASE_URL, RADAR_FRAME_INTERVAL_MINUTES } from './constants';
import type { ImsRadarItem, ImsRadarResponse, RadarFrame, RadarFrameSelection, RadarSource, RadarStatus } from './types';

// IMSRadar file names end with the radar status, e.g. IMSRadar4GIS_202609261515_0.png
export function parseRadarStatus(fileName: string): RadarStatus {
  const match = fileName.match(/_(\d)\.png$/);
  const status = match ? Number(match[1]) : 0;
  return ([0, 1, 2, 3].includes(status) ? status : 0) as RadarStatus;
}

function toFrames(items: ReadonlyArray<ImsRadarItem> | undefined, source: RadarSource): RadarFrame[] {
  return [...(items ?? [])]
    .sort((a, b) => a.forecast_time.localeCompare(b.forecast_time))
    .map((item) => ({
      time: item.forecast_time,
      url: `${IMS_BASE_URL}${item.file_name}`,
      status: source === 'IMSRadar' ? parseRadarStatus(item.file_name) : 0,
    }));
}

// Prefers the 5-minute IMS radar, falls back to the composite radar when the IMS radar is down
export function selectRadarFrames(response: ImsRadarResponse, minutes: number): RadarFrameSelection {
  const types = response?.data?.types;
  const imsFrames = toFrames(types?.IMSRadar, 'IMSRadar');
  const latestIms = imsFrames.at(-1);
  const source: RadarSource = latestIms && latestIms.status <= 1 ? 'IMSRadar' : 'radar';
  const frames = source === 'IMSRadar' ? imsFrames : toFrames(types?.radar, 'radar');

  if (!frames.length) {
    throw new Error('No radar frames available from IMS');
  }

  const count = Math.max(1, Math.round(minutes / RADAR_FRAME_INTERVAL_MINUTES[source]) + 1);
  return { source, frames: frames.slice(-count) };
}

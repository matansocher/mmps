import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { DEFAULT_ANIMATION_MINUTES, DEFAULT_VIEW, FRAME_DELAY_MS, IMS_BASE_URL, IMS_RADAR_METADATA_ENDPOINT, IMS_USER_AGENT, LAST_FRAME_DELAY_MS, RADAR_BOUNDS } from './constants';
import { selectRadarFrames } from './frames';
import { createLabelOverlay, createMarkerOverlay, createProgressOverlay, createRadarOverlay, getBaseMap } from './map-utils';
import type { GeneratedRadarImage, ImsRadarResponse, RadarFrame, RadarSource, RadarView, RainRadarAnimation, RainRadarOptions } from './types';

const logger = new Logger('rain-radar');

async function fetchRadarMetadata(): Promise<ImsRadarResponse> {
  const res = await axios.get<ImsRadarResponse>(`${IMS_BASE_URL}${IMS_RADAR_METADATA_ENDPOINT}`, {
    timeout: 15_000,
    headers: { 'User-Agent': IMS_USER_AGENT, Accept: 'application/json' },
  });
  return res.data;
}

async function fetchRadarImage(frame: RadarFrame): Promise<Buffer | null> {
  if (frame.status !== 0) return null;
  try {
    const res = await axios.get<ArrayBuffer>(frame.url, { responseType: 'arraybuffer', timeout: 15_000, headers: { 'User-Agent': IMS_USER_AGENT } });
    return Buffer.from(res.data);
  } catch {
    logger.warn(`Failed to download radar frame ${frame.url}`);
    return null;
  }
}

function formatFrameLabel(time: string): string {
  // "2026-09-26 15:10:00" -> "15:10 · 26/09"
  const [date, clock] = time.split(' ');
  const [, month, day] = date.split('-');
  return `${clock.slice(0, 5)} · ${day}/${month}`;
}

async function renderFrame(frame: RadarFrame, index: number, total: number, source: RadarSource, view: RadarView, options: RainRadarOptions): Promise<Buffer> {
  const [baseMap, radarImage, label] = await Promise.all([getBaseMap(view), fetchRadarImage(frame), createLabelOverlay(formatFrameLabel(frame.time), view)]);
  const radar = radarImage ? await createRadarOverlay(radarImage, RADAR_BOUNDS[source], view) : null;
  const marker = options.marker ? createMarkerOverlay(options.marker, view) : null;
  const overlays = [radar, marker, label, total > 1 ? createProgressOverlay(index, total, view) : null].filter(Boolean);

  return sharp(baseMap).composite(overlays).png().toBuffer();
}

export async function generateRainRadarAnimation(options: RainRadarOptions = {}): Promise<RainRadarAnimation> {
  const view = options.view ?? DEFAULT_VIEW;
  const { source, frames } = selectRadarFrames(await fetchRadarMetadata(), options.minutes ?? DEFAULT_ANIMATION_MINUTES);
  const latest = frames.at(-1);
  logger.log(`Rendering ${frames.length} ${source} radar frames up to ${latest.time}`);

  const rendered: Buffer[] = [];
  for (const [index, frame] of frames.entries()) {
    rendered.push(await renderFrame(frame, index, frames.length, source, view, options));
  }

  const delay = rendered.map((_, index) => (index === rendered.length - 1 ? LAST_FRAME_DELAY_MS : FRAME_DELAY_MS));
  const gif = await sharp(rendered, { join: { animated: true } })
    .gif({ delay, loop: 0 })
    .toBuffer();

  return { gif, latestFrame: rendered.at(-1), source, latestTime: latest.time, latestStatus: latest.status, frameCount: frames.length };
}

export async function generateRainRadarImage(options: Omit<RainRadarOptions, 'minutes'> = {}): Promise<GeneratedRadarImage> {
  const radar = await generateRainRadarAnimation({ ...options, minutes: 0 });

  const assetsDir = path.resolve(process.cwd(), 'assets', 'radar');
  fs.mkdirSync(assetsDir, { recursive: true });
  const outputPath = path.join(assetsDir, `ims_radar_${Date.now()}.png`);
  fs.writeFileSync(outputPath, radar.latestFrame);

  logger.log(`IMS radar image saved to: ${outputPath}`);
  return { path: outputPath, time: radar.latestTime };
}

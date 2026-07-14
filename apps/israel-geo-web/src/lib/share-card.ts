import type { RoundResult } from '../types';
import { getCosmetic } from './cosmetics';

type ShareCardData = {
  readonly score: number;
  readonly results: readonly RoundResult[];
  readonly newStampCount: number;
  readonly shareFrameId?: string;
};

function createCard(data: ShareCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image sharing is not supported in this browser');

  const frame = getCosmetic(data.shareFrameId);
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, frame?.palette[0] ?? '#111827');
  gradient.addColorStop(1, frame?.palette[1] ?? '#030712');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, 1080, 1350);
  if (frame) {
    context.strokeStyle = '#FFFFFF';
    context.globalAlpha = 0.55;
    context.lineWidth = 14;
    context.strokeRect(34, 34, 1012, 1282);
    context.globalAlpha = 1;
  }

  context.fillStyle = '#F97316';
  context.fillRect(72, 72, 150, 12);
  context.font = '700 54px system-ui, sans-serif';
  context.fillText('ISRAEL GEO', 72, 170);
  context.fillStyle = '#9CA3AF';
  context.font = '600 30px system-ui, sans-serif';
  context.fillText('FIVE STREETS. FIVE CONFIDENCE CIRCLES.', 72, 220);

  context.fillStyle = '#FFFFFF';
  context.font = '800 132px system-ui, sans-serif';
  context.fillText(data.score.toLocaleString(), 72, 390);
  context.fillStyle = '#9CA3AF';
  context.font = '700 34px system-ui, sans-serif';
  context.fillText('OUT OF 25,000', 78, 438);

  data.results.forEach((result, index) => {
    const y = 540 + index * 120;
    context.fillStyle = result.circleHit ? '#16A34A' : '#DC2626';
    context.beginPath();
    context.arc(108, y, 28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#FFFFFF';
    context.font = '800 28px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(result.circleHit ? 'H' : 'M', 108, y + 10);
    context.textAlign = 'left';
    context.font = '700 34px system-ui, sans-serif';
    context.fillText(`ROUND ${result.round}`, 166, y - 5);
    context.fillStyle = '#9CA3AF';
    context.font = '600 28px system-ui, sans-serif';
    context.fillText(`${result.circleRadiusKm} km circle`, 166, y + 35);
    context.fillStyle = '#F97316';
    context.font = '800 36px system-ui, sans-serif';
    context.textAlign = 'right';
    context.fillText(`+${result.points.toLocaleString()}`, 1008, y + 12);
    context.textAlign = 'left';
  });

  context.fillStyle = '#1F2937';
  context.fillRect(72, 1165, 936, 1);
  context.fillStyle = '#FFFFFF';
  context.font = '700 32px system-ui, sans-serif';
  context.fillText(data.newStampCount > 0 ? `${data.newStampCount} new passport stamp${data.newStampCount === 1 ? '' : 's'}` : 'Israel Passport journey continues', 72, 1230);
  context.fillStyle = '#F97316';
  context.font = '700 30px system-ui, sans-serif';
  context.fillText('Play at /israel-geo', 72, 1290);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not generate the share card'))), 'image/png');
  });
}

export async function shareResultCard(data: ShareCardData): Promise<'shared' | 'downloaded'> {
  const blob = await canvasToBlob(createCard(data));
  const file = new File([blob], `israel-geo-${data.score}.png`, { type: 'image/png' });
  const shareData = { title: 'Israel Geo', text: `I scored ${data.score.toLocaleString()} / 25,000 in Israel Geo.`, files: [file], url: `${window.location.origin}/israel-geo/` };
  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

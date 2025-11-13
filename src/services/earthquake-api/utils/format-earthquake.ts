import { Earthquake } from '../types';
import { formatDepth } from './format-depth';
import { getAlertEmoji } from './get-alert-emoji';
import { getSeverityEmoji } from './get-severity-emoji';

export function formatEarthquake(quake: Earthquake): string {
  const { properties, geometry } = quake;
  const [longitude, latitude, depth] = geometry.coordinates;

  const severity = getSeverityEmoji(properties.mag);
  const date = new Date(properties.time);
  const depthStr = formatDepth(depth);

  let message = `${severity} *Magnitude ${properties.mag.toFixed(1)}*\n`;
  message += `📍 ${properties.place}\n`;
  message += `🕐 ${date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
  message += `📏 Depth: ${depthStr}\n`;
  message += `🌐 Coordinates: ${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°\n`;

  if (properties.tsunami === 1) {
    message += `🌊 *TSUNAMI WARNING*\n`;
  }

  if (properties.alert) {
    const alertEmoji = getAlertEmoji(properties.alert);
    message += `⚠️  Alert Level: ${alertEmoji} ${properties.alert.toUpperCase()}\n`;
  }

  if (properties.felt !== null && properties.felt !== undefined) {
    message += `👥 Felt by: ${properties.felt} people\n`;
  }

  message += `\n🔗 [Details](${properties.url})`;

  return message;
}

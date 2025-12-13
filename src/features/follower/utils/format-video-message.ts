import type { VideoNotification } from '../types';

export function formatVideoMessage(notification: VideoNotification): string {
  const { videoUrl, title, description, summary, channelName } = notification;

  const parts: string[] = [`New video from ${channelName}!`, '', `📺 ${title}`];

  if (summary) {
    parts.push('', `📝 Summary: ${summary}`);
  } else if (description) {
    const truncatedDescription = description.length > 200 ? `${description.substring(0, 200)}...` : description;
    parts.push('', truncatedDescription);
  }

  parts.push('', `🔗 Watch: ${videoUrl}`);

  return parts.join('\n');
}

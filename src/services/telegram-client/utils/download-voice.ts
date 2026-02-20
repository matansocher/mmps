import fs from 'fs/promises';
import { Api, TelegramClient } from 'telegram';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';

const logger = new Logger('TelegramClientDownloadVoice');

export async function downloadVoice(client: TelegramClient, event): Promise<{ fileName: string } | undefined> {
  try {
    const document = event.message?.media?.document;
    const documentObject = new Api.Document({
      id: document.id,
      accessHash: document.accessHash,
      fileReference: Buffer.from(document.fileReference),
      date: document.date,
      mimeType: document.mimeType,
      size: document.size,
      dcId: document.dcId,
      attributes: document.attributes.map((attr) => {
        if (attr.className === 'DocumentAttributeAudio') {
          return new Api.DocumentAttributeAudio({
            voice: attr.voice,
            duration: attr.duration,
            waveform: Buffer.from(attr.waveform),
          });
        }
        return attr;
      }),
    });

    const mediaDocument = new Api.MessageMediaDocument({ document: documentObject });

    const buffer = await client.downloadMedia(mediaDocument);

    const fileName = `${LOCAL_FILES_PATH}/telegram-audio-message-${Date.now()}.ogg`;
    await fs.writeFile(fileName, buffer);

    return { fileName };
  } catch (err) {
    logger.error(`Failed to download voice message: ${err}`);
    return undefined;
  }
}

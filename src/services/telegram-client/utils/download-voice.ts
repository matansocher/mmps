import * as fs from 'fs';
import { Api, TelegramClient } from 'telegram';
import { LOCAL_FILES_PATH } from '@core/config';

export async function downloadVoice(client: TelegramClient, event) {
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

  const fileName = `${LOCAL_FILES_PATH}/telegram-audio-message-${new Date().getTime()}.ogg`;
  fs.writeFileSync(fileName, buffer);

  return { fileName };
}

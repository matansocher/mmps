import { deleteFile } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai';
import { listen, sendMessage, TelegramMessage } from '@services/telegram-client';

const contacts = {
  tootie: { chatId: '1332013273', name: 'Toodie', number: '+972546602785' },
  matan: { chatId: '862305226', name: 'Matan', number: '+972545429402' },
};

export function transcriptIncomingMessages() {
  const contactsIds = Object.values(contacts).map((c) => c.chatId);
  listen({ conversationsIds: contactsIds }, async (messageData: TelegramMessage) => {
    if (!messageData.isVoice) {
      return;
    }

    const transcript = await getTranscriptFromAudio(messageData.voice.fileName, 'he');
    const contact = Object.values(contacts).find((c) => c.chatId === messageData.userId.toString());

    await sendMessage({ name: contact.name, number: contact.number, message: transcript }).catch((err) => {
      console.error(`Error sending message: ${err.message}`, err.stack);
    });

    await deleteFile(messageData.voice.fileName);
  });
}

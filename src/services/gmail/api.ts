import { getGmailClient } from './auth';

type Email = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly snippet: string;
};

type SendEmailOpts = {
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
};

export async function fetchUserEmails(q: string, maxResults: number): Promise<Email[]> {
  try {
    const gmail = await getGmailClient();
    const response = await gmail.users.messages.list({ userId: 'me', q, maxResults });
    const messages = response.data.messages || [];
    if (messages.length === 0) {
      console.log('No new unread emails.');
      return;
    }

    const cleanedEmails = [];
    for (const message of messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: message.id as string });

      const subject = details.data.payload?.headers?.find((h) => h.name === 'Subject')?.value;
      const from = details.data.payload?.headers?.find((h) => h.name === 'From')?.value;

      cleanedEmails.push({
        id: details.data.id,
        from: from || 'Unknown Sender',
        subject: subject || 'No Subject',
        snippet: details.data.snippet || '',
      });
    }
    return cleanedEmails;
  } catch (err) {
    console.error(`Error fetching emails: ${err}`);
    return [];
  }
}

export async function trashEmail(messageId: string) {
  try {
    const gmail = await getGmailClient();
    await gmail.users.messages.trash({ userId: 'me', id: messageId });
  } catch (err) {
    console.error(`Error trashing email: ${err}`);
    return null;
  }
}

export async function sendEmail({ recipient, subject, body }: SendEmailOpts): Promise<string> {
  try {
    const gmail = await getGmailClient();
    const utf8Message = [`To: ${recipient}`, 'Content-Type: text/html; charset=utf-8', 'MIME-Version: 1.0', `Subject: ${subject}`, '', body].join('\r\n');
    const base64EncodedEmail = Buffer.from(utf8Message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: base64EncodedEmail } });
    return res.data.id;
  } catch (err) {
    console.error(`Failed to send email: ${err}`);
  }
}

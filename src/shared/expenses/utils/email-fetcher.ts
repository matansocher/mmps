import { PDFParse } from 'pdf-parse';
import { Logger } from '@core/utils';
import { downloadAttachment, fetchEmailFull, type EmailAttachment } from '@services/gmail';

const logger = new Logger('expense-email-fetcher');

export type FetchedPdf = {
  readonly filename: string;
  readonly text: string;
};

export type FetchedEmailContent = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly date: string;
  readonly snippet: string;
  readonly bodyText: string;
  readonly pdfs: ReadonlyArray<FetchedPdf>;
  readonly attachments: ReadonlyArray<EmailAttachment>;
};

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    return (text || '').trim();
  } catch (err) {
    logger.warn(`PDF parse failed: ${err}`);
    return '';
  }
}

export async function fetchEmailContent(messageId: string): Promise<FetchedEmailContent | null> {
  const email = await fetchEmailFull(messageId);
  if (!email) return null;

  const pdfAttachments = email.attachments.filter((a) => a.mimeType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'));

  const pdfs: FetchedPdf[] = [];
  for (const att of pdfAttachments) {
    try {
      const buffer = await downloadAttachment(email.id, att.attachmentId);
      const text = await parsePdfBuffer(buffer);
      if (text) pdfs.push({ filename: att.filename, text });
    } catch (err) {
      logger.warn(`Failed to download/parse attachment ${att.filename}: ${err}`);
    }
  }

  return {
    id: email.id,
    from: email.from,
    subject: email.subject,
    date: email.date,
    snippet: email.snippet,
    bodyText: email.bodyText,
    pdfs,
    attachments: email.attachments,
  };
}

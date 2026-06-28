export { fetchUserEmails, trashEmail, sendEmail, listMessageIds, fetchEmailFull, downloadAttachment } from './api';
export type { EmailAttachment, FullEmail } from './api';
export { flattenParts, decodeBase64Url, extractBody, stripHtml } from './parts';
export type { EmailPart } from './parts';

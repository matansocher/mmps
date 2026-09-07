import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { fetchUserEmails, sendEmail, trashEmail } from '@services/gmail';

const schema = z.object({
  action: z.enum(['list', 'send', 'delete']).describe('Action to perform: "list" to fetch emails, "send" to send an email, "delete" to trash an email'),

  // For list action
  query: z.string().optional().describe('Gmail search query for filtering emails (e.g., "is:unread", "from:sender@example.com", "subject:invoice"). Default: "is:unread"'),
  maxResults: z.number().optional().describe('Maximum number of emails to return (default: 10, max: 50)'),

  // For send action
  recipient: z.string().optional().describe('Email address of the recipient'),
  subject: z.string().optional().describe('Email subject line'),
  body: z.string().optional().describe('Email body content (supports HTML)'),

  // For delete action
  emailId: z.string().optional().describe('The Gmail message ID to delete/trash'),
});

type SchemaType = z.infer<typeof schema>;

const sendInputSchema = z.object({
  recipient: z.string().email().describe('Recipient email address'),
  subject: z.string().min(1).describe('Email subject'),
  body: z.string().min(1).describe('HTML email body'),
});

const deleteInputSchema = z.object({
  emailId: z.string().min(1).describe('The Gmail message ID to delete/trash'),
});

async function listEmailsInternal(query?: string, maxResults?: number): Promise<any> {
  const finalQuery = query || 'is:unread';
  const finalMaxResults = Math.min(maxResults || 10, 50);

  const emails = await fetchUserEmails(finalQuery, finalMaxResults);

  if (emails.length === 0) {
    return {
      message: 'No emails found matching query',
      emails: [],
    };
  }

  return {
    message: `Found ${emails.length} email(s)`,
    emails: emails.map((email) => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
    })),
  };
}

async function sendEmailInternal(recipient?: string, subject?: string, body?: string): Promise<any> {
  const { recipient: to, subject: emailSubject, body: emailBody } = sendInputSchema.parse({ recipient, subject, body });
  const messageId = await sendEmail({ recipient: to, subject: emailSubject, body: emailBody });

  return {
    message: `Email sent successfully to ${to}`,
    messageId: messageId,
    subject: emailSubject,
  };
}

async function deleteEmailInternal(emailId?: string): Promise<any> {
  const { emailId: id } = deleteInputSchema.parse({ emailId });
  await trashEmail(id);

  return {
    message: `Email with ID ${id} has been moved to trash`,
    emailId: id,
  };
}

async function runner({ action, query, maxResults, recipient, subject, body, emailId }: SchemaType) {
  switch (action) {
    case 'list':
      return await listEmailsInternal(query, maxResults);

    case 'send':
      return await sendEmailInternal(recipient, subject, body);

    case 'delete':
      return await deleteEmailInternal(emailId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export const gmailTool = tool(runner, {
  name: 'gmail',
  description: 'List, send, or delete Gmail emails. Supports three actions: "list" to fetch emails with optional search query, "send" to send HTML emails, or "delete" to move emails to trash.',
  schema,
});

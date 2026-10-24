import type { ObjectId } from 'mongodb';

// none = scanned, no event found. processing = a button tap is being handled.
export type EmailEventStatus = 'none' | 'pending' | 'processing' | 'added' | 'dismissed';

export type EmailEventDetails = {
  readonly title: string;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly startTime: string | null; // Format: "HH:mm", null for an all-day event
  readonly endDate: string | null; // Format: "YYYY-MM-DD", null when it ends on `date`
  readonly endTime: string | null; // Format: "HH:mm"
  readonly location: string | null;
  readonly description: string | null;
};

export type EmailEvent = {
  readonly _id?: ObjectId;
  readonly emailId: string;
  readonly emailFrom: string;
  readonly emailSubject: string;
  readonly status: EmailEventStatus;
  readonly event?: EmailEventDetails;
  readonly messageId?: number;
  readonly calendarEventId?: string;
  readonly createdAt: Date;
  readonly resolvedAt?: Date;
};

export type CreateEmailEventData = Omit<EmailEvent, '_id' | 'createdAt' | 'messageId' | 'calendarEventId' | 'resolvedAt'>;

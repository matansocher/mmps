import type { Binary, ObjectId } from 'mongodb';

export type WhatsAppIncomingMessage = {
  readonly from: string;
  readonly id: string;
  readonly timestamp: string;
  readonly type: string;
  readonly text?: { readonly body: string };
  readonly sticker?: { readonly id: string; readonly mime_type?: string; readonly sha256?: string; readonly animated?: boolean };
  readonly context?: { readonly from?: string; readonly id?: string };
};

export type WhatsAppWebhookPayload = {
  readonly object?: string;
  readonly entry?: ReadonlyArray<{
    readonly id?: string;
    readonly changes?: ReadonlyArray<{
      readonly field?: string;
      readonly value?: {
        readonly messaging_product?: string;
        readonly messages?: ReadonlyArray<WhatsAppIncomingMessage>;
        readonly statuses?: ReadonlyArray<{ readonly status?: string; readonly recipient_id?: string }>;
      };
    }>;
  }>;
};

export type IncomingTextMessage = {
  readonly kind: 'text';
  readonly from: string;
  readonly id: string;
  readonly text: string;
  readonly contextId?: string; // id of the message this one quote-replies to
};

export type IncomingStickerMessage = {
  readonly kind: 'sticker';
  readonly from: string;
  readonly id: string;
  readonly mediaId: string;
  readonly animated: boolean;
};

export type IncomingMessage = IncomingTextMessage | IncomingStickerMessage;

export type Sticker = {
  readonly _id?: ObjectId;
  readonly ownerPhone: string;
  readonly sha256: string; // hex sha256 of the webp bytes, unique per owner
  readonly data: Binary;
  readonly mimeType: string;
  readonly animated: boolean;
  readonly tags: string[];
  readonly messageIds: string[]; // wamids of chat messages showing this sticker, for quote-reply lookup
  readonly mediaId?: string; // last upload to Meta, reusable until it expires
  readonly mediaUploadedAt?: Date;
  readonly lastReceivedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StickerSummary = Omit<Sticker, 'data'>;

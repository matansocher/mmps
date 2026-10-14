type WhatsAppMessageBase = {
  readonly messaging_product: 'whatsapp';
  readonly recipient_type: 'individual';
  readonly to: string;
};

export type WhatsAppTextMessageRequest = WhatsAppMessageBase & {
  readonly type: 'text';
  readonly text: { readonly body: string };
};

export type WhatsAppStickerMessageRequest = WhatsAppMessageBase & {
  readonly type: 'sticker';
  readonly sticker: { readonly id: string };
};

export type WhatsAppReplyButton = {
  readonly id: string; // returned in the tap's button_reply, up to 256 chars
  readonly title: string; // up to 20 chars
};

export type WhatsAppButtonsMessageRequest = WhatsAppMessageBase & {
  readonly type: 'interactive';
  readonly interactive: {
    readonly type: 'button';
    readonly body: { readonly text: string };
    readonly action: { readonly buttons: ReadonlyArray<{ readonly type: 'reply'; readonly reply: WhatsAppReplyButton }> };
  };
};

export type WhatsAppSendMessageResponse = {
  readonly messages?: ReadonlyArray<{ readonly id: string }>;
};

export type WhatsAppMediaInfo = {
  readonly url: string;
  readonly mime_type: string;
  readonly sha256: string;
  readonly file_size: number;
  readonly id: string;
};

export type WhatsAppTypingIndicatorRequest = {
  readonly messaging_product: 'whatsapp';
  readonly status: 'read';
  readonly message_id: string;
  readonly typing_indicator: { readonly type: 'text' };
};

export type WhatsAppIncomingMessage = {
  readonly from: string;
  readonly id: string;
  readonly timestamp: string;
  readonly type: string;
  readonly text?: { readonly body: string };
  readonly sticker?: { readonly id: string; readonly mime_type?: string; readonly sha256?: string; readonly animated?: boolean };
  readonly context?: { readonly from?: string; readonly id?: string };
  readonly interactive?: { readonly type?: string; readonly button_reply?: { readonly id: string; readonly title: string } };
};

export type WhatsAppStatusError = {
  readonly code?: number;
  readonly title?: string;
  readonly message?: string;
  readonly error_data?: { readonly details?: string };
};

export type WhatsAppMessageStatus = {
  readonly id?: string;
  readonly status?: string;
  readonly recipient_id?: string;
  readonly errors?: ReadonlyArray<WhatsAppStatusError>;
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
        readonly statuses?: ReadonlyArray<WhatsAppMessageStatus>;
      };
    }>;
  }>;
};

export type IncomingTextMessage = {
  readonly kind: 'text';
  readonly from: string;
  readonly id: string;
  readonly sentAt?: number; // epoch ms from Meta's message timestamp (1s precision)
  readonly text: string;
  readonly contextId?: string; // id of the message this one quote-replies to
};

export type IncomingStickerMessage = {
  readonly kind: 'sticker';
  readonly from: string;
  readonly id: string;
  readonly sentAt?: number; // epoch ms from Meta's message timestamp (1s precision)
  readonly mediaId: string;
  readonly animated: boolean;
};

export type IncomingButtonReplyMessage = {
  readonly kind: 'button';
  readonly from: string;
  readonly id: string;
  readonly sentAt?: number; // epoch ms from Meta's message timestamp (1s precision)
  readonly buttonId: string;
  readonly title: string;
};

export type IncomingMessage = IncomingTextMessage | IncomingStickerMessage | IncomingButtonReplyMessage;

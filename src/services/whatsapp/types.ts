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

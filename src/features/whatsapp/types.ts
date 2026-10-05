export type WhatsAppIncomingMessage = {
  readonly from: string;
  readonly id: string;
  readonly timestamp: string;
  readonly type: string;
  readonly text?: { readonly body: string };
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
  readonly from: string;
  readonly text: string;
};

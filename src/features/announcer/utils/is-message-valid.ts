type ExpectedMessageParse = {
  readonly botName: string;
  readonly chatIds: number[];
  readonly text: string;
};

export function isMessageValid(message: string): ExpectedMessageParse {
  try {
    const details = JSON.parse(message);
    if (!details.chatIds || !details.text) return null;
    if (!Array.isArray(details.chatIds)) return null;
    return { ...details, chatIds: [...new Set(details.chatIds)] };
  } catch (e) {
    return null;
  }
}

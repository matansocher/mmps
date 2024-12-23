export interface DayDetailsModel extends Document {
  _id: {
    conversationId: string;
    date: string; // ISO date format (e.g., "2024-12-23")
  };
  conversationName: string;
  messageCount: number;
}

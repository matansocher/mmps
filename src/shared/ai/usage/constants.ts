// Cross-bot LLM usage records live in the 'Chatbot' Mongo database (shared with the LangGraph
// checkpoints). The connection is registered in chatbot.init; in production every bot boots, so
// the connection always exists. Writes are best-effort, so a missing connection (e.g. running a
// single non-chatbot bot locally) just logs and is ignored.
export const USAGE_DB_NAME = 'Chatbot';
export const USAGE_COLLECTION_NAME = 'usage';
export const USAGE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

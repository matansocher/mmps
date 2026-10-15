export type YouTubeQueueConfig = {
  readonly projectId: string;
  readonly topicId: string;
  readonly subscriptionId: string;
  readonly deadLetterTopicId: string;
  readonly credentials?: {
    readonly client_email: string;
    readonly private_key: string;
  };
};

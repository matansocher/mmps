import { CallbackQuery, Message } from 'node-telegram-bot-api';

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4095;

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}

export enum POSSIBLE_INPUTS {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  PHOTO = 'photo',
  FILE = 'file',
}

export enum TELEGRAM_EVENTS {
  COMMAND = 'command',
  TEXT = 'text',
  MESSAGE = 'message',
  CALLBACK_QUERY = 'callback_query',
  LOCATION = 'location',
  PHOTO = 'photo',
  AUDIO = 'audio',
  VOICE = 'voice',
  EDITED_MESSAGE = 'edited_message',
  POLLING_ERROR = 'polling_error',
  ERROR = 'error',

  // message = 'message'
  // text = 'text'
  // animation = 'animation'
  // audio = 'audio'
  // channel_chat_created = 'channel_chat_created'
  // contact = 'contact'
  // delete_chat_photo = 'delete_chat_photo'
  // document = 'document'
  // game = 'game'
  // group_chat_created = 'group_chat_created'
  // invoice = 'invoice'
  // left_chat_member = 'left_chat_member'
  // location = 'location'
  // migrate_from_chat_id = 'migrate_from_chat_id'
  // migrate_to_chat_id = 'migrate_to_chat_id'
  // new_chat_members = 'new_chat_members'
  // new_chat_photo = 'new_chat_photo'
  // new_chat_title = 'new_chat_title'
  // passport_data = 'passport_data'
  // photo = 'photo'
  // pinned_message = 'pinned_message'
  // sticker = 'sticker'
  // successful_payment = 'successful_payment'
  // supergroup_chat_created = 'supergroup_chat_created'
  // video = 'video'
  // video_note = 'video_note'
  // voice = 'voice'
  // video_chat_started = 'video_chat_started'
  // video_chat_ended = 'video_chat_ended'
  // video_chat_participants_invited = 'video_chat_participants_invited'
  // video_chat_scheduled = 'video_chat_scheduled'
  // message_auto_delete_timer_changed = 'message_auto_delete_timer_changed'
  // chat_invite_link = 'chat_invite_link'
  // chat_member_updated = 'chat_member_updated'
  // web_app_data = 'web_app_data'
  // callback_query = 'callback_query'
  // inline_query = 'inline_query'
  // poll = 'poll'
  // poll_answer = 'poll_answer'
  // chat_member = 'chat_member'
  // my_chat_member = 'my_chat_member'
  // chosen_inline_result = 'chosen_inline_result'
  // channel_post = 'channel_post'
  // edited_message = 'edited_message'
  // edited_message_text = 'edited_message_text'
  // edited_message_caption = 'edited_message_caption'
  // edited_channel_post = 'edited_channel_post'
  // edited_channel_post_text = 'edited_channel_post_text'
  // edited_channel_post_caption = 'edited_channel_post_caption'
  // shipping_query = 'shipping_query'
  // pre_checkout_query = 'pre_checkout_query'
  // polling_error = 'polling_error'
  // webhook_error = 'webhook_error'
  // chat_join_request = 'chat_join_request'
}

export interface TelegramEventHandler {
  readonly event: TELEGRAM_EVENTS;
  readonly regex?: string;
  readonly handler: (payload: Message | CallbackQuery) => Promise<void> | void;
}

export const BLOCKED_ERROR = 'bot was blocked by the user';

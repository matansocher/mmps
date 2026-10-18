import type { ReactNode } from 'react';
import { AppIcon } from '../AppIcon';
import { RichText } from './RichText';

type ChatBubbleProps = {
  readonly role: 'user' | 'assistant' | 'question';
  readonly text?: string;
  readonly meta?: ReactNode;
  readonly children?: ReactNode;
  readonly streaming?: boolean;
};

export function ChatBubble({ role, text, meta, children, streaming }: ChatBubbleProps) {
  return (
    <div className={`chat-row ${role}`}>
      {role !== 'user' && (
        <div className="chat-avatar" aria-hidden="true">
          <AppIcon name={role === 'question' ? 'target' : 'sparkle'} size={16} />
        </div>
      )}
      <div className={`chat-bubble ${role}${streaming ? ' streaming' : ''}`}>
        {meta && <div className="chat-meta">{meta}</div>}
        {text !== undefined && (role === 'user' ? <p className="chat-plain">{text}</p> : <RichText text={text} />)}
        {children}
      </div>
    </div>
  );
}

export function TypingIndicator({ label }: { readonly label?: string }) {
  return (
    <div className="chat-row assistant" role="status" aria-live="polite">
      <div className="chat-avatar" aria-hidden="true">
        <AppIcon name="sparkle" size={16} />
      </div>
      <div className="chat-bubble assistant typing">
        <span className="typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {label && <span className="typing-label">{label}</span>}
      </div>
    </div>
  );
}

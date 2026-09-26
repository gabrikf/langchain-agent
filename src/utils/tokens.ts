import type { BaseMessage } from '@langchain/core/messages';

/**
 * Rough token estimate for thresholding (not billing-accurate).
 * ~4 chars/token works well enough for mixed PT/EN industrial chat.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function messageText(msg: BaseMessage): string {
  const { content } = msg;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '');
        }
        return JSON.stringify(part);
      })
      .join('');
  }
  return content == null ? '' : JSON.stringify(content);
}

/** Estimate total tokens for a message list (content + small per-message overhead). */
export function estimateMessagesTokens(messages: BaseMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(messageText(msg)) + 4, 0);
}

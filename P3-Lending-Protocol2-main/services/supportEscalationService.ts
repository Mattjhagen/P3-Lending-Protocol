import { ChatMessage, UserProfile } from '../types';

export interface SupportEscalationResult {
  ok: boolean;
  ticketId: string;
  emailSent: boolean;
  escalatedAt: string;
}

interface EscalationPayload {
  user: UserProfile;
  threadId: string;
  triggerMessage: string;
  aiResponse: string;
  category: string;
  transcript: ChatMessage[];
}

export const SupportEscalationService = {
  escalateToAgent: async (payload: EscalationPayload): Promise<SupportEscalationResult> => {
    const response = await fetch('/.netlify/functions/support-escalation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: payload.user.id,
        userName: payload.user.name,
        threadId: payload.threadId,
        triggerMessage: payload.triggerMessage,
        aiResponse: payload.aiResponse,
        category: payload.category,
        transcript: payload.transcript.slice(-20).map((message) => ({
          senderId: message.senderId,
          senderName: message.senderName,
          message: message.message,
          timestamp: message.timestamp,
          role: message.role,
        })),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || 'Failed to escalate chat to support agent.');
    }

    return {
      ok: true,
      ticketId: data.ticketId,
      emailSent: Boolean(data.emailSent),
      escalatedAt: data.escalatedAt || new Date().toISOString(),
    };
  },
};

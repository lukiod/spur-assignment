const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:3001');

export interface Message {
  id?: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  error?: string;
}

export interface HistoryResponse {
  sessionId: string;
  messages: Message[];
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async sendMessage(message: string, conversationId?: number): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message, 
        conversationId: conversationId || 0,
        sender: 'user'
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to send message');
    }

    const data = await response.json();
    
    return {
      reply: data.aiMessage?.text || '',
      sessionId: String(data.conversationId),
    };
  }

  async getHistory(sessionId: string): Promise<HistoryResponse> {
    const response = await fetch(`${this.baseURL}/api/chat/history/${sessionId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch history');
    }

    return response.json();
  }

  async createNewConversation(): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.baseURL}/api/chat/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create new conversation');
    }

    return response.json();
  }
}

export const api = new APIClient(API_BASE_URL);


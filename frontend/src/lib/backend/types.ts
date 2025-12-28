export interface Message {
  id: number;
  conversation_id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface Conversation {
  id: number;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  error?: string;
}



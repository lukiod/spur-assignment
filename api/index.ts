import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

import { generateReply } from '../backend/src/gemini';
import db from '../backend/src/db';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/chat/history/:conversationId', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    
    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const messages = await db.getRecentMessages(conversationId, 50);
    res.json({ messages });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

app.post('/api/chat/message', async (req, res) => {
  try {
    const { conversationId, message, sender } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sender || !['user', 'agent'].includes(sender)) {
      return res.status(400).json({ error: 'Invalid sender' });
    }

    const trimmedMessage = message.trim();
    let actualConversationId = conversationId;

    if (!actualConversationId || actualConversationId === 0) {
      actualConversationId = await db.createConversation();
    }

    const userMessageId = await db.saveMessage(
      actualConversationId,
      trimmedMessage,
      sender
    );

    let aiReply = null;
    let aiMessageId = null;

    if (sender === 'user') {
      aiReply = await generateReply(actualConversationId, trimmedMessage);
      aiMessageId = await db.saveMessage(actualConversationId, aiReply, 'agent');
    }

    res.json({
      conversationId: actualConversationId,
      userMessage: {
        id: userMessageId,
        text: trimmedMessage,
        sender,
        timestamp: new Date().toISOString(),
      },
      aiMessage: aiReply
        ? {
            id: aiMessageId,
            text: aiReply,
            sender: 'agent',
            timestamp: new Date().toISOString(),
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error in /api/chat/message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

app.get('/api/chat/faqs', async (req, res) => {
  try {
    const faqs = await db.getFAQs();
    res.json({ faqs });
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

export default app;


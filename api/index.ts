// Vercel serverless function for API routes
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables (Vercel provides these, but load dotenv for local testing)
dotenv.config({ path: '../.env' });

import { generateReply } from '../backend/src/gemini';
import db from '../backend/src/db';

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins in production (Vercel handles this)
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get conversation history
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

// Send message and get AI reply
app.post('/api/chat/message', async (req, res) => {
  try {
    const { conversationId, message, sender } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sender || !['user', 'agent'].includes(sender)) {
      return res.status(400).json({ error: 'Invalid sender' });
    }

    const trimmedMessage = message.trim();
    let actualConversationId = conversationId;

    // Create new conversation if needed
    if (!actualConversationId || actualConversationId === 0) {
      actualConversationId = await db.createConversation();
    }

    // Save user message
    const userMessageId = await db.saveMessage(
      actualConversationId,
      trimmedMessage,
      sender
    );

    // Generate AI reply if sender is user
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

// Get FAQs
app.get('/api/chat/faqs', async (req, res) => {
  try {
    const faqs = await db.getFAQs();
    res.json({ faqs });
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// Favicon handlers
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Export as Vercel serverless function
export default app;


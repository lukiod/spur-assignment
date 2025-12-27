import { Router, Request, Response } from 'express';
import db from '../db';
import { generateReply } from '../gemini';
import { ChatRequest, ChatResponse } from '../types';

const router = Router();

// POST /api/chat/message - Send a message and get AI response
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body as ChatRequest;

    // Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        error: 'Message cannot be empty'
      });
    }

    if (trimmedMessage.length > 1000) {
      return res.status(400).json({
        error: 'Message is too long. Please keep it under 1000 characters.',
        maxLength: 1000,
        currentLength: trimmedMessage.length
      });
    }

    // Get or create conversation
    let conversationId: number;

    if (sessionId) {
      const existing = await db.getConversation(parseInt(sessionId));
      if (existing) {
        conversationId = existing.id;
      } else {
        conversationId = await db.createConversation();
      }
    } else {
      conversationId = await db.createConversation();
    }

    // Save user message
    await db.createMessage(conversationId, 'user', trimmedMessage);

    // Generate AI reply
    const aiReply = await generateReply(conversationId, trimmedMessage);

    // Save AI message
    await db.createMessage(conversationId, 'ai', aiReply);

    // Return response
    const response: ChatResponse = {
      reply: aiReply,
      sessionId: conversationId.toString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('Chat message error:', error);
    res.status(500).json({
      error: 'An error occurred while processing your message. Please try again.',
      sessionId: req.body.sessionId || null
    });
  }
});

// GET /api/chat/history/:sessionId - Get conversation history
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID'
      });
    }

    const conversation = await db.getConversation(sessionId);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    const messages = await db.getMessages(sessionId);

    res.json({
      sessionId: sessionId.toString(),
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp
      }))
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching conversation history'
    });
  }
});

// POST /api/chat/new - Create new conversation
router.post('/new', async (req: Request, res: Response) => {
  try {
    const conversationId = await db.createConversation();
    res.json({
      sessionId: conversationId.toString()
    });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      error: 'An error occurred while creating a new conversation'
    });
  }
});

export default router;


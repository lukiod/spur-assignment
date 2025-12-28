import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateReply } from '$lib/backend/gemini';
import db from '$lib/backend/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { conversationId, message, sender } = await request.json();

		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			throw error(400, 'Message is required');
		}

		if (!sender || !['user', 'agent'].includes(sender)) {
			throw error(400, 'Invalid sender');
		}

		const trimmedMessage = message.trim();
		let actualConversationId = conversationId;

		if (!actualConversationId || actualConversationId === 0) {
			actualConversationId = await db.createConversation();
		}

		const userMsg = await db.createMessage(
			actualConversationId,
			sender as 'user' | 'ai',
			trimmedMessage
		);

		let aiReply = null;
		let aiMsg = null;

		if (sender === 'user') {
			aiReply = await generateReply(actualConversationId, trimmedMessage);
			aiMsg = await db.createMessage(actualConversationId, 'ai', aiReply);
		}

		return json({
			conversationId: actualConversationId,
			userMessage: {
				id: userMsg.id,
				text: trimmedMessage,
				sender,
				timestamp: new Date().toISOString(),
			},
			aiMessage: aiReply
				? {
						id: aiMsg?.id,
						text: aiReply,
						sender: 'agent',
						timestamp: new Date().toISOString(),
				  }
				: null,
		});
	} catch (err: any) {
		console.error('Error in /api/chat/message:', err);
		throw error(500, err.message || 'Failed to process message');
	}
};


import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/backend/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const conversationId = parseInt(params.conversationId, 10);
		
		if (isNaN(conversationId)) {
			throw error(400, 'Invalid conversation ID');
		}

		const messages = await db.getRecentMessages(conversationId, 50);
		return json({ messages });
	} catch (err: any) {
		console.error('Error fetching history:', err);
		throw error(500, 'Failed to fetch conversation history');
	}
};


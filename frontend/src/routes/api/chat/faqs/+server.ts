import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/backend/db';

export const GET: RequestHandler = async () => {
	try {
		const faqs = await db.getFAQs();
		return json({ faqs });
	} catch (err: any) {
		console.error('Error fetching FAQs:', err);
		throw error(500, 'Failed to fetch FAQs');
	}
};


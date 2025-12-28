import { Pool } from 'pg';
import { Message, Conversation, FAQ } from './types';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pool.on('connect', () => {
      console.log('✓ Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }
  
  return pool;
}

export const db = {
  async initSchema() {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
          sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
          text TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS faqs (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation 
        ON messages(conversation_id, timestamp DESC)
      `);

      await client.query('COMMIT');
      console.log('✓ Database schema initialized');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async seedFAQs() {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const count = await client.query('SELECT COUNT(*) FROM faqs');
      if (parseInt(count.rows[0].count) > 0) {
        console.log('✓ FAQs already seeded');
        return;
      }

      const faqs = [
        {
          question: 'What is your shipping policy?',
          answer: 'We offer free shipping on all orders over $50. Standard delivery takes 3-5 business days within the US. Express shipping (1-2 days) is available for $15. We ship from our warehouse in Chicago, IL.'
        },
        {
          question: 'What is your return policy?',
          answer: 'We have a 30-day return policy. Items must be unused, in original packaging, with all tags attached. Refunds are processed within 5-7 business days after we receive your return. Return shipping is free for US customers.'
        },
        {
          question: 'What are your support hours?',
          answer: 'Our customer support team is available Monday through Friday, 9 AM to 6 PM EST. Call us at 1-800-SHOP-EASE or email support@shopease.com. Our AI chat assistant is available 24/7 to help answer common questions instantly.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, Google Pay, and Shop Pay. All transactions are secure and encrypted with SSL. We also offer buy now, pay later options through Klarna and Afterpay.'
        },
        {
          question: 'Do you ship internationally?',
          answer: 'Yes! We currently ship to USA, Canada, United Kingdom, Australia, and most European countries. International shipping typically takes 7-14 business days. Customs fees may apply and are the responsibility of the customer.'
        },
        {
          question: 'How can I track my order?',
          answer: 'Once your order ships, you\'ll receive a tracking number via email and SMS. You can use this number to track your package on our website under "Track Order" or directly on the carrier\'s website (USPS, FedEx, or UPS).'
        },
        {
          question: 'What if my item arrives damaged?',
          answer: 'We apologize if that happens! Please contact us within 48 hours of delivery with photos of the damage. We\'ll send a replacement or issue a full refund immediately. No need to return the damaged item.'
        },
        {
          question: 'How do I contact customer support?',
          answer: 'You can reach us via: Email: support@shopease.com | Phone: 1-800-746-7327 (1-800-SHOP-EASE) | Live Chat: Available on our website 24/7 | Social Media: @ShopEase on Twitter, Facebook, and Instagram. Average response time is under 2 hours.'
        },
        {
          question: 'Do you offer gift wrapping?',
          answer: 'Yes! We offer complimentary gift wrapping for $5 per item. Your gift will be wrapped in premium paper with a satin ribbon and includes a personalized gift message card. Select this option at checkout.'
        },
        {
          question: 'What is your price match guarantee?',
          answer: 'We offer a 14-day price match guarantee! If you find a lower price on an identical item from a competitor, we\'ll match it and give you an additional 10% off. Just contact our support team with proof of the lower price.'
        },
        {
          question: 'How do I cancel or modify my order?',
          answer: 'You can cancel or modify your order within 1 hour of placing it by contacting us immediately at support@shopease.com or calling 1-800-SHOP-EASE. After 1 hour, orders are processed and cannot be changed, but you can return items once received.'
        },
        {
          question: 'Do you have a loyalty program?',
          answer: 'Yes! Join ShopEase Rewards for free and earn 1 point for every dollar spent. 100 points = $5 off your next purchase. Plus, get birthday rewards, early access to sales, and exclusive member-only deals. Sign up at checkout or in your account settings.'
        }
      ];

      for (const faq of faqs) {
        await client.query(
          'INSERT INTO faqs (question, answer) VALUES ($1, $2)',
          [faq.question, faq.answer]
        );
      }

      console.log('✓ FAQs seeded successfully');
    } finally {
      client.release();
    }
  },

  async getFAQs(): Promise<FAQ[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM faqs ORDER BY id');
    return result.rows;
  },

  async createConversation(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO conversations (created_at) VALUES (CURRENT_TIMESTAMP) RETURNING id'
    );
    return result.rows[0].id;
  },

  async getConversation(id: number): Promise<Conversation | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async createMessage(
    conversationId: number,
    sender: 'user' | 'ai',
    text: string
  ): Promise<Message> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender, text, timestamp) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [conversationId, sender, text]
    );
    return result.rows[0];
  },

  async getMessages(conversationId: number, limit: number = 50): Promise<Message[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY timestamp ASC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows;
  },

  async getRecentMessages(conversationId: number, limit: number = 10): Promise<Message[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows.reverse();
  }
};

export default db;


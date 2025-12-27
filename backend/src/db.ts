import { Pool } from 'pg';
import { Message, Conversation, FAQ } from './types';

// Create pool lazily to ensure env vars are loaded first
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

    // Test connection
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
  // Create tables
  async initSchema() {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
          sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
          text TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create FAQs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS faqs (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL
        )
      `);

      // Create index for faster queries
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

  // Seed FAQ data
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
          answer: 'We offer free shipping on all orders over $50. Standard delivery takes 3-5 business days within the US. Express shipping (1-2 days) is available for $15.'
        },
        {
          question: 'What is your return policy?',
          answer: 'We have a 30-day return policy. Items must be unused, in original packaging, with all tags attached. Refunds are processed within 5-7 business days after we receive your return.'
        },
        {
          question: 'What are your support hours?',
          answer: 'Our customer support team is available Monday through Friday, 9 AM to 6 PM EST. Our AI chat assistant is available 24/7 to help answer common questions.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. All transactions are secure and encrypted.'
        },
        {
          question: 'Do you ship internationally?',
          answer: 'Yes! We currently ship to USA, Canada, United Kingdom, Australia, and most European countries. International shipping typically takes 7-14 business days.'
        },
        {
          question: 'How can I track my order?',
          answer: 'Once your order ships, you\'ll receive a tracking number via email. You can use this number to track your package on our website or the carrier\'s website.'
        },
        {
          question: 'What if my item arrives damaged?',
          answer: 'We apologize if that happens! Please contact us within 48 hours of delivery with photos of the damage. We\'ll send a replacement or issue a full refund immediately.'
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

  // Get all FAQs
  async getFAQs(): Promise<FAQ[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM faqs ORDER BY id');
    return result.rows;
  },

  // Create new conversation
  async createConversation(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO conversations (created_at) VALUES (CURRENT_TIMESTAMP) RETURNING id'
    );
    return result.rows[0].id;
  },

  // Get conversation by ID
  async getConversation(id: number): Promise<Conversation | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  // Create message
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

  // Get conversation history
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

  // Get recent messages for context
  async getRecentMessages(conversationId: number, limit: number = 10): Promise<Message[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  }
};

export default db;


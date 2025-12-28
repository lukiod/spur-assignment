import dotenv from 'dotenv';
import path from 'path';
import db from './db';

// Load environment variables (look in parent directory)
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

async function setup() {
  try {
    console.log('🔧 Setting up database...\n');
    console.log('Environment file:', envPath);
    console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'Yes' : 'No');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    await db.initSchema();
    await db.seedFAQs();
    
    console.log('\n✅ Database setup complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setup();


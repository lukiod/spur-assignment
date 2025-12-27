import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';

// Load environment variables (look in parent directory)
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any localhost port or no origin (like mobile apps or curl)
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, process.env.FRONTEND_URL || 'http://localhost:5173');
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/chat', chatRoutes);

// Favicon handler - return 204 (No Content) to suppress 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API endpoint: http://localhost:${PORT}/api/chat/message`);
  console.log(`\n📊 Environment check:`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Loaded' : '✗ Missing'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});


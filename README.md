# Spur AI Live Chat Agent

A full-stack AI support chat application built for the Spur Founding Engineer take-home assignment. This is a working prototype of an AI-powered customer support chat widget that answers questions about a fictional e-commerce store called "ShopEase".

**Live Demo**: https://frontend-liard-one-85.vercel.app

## What This Does

Users can chat with an AI support agent that answers questions about shipping, returns, support hours, and other common e-commerce queries. The AI remembers the conversation context and provides helpful, contextual responses. All conversations are saved, so users can reload the page and continue where they left off.

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Backend**: SvelteKit API routes (serverless functions)
- **Database**: PostgreSQL (Neon)
- **AI**: Google Gemini API (with 10-model fallback system)
- **Deployment**: Vercel

## Quick Start

### Prerequisites

You'll need:
- Node.js 18+ and npm
- A PostgreSQL database (I used Neon's free tier)
- A Google Gemini API key (free tier available)

### Step-by-Step Setup

1. **Clone and install dependencies**

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

You can get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

3. **Initialize the database**

This creates the tables and seeds the FAQ knowledge base:

```bash
cd backend
npm run db:setup
```

This will:
- Create `conversations`, `messages`, and `faqs` tables
- Seed 12 FAQs about shipping, returns, support, etc.
- Set up database indexes

4. **Start the development servers**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

5. **Open in browser**

Navigate to `http://localhost:5173` and start chatting!

## Architecture Overview

### How It's Structured

I chose to use SvelteKit for both frontend and backend because it simplifies deployment and keeps everything in one codebase. Here's how it's organized:

**Frontend (`frontend/src/`):**
- `routes/+page.svelte` - Main chat page
- `lib/components/` - Reusable UI components (ChatWidget, MessageBubble, TypingIndicator)
- `lib/api.ts` - API client that handles communication with backend
- `lib/backend/` - Shared backend code (database, AI integration)

**Backend (`frontend/src/routes/api/`):**
- `api/chat/message/+server.ts` - Handles POST requests for sending messages
- `api/chat/history/[conversationId]/+server.ts` - Fetches conversation history
- `api/chat/faqs/+server.ts` - Returns FAQ list
- `api/health/+server.ts` - Health check endpoint

**Services (`frontend/src/lib/backend/`):**
- `db.ts` - All database operations (connection pooling, queries, migrations)
- `gemini.ts` - LLM integration with sequential model fallback
- `types.ts` - TypeScript type definitions

### Design Decisions

1. **SvelteKit API Routes over Express**: Simpler deployment, fewer moving parts, built-in TypeScript support. Since we're deploying to Vercel, SvelteKit's serverless functions work perfectly.

2. **Sequential Model Fallback**: Instead of calling multiple LLM APIs in parallel, I implemented a fallback system that tries 10 different Gemini models one by one. If one hits a rate limit, it automatically tries the next. This is more cost-effective and reliable than parallel calls.

3. **FAQ in Database**: FAQs are stored in PostgreSQL rather than hardcoded. This makes it easy to update knowledge without redeploying, and the AI prompt dynamically includes all FAQs.

4. **Conversation History**: The AI gets the last 10 messages for context. This is a good balance between context and token usage.

5. **Simple Session Management**: Using localStorage to store conversation IDs. No auth needed per the assignment requirements.

## LLM Integration

### Provider & Model

I'm using **Google Gemini** because:
- Free tier is generous
- API is straightforward
- Good response quality
- Fast response times

**Models Used**: I implemented a sequential fallback system with 10 models:
1. gemini-2.5-flash-lite
2. gemini-2.5-flash-tts
3. gemini-2.5-flash
4. gemini-3-flash
5. gemini-robotics-er-1.5-preview
6. gemma-3-12b
7. gemma-3-1b
8. gemma-3-27b
9. gemma-3-2b
10. gemma-3-4b

If one model hits a rate limit, the system automatically tries the next one. Models are marked as rate-limited for 1 minute, then become available again.

### Prompting Strategy

The prompt is built dynamically and includes:

1. **System Instructions**: Defines the AI as a helpful support agent for ShopEase
2. **FAQ Knowledge Base**: All 12 FAQs are injected into the prompt so the AI has domain knowledge
3. **Contact Information**: Phone, email, hours are included so the AI can provide them when asked
4. **Conversation History**: Last 10 messages for context
5. **Current User Message**: The question being asked

**Example prompt structure:**
```
You are a helpful AI support agent for "ShopEase"...

STORE INFORMATION:
Q: What is your shipping policy?
A: We offer free shipping on all orders over $50...

CONVERSATION HISTORY:
Customer: What's your return policy?
Agent: We have a 30-day return policy...

Customer: [current message]
Agent:
```

### Configuration

- **Temperature**: 0.7 (balanced creativity/consistency)
- **Max Output Tokens**: 500 (keeps responses concise)
- **Timeout**: 30 seconds (prevents hanging requests)
- **Top P**: 0.8
- **Top K**: 40

### Error Handling

The system handles several failure scenarios gracefully:

- **Rate Limits**: Detects rate limit errors and switches to next model
- **Timeouts**: 30-second timeout with friendly error message
- **Invalid API Key**: Falls back to FAQ-based mock responses
- **Empty Responses**: Retries with next model
- **Network Errors**: Caught and displayed to user with retry option

If all models fail, the system falls back to a simple FAQ-matching system that still provides helpful answers.

## API Endpoints

### POST `/api/chat/message`

Sends a message and gets an AI response.

**Request:**
```json
{
  "message": "What's your return policy?",
  "conversationId": 123,
  "sender": "user"
}
```

**Response:**
```json
{
  "conversationId": 123,
  "userMessage": {
    "id": 456,
    "text": "What's your return policy?",
    "sender": "user",
    "timestamp": "2025-12-28T10:00:00Z"
  },
  "aiMessage": {
    "id": 457,
    "text": "We have a 30-day return policy...",
    "sender": "agent",
    "timestamp": "2025-12-28T10:00:01Z"
  }
}
```

**Note**: The frontend transforms `conversationId` to `sessionId` for compatibility with the original API design.

### GET `/api/chat/history/:conversationId`

Fetches conversation history for a given conversation ID.

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "conversation_id": 123,
      "sender": "user",
      "text": "Hello",
      "timestamp": "2025-12-28T10:00:00Z"
    },
    {
      "id": 2,
      "conversation_id": 123,
      "sender": "ai",
      "text": "Hi! How can I help you?",
      "timestamp": "2025-12-28T10:00:01Z"
    }
  ]
}
```

### GET `/api/chat/faqs`

Returns all FAQs stored in the database.

### GET `/api/health`

Health check endpoint for monitoring.

## Database Schema

### Tables

**conversations**
- `id` (SERIAL PRIMARY KEY)
- `created_at` (TIMESTAMP)
- `metadata` (JSONB) - For future extensibility

**messages**
- `id` (SERIAL PRIMARY KEY)
- `conversation_id` (INTEGER, references conversations)
- `sender` (VARCHAR, either 'user' or 'ai')
- `text` (TEXT)
- `timestamp` (TIMESTAMP)

**faqs**
- `id` (SERIAL PRIMARY KEY)
- `question` (TEXT)
- `answer` (TEXT)

### Migrations

Run `npm run db:setup` in the backend directory to:
- Create all tables
- Set up indexes for performance
- Seed the FAQ knowledge base

## FAQ Knowledge Base

The AI has knowledge about 12 common e-commerce topics:

1. **Shipping Policy**: Free shipping over $50, 3-5 day delivery, express options
2. **Return Policy**: 30-day returns, free return shipping
3. **Support Hours**: Mon-Fri 9 AM - 6 PM EST, AI available 24/7
4. **Payment Methods**: Credit cards, PayPal, Apple Pay, Google Pay, Klarna, Afterpay
5. **International Shipping**: Ships to USA, Canada, UK, Australia, Europe
6. **Order Tracking**: Email/SMS notifications with tracking numbers
7. **Damaged Items**: 48-hour report window, full refund/replacement
8. **Contact Information**: Phone, email, social media
9. **Gift Wrapping**: $5 premium wrapping option
10. **Price Match**: 14-day guarantee with 10% bonus
11. **Order Cancellation**: 1-hour window for changes
12. **Loyalty Program**: ShopEase Rewards with points system

These FAQs are stored in the database and dynamically included in the AI prompt, so the AI can answer questions about them reliably.

## Robustness & Error Handling

### Input Validation

- **Empty messages**: Rejected with clear error
- **Very long messages**: Truncated at 1000 characters with warning
- **Invalid sender**: Rejected with 400 error
- **XSS Protection**: All user input is properly escaped
- **SQL Injection**: All queries use parameterized statements

### Error Scenarios Handled

1. **LLM API Failures**: 
   - Rate limits → Try next model
   - Timeouts → Show friendly message after 30 seconds
   - Invalid API key → Fall back to FAQ matching
   - Network errors → Display error with retry option

2. **Database Errors**:
   - Connection failures → Logged, user sees friendly message
   - Query errors → Caught and handled gracefully

3. **Frontend Errors**:
   - Network failures → Retry button shown
   - Invalid responses → Error message displayed
   - Session loss → New conversation created automatically

### Security

- API keys stored in environment variables (never committed)
- CORS configured appropriately
- Input sanitization on all user inputs
- Parameterized database queries
- SSL/TLS for database connections

## Deployment

The app is deployed on Vercel at: https://frontend-liard-one-85.vercel.app

### How to Deploy

1. **Push to GitHub**
2. **Import to Vercel**: Connect your GitHub repo
3. **Set Environment Variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
4. **Deploy**: Vercel automatically builds and deploys

The frontend and API routes are deployed as serverless functions, which scales automatically.

## Trade-offs & Design Decisions

### What I Chose and Why

1. **SvelteKit over Express**: Simpler deployment, fewer moving parts, built-in TypeScript. Since we're deploying to Vercel, SvelteKit's serverless functions are perfect.

2. **Sequential Model Fallback over Parallel**: More reliable, cost-effective, and easier to debug. Parallel calls would be faster but consume more API quota.

3. **PostgreSQL over SQLite**: Production-ready, supports concurrent connections, works well with serverless functions.

4. **Simple Session Management**: Using localStorage instead of auth. Per requirements, no auth needed. This keeps it simple.

5. **FAQ in Database**: Makes it easy to update knowledge without code changes. Could be hardcoded, but database approach is more flexible.

6. **10-Message History**: Good balance between context and token usage. Could include more, but 10 is usually enough for support conversations.

### If I Had More Time

Here's what I'd add or improve:

1. **Redis Caching**: Cache FAQ responses and common queries to reduce database load and API calls
2. **Message Streaming**: Stream LLM responses token-by-token for better UX (feels more real-time)
3. **Rate Limiting**: Per-user rate limiting to prevent abuse
4. **Analytics**: Track conversation quality, common questions, response times
5. **Better Error Recovery**: Exponential backoff retry logic for transient failures
6. **Testing**: Unit tests for critical paths, integration tests for API endpoints
7. **Message Reactions**: Thumbs up/down for feedback to improve the AI
8. **Admin Dashboard**: View all conversations, update FAQs, monitor performance
9. **Multi-language Support**: Detect language and respond accordingly
10. **WebSocket**: Real-time updates instead of polling (though current approach works fine)

## Testing

I tested the following scenarios:

- ✅ Empty message rejection
- ✅ Long message handling (>1000 chars)
- ✅ Gemini API failure handling
- ✅ Session persistence across page reloads
- ✅ Conversation history retrieval
- ✅ Multi-turn conversations with context
- ✅ Mobile responsiveness
- ✅ FAQ knowledge accuracy
- ✅ Rate limit detection and fallback
- ✅ Network error handling
- ✅ Typing indicator
- ✅ Error messages display correctly

## Time Spent

- **Planning & Setup**: ~1 hour
- **Backend Development**: ~3 hours
- **Frontend Development**: ~4 hours
- **Testing & Polish**: ~2 hours
- **Documentation**: ~1 hour
- **Total**: ~11 hours

## Assignment Requirements Checklist

### ✅ Functional Requirements

- [x] Chat UI with scrollable message list
- [x] Clear distinction between user and AI messages
- [x] Input box + send button (Enter key works)
- [x] Auto-scroll to latest message
- [x] Disabled send button while loading
- [x] "Agent is typing..." indicator
- [x] Backend API: POST `/api/chat/message`
- [x] Message persistence to database
- [x] Messages associated with conversation/session
- [x] Real LLM API integration (Google Gemini)
- [x] API key via environment variables
- [x] LLM call wrapped in `generateReply()` function
- [x] System prompt included
- [x] Conversation history in prompt
- [x] Error handling (timeouts, rate limits, invalid key)
- [x] Max tokens capped (500 tokens)
- [x] FAQ knowledge seeded (12 FAQs in database)
- [x] FAQs included in prompt
- [x] Database tables: conversations, messages
- [x] History retrieval on reload

### ✅ Non-Requirements (Correctly Skipped)

- [x] No Shopify/Facebook/Instagram/WhatsApp integrations
- [x] No authentication system
- [x] No Docker/Kubernetes setup

## Project Structure

```
TEST/
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte              # Main chat page
│   │   │   └── api/                       # API endpoints
│   │   │       ├── chat/
│   │   │       │   ├── message/+server.ts
│   │   │       │   ├── history/[id]/+server.ts
│   │   │       │   └── faqs/+server.ts
│   │   │       └── health/+server.ts
│   │   ├── lib/
│   │   │   ├── components/                # UI components
│   │   │   │   ├── ChatWidget.svelte
│   │   │   │   ├── MessageBubble.svelte
│   │   │   │   └── TypingIndicator.svelte
│   │   │   ├── backend/                    # Shared backend code
│   │   │   │   ├── db.ts                  # Database operations
│   │   │   │   ├── gemini.ts              # LLM integration
│   │   │   │   └── types.ts               # TypeScript types
│   │   │   └── api.ts                     # API client
│   │   └── app.css                        # Global styles
│   ├── package.json
│   └── svelte.config.js
├── backend/                                # Original Express backend (not used in deployment)
│   └── src/
├── .env                                    # Environment variables
└── README.md
```

## License

MIT

---

Built for the Spur Founding Engineer Take-Home Assignment. This is a working prototype that demonstrates the core functionality of an AI-powered support chat system.

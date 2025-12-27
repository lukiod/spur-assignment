# Spur AI Live Chat Agent

A full-stack AI support chat application built with SvelteKit, Node.js, PostgreSQL, and Google Gemini API.

![Tech Stack](https://img.shields.io/badge/Frontend-SvelteKit-FF3E00?style=flat&logo=svelte)
![Tech Stack](https://img.shields.io/badge/Backend-Node.js-339933?style=flat&logo=node.js)
![Tech Stack](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql)
![Tech Stack](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=flat&logo=google)

## 🎯 Features

### Core Functionality
- ✅ Real-time AI chat interface with modern gradient design
- ✅ Persistent conversation history across sessions
- ✅ Context-aware responses using conversation history
- ✅ Pre-seeded FAQ knowledge base for e-commerce support
- ✅ Input validation and error handling
- ✅ Typing indicator and loading states

### Technical Highlights
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: Neon PostgreSQL (hosted)
- **AI Model**: Google Gemini 2.5 Flash
- **Design**: Modern SaaS theme with glassmorphism and gradients
- **UX**: Auto-scroll, character counter, keyboard shortcuts

## 📁 Project Structure

```
TEST/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server
│   │   ├── db.ts              # Database operations
│   │   ├── gemini.ts          # Gemini API integration
│   │   ├── db-setup.ts        # Database initialization
│   │   ├── types.ts           # TypeScript types
│   │   └── routes/
│   │       └── chat.ts        # Chat API endpoints
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── +page.svelte   # Main chat page
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── ChatWidget.svelte
│   │   │   │   ├── MessageBubble.svelte
│   │   │   │   └── TypingIndicator.svelte
│   │   │   └── api.ts         # API client
│   │   └── app.css            # Global styles
│   ├── package.json
│   └── svelte.config.js
├── .env                        # Environment variables
├── .env.example               # Environment template
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Neon PostgreSQL account (free tier)
- Google Gemini API key (free tier)

### Installation

1. **Clone the repository**
```bash
cd TEST
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Setup environment variables**
```bash
# Copy .env.example to .env (already done)
# The .env file is already configured with your credentials
```

4. **Initialize database**
```bash
cd backend
npm run db:setup
```

This will:
- Create the required tables (conversations, messages, faqs)
- Seed the FAQ knowledge base
- Set up indexes for performance

5. **Start the backend server**
```bash
# In the backend directory
npm run dev
```

The backend will start on `http://localhost:3001`

6. **Start the frontend** (in a new terminal)
```bash
# In the frontend directory
cd ../frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

7. **Open in browser**
```
http://localhost:5173
```

## 🎨 Design Features

### Modern SaaS Theme
- **Gradient backgrounds**: Purple to blue gradient theme
- **Glassmorphism**: Frosted glass effect on chat widget
- **Smooth animations**: Fade-in, slide-in, and bounce effects
- **Custom scrollbar**: Styled to match the theme
- **Responsive**: Works perfectly on mobile and desktop

### UX Enhancements
- Auto-scroll to latest message
- "Agent is typing..." indicator
- Character counter (appears at 800+ chars)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Disabled send button while loading
- Error messages with retry capability
- New chat button to start fresh conversations
- Message timestamps on hover

## 🔧 API Endpoints

### POST `/api/chat/message`
Send a message and get AI response

**Request:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "123" // optional
}
```

**Response:**
```json
{
  "reply": "We have a 30-day return policy...",
  "sessionId": "123"
}
```

### GET `/api/chat/history/:sessionId`
Fetch conversation history

**Response:**
```json
{
  "sessionId": "123",
  "messages": [
    {
      "id": 1,
      "sender": "user",
      "text": "Hello",
      "timestamp": "2025-12-28T10:00:00Z"
    }
  ]
}
```

### POST `/api/chat/new`
Create new conversation

**Response:**
```json
{
  "sessionId": "124"
}
```

## 🛡️ Robustness Features

### Input Validation
- ❌ Empty messages rejected
- ❌ Messages > 1000 characters rejected with warning
- ✅ XSS protection via proper escaping
- ✅ SQL injection prevention via parameterized queries

### Error Handling
- **Gemini API failures**: Graceful fallback messages
- **Timeout handling**: 30-second timeout with user-friendly message
- **Rate limiting**: Detected and handled
- **Network errors**: Retry capability
- **Database errors**: Caught and logged without crashing

### Security
- API keys in environment variables (never committed)
- CORS configured for specific origin
- Input sanitization
- Parameterized database queries
- SSL/TLS for database connection

## 📊 Database Schema

### Tables

**conversations**
```sql
id              SERIAL PRIMARY KEY
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
metadata        JSONB DEFAULT '{}'
```

**messages**
```sql
id              SERIAL PRIMARY KEY
conversation_id INTEGER REFERENCES conversations(id)
sender          VARCHAR(10) CHECK (sender IN ('user', 'ai'))
text            TEXT NOT NULL
timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**faqs**
```sql
id              SERIAL PRIMARY KEY
question        TEXT NOT NULL
answer          TEXT NOT NULL
```

## 🤖 AI Configuration

### Model
- **Provider**: Google Gemini
- **Model**: gemini-2.5-flash (confirmed working model)
- **Temperature**: 0.7
- **Max tokens**: 500

### Prompt Design
The AI agent is prompted as:
> "You are a helpful AI support agent for 'ShopEase', a modern e-commerce store. Your role is to assist customers with their questions clearly, concisely, and professionally."

The prompt includes:
1. System instructions
2. FAQ knowledge base
3. Conversation history (last 10 messages)
4. Current user message

## 📝 FAQ Knowledge Base

The agent has knowledge about:
- **Shipping**: Free shipping over $50, 3-5 day delivery
- **Returns**: 30-day return policy
- **Support Hours**: Mon-Fri 9 AM - 6 PM EST, AI 24/7
- **Payment**: Credit cards, PayPal, Apple Pay, Google Pay
- **International**: Ships to USA, Canada, UK, Australia
- **Tracking**: Email notifications with tracking numbers
- **Damaged Items**: 48-hour report window, full refund/replacement

## 🚢 Deployment

### Backend (Railway/Render)
```bash
cd backend
npm run build
npm start
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
```

### Environment Variables for Production
Update `.env` with production values:
- `FRONTEND_URL`: Your deployed frontend URL
- `NODE_ENV`: production
- Keep `DATABASE_URL` and `GEMINI_API_KEY` as is

## 🧪 Testing Checklist

- [x] Empty message rejection
- [x] Long message handling (>1000 chars)
- [x] Gemini API failure handling
- [x] Session persistence across reloads
- [x] Conversation history retrieval
- [x] Multi-turn conversations with context
- [x] Mobile responsiveness
- [x] FAQ knowledge accuracy
- [x] New chat functionality
- [x] Typing indicator
- [x] Error messages

## ⏱️ Time Spent

- **Planning & Setup**: 1 hour
- **Backend Development**: 3 hours
- **Frontend Development**: 4 hours
- **Testing & Polish**: 2 hours
- **Documentation**: 1 hour
- **Total**: ~11 hours

## 🎯 Assignment Requirements Checklist

### Functional Requirements
- ✅ Chat UI with scrollable messages
- ✅ Clear user/AI message distinction
- ✅ Input box + send button (Enter works)
- ✅ Auto-scroll to latest message
- ✅ Disabled send button while loading
- ✅ "Agent is typing..." indicator
- ✅ Backend API (POST /chat/message)
- ✅ Message persistence (PostgreSQL)
- ✅ Session management
- ✅ Real LLM integration (Gemini)
- ✅ FAQ domain knowledge
- ✅ Conversation history for context
- ✅ Graceful error handling
- ✅ Input validation
- ✅ No hardcoded secrets

### Non-Requirements (Skipped)
- ❌ No Shopify/Facebook/Instagram/WhatsApp integrations
- ❌ No authentication system
- ❌ No Docker/Kubernetes setup

## 🚀 Future Improvements

If I had more time, I would add:
1. **Redis caching** for frequently asked questions
2. **Message reactions** (thumbs up/down for feedback)
3. **Admin dashboard** to view all conversations
4. **Multi-language support** with language toggle
5. **Voice input** using Web Speech API
6. **File attachments** for support tickets
7. **Sentiment analysis** for user messages
8. **Rate limiting** middleware for API protection
9. **WebSocket** for real-time updates
10. **A/B testing** for different prompt strategies

## 📧 Contact

Built by [Your Name] for Spur Founding Engineer Take-Home Assignment

## 📄 License

MIT


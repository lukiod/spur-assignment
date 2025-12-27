# Sequential Model Fallback System

## Overview
The backend now implements a sequential fallback system for Gemini API models. When one model hits its rate limit or fails, the system automatically tries the next available model in the priority list.

## Model Priority List
Models are tried in this order (same priority for all):

1. `gemini-2.5-flash-lite`
2. `gemini-2.5-flash-tts`
3. `gemini-2.5-flash`
4. `gemini-3-flash`
5. `gemini-robotics-er-1.5-preview`
6. `gemma-3-12b`
7. `gemma-3-1b`
8. `gemma-3-27b`
9. `gemma-3-2b`
10. `gemma-3-4b`

## How It Works

### 1. Model Selection
- When a request comes in, the system calls `getNextAvailableModel()`
- This function checks which models are currently rate-limited
- It returns the first available model that isn't rate-limited

### 2. Rate Limit Tracking
- When a model returns a rate limit error (429, quota exceeded, etc.), it's marked as rate-limited
- Rate-limited models are stored in a Map with a timestamp
- After 1 minute, the rate limit marker automatically expires and the model becomes available again

### 3. Sequential Fallback
- If a model fails (rate limit or other error), the system automatically tries the next model
- This continues until either:
  - A model successfully generates a response
  - All models have been exhausted
- If all models fail, the system falls back to FAQ-based mock responses

### 4. Error Detection
The system detects rate limit errors by checking for these keywords in error messages:
- "rate limit"
- "quota"
- "429"
- "resource exhausted"

## Benefits

1. **High Availability**: If one model is rate-limited, others can still serve requests
2. **Automatic Recovery**: Rate limits automatically expire after 1 minute
3. **Transparent Failover**: Users get responses even when primary models are unavailable
4. **Logging**: All model switches and errors are logged for debugging

## Example Flow

```
Request comes in
  ↓
Try gemini-2.5-flash-lite
  ↓
Rate limit error detected
  ↓
Mark gemini-2.5-flash-lite as rate-limited (1 min)
  ↓
Try gemini-2.5-flash-tts
  ↓
Success! Return response
```

## Logs to Watch For

- `✓ Using model: [model-name]` - Model being used for request
- `⚠️ Model [model-name] has been rate limited, marking for 1 minute` - Model hit rate limit
- `Rate limit hit for [model-name], trying next model...` - Switching to next model
- `✓ Successfully generated response using [model-name]` - Response generated successfully
- `⚠️ All models are rate limited or unavailable, using mock responses` - All models exhausted

## Configuration

To modify the model priority list, edit the `MODEL_PRIORITY` array in `backend/src/gemini.ts`:

```typescript
const MODEL_PRIORITY = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-tts',
  // ... add or reorder models here
];
```

## CORS Update

The CORS configuration has also been updated to accept requests from any localhost port:

```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any localhost port or no origin
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, process.env.FRONTEND_URL || 'http://localhost:5173');
    }
  },
  credentials: true
}));
```

This fixes the CORS issue when the frontend runs on different ports (e.g., 5173, 5175, etc.).

## Testing

To test the fallback system:

1. Send multiple requests rapidly to hit rate limits
2. Watch the backend logs to see model switching
3. Verify responses are still generated even with rate limits

## Files Modified

- `backend/src/gemini.ts` - Added sequential fallback logic
- `backend/src/server.ts` - Updated CORS to accept any localhost port


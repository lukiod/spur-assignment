import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import db from './db';
import { Message } from './types';

// Model priority list - will try in this order when rate limits are hit
const MODEL_PRIORITY = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-tts',
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-robotics-er-1.5-preview',
  'gemma-3-12b',
  'gemma-3-1b',
  'gemma-3-27b',
  'gemma-3-2b',
  'gemma-3-4b'
];

// Track which models have been rate limited (reset after 1 minute)
const rateLimitedModels = new Map<string, number>();

// Lazy initialization to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;
let useMockMode = false; // Set to true if API fails to initialize

function getNextAvailableModel(): { model: GenerativeModel; modelName: string } | null {
  if (useMockMode) return null;
  
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not set, using mock responses');
      useMockMode = true;
      return null;
    }
    
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('✓ Gemini AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      console.warn('⚠️  Falling back to mock responses');
      useMockMode = true;
      return null;
    }
  }
  
  // Clean up expired rate limits (after 1 minute)
  const now = Date.now();
  for (const [modelName, timestamp] of rateLimitedModels.entries()) {
    if (now - timestamp > 60000) {
      rateLimitedModels.delete(modelName);
    }
  }
  
  // Try each model in priority order
  for (const modelName of MODEL_PRIORITY) {
    if (!rateLimitedModels.has(modelName)) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✓ Using model: ${modelName}`);
        return { model, modelName };
      } catch (error) {
        console.warn(`⚠️  Could not initialize ${modelName}, trying next model`);
        continue;
      }
    }
  }
  
  // All models are rate limited or failed
  console.warn('⚠️  All models are rate limited or unavailable, using mock responses');
  return null;
}

function markModelAsRateLimited(modelName: string) {
  rateLimitedModels.set(modelName, Date.now());
  console.warn(`⚠️  Model ${modelName} has been rate limited, marking for 1 minute`);
}

// Configure generation settings for better responses
const generationConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 500,
};

// Generate mock response based on FAQs
function generateMockResponse(userMessage: string, faqs: any[]): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for FAQ matches
  for (const faq of faqs) {
    if (lowerMessage.includes(faq.question.toLowerCase().slice(0, 15))) {
      return faq.answer;
    }
    
    // Keyword matching
    const keywords = faq.question.toLowerCase().split(' ');
    if (keywords.some(keyword => lowerMessage.includes(keyword) && keyword.length > 4)) {
      return faq.answer;
    }
  }
  
  // Default response
  return "Thank you for your question! While I'm currently experiencing some technical difficulties with my AI connection, I'd be happy to help. For immediate assistance, please contact our support team at support@shopease.com or call us Monday-Friday, 9 AM - 6 PM EST.";
}

export async function generateReply(
  conversationId: number,
  userMessage: string
): Promise<string> {
  try {
    // Get FAQs for context
    const faqs = await db.getFAQs();
    
    // Try each available model in sequence
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MODEL_PRIORITY.length; attempt++) {
      const modelInfo = getNextAvailableModel();
      
      // Use mock mode if no model is available
      if (!modelInfo || useMockMode) {
        console.log('Using mock response mode');
        return generateMockResponse(userMessage, faqs);
      }
      
      const { model, modelName } = modelInfo;
      
      try {
        // Get recent conversation history
        const recentMessages = await db.getRecentMessages(conversationId, 10);

        // Build context from FAQs
        const faqContext = faqs
          .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
          .join('\n\n');

        // Build conversation history
        const conversationHistory = recentMessages
          .map((msg) => `${msg.sender === 'user' ? 'Customer' : 'Agent'}: ${msg.text}`)
          .join('\n');

        // Construct the prompt
        const systemPrompt = `You are a helpful AI support agent for "ShopEase", a modern e-commerce store. 
Your role is to assist customers with their questions clearly, concisely, and professionally.

STORE INFORMATION:
${faqContext}

GUIDELINES:
- Be friendly, professional, and empathetic
- Answer based on the store information provided above
- If you don't know something, be honest and offer to connect them with human support
- Keep responses concise (2-3 sentences max unless more detail is needed)
- Use a warm, conversational tone
- For questions outside the FAQ scope, provide helpful general guidance

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}
Customer: ${userMessage}
Agent:`;

        // Call Gemini API with timeout
        const result = await Promise.race([
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          ),
        ]);

        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }

        console.log(`✓ Successfully generated response using ${modelName}`);
        return text.trim();
        
      } catch (error: any) {
        lastError = error;
        console.error(`Error with model ${modelName}:`, error?.message || error);
        
        // Check if it's a rate limit error
        const errorMessage = error?.message?.toLowerCase() || '';
        const isRateLimit = errorMessage.includes('rate limit') || 
                           errorMessage.includes('quota') || 
                           errorMessage.includes('429') ||
                           errorMessage.includes('resource exhausted');
        
        if (isRateLimit) {
          console.log(`Rate limit hit for ${modelName}, trying next model...`);
          markModelAsRateLimited(modelName);
          continue; // Try next model
        }
        
        // For other errors, also try next model
        console.log(`Error with ${modelName}, trying next model...`);
        markModelAsRateLimited(modelName);
        continue;
      }
    }
    
    // All models failed, fall back to mock mode
    console.warn('⚠️  All models failed, falling back to mock responses');
    console.error('Last error:', lastError);
    return generateMockResponse(userMessage, faqs);
    
  } catch (error: any) {
    console.error('Unexpected error in generateReply:', error);
    
    // Fall back to mock mode on error
    const faqs = await db.getFAQs();
    return generateMockResponse(userMessage, faqs);
  }
}


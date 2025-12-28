import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import db from './db';
import { Message } from './types';

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

const rateLimitedModels = new Map<string, number>();
let genAI: GoogleGenerativeAI | null = null;
let useMockMode = false;

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
  
  const now = Date.now();
  for (const [modelName, timestamp] of rateLimitedModels.entries()) {
    if (now - timestamp > 60000) {
      rateLimitedModels.delete(modelName);
    }
  }
  
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
  
  console.warn('⚠️  All models are rate limited or unavailable, using mock responses');
  return null;
}

function markModelAsRateLimited(modelName: string) {
  rateLimitedModels.set(modelName, Date.now());
  console.warn(`⚠️  Model ${modelName} has been rate limited, marking for 1 minute`);
}

const generationConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 500,
};

function generateMockResponse(userMessage: string, faqs: any[]): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || 
      lowerMessage.includes('email') || lowerMessage.includes('call') || 
      lowerMessage.includes('support number') || lowerMessage.includes('reach')) {
    return "You can reach our support team at:\n📞 Phone: 1-800-SHOP-EASE (1-800-746-7327)\n📧 Email: support@shopease.com\n🕒 Hours: Monday-Friday, 9 AM - 6 PM EST\n💬 Live Chat: Available 24/7 (right here!)\n\nWe typically respond within 2 hours. How else can I help you today?";
  }
  
  for (const faq of faqs) {
    if (lowerMessage.includes(faq.question.toLowerCase().slice(0, 15))) {
      return faq.answer;
    }
    
    const keywords = faq.question.toLowerCase().split(' ');
    if (keywords.some(keyword => lowerMessage.includes(keyword) && keyword.length > 4)) {
      return faq.answer;
    }
  }
  
  return "Thank you for your question! While I'm currently experiencing some technical difficulties with my AI connection, I'd be happy to help. For immediate assistance, please contact our support team:\n📞 1-800-SHOP-EASE (1-800-746-7327)\n📧 support@shopease.com\n🕒 Monday-Friday, 9 AM - 6 PM EST";
}

export async function generateReply(
  conversationId: number,
  userMessage: string
): Promise<string> {
  try {
    const faqs = await db.getFAQs();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MODEL_PRIORITY.length; attempt++) {
      const modelInfo = getNextAvailableModel();
      
      if (!modelInfo || useMockMode) {
        console.log('Using mock response mode');
        return generateMockResponse(userMessage, faqs);
      }
      
      const { model, modelName } = modelInfo;
      
      try {
        const recentMessages = await db.getRecentMessages(conversationId, 10);
        const faqContext = faqs
          .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
          .join('\n\n');
        const conversationHistory = recentMessages
          .map((msg) => `${msg.sender === 'user' ? 'Customer' : 'Agent'}: ${msg.text}`)
          .join('\n');

        const systemPrompt = `You are a helpful AI support agent for "ShopEase", a modern e-commerce store. 
Your role is to assist customers with their questions clearly, concisely, and professionally.

STORE INFORMATION:
${faqContext}

CONTACT INFORMATION:
- Phone: 1-800-SHOP-EASE (1-800-746-7327)
- Email: support@shopease.com
- Hours: Monday-Friday, 9 AM - 6 PM EST
- Live Chat: Available 24/7 (this chat)
- Social Media: @ShopEase on Twitter, Facebook, Instagram

GUIDELINES:
- Be friendly, professional, and empathetic
- Answer based on the store information provided above
- When asked for contact info, provide the phone number, email, and hours clearly
- If the customer needs immediate help beyond your scope, provide contact details
- Keep responses concise (2-3 sentences max unless more detail is needed)
- Use a warm, conversational tone
- For questions outside the FAQ scope, provide helpful general guidance

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}
Customer: ${userMessage}
Agent:`;

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
        
        const errorMessage = error?.message?.toLowerCase() || '';
        const isRateLimit = errorMessage.includes('rate limit') || 
                           errorMessage.includes('quota') || 
                           errorMessage.includes('429') ||
                           errorMessage.includes('resource exhausted');
        
        if (isRateLimit) {
          console.log(`Rate limit hit for ${modelName}, trying next model...`);
          markModelAsRateLimited(modelName);
          continue;
        }
        
        console.log(`Error with ${modelName}, trying next model...`);
        markModelAsRateLimited(modelName);
        continue;
      }
    }
    
    console.warn('⚠️  All models failed, falling back to mock responses');
    console.error('Last error:', lastError);
    return generateMockResponse(userMessage, faqs);
    
  } catch (error: any) {
    console.error('Unexpected error in generateReply:', error);
    const faqs = await db.getFAQs();
    return generateMockResponse(userMessage, faqs);
  }
}


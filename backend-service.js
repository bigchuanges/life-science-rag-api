// RAG Backend Service for Plug AI Tutor
// Complete version with your API keys

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';

// Configuration with your actual API keys
const GEMINI_API_KEY = 'AIzaSyAjF1uFufPSfqu1BVJaohrwPRnZDGvGzNk';
const PINECONE_API_KEY = 'pcsk_K2WT4_JYWvjX81Bg5xPJdPjHViiTKgrVZFPKYzbSFtyNw5mjtsPdpuMNaaWnMZMiGSMJV';
const PINECONE_INDEX_NAME = 'plug-knowledge-base';

class PlugRAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.chatModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    this.pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    this.index = this.pinecone.index(PINECONE_INDEX_NAME);
  }

  // Detect curriculum, grade, and subject from user message
  detectContext(message) {
    const msg = message.toLowerCase();
    
    let curriculum = 'caps'; // default
    if (msg.includes('ieb') || msg.includes('independent')) {
      curriculum = 'ieb';
    }
    
    let grade = 'grade12'; // default
    const gradePatterns = {
      'grade8': /grade\s*8|gr\s*8|year\s*8/,
      'grade9': /grade\s*9|gr\s*9|year\s*9/,
      'grade10': /grade\s*10|gr\s*10|year\s*10/,
      'grade11': /grade\s*11|gr\s*11|year\s*11/,
      'grade12': /grade\s*12|gr\s*12|matric|year\s*12/
    };
    
    for (const [gradeKey, pattern] of Object.entries(gradePatterns)) {
      if (pattern.test(msg)) {
        grade = gradeKey;
        break;
      }
    }
    
    let subject = '';
    if (msg.includes('life science') || msg.includes('biology') || msg.includes('dna') || msg.includes('evolution') || msg.includes('genetics')) {
      subject = 'life-science';
    } else if (msg.includes('physical science') || msg.includes('physics') || msg.includes('chemistry')) {
      subject = 'physical-science';
    }
    
    return { curriculum, grade, subject };
  }

  // Search for relevant content in Pinecone
  async searchRelevantContent(query, context, topK = 3) {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      console.log('📊 Context:', context);
      
      // Create filter based on detected context
      const filter = {};
      if (context.curriculum) filter.curriculum = context.curriculum;
      if (context.grade) filter.grade = context.grade;
      if (context.subject) filter.subject = context.subject;
      
      console.log('🎯 Search filter:', filter);
      
      // Search in Pinecone using dummy vector (since we stored content with dummy vectors)
      const dummyVector = new Array(768).fill(0.1);
      
      const searchResults = await this.index.query({
        vector: dummyVector,
        topK: topK,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      console.log(`📝 Found ${searchResults.matches?.length || 0} matches`);
      
      if (searchResults.matches && searchResults.matches.length > 0) {
        searchResults.matches.forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.metadata.filename} (score: ${match.score})`);
        });
      }
      
      return searchResults.matches || [];
      
    } catch (error) {
      console.error('❌ Error searching content:', error);
      return [];
    }
  }

  // Main function to get enhanced response
  async getEnhancedResponse(userMessage) {
    try {
      console.log('🚀 Processing user message:', userMessage);
      
      // Detect context from user message
      const context = this.detectContext(userMessage);
      console.log('🎯 Detected context:', context);
      
      // Search for relevant content
      const relevantChunks = await this.searchRelevantContent(userMessage, context);
      
      // Prepare context for Gemini
      let contextText = '';
      let sourcesUsed = [];
      
      if (relevantChunks.length > 0) {
        contextText = relevantChunks
          .map(chunk => {
            sourcesUsed.push(chunk.metadata.filename);
            return `📚 Source: ${chunk.metadata.filename}\n${chunk.metadata.text.substring(0, 800)}...`;
          })
          .join('\n\n---\n\n');
        
        console.log('📖 Using content from:', sourcesUsed);
      } else {
        console.log('⚠️  No relevant content found, using general knowledge');
      }
      
      // Build the enhanced prompt
      const systemInstruction = `You are Plug, an expert South African tutor specializing in CAPS and IEB curricula.

**Your Persona & Vibe:**
You're the cool, relatable, slightly playful tutor who makes learning enjoyable. Think of yourself as that awesome teacher everyone loves - knowledgeable but never intimidating.

**Interaction Flow:**
1. **Greeting & Banter:** Always be warm and engaging
2. **Receiving a Question:** Listen carefully and show you understand  
3. **The Explanation (Tutor Mode):** This is where you shine:
   - **CONCISE & DIRECT:** Get straight to the point, skip unnecessary fluff
   - **SEAMLESS TONE SHIFT:** The explanation should be slightly more focused and professional, but still maintain your personality
   - **Focus on Subjects:** You are amazing at Life Sciences and Physical Sciences, but can help with other subjects too

**After the Explanation:**
4. **Follow-up & Engagement:** Offer practice questions, ask if they need clarification, suggest related topics

${contextText ? `**RELEVANT CURRICULUM CONTENT:**\n${contextText}\n` : ''}

**CRITICAL INSTRUCTIONS:**
- Use the curriculum content above as your primary knowledge source for curriculum-aligned responses
- **CONCISE & DIRECT:** Your explanations should be focused and to the point
- **Focus on Subjects:** You excel at Life Sciences and Physical Sciences
- Be patient, encouraging, and break down complex concepts into digestible parts
- Use examples relevant to South African students
- Always maintain your warm, engaging personality

Your main goal is to make learning enjoyable, accessible, and effective while ensuring students truly understand the concepts.`;

      const prompt = `${systemInstruction}\n\nUser: ${userMessage}\nPlug:`;
      
      console.log('🤖 Generating response with Gemini...');
      
      // Get response from Gemini
      const result = await this.chatModel.generateContent(prompt);
      const response = result.response.text();
      
      console.log('✅ Response generated successfully');
      
      return {
        response: response,
        context: context,
        relevantSources: relevantChunks.length,
        sourcesUsed: sourcesUsed,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error generating response:', error);
      return {
        response: "Sorry, I'm having trouble right now. Please try again!",
        success: false,
        error: error.message
      };
    }
  }
}

// API endpoint handler (for Vercel deployment)
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { message } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    
    console.log('📨 Received API request:', message);
    
    const ragService = new PlugRAGService();
    const result = await ragService.getEnhancedResponse(message);
    
    console.log('📤 Sending response');
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
}

// For local testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing RAG Service locally...\n');
  
  const ragService = new PlugRAGService();
  
  // Test with a Life Science question
  const testQuestion = "What is DNA and how does it work in genetics?";
  console.log(`📝 Testing question: "${testQuestion}"\n`);
  
  ragService.getEnhancedResponse(testQuestion)
    .then(result => {
      console.log('\n🎉 Test Result:');
      console.log('📋 Response:', result.response);
      console.log('📊 Sources used:', result.sourcesUsed);
      console.log('🎯 Context detected:', result.context);
      console.log('📈 Number of sources:', result.relevantSources);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
    });
}
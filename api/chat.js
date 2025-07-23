// FORCE UPDATE: 2025-07-23-FINAL
// RAG API V4.1 - PRODUCTION READY WITH PROPER ERROR HANDLING
export default async function handler(req, res) {
  // Enable CORS - MUST BE FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET requests for health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Plug RAG API is working - V4.1 PRODUCTION!', 
      status: 'ready',
      version: '4.1',
      timestamp: new Date().toISOString(),
      features: ['Life Science knowledge', 'CAPS Grade 12', 'DNA & Evolution content'],
      endpoints: {
        'GET /api/chat': 'Health check',
        'POST /api/chat': 'Send Life Sciences question'
      }
    });
  }
  
  // Handle POST requests
  if (req.method === 'POST') {
    const { message } = req.body || {};
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string',
        version: '4.1'
      });
    }
    
    console.log('=== RAG API V4.1: POST REQUEST ===');
    console.log('Message received:', message);
    console.log('Environment check:');
    console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('- PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
    console.log('- PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
    
    try {
      console.log('Step 1: Importing libraries...');
      
      // Dynamic imports for Vercel compatibility
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const { Pinecone } = await import('@pinecone-database/pinecone');
      
      console.log('✅ Libraries imported successfully');
      
      console.log('Step 2: Initializing services...');
      
      // Validate environment variables
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY environment variable is not set');
      }
      if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error('PINECONE_INDEX_NAME environment variable is not set');
      }
      
      // Initialize services
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const pinecone = new Pinecone({ 
        apiKey: process.env.PINECONE_API_KEY
      });
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      
      console.log('✅ Services initialized successfully');
      
      console.log('Step 3: Creating embedding for search...');
      
      // Create embedding using Gemini's embedding model
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const embeddingResult = await embeddingModel.embedContent(message);
      const queryVector = embeddingResult.embedding.values;
      
      console.log('✅ Embedding created, vector length:', queryVector.length);
      
      console.log('Step 4: Searching knowledge base...');
      
      // Search Pinecone with the actual embedding
      const searchResults = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true,
        filter: { 
          curriculum: 'caps', 
          grade: 'grade12', 
          subject: 'life-science' 
        }
      });
      
      console.log('✅ Knowledge base search completed');
      console.log('Search results:', searchResults.matches?.length || 0, 'matches found');
      
      console.log('Step 5: Preparing context...');
      
      // Prepare context from search results
      let contextText = '';
      let sourcesUsed = [];
      
      if (searchResults.matches && searchResults.matches.length > 0) {
        const relevantChunks = searchResults.matches
          .filter(match => match.score > 0.7) // Only use high-confidence matches
          .slice(0, 3); // Limit to top 3 results
        
        contextText = relevantChunks
          .map((chunk, index) => {
            if (chunk.metadata) {
              const source = chunk.metadata.filename || chunk.metadata.source || `Source ${index + 1}`;
              sourcesUsed.push(source);
              const content = chunk.metadata.text || chunk.metadata.content || '';
              return `📚 **${source}** (Relevance: ${(chunk.score * 100).toFixed(1)}%)\n${content}`;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join('\n\n---\n\n');
      }
      
      console.log('✅ Context prepared from', sourcesUsed.length, 'sources');
      
      console.log('Step 6: Generating response...');
      
      // Create the prompt with context
      const systemInstruction = `You are Plug, a cool and knowledgeable South African tutor specializing in CAPS Grade 12 Life Sciences. You make learning fun and engaging!

${contextText ? `**RELEVANT CAPS CURRICULUM CONTENT:**\n${contextText}\n\n` : ''}

Guidelines:
- Use the curriculum content above as your PRIMARY knowledge source
- Be concise but comprehensive in your explanations
- Use relatable examples and analogies
- Keep a friendly, encouraging tone
- If the curriculum content doesn't fully answer the question, supplement with your general Life Sciences knowledge
- Always aim to help students understand concepts clearly

Student's question: ${message}

Your response:`;

      const result = await chatModel.generateContent(systemInstruction);
      const aiResponse = result.response.text();
      
      console.log('✅ AI response generated successfully');
      console.log('Response length:', aiResponse.length, 'characters');
      
      // Return successful response
      return res.status(200).json({
        response: aiResponse,
        success: true,
        metadata: {
          sourcesUsed: [...new Set(sourcesUsed)],
          relevantSources: searchResults.matches?.length || 0,
          highConfidenceMatches: searchResults.matches?.filter(m => m.score > 0.7).length || 0,
          searchQuery: message,
          version: '4.1',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('=== ERROR IN RAG API V4.1 ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Return detailed error for debugging
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          version: '4.1',
          timestamp: new Date().toISOString(),
          receivedMessage: message,
          environmentCheck: {
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasPineconeKey: !!process.env.PINECONE_API_KEY,
            pineconeIndex: process.env.PINECONE_INDEX_NAME
          }
        }
      });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ 
    error: 'Method not allowed',
    supportedMethods: ['GET', 'POST', 'OPTIONS'],
    version: '4.1'
  });
}

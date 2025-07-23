// FORCE UPDATE: 2025-07-22-23-45
// DEBUG VERSION 4.0 - FORCED UPDATE WITH NEW ERROR HANDLING
// DEBUG VERSION 4.0 - FORCED UPDATE WITH NEW ERROR HANDLING
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Plug RAG API is working - DEBUG V4.0!', 
      status: 'ready',
      version: '4.0',
      timestamp: new Date().toISOString(),
      features: ['Life Science knowledge', 'CAPS Grade 12', 'DNA & Evolution content']
    });
  }
  
  if (req.method === 'POST') {
    const { message } = req.body || {};
    
    console.log('=== DEBUG V4.0: POST REQUEST RECEIVED ===');
    console.log('Message:', message);
    console.log('Environment variables check:');
    console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
    console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
    
    try {
      console.log('=== STEP 1: Importing libraries ===');
      
      // Import libraries dynamically
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      console.log('✅ GoogleGenerativeAI imported successfully');
      
      const { Pinecone } = await import('@pinecone-database/pinecone');
      console.log('✅ Pinecone imported successfully');
      
      console.log('=== STEP 2: Initializing services ===');
      
      // Initialize services
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('✅ GoogleGenerativeAI initialized');
      
      const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      console.log('✅ Chat model initialized');
      
      const pinecone = new Pinecone({ 
        apiKey: process.env.PINECONE_API_KEY
      });
      console.log('✅ Pinecone client initialized');
      
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      console.log('✅ Pinecone index initialized');
      
      console.log('=== STEP 3: Performing vector search ===');
      
      // Use simple vector search
      const dummyVector = new Array(768).fill(0.1);
      
      const searchResults = await index.query({
        vector: dummyVector,
        topK: 5,
        includeMetadata: true,
        filter: { curriculum: 'caps', grade: 'grade12', subject: 'life-science' }
      });
      
      console.log('✅ Vector search completed');
      console.log('Search results:', searchResults.matches?.length || 0, 'matches found');
      
      console.log('=== STEP 4: Preparing context ===');
      
      // Prepare context
      let contextText = '';
      let sourcesUsed = [];
      
      if (searchResults.matches && searchResults.matches.length > 0) {
        contextText = searchResults.matches
          .map(chunk => {
            if (chunk.metadata && chunk.metadata.filename) {
              sourcesUsed.push(chunk.metadata.filename);
              return `📚 Source: ${chunk.metadata.filename}\n${chunk.metadata.text || chunk.metadata.content || 'No content available'}`;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join('\n\n---\n\n');
      }
      
      console.log('✅ Context prepared, sources:', sourcesUsed.length);
      
      console.log('=== STEP 5: Generating AI response ===');
      
      // Generate response
      const systemInstruction = `You are Plug, an expert South African tutor specializing in CAPS Grade 12 Life Sciences.

${contextText ? `**RELEVANT CURRICULUM CONTENT:**\n${contextText}\n` : ''}

You're cool, relatable, and make learning enjoyable. Use the curriculum content above as your primary knowledge source. Be concise, engaging, and focus on helping students understand concepts clearly.

If no relevant curriculum content is found, still answer based on your Life Sciences knowledge but mention that you're drawing from general knowledge.`;

      const prompt = `${systemInstruction}\n\nUser: ${message}\nPlug:`;
      
      const result = await chatModel.generateContent(prompt);
      const response = result.response.text();
      
      console.log('✅ AI response generated successfully');
      console.log('=== SUCCESS: Returning response ===');
      
      return res.status(200).json({
        response: response,
        success: true,
        sourcesUsed: [...new Set(sourcesUsed)],
        relevantSources: searchResults.matches?.length || 0,
        receivedMessage: message,
        version: '4.0',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('=== ERROR CAUGHT IN DEBUG V4.0 ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      
      // Return the ACTUAL error details - NO GENERIC MESSAGE
      return res.status(500).json({
        success: false,
        version: '4.0',
        actualError: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorDetails: error.toString(),
        receivedMessage: message,
        timestamp: new Date().toISOString(),
        debugInfo: {
          hasGeminiKey: !!process.env.GEMINI_API_KEY,
          hasPineconeKey: !!process.env.PINECONE_API_KEY,
          pineconeIndex: process.env.PINECONE_INDEX_NAME
        }
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed', version: '4.0' });
}

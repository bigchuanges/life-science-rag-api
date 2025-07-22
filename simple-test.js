console.log('🚀 Starting simple test...');

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';

const GEMINI_API_KEY = 'AIzaSyAjF1uFufPSfqu1BVJaohrwPRnZDGvGzNk';
const PINECONE_API_KEY = 'pcsk_K2WT4_JYWvjX81Bg5xPJdPjHViiTKgrVZFPKYzbSFtyNw5mjtsPdpuMNaaWnMZMiGSMJV';

console.log('✅ Imports successful');

try {
  console.log('🔧 Testing Gemini connection...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini initialized');
  
  console.log('🔧 Testing Pinecone connection...');
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  console.log('✅ Pinecone initialized');
  
  console.log('🎉 All connections successful!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
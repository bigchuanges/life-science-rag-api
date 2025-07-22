import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = 'pcsk_K2WT4_JYWvjX81Bg5xPJdPjHViiTKgrVZFPKYzbSFtyNw5mjtsPdpuMNaaWnMZMiGSMJV';
const PINECONE_INDEX_NAME = 'plug-knowledge-base';

console.log('🚀 Metadata Upload Test...\n');

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.index(PINECONE_INDEX_NAME);

const txtFiles = fs.readdirSync('.').filter(f => f.endsWith('.txt'));
console.log(`📝 Found ${txtFiles.length} files`);

try {
  for (let i = 0; i < txtFiles.length; i++) {
    const fileName = txtFiles[i];
    const content = fs.readFileSync(fileName, 'utf8');
    
    // Create a simple dummy vector (768 dimensions of zeros)
    const dummyVector = new Array(768).fill(0.1);
    
    const record = {
      id: `test_${i}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      values: dummyVector,
      metadata: {
        text: content.substring(0, 1000), // First 1000 chars only
        filename: fileName,
        curriculum: 'caps',
        grade: 'grade12',
        subject: 'life-science'
      }
    };
    
    await index.upsert([record]);
    console.log(`✅ Uploaded: ${fileName}`);
  }
  
  console.log('\n🎉 Test upload successful!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
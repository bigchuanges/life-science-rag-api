import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = 'pcsk_K2WT4_JYWvjX81Bg5xPJdPjHViiTKgrVZFPKYzbSFtyNw5mjtsPdpuMNaaWnMZMiGSMJV';
const PINECONE_INDEX_NAME = 'plug-knowledge-base';

console.log('🚀 Plug Content Processor (Final Version)...\n');

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.index(PINECONE_INDEX_NAME);

const txtFiles = fs.readdirSync('.').filter(f => f.endsWith('.txt'));
console.log(`📝 Found ${txtFiles.length} .txt files:`, txtFiles);

const allChunks = [];

for (const fileName of txtFiles) {
  console.log(`\n📖 Processing: ${fileName}`);
  const content = fs.readFileSync(fileName, 'utf8');
  console.log(`📊 Content length: ${content.length} characters`);
  
  if (content.trim().length > 50) {
    allChunks.push({
      id: `caps_grade12_lifescience_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      content: content.trim(),
      filename: fileName
    });
  }
}

console.log(`\n✅ Created ${allChunks.length} chunks`);

try {
  console.log('\n🚀 Uploading to Pinecone with proper format...');
  
  const inferenceIndex = pinecone.index(PINECONE_INDEX_NAME).namespace('');
  
  for (const chunk of allChunks) {
    console.log(`📤 Uploading: ${chunk.filename}`);
    
    const record = {
      id: chunk.id,
      values: chunk.content,
      metadata: {
        text: chunk.content,
        curriculum: 'caps',
        grade: 'grade12', 
        subject: 'life-science',
        filename: chunk.filename,
        source: 'caps grade12 life-science',
        type: 'study_material'
      }
    };
    
    try {
      await inferenceIndex.upsert([record]);
      console.log(`✅ Successfully uploaded: ${chunk.filename}`);
    } catch (uploadError) {
      console.log(`⚠️  Retrying with different format for: ${chunk.filename}`);
      
      const metadataOnlyRecord = {
        id: chunk.id,
        metadata: {
          text: chunk.content,
          curriculum: 'caps',
          grade: 'grade12',
          subject: 'life-science', 
          filename: chunk.filename,
          source: 'caps grade12 life-science',
          type: 'study_material'
        }
      };
      
      await inferenceIndex.upsert([metadataOnlyRecord]);
      console.log(`✅ Uploaded (metadata only): ${chunk.filename}`);
    }
  }
  
  console.log(`\n🎉 Upload completed! All ${allChunks.length} chunks processed.`);
  
  console.log('\n🔍 Testing search functionality...');
  const searchResult = await inferenceIndex.query({
    data: 'DNA',
    topK: 1,
    includeMetadata: true
  });
  
  if (searchResult.matches && searchResult.matches.length > 0) {
    console.log('✅ Search test successful! Found:', searchResult.matches[0].metadata.filename);
  } else {
    console.log('⚠️  Search test returned no results');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Full error details:', error);
}
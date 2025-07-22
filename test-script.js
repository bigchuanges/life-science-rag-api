// Content Processing Script for Plug RAG System - FIXED VERSION
import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = 'pcsk_K2WT4_JYWvjX81Bg5xPJdPjHViiTKgrVZFPKYzbSFtyNw5mjtsPdpuMNaaWnMZMiGSMJV';
const PINECONE_INDEX_NAME = 'plug-knowledge-base';

console.log('🚀 Starting script...');
console.log('Current directory:', process.cwd());

const files = fs.readdirSync('.');
console.log('Files found:', files);

const txtFiles = files.filter(f => f.endsWith('.txt'));
console.log('TXT files:', txtFiles);

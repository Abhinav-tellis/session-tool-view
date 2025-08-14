import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getEmbedding } from './embedData.js';

interface SessionChunk {
  id: string;
  sessionId: string;
  content: string;
  embedding: number[];
  metadata: {
    filePath: string;
    chunkIndex: number;
    timestamp: string;
  };
}

export async function processSessionData(sessionsDir: string = './session-mcp/sessions'): Promise<SessionChunk[]> {
  const results: SessionChunk[] = [];
  
  if (!existsSync(sessionsDir)) {
    console.error(`Sessions directory not found: ${sessionsDir}`);
    return results;
  }

  const files = readdirSync(sessionsDir).filter(file => file.endsWith('.md'));
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    separators: ['\n\n', '\n', ' ', ''],
    chunkOverlap: 100,
  });

  for (const file of files) {
    const filePath = join(sessionsDir, file);
    const content = readFileSync(filePath, 'utf8');
    
    const chunks = await splitter.createDocuments([content]);
    const sessionId = file.replace('.md', '');
    
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResult = await getEmbedding(chunk.pageContent);
      
      if (embeddingResult.embedding) {
        results.push({
          id: `${sessionId}-chunk-${i}`,
          sessionId,
          content: chunk.pageContent,
          embedding: embeddingResult.embedding,
          metadata: {
            filePath,
            chunkIndex: i,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export async function saveEmbeddings(chunks: SessionChunk[], outputPath: string = './embeddings.json') {
  writeFileSync(outputPath, JSON.stringify(chunks, null, 2));
  console.log(`Saved ${chunks.length} chunks with embeddings to ${outputPath}`);
}

// Main execution function
export async function main() {
  console.log('Processing session data for embeddings...');
  
  const chunks = await processSessionData();
  
  if (chunks.length > 0) {
    await saveEmbeddings(chunks);
    console.log('Successfully processed and saved session embeddings!');
  } else {
    console.log('No chunks were processed.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
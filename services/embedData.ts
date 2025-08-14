import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export async function getEmbedding(text: string) {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text:v1.5',
      prompt: text,
      stream: false
    })
  });

  const result:any = await response.json();
  
  return {
    embedding: result.embedding,
    length: result.embedding?.length
  };
}
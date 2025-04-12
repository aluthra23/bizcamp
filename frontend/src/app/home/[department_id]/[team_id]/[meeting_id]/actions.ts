"use server"

import { QdrantManager } from './QdrantManager';
import { AssemblyAI } from 'assemblyai';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

const qdrantApiKey = process.env.QDRANT_API_KEY || '';

const host = process.env.QDRANT_LINK || 'http://localhost';
const manager = new QdrantManager(qdrantApiKey, host);

const client = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY,
});


export async function processAudioChunk(audioBlob: Blob, collectionName: string) {
  try {
    // Check if the blob is valid
    if (!audioBlob.type.includes('audio/')) {
      console.error("Invalid audio blob type:", audioBlob.type);
      return;
    }

    if (audioBlob.size < 1000) {  // Arbitrary minimum size check
      console.log("Audio chunk too small, skipping...");
      return;
    }

    console.log("Processing interval audio chunk:", {
      type: audioBlob.type,
      size: audioBlob.size
    });

    const timestamp = new Date().toISOString();
    const file = new File([audioBlob], `audio_chunk_${timestamp}.webm`, { 
      type: audioBlob.type
    });

    const data = {
      audio: file,
      language_code: "en_us"
    };

    console.log("Sending chunk for transcription...");
    const transcript = await client.transcripts.transcribe(data);
    
    if (transcript.status === 'error') {
      console.error('Transcription error:', transcript.error);
      return;
    }
    
    if (transcript.text && transcript.text.trim()) {
      await manager.addText(collectionName, transcript.text);
      console.log('Added transcription to Qdrant:', transcript.text);
    }

  } catch (error) {
    console.error('Error processing audio chunk:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
  }
}

export async function initializeCollection(collectionName: string, vectorSize: number = 768): Promise<void> {
  try {
    console.log(`Initializing collection '${collectionName}'`);
    
    // Use our API proxy to communicate with the backend
    const response = await fetch(`/api/backend/transcriptions/collections/${collectionName}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vectorSize }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to initialize collection: ${response.statusText}`);
    }
    
    console.log('Collection initialized successfully');
  } catch (error) {
    console.error(`Error initializing collection '${collectionName}':`, error);
    throw error;
  }
}

export async function restartCollection(collectionName: string, vectorSize: number = 768): Promise<void> {
  try {
    console.log(`Restarting collection '${collectionName}'`);
    
    // Use our API proxy to communicate with the backend
    const response = await fetch(`/api/backend/transcriptions/collections/${collectionName}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vectorSize }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to restart collection: ${response.statusText}`);
    }
    
    console.log('Collection restarted successfully');
  } catch (error) {
    console.error(`Error restarting collection '${collectionName}':`, error);
    throw error;
  }
}

export async function collectionExists(collectionName: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/backend/transcriptions/collections/${collectionName}/exists`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check if collection exists: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error(`Error checking if collection '${collectionName}' exists:`, error);
    return false;
  }
}

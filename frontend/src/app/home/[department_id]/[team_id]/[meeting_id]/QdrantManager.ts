import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SearchResult {
  payload: {
    text: string;
    start_time: number;
    end_time: number;
  };
  score: number;
}

const googleApiKeyList = [process.env.GOOGLE_API_KEY_1 || '', process.env.GOOGLE_API_KEY_2 || '', process.env.GOOGLE_API_KEY_3 || '']

export interface Point {
  id: string | number; // ID can be a string or a number
  payload?: {
    text: string;
    start_time: number;
    end_time: number;
  };
  vector?: number[];   // Optional, if you are working with vectors
}

export class QdrantManager {
  private client: QdrantClient;

  constructor(
    qdrantApiKey: string,
    host: string = 'localhost',
    port: number = 6333
  ) {
    this.client = new QdrantClient({
      url: host,
      port,
      apiKey: qdrantApiKey,
    });
  }

  async collectionExists(collectionName: string): Promise<boolean> {
    const { exists } = await this.client.collectionExists(collectionName);
    if (exists) {
      return true;
    } else {
      return false;
    }
  }

  async createCollection(
    collectionName: string,
    vectorSize: number = 768
  ): Promise<void> {
    try {
      const { exists } = await this.client.collectionExists(collectionName);
      if (exists) {
        console.log(`Collection '${collectionName}' already exists`);
        return;
      }
    } catch (e) {
      // Ignore deletion errors
      console.log(e);
    }

    await this.client.createCollection(collectionName, 
      {
      vectors: {
        size: vectorSize,
        distance: "Cosine"
      },
    });

    console.log(`Collection '${collectionName}' created successfully`);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    const { exists } = await this.client.collectionExists(collectionName);
    if (!exists) {
      throw new Error(`Collection '${collectionName}' does not exist`);
    }

    await this.client.deleteCollection(collectionName);
  }

  private async getNextId(collectionName: string): Promise<number> {
    try {
      const response = await this.client.count(collectionName);

      // If there are no points, start with ID 0
      if (!response.count) {
        return 0;
      }

      const highestId = response.count as number;
      console.log("Highest ID:", highestId);
      return highestId;
    } catch (error) {
      console.error('Error getting next ID:', error);
      // If there's an error reading, start with ID 0
      return 0;
    }
  }

  private async getLastEndTime(collectionName: string, lastId: number): Promise<number> {
    try {
      if (lastId < 0) {
        console.log("No points in the collection.");
        return 0;
      }
      // Retrieve the point with the last ID
      const point = await this.client.retrieve(collectionName, {
        ids: [lastId], // Assuming IDs are strings
      });
  
      if (point && point.length > 0) {
        const lastPoint = point[0];
        const endTime = lastPoint.payload?.end_time;
  
        console.log("Last point retrieved:", lastPoint);
        console.log("End Time:", endTime);
  
        return endTime as number;
      } else {
        console.log("No point found with the last ID.");
        return 0;
      }
    } catch (error) {
      console.error("Error retrieving last point:", error);
      return 0;
    }
  }  

  async addText(collectionName: string, text: string): Promise<void> {
    const { exists } = await this.client.collectionExists(collectionName);
    if (!exists) {
      throw new Error(`Collection '${collectionName}' does not exist`);
    }

    // Get embedding from Google's Generative AI
    const genAI = new GoogleGenerativeAI(googleApiKeyList[Math.floor(Math.random() * googleApiKeyList.length)]);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Get the next available ID from the database
    const nextId = await this.getNextId(collectionName);
    const lastEndTime = await this.getLastEndTime(collectionName, nextId - 1);

    await this.client.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: nextId,
          vector: embedding,
          payload: {
            text,
            start_time: lastEndTime,
            end_time: lastEndTime + 10,
          },
        },
      ],
    });
  }

  async getTranscriptions(collectionName: string) {
    const { exists } = await this.client.collectionExists(collectionName);
    if (!exists) {
      throw new Error(`Collection '${collectionName}' does not exist`);
    }

    const response = await this.client.query(collectionName, {
      limit: 1000,
      with_payload: true,
    });

    console.log("Response:", response);

    return response.points;
  }
} 
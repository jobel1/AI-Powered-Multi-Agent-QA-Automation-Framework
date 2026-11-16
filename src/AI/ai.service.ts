
import {GoogleGenAI, type GenerateContentConfig} from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

export class AIService {
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    if (!model) {
      throw new Error('GEMINI_MODEL is missing');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(
    prompt: string,
    config?: GenerateContentConfig
  ): Promise<string> {

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response');
    }

    return response.text;
  }
}

import { GoogleGenAI } from "@google/genai";

import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
    apiKey:process.env.Gemini_API_Key
});

async function testAPI() {
    try {
        const response = await ai.interactions.create({
            model: "gemini-3.5-flash",
            input:"Explain how AI works",
            
        });

        console.log("Response:",response.output_text)
    } catch(error) {
        console.error('API test failed:',error)
    }
}

testAPI();
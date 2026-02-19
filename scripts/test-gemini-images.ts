import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('🧪 Testing Gemini Image Generation...\n');

const genAI = new GoogleGenerativeAI(apiKey);

async function testImageGeneration() {
  const imageModels = [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp-image',
  ];

  for (const modelName of imageModels) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Try to generate an image
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: 'Generate a simple image of a red apple on a white background'
          }]
        }]
      });

      const response = await result.response;
      console.log(`✅ ${modelName} - Response received`);
      console.log(`   Response type:`, typeof response);
      console.log(`   Has candidates:`, response.candidates ? 'Yes' : 'No');

      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        console.log(`   Content parts:`, candidate.content?.parts?.length || 0);

        // Check if it returned an image
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if ('inlineData' in part) {
              console.log(`   ✅ IMAGE FOUND! MimeType: ${part.inlineData?.mimeType}`);
              console.log(`   Image data length: ${part.inlineData?.data?.length || 0} bytes`);
            } else if ('text' in part) {
              console.log(`   📝 TEXT: ${part.text?.substring(0, 100)}...`);
            }
          }
        }
      }
      console.log('');
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`❌ ${modelName} - NOT FOUND (404)`);
      } else if (error.status === 403) {
        console.log(`⛔ ${modelName} - FORBIDDEN (403)`);
      } else if (error.status === 400) {
        console.log(`⚠️  ${modelName} - BAD REQUEST (400) - ${error.message?.substring(0, 100)}`);
      } else {
        console.log(`❌ ${modelName} - ERROR: ${error.message?.substring(0, 100)}`);
      }
      console.log('');
    }
  }
}

testImageGeneration().catch(console.error);

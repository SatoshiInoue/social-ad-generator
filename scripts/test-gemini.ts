import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
console.log('\n🧪 Testing Gemini API...\n');

const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiAPI() {
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro-latest',
    'gemini-pro',
  ];

  console.log('Testing available models:\n');

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello, respond with just "OK"');
      const response = await result.response;
      const text = response.text();

      console.log(`✅ ${modelName.padEnd(30)} - WORKS! Response: ${text.substring(0, 20)}...`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`❌ ${modelName.padEnd(30)} - NOT FOUND (404)`);
      } else if (error.status === 403) {
        console.log(`⛔ ${modelName.padEnd(30)} - FORBIDDEN (403) - Check API key permissions`);
      } else if (error.status === 429) {
        console.log(`⏸️  ${modelName.padEnd(30)} - RATE LIMITED (429)`);
      } else {
        console.log(`❌ ${modelName.padEnd(30)} - ERROR: ${error.message}`);
      }
    }
  }

  console.log('\n✨ Test complete!\n');
}

testGeminiAPI().catch(console.error);

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('📋 Listing all available Gemini models...\n');

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // Try to list models using the API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`Found ${data.models?.length || 0} models:\n`);

    if (data.models) {
      for (const model of data.models) {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description || 'N/A'}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);

        // Check if it supports image generation
        const supportsImages = model.supportedGenerationMethods?.includes('generateContent') &&
                             (model.name.includes('imagen') ||
                              model.name.includes('image') ||
                              model.description?.toLowerCase().includes('image'));

        if (supportsImages) {
          console.log(`   ⭐ SUPPORTS IMAGE GENERATION`);
        }
        console.log('');
      }

      // Filter models that might support image generation
      const imageModels = data.models.filter((m: any) =>
        m.name.includes('imagen') ||
        m.name.includes('image') ||
        m.description?.toLowerCase().includes('image')
      );

      if (imageModels.length > 0) {
        console.log(`\n🎨 Models that might support images: ${imageModels.length}`);
        imageModels.forEach((m: any) => console.log(`   - ${m.name}`));
      } else {
        console.log('\n❌ No image generation models found.');
        console.log('\n💡 To enable Imagen:');
        console.log('   1. Go to Google Cloud Console');
        console.log('   2. Enable "Vertex AI Imagen API"');
        console.log('   3. Wait a few minutes for activation');
      }
    }
  } catch (error: any) {
    console.error('❌ Error listing models:', error.message);
  }
}

listModels();

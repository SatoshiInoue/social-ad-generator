import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import yaml from 'js-yaml';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface ParsedBrief {
  campaignName?: string;
  brandName?: string;
  cta?: string;
  productName?: string;
  targetRegion?: string;
  language?: string;
  audience?: string;
  message?: string;
}

export async function parseBriefFile(
  fileBuffer: Buffer,
  fileType: string
): Promise<ParsedBrief> {
  let extractedText = '';

  try {
    if (fileType === 'application/pdf') {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const uint8 = new Uint8Array(fileBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8, useSystemFonts: true });
      const doc = await loadingTask.promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.filter((item) => 'str' in item).map((item) => (item as { str: string }).str).join(' ');
      }
    } else if (
      fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;
    } else if (fileType === 'application/json') {
      const jsonData = JSON.parse(fileBuffer.toString('utf-8'));
      return jsonData as ParsedBrief;
    } else if (
      fileType === 'application/x-yaml' ||
      fileType === 'text/yaml'
    ) {
      const yamlData = yaml.load(fileBuffer.toString('utf-8'));
      return yamlData as ParsedBrief;
    } else {
      throw new Error('Unsupported file type');
    }

    // Use Gemini to structure the extracted text
    return await structureTextWithGemini(extractedText);
  } catch (error) {
    console.error('Error parsing brief file:', error);
    throw error;
  }
}

async function structureTextWithGemini(text: string): Promise<ParsedBrief> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a campaign brief parser. Extract the following information from the provided text and return it as a JSON object. If a field is not found, omit it from the response.

Expected fields:
- campaignName: The name of the advertising campaign
- brandName: The brand name
- cta: Call to action (e.g., "Shop Now", "Learn More")
- productName: Product or service being advertised
- targetRegion: Geographic target region
- language: Target language
- audience: Target audience description
- message: Core campaign message or value proposition

Text to parse:
${text}

Return ONLY a valid JSON object with the extracted fields. Do not include any other text or explanation.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse Gemini response');
  } catch (error) {
    console.error('Error structuring text with Gemini:', error);
    // Return empty object if AI parsing fails
    return {};
  }
}

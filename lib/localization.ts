import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
] as const;

interface TranslationContext {
  brandName: string;
  productName?: string;
  campaignType?: string;
  preserveTerms?: string[];
}

export async function translateAdCopy(
  text: string,
  targetLanguage: string,
  context: TranslationContext
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const preserveList = [
      context.brandName,
      ...(context.productName ? [context.productName] : []),
      ...(context.preserveTerms || []),
    ].join(', ');

    const prompt = `
Translate the following advertising copy to ${targetLanguage}.

IMPORTANT INSTRUCTIONS:
1. Preserve these terms exactly as written (do not translate): ${preserveList}
2. Maintain the advertising tone and style
3. Keep the translation concise and impactful for advertising
4. Adapt cultural references if necessary while keeping the core message
5. Return ONLY the translated text, no explanations

Original text:
${text}

Translated text:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

export async function translateMultipleTexts(
  texts: string[],
  targetLanguage: string,
  context: TranslationContext
): Promise<string[]> {
  const translations = await Promise.all(
    texts.map((text) => translateAdCopy(text, targetLanguage, context))
  );
  return translations;
}

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.name || code;
}

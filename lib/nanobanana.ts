import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export interface GenerationOptions {
  prompt: string;
  aspectRatio?: string; // '1:1', '9:16', '16:9'
  style?: string;
}

export interface ProductImageData {
  base64: string;
  mimeType: string;
}

export interface ImageGenerationResult {
  imageData: string; // base64 encoded image
  mimeType: string;
}

/**
 * Generate background image from text prompt
 */
export async function generateBackground(
  options: GenerationOptions
): Promise<ImageGenerationResult> {
  try {
    // Use Gemini 2.5 Flash Image (Nano Banana) for image generation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const aspectRatioMap: Record<string, string> = {
      '1:1': '1:1 square format',
      '9:16': '9:16 vertical format',
      '16:9': '16:9 horizontal format',
    };

    const aspectRatioDescription = aspectRatioMap[options.aspectRatio || '1:1'] || '1:1 square format';

    // Generate image using Gemini 2.5 Flash Image
    const imagePrompt = `CRITICAL: Do NOT add ANY new text, words, letters, numbers, watermarks, or typography to the image. The image must be purely visual with no added text. The image MUST fill the entire ${aspectRatioDescription} canvas edge-to-edge with no blank space, white borders, or margins.

Create a professional advertising background image.
Prompt: ${options.prompt}
Style: ${options.style || 'professional, clean, modern'}
Aspect Ratio: ${aspectRatioDescription}
Requirements: High quality, suitable for product advertising, visually appealing, on-brand. Fill the entire canvas edge-to-edge. Do NOT add any text or typography.`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: imagePrompt
        }]
      }]
    });

    const response = await result.response;
    const candidates = response.candidates;

    // Extract image data from response
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          // Found the generated image!
          return {
            imageData: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
          };
        }
      }
    }

    // If no image found in response, throw error
    throw new Error('No image data returned from Gemini');
  } catch (error) {
    console.error('Error generating background:', error);
    throw new Error('Failed to generate background image');
  }
}

/**
 * Remove background from product image using Gemini image editing
 */
export async function removeBackground(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<ImageGenerationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            text: 'Remove the background from this product image. Keep only the product itself with a transparent or white background. Maintain the original quality, details, colors, and proportions of the product. The result should be a clean product cutout suitable for advertising.'
          },
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          },
        ],
      }],
    });

    const response = await result.response;
    const candidates = response.candidates;

    // Extract the edited image from response
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          return {
            imageData: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
          };
        }
      }
    }

    throw new Error('No image data returned from background removal');
  } catch (error) {
    console.error('Error removing background:', error);
    throw new Error('Failed to remove background');
  }
}

/**
 * Generate ad with product image composited into the scene
 * Uses Gemini's multi-modal capabilities to create a unified composition
 */
export async function generateAdWithProduct(
  options: GenerationOptions & {
    productImages: ProductImageData[];
    productName?: string;
  }
): Promise<ImageGenerationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const aspectRatioMap: Record<string, string> = {
      '1:1': '1:1 square format',
      '9:16': '9:16 vertical format (Instagram story/reel)',
      '16:9': '16:9 horizontal format (banner/post)',
    };
    const aspectRatioDescription = aspectRatioMap[options.aspectRatio || '1:1'] || '1:1 square format';

    // Build multi-part content: text prompt + product image(s)
    const parts: any[] = [
      {
        text: `CRITICAL RULES - YOU MUST FOLLOW THESE:
1. Do NOT ADD any new text, words, letters, numbers, watermarks, or typography to the image. However, you MUST PRESERVE all existing text, labels, branding, and logos that are already printed on the product packaging — do not remove or alter them.
2. Do NOT distort, stretch, squash, or change the proportions of the product. The product must appear with its EXACT original aspect ratio and proportions preserved.
3. The generated image MUST fill the ENTIRE canvas edge-to-edge. No blank space, white borders, margins, or empty areas anywhere.

Create a professional advertising image featuring the provided product.

Product: ${options.productName || 'the product shown in the image'}
Scene/Background: ${options.prompt}
Style: ${options.style || 'professional, clean, modern'}
Aspect Ratio: ${aspectRatioDescription}

Requirements:
- The image MUST fill the entire ${aspectRatioDescription} canvas completely edge-to-edge with no blank space
- Place the product prominently in the composition as the visual focus
- Create an appealing background/scene that fills the ENTIRE image area behind and around the product
- The product should appear natural and well-integrated into the scene
- PRESERVE the product's exact original proportions — never stretch, squash, or distort it
- PRESERVE all existing text, labels, and branding on the product packaging exactly as they appear
- Do NOT add any new text or typography that is not part of the original product
- Professional lighting and composition suitable for social media advertising
- High quality, visually appealing result suitable for ${options.aspectRatio || '1:1'} social media posts`
      },
    ];

    // Add product images as inline data
    for (const img of options.productImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const response = await result.response;
    const candidates = response.candidates;

    // Extract generated image
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          return {
            imageData: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
          };
        }
      }
    }

    throw new Error('No image data returned from ad generation with product');
  } catch (error) {
    console.error('Error generating ad with product:', error);
    throw new Error('Failed to generate ad with product');
  }
}

/**
 * Apply style harmonization between product and background
 */
export async function harmonizeStyle(
  productImage: string,
  backgroundImage: string,
  targetStyle: string
): Promise<ImageGenerationResult> {
  try {
    // Placeholder for style harmonization
    return {
      imageData: 'mock-harmonized-image-data',
      mimeType: 'image/png',
    };
  } catch (error) {
    console.error('Error harmonizing style:', error);
    throw new Error('Failed to harmonize style');
  }
}

/**
 * Extend canvas to adapt to different aspect ratios
 */
export async function extendCanvas(
  imageData: string,
  targetAspectRatio: string
): Promise<ImageGenerationResult> {
  try {
    // Placeholder for canvas extension
    return {
      imageData: 'mock-extended-image-data',
      mimeType: 'image/png',
    };
  } catch (error) {
    console.error('Error extending canvas:', error);
    throw new Error('Failed to extend canvas');
  }
}

/**
 * Composite product onto background
 */
export async function compositeWithProduct(
  backgroundImage: string,
  productImage: string,
  position?: { x: number; y: number }
): Promise<ImageGenerationResult> {
  try {
    // Placeholder for image compositing
    return {
      imageData: 'mock-composite-image-data',
      mimeType: 'image/png',
    };
  } catch (error) {
    console.error('Error compositing images:', error);
    throw new Error('Failed to composite images');
  }
}

/**
 * Generate ad copy (headline and CTA) using AI
 */
export async function generateAdCopy(brief: {
  brandName: string;
  productName?: string;
  message?: string;
  audience?: string;
  cta?: string;
  language?: string;
}): Promise<{ headline: string; cta: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const languageInstruction = brief.language
      ? `Generate all text in ${brief.language}.`
      : 'Generate all text in English.';

    const ctaGuidance = brief.cta
      ? `Refine and improve this CTA: "${brief.cta}"`
      : 'Create a compelling call-to-action (2-4 words)';

    const promptText = `
You are an expert advertising copywriter. Generate catchy, compelling ad copy for this product:

Brand: ${brief.brandName}
Product: ${brief.productName || 'N/A'}
Message: ${brief.message || 'N/A'}
Target Audience: ${brief.audience || 'general'}

Requirements:
1. Generate a SHORT, attention-grabbing headline (maximum 6 words) that highlights the product benefit or creates urgency
2. ${ctaGuidance}
3. ${languageInstruction}
4. Make the copy punchy, memorable, and suitable for social media advertising
5. Return ONLY valid JSON in this exact format: {"headline": "Your Headline Here", "cta": "Your CTA"}

Do NOT include any explanation, just the JSON object.
`;

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text().trim();

    // Try to parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        headline: parsed.headline || 'Discover More',
        cta: parsed.cta || 'Shop Now',
      };
    }

    // Fallback if JSON parsing fails
    console.warn('Failed to parse AI copy response, using fallback');
    return {
      headline: brief.productName || brief.message || 'Discover More',
      cta: brief.cta || 'Shop Now',
    };
  } catch (error) {
    console.error('Error generating ad copy:', error);
    // Fallback
    return {
      headline: brief.productName || brief.message || 'Discover More',
      cta: brief.cta || 'Shop Now',
    };
  }
}

/**
 * Generate prompt from campaign brief
 */
export async function generatePromptFromBrief(brief: {
  brandName: string;
  productName?: string;
  message?: string;
  audience?: string;
  tone?: string;
  style?: string;
  hasProductImages?: boolean;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const productContext = brief.hasProductImages
      ? 'Note: The actual product image will be provided separately. Focus on generating a complementary background/scene rather than describing the product itself.'
      : 'The background should suggest the product context visually.';

    const promptText = `
Generate a detailed image generation prompt for an advertising ${brief.hasProductImages ? 'scene' : 'background'} based on this campaign brief:

Brand: ${brief.brandName}
Product: ${brief.productName || 'N/A'}
Message: ${brief.message || 'N/A'}
Audience: ${brief.audience || 'general'}
Tone: ${brief.tone || 'professional'}
Style: ${brief.style || 'modern'}

${productContext}

Create a concise but descriptive prompt (2-3 sentences) that would generate an appropriate advertising ${brief.hasProductImages ? 'scene that complements the product' : 'background'}. Focus on visual elements, colors, mood, and composition.
`;

    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating prompt:', error);
    // Fallback prompt
    return `Professional advertising ${brief.hasProductImages ? 'scene' : 'background'} for ${brief.brandName}, featuring ${brief.style || 'modern'} design with ${brief.tone || 'professional'} mood`;
  }
}

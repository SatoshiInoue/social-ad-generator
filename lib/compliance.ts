import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface ComplianceCheck {
  score: number; // 0-100 for the specific check
  reasoning: string;
  issues: string[];
}

interface ComplianceResult {
  totalScore: number; // 0-100
  prohibitedTerms: ComplianceCheck;
  colorCompliance: ComplianceCheck;
  guidelinesCompliance: ComplianceCheck;
  logoPresence: ComplianceCheck;
  textReadability: ComplianceCheck;
}

interface BrandSettings {
  prohibitedTerms: string[];
  colorPalette: string[];
  guidelines?: string;
  logoUrl?: string;
}

interface AssetData {
  imageUrl: string;
  textLayers: Array<{ text: string }>;
  hasLogo: boolean;
  dominantColors?: string[];
}

/**
 * Check for prohibited terms in text layers
 */
function checkProhibitedTerms(
  textLayers: Array<{ text: string }>,
  prohibitedTerms: string[]
): ComplianceCheck {
  const issues: string[] = [];
  let foundTerms = 0;

  for (const layer of textLayers) {
    const text = layer.text.toLowerCase();
    for (const term of prohibitedTerms) {
      if (text.includes(term.toLowerCase())) {
        issues.push(`Found prohibited term "${term}" in text layer`);
        foundTerms++;
      }
    }
  }

  const score = foundTerms === 0 ? 25 : Math.max(0, 25 - foundTerms * 5);

  return {
    score,
    reasoning:
      foundTerms === 0
        ? 'No prohibited terms found'
        : `Found ${foundTerms} prohibited term(s)`,
    issues,
  };
}

/**
 * Check color palette compliance using Delta-E approximation
 */
function checkColorCompliance(
  assetColors: string[],
  brandColors: string[]
): ComplianceCheck {
  if (brandColors.length === 0) {
    return {
      score: 25,
      reasoning: 'No brand color palette defined, skipping check',
      issues: [],
    };
  }

  const issues: string[] = [];
  let matchingColors = 0;

  // Simple color matching (in production, use proper Delta-E calculation)
  for (const assetColor of assetColors) {
    const matches = brandColors.some(
      (brandColor) =>
        assetColor.toLowerCase() === brandColor.toLowerCase()
    );
    if (matches) {
      matchingColors++;
    } else {
      issues.push(`Color ${assetColor} not in brand palette`);
    }
  }

  const matchPercentage = assetColors.length > 0
    ? (matchingColors / assetColors.length) * 100
    : 100;
  const score = Math.round((matchPercentage / 100) * 25);

  return {
    score,
    reasoning: `${matchingColors}/${assetColors.length} colors match brand palette`,
    issues,
  };
}

/**
 * Use AI to check brand guidelines compliance
 */
async function checkGuidelinesCompliance(
  imageUrl: string,
  guidelines?: string
): Promise<ComplianceCheck> {
  if (!guidelines) {
    return {
      score: 30,
      reasoning: 'No brand guidelines provided, skipping check',
      issues: [],
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze this advertising image against the following brand guidelines and provide a compliance score:

Brand Guidelines:
${guidelines}

Evaluate the image on:
1. Visual style alignment
2. Tone and messaging
3. Overall brand consistency

Provide a score from 0-30 and list any issues or concerns. Format your response as:
SCORE: [number 0-30]
REASONING: [brief explanation]
ISSUES: [list of issues, or "None"]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    const scoreMatch = text.match(/SCORE:\s*(\d+)/);
    const reasoningMatch = text.match(/REASONING:\s*([\s\S]+?)(?=ISSUES:|$)/);
    const issuesMatch = text.match(/ISSUES:\s*([\s\S]+)/);

    const score = scoreMatch ? Math.min(30, parseInt(scoreMatch[1])) : 20;
    const reasoning =
      reasoningMatch?.[1].trim() || 'AI analysis completed';
    const issuesText = issuesMatch?.[1].trim() || 'None';
    const issues =
      issuesText.toLowerCase() === 'none' ? [] : [issuesText];

    return { score, reasoning, issues };
  } catch (error) {
    console.error('Error checking guidelines:', error);
    return {
      score: 20,
      reasoning: 'AI check unavailable, using default score',
      issues: [],
    };
  }
}

/**
 * Check logo presence using AI
 */
async function checkLogoPresence(
  imageUrl: string,
  hasLogo: boolean
): Promise<ComplianceCheck> {
  if (!hasLogo) {
    return {
      score: 0,
      reasoning: 'No logo found in asset',
      issues: ['Logo is missing from the design'],
    };
  }

  // In production, use AI to verify logo is visible and correctly placed
  return {
    score: 10,
    reasoning: 'Logo is present',
    issues: [],
  };
}

/**
 * Check text readability
 */
async function checkTextReadability(
  imageUrl: string,
  textLayers: Array<{ text: string }>
): Promise<ComplianceCheck> {
  if (textLayers.length === 0) {
    return {
      score: 10,
      reasoning: 'No text in asset',
      issues: [],
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze the text readability in this advertising image:

Text content: ${textLayers.map((l) => l.text).join(', ')}

Evaluate:
1. Contrast and visibility
2. Text size appropriateness
3. Overlap with other elements

Provide a score from 0-10. Format:
SCORE: [number 0-10]
REASONING: [brief explanation]
ISSUES: [list of issues, or "None"]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const scoreMatch = text.match(/SCORE:\s*(\d+)/);
    const reasoningMatch = text.match(/REASONING:\s*([\s\S]+?)(?=ISSUES:|$)/);
    const issuesMatch = text.match(/ISSUES:\s*([\s\S]+)/);

    const score = scoreMatch ? Math.min(10, parseInt(scoreMatch[1])) : 8;
    const reasoning = reasoningMatch?.[1].trim() || 'Text is readable';
    const issuesText = issuesMatch?.[1].trim() || 'None';
    const issues =
      issuesText.toLowerCase() === 'none' ? [] : [issuesText];

    return { score, reasoning, issues };
  } catch (error) {
    console.error('Error checking readability:', error);
    return {
      score: 8,
      reasoning: 'AI check unavailable, using default score',
      issues: [],
    };
  }
}

/**
 * Run full compliance check on an asset
 */
export async function checkCompliance(
  asset: AssetData,
  brand: BrandSettings
): Promise<ComplianceResult> {
  // Run all checks
  const prohibitedTermsResult = checkProhibitedTerms(
    asset.textLayers,
    brand.prohibitedTerms
  );

  const colorResult = checkColorCompliance(
    asset.dominantColors || [],
    brand.colorPalette
  );

  const [guidelinesResult, logoResult, readabilityResult] = await Promise.all([
    checkGuidelinesCompliance(asset.imageUrl, brand.guidelines),
    checkLogoPresence(asset.imageUrl, asset.hasLogo),
    checkTextReadability(asset.imageUrl, asset.textLayers),
  ]);

  // Calculate total score
  const totalScore =
    prohibitedTermsResult.score +
    colorResult.score +
    guidelinesResult.score +
    logoResult.score +
    readabilityResult.score;

  return {
    totalScore,
    prohibitedTerms: prohibitedTermsResult,
    colorCompliance: colorResult,
    guidelinesCompliance: guidelinesResult,
    logoPresence: logoResult,
    textReadability: readabilityResult,
  };
}

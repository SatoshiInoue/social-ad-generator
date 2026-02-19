/**
 * Canvas state generation for Fabric.js
 * Creates initial canvas states with background, text layers, and logos
 */

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adjust a color for contrast against the background brightness.
 * Keeps the same hue but makes it darker (on light bg) or lighter (on dark bg).
 */
function adjustColorForContrast(hexColor: string, backgroundIsLight: boolean): string {
  const hsl = hexToHSL(hexColor);

  if (backgroundIsLight) {
    // Dark version: clamp lightness to max 20%
    hsl.l = Math.min(hsl.l, 20);
  } else {
    // Light version: clamp lightness to min 85%
    hsl.l = Math.max(hsl.l, 85);
  }

  return hslToHex(hsl.h, hsl.s, hsl.l);
}

export interface CanvasLayer {
  type: string;
  version?: string;
  originX?: string;
  originY?: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string | null;
  strokeWidth?: number;
  strokeDashArray?: null;
  strokeLineCap?: string;
  strokeDashOffset?: number;
  strokeLineJoin?: string;
  strokeUniform?: boolean;
  strokeMiterLimit?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  shadow?: null;
  visible?: boolean;
  backgroundColor?: string;
  fillRule?: string;
  paintFirst?: string;
  globalCompositeOperation?: string;
  skewX?: number;
  skewY?: number;
  src?: string;
  crossOrigin?: string | null;
  filters?: any[];
  text?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: string;
  lineHeight?: number;
  textAlign?: string;
  underline?: boolean;
  overline?: boolean;
  linethrough?: boolean;
  textBackgroundColor?: string;
  charSpacing?: number;
  splitByGrapheme?: boolean;
  locked?: boolean;
  selectable?: boolean;
  evented?: boolean;
  name?: string;
  layerType?: string;
}

export interface FabricCanvasState {
  version: string;
  objects: CanvasLayer[];
  [key: string]: unknown;
}

export interface CanvasStateOptions {
  aspectRatio: string;
  backgroundImageUrl: string;
  brandLogoUrl?: string;
  headline: string;
  cta: string;
  brandColors?: string[];
  language?: string;
  backgroundBrightness?: { headlineLight: boolean; ctaLight: boolean };
}

/**
 * Get canvas dimensions based on aspect ratio
 */
function getDimensions(aspectRatio: string): { width: number; height: number } {
  const dimensionMap: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
  };

  return dimensionMap[aspectRatio] || { width: 1080, height: 1080 };
}

/**
 * Generate initial canvas state with background, text, and logo layers
 */
export function generateInitialCanvasState(
  options: CanvasStateOptions
): FabricCanvasState {
  const { width, height } = getDimensions(options.aspectRatio);
  const objects: CanvasLayer[] = [];

  // Primary brand color (fallback to dark gray if no brand colors)
  const rawPrimaryColor = options.brandColors?.[0] || '#1a1a1a';
  const rawAccentColor = options.brandColors?.[1] || '#ffffff';

  // Adjust colors for contrast against background if brightness info available
  const bb = options.backgroundBrightness;
  const headlineColor = bb
    ? adjustColorForContrast(rawAccentColor, bb.headlineLight)
    : rawAccentColor;
  const ctaTextColor = bb
    ? adjustColorForContrast(rawPrimaryColor, bb.ctaLight)
    : rawPrimaryColor;
  const ctaBgColor = bb
    ? adjustColorForContrast(rawAccentColor, !bb.ctaLight)
    : rawAccentColor;

  // Choose font family based on language
  const isJapanese = options.language?.toLowerCase() === 'japanese' || options.language?.toLowerCase() === 'ja';
  const fontFamily = isJapanese ? 'Noto Sans JP, Arial, sans-serif' : 'Arial, sans-serif';

  // Layer 1: Background image (locked, not selectable)
  objects.push({
    type: 'image',
    version: '6.0.0',
    originX: 'left',
    originY: 'top',
    left: 0,
    top: 0,
    width: width,
    height: height,
    fill: 'rgb(0,0,0)',
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeDashOffset: 0,
    strokeLineJoin: 'miter',
    strokeUniform: false,
    strokeMiterLimit: 4,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    shadow: null,
    visible: true,
    backgroundColor: '',
    fillRule: 'nonzero',
    paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0,
    skewY: 0,
    src: options.backgroundImageUrl,
    crossOrigin: 'anonymous',
    filters: [],
    locked: true,
    selectable: false,
    evented: false,
    name: 'Background',
    layerType: 'background',
  });

  // Calculate text positions based on aspect ratio
  const isVertical = options.aspectRatio === '9:16';
  const isHorizontal = options.aspectRatio === '16:9';

  // Layer 2: Headline text (top third of canvas)
  const headlineFontSize = isVertical ? 72 : isHorizontal ? 96 : 80;
  const headlineTop = height * 0.15;
  const headlineLeft = width * 0.5;

  objects.push({
    type: 'textbox',
    version: '6.0.0',
    originX: 'center',
    originY: 'top',
    left: headlineLeft,
    top: headlineTop,
    width: width * 0.85,
    fill: headlineColor,
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeDashOffset: 0,
    strokeLineJoin: 'miter',
    strokeUniform: false,
    strokeMiterLimit: 4,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    shadow: null,
    visible: true,
    backgroundColor: '',
    fillRule: 'nonzero',
    paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0,
    skewY: 0,
    lockScalingX: true,
    lockScalingY: true,
    text: options.headline,
    fontSize: headlineFontSize,
    fontWeight: 700,
    fontFamily: fontFamily,
    fontStyle: 'normal',
    lineHeight: 1.16,
    textAlign: 'center',
    underline: false,
    overline: false,
    linethrough: false,
    textBackgroundColor: '',
    charSpacing: 0,
    splitByGrapheme: false,
    selectable: true,
    evented: true,
    name: 'Headline',
    layerType: 'text',
  });

  // Layer 3: CTA text (bottom of canvas)
  const ctaFontSize = isVertical ? 48 : isHorizontal ? 56 : 52;
  const ctaTop = height * 0.82;
  const ctaLeft = width * 0.5;

  objects.push({
    type: 'textbox',
    version: '6.0.0',
    originX: 'center',
    originY: 'top',
    left: ctaLeft,
    top: ctaTop,
    width: width * 0.6,
    fill: ctaTextColor,
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    strokeLineCap: 'butt',
    strokeDashOffset: 0,
    strokeLineJoin: 'miter',
    strokeUniform: false,
    strokeMiterLimit: 4,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    shadow: null,
    visible: true,
    backgroundColor: ctaBgColor,
    fillRule: 'nonzero',
    paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0,
    skewY: 0,
    lockScalingX: true,
    lockScalingY: true,
    text: options.cta,
    fontSize: ctaFontSize,
    fontWeight: 700,
    fontFamily: fontFamily,
    fontStyle: 'normal',
    lineHeight: 1.16,
    textAlign: 'center',
    underline: false,
    overline: false,
    linethrough: false,
    textBackgroundColor: '',
    charSpacing: 0,
    splitByGrapheme: false,
    selectable: true,
    evented: true,
    name: 'CTA',
    layerType: 'text',
  });

  // Layer 4: Logo (optional, bottom right corner)
  if (options.brandLogoUrl) {
    const logoSize = isVertical ? 120 : isHorizontal ? 150 : 140;
    const logoLeft = width - logoSize - 40;
    const logoTop = height - logoSize - 40;

    objects.push({
      type: 'image',
      version: '6.0.0',
      originX: 'left',
      originY: 'top',
      left: logoLeft,
      top: logoTop,
      width: logoSize,
      height: logoSize,
      fill: 'rgb(0,0,0)',
      stroke: null,
      strokeWidth: 0,
      strokeDashArray: null,
      strokeLineCap: 'butt',
      strokeDashOffset: 0,
      strokeLineJoin: 'miter',
      strokeUniform: false,
      strokeMiterLimit: 4,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 0.9,
      shadow: null,
      visible: true,
      backgroundColor: '',
      fillRule: 'nonzero',
      paintFirst: 'fill',
      globalCompositeOperation: 'source-over',
      skewX: 0,
      skewY: 0,
      src: options.brandLogoUrl,
      crossOrigin: 'anonymous',
      filters: [],
      selectable: true,
      evented: true,
      name: 'Logo',
      layerType: 'logo',
    });
  }

  return {
    version: '6.0.0',
    objects,
  };
}

/**
 * Generate headline text from campaign data
 */
export function generateHeadlineText(
  productName?: string,
  campaignName?: string,
  message?: string
): string {
  if (message && message.length <= 60) {
    return message;
  }
  if (productName) {
    return productName;
  }
  if (campaignName) {
    return campaignName;
  }
  return 'Discover More';
}

/**
 * Generate CTA text from brief
 */
export function generateCTAText(cta?: string): string {
  if (cta) {
    return cta;
  }
  return 'Shop Now';
}

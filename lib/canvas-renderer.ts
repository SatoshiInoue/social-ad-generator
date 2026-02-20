/**
 * Server-side canvas rendering using @napi-rs/canvas
 * Renders Fabric.js canvas states into final images with text and logos
 */

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { FabricCanvasState } from './canvas-state';
import path from 'path';

// Register CJK fonts
try {
  const jpFontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Bold.ttf');
  GlobalFonts.registerFromPath(jpFontPath, 'Noto Sans JP');
} catch (error) {
  console.error('Failed to register Japanese font:', error);
}

try {
  const scFontPath = path.join(process.cwd(), 'fonts', 'NotoSansSC-Bold.ttf');
  GlobalFonts.registerFromPath(scFontPath, 'Noto Sans SC');
} catch (error) {
  console.error('Failed to register Chinese font:', error);
}

try {
  const krFontPath = path.join(process.cwd(), 'fonts', 'NotoSansKR-Bold.otf');
  GlobalFonts.registerFromPath(krFontPath, 'Noto Sans KR');
} catch (error) {
  console.error('Failed to register Korean font:', error);
}

/**
 * Render a Fabric.js canvas state to a PNG image buffer
 */
export async function renderCanvasState(
  canvasState: FabricCanvasState,
  dimensions: { width: number; height: number }
): Promise<Buffer> {
  const { width, height } = dimensions;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Set white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Process each layer in order
  for (const layer of canvasState.objects) {
    ctx.save();

    // Apply transformations
    const left = layer.left || 0;
    const top = layer.top || 0;
    const scaleX = layer.scaleX || 1;
    const scaleY = layer.scaleY || 1;
    const angle = layer.angle || 0;
    const opacity = layer.opacity !== undefined ? layer.opacity : 1;

    // Set global opacity
    ctx.globalAlpha = opacity;

    const layerType = (layer.type || '').toLowerCase();

    if (layerType === 'image' && layer.src) {
      try {
        // Resolve proxy URLs to direct S3 URLs for server-side loading
        let imageSrc = layer.src;
        if (imageSrc.includes('/api/proxy-image?url=')) {
          try {
            const proxyUrl = new URL(imageSrc, 'http://localhost');
            const realUrl = proxyUrl.searchParams.get('url');
            if (realUrl) imageSrc = realUrl;
          } catch {
            // Keep original src if URL parsing fails
          }
        }

        // Load and draw image
        const image = await loadImage(imageSrc);
        const imgWidth = (layer.width || image.width) * scaleX;
        const imgHeight = (layer.height || image.height) * scaleY;

        // Apply rotation if needed
        if (angle !== 0) {
          ctx.translate(left + imgWidth / 2, top + imgHeight / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        } else {
          ctx.drawImage(image, left, top, imgWidth, imgHeight);
        }
      } catch (error) {
        console.error('Error loading image:', layer.src, error);
        // Continue rendering other layers even if one image fails
      }
    } else if (layerType === 'textbox' && layer.text) {
      // Set text properties
      const fontSize = (layer.fontSize || 16) * scaleX;
      const fontWeight = layer.fontWeight || 'normal';
      let fontFamily = layer.fontFamily || 'Arial, sans-serif';
      const textAlign = layer.textAlign || 'left';
      const lineHeight = layer.lineHeight || 1.16;

      // Detect if text contains CJK/Korean characters and ensure an appropriate font is used
      const hasKorean = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(layer.text);
      const hasCJK = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(layer.text);
      if ((hasCJK || hasKorean) && !fontFamily.includes('Noto Sans')) {
        const cjkFont = hasKorean ? 'Noto Sans KR' : 'Noto Sans JP';
        fontFamily = cjkFont + ', ' + fontFamily;
      }

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      // Text alignment
      if (textAlign === 'center') {
        ctx.textAlign = 'center';
      } else if (textAlign === 'right') {
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'left';
      }

      // Background color for text (check both backgroundColor and textBackgroundColor)
      const bgColor = layer.backgroundColor || layer.textBackgroundColor;
      if (bgColor && bgColor !== '') {
        const textWidth = layer.width || ctx.measureText(layer.text).width;
        const textHeight = fontSize * lineHeight;
        ctx.fillStyle = bgColor;

        // Adjust position based on alignment
        let bgX = left;
        if (textAlign === 'center' && layer.originX === 'center') {
          bgX = left - textWidth / 2;
        }

        // Add padding
        const padding = 20;
        ctx.fillRect(
          bgX - padding,
          top - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );
      }

      // Text fill color
      ctx.fillStyle = layer.fill || '#000000';

      // Word wrapping for textbox
      const maxWidth = layer.width || width;
      const words = layer.text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      // Draw each line
      const lineHeightPx = fontSize * lineHeight;
      let textX = left;
      let textY = top;

      // Adjust x position based on origin
      if (layer.originX === 'center') {
        // Text is already centered via ctx.textAlign
        textX = left;
      }

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textX, textY + i * lineHeightPx);
      }
    }

    ctx.restore();
  }

  // Return PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Get canvas dimensions from aspect ratio
 */
export function getDimensionsFromAspectRatio(
  aspectRatio: string
): { width: number; height: number } {
  const dimensionMap: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
  };

  return dimensionMap[aspectRatio] || { width: 1080, height: 1080 };
}

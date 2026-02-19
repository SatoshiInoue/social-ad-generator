/**
 * PSD export library using ag-psd
 * Converts Fabric.js canvas states to Photoshop PSD files
 */

import { writePsdBuffer, Layer as PsdLayer } from 'ag-psd';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { FabricCanvasState } from './canvas-state';

interface ExportToPsdOptions {
  canvasState: FabricCanvasState;
  width: number;
  height: number;
}

/**
 * Export Fabric.js canvas state to PSD buffer
 */
export async function exportToPsd(options: ExportToPsdOptions): Promise<Buffer> {
  const { canvasState, width, height } = options;

  // Create PSD layers from Fabric.js objects
  const psdLayers: PsdLayer[] = [];

  for (const obj of canvasState.objects) {
    try {
      if (obj.type === 'image' && obj.src) {
        const layer = await createImageLayer(obj);
        if (layer) psdLayers.push(layer);
      } else if (obj.type === 'textbox' && obj.text) {
        const layer = await createTextLayer(obj);
        if (layer) psdLayers.push(layer);
      } else if (obj.type === 'rect' || obj.type === 'circle') {
        const layer = await createShapeLayer(obj);
        if (layer) psdLayers.push(layer);
      }
    } catch (error) {
      console.error(`Error creating layer "${obj.name}":`, error);
    }
  }

  // Create PSD document
  const psd = {
    width,
    height,
    children: psdLayers,
  };

  // Generate PSD buffer
  const buffer = writePsdBuffer(psd, { generateThumbnail: true });
  return Buffer.from(buffer);
}

/**
 * Create PSD image layer from Fabric.js image object
 */
async function createImageLayer(obj: any): Promise<PsdLayer | null> {
  try {
    const response = await fetch(obj.src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Calculate final dimensions with scaling
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 100;
    const imgHeight = metadata.height || 100;
    const finalWidth = Math.round(imgWidth * scaleX);
    const finalHeight = Math.round(imgHeight * scaleY);

    // Resize and convert to raw RGBA
    const { data, info } = await sharp(imageBuffer)
      .resize(finalWidth, finalHeight)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create canvas for the layer
    const canvas = createCanvas(info.width, info.height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(info.width, info.height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);

    return {
      name: obj.name || 'Image Layer',
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      opacity: Math.round((obj.opacity ?? 1) * 255),
      canvas: canvas as any,
    };
  } catch (error) {
    console.error('Error processing image layer:', error);
    return null;
  }
}

/**
 * Create PSD text layer rendered as an image (rasterized)
 * This is more reliable than using ag-psd's text layer format.
 */
async function createTextLayer(obj: any): Promise<PsdLayer | null> {
  try {
    const fontSize = obj.fontSize || 16;
    const fontFamily = obj.fontFamily || 'Arial';
    const fontWeight = obj.fontWeight || 'normal';
    const fontStyle = obj.fontStyle || 'normal';
    const fill = obj.fill || '#000000';
    const text = obj.text || '';
    const textAlign = (obj.textAlign || 'left') as CanvasTextAlign;
    const lineHeight = obj.lineHeight || 1.16;
    const layerWidth = Math.round((obj.width || 200) * (obj.scaleX || 1));
    const lineHeightPx = Math.round(fontSize * lineHeight);

    // Measure text to figure out required height
    const measureCanvas = createCanvas(layerWidth, 10);
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const wrappedLines = wrapText(measureCtx, text, layerWidth - 10);
    const layerHeight = Math.max(lineHeightPx, wrappedLines.length * lineHeightPx + 20);

    // Create canvas for text rendering
    const canvas = createCanvas(layerWidth, layerHeight);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, layerWidth, layerHeight);

    // Text background
    if (obj.textBackgroundColor && obj.textBackgroundColor !== '') {
      ctx.fillStyle = obj.textBackgroundColor;
      ctx.fillRect(0, 0, layerWidth, layerHeight);
    }

    // Set text properties
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fill;
    ctx.textBaseline = 'top';
    ctx.textAlign = textAlign;

    // Draw each wrapped line
    let y = 5;
    for (const line of wrappedLines) {
      let x = 5;
      if (textAlign === 'center') x = layerWidth / 2;
      else if (textAlign === 'right') x = layerWidth - 5;

      ctx.fillText(line, x, y);
      y += lineHeightPx;
    }

    // Calculate position - handle originX/originY
    let left = Math.round(obj.left || 0);
    let top = Math.round(obj.top || 0);
    if (obj.originX === 'center') left -= Math.round(layerWidth / 2);
    if (obj.originY === 'center') top -= Math.round(layerHeight / 2);

    return {
      name: obj.name || 'Text Layer',
      left,
      top,
      opacity: Math.round((obj.opacity ?? 1) * 255),
      canvas: canvas as any,
    };
  } catch (error) {
    console.error('Error creating text layer:', error);
    return null;
  }
}

/**
 * Create PSD shape layer (rectangle or circle)
 */
async function createShapeLayer(obj: any): Promise<PsdLayer | null> {
  try {
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;
    const w = Math.round((obj.width || 100) * scaleX);
    const h = Math.round((obj.height || 100) * scaleY);

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = obj.fill || '#3b82f6';

    if (obj.type === 'circle') {
      const r = Math.round((obj.radius || 50) * Math.max(scaleX, scaleY));
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, w, h);
    }

    return {
      name: obj.name || 'Shape Layer',
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      opacity: Math.round((obj.opacity ?? 1) * 255),
      canvas: canvas as any,
    };
  } catch (error) {
    console.error('Error creating shape layer:', error);
    return null;
  }
}

/**
 * Word-wrap text to fit within maxWidth
 */
function wrapText(
  ctx: any,
  text: string,
  maxWidth: number
): string[] {
  const result: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        result.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) result.push(currentLine);
  }
  return result;
}

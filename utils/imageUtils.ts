import { PixelCrop } from '../types';

export const TO_RADIANS = Math.PI / 180;

export async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
  scale = 1,
  rotate = 0,
) {
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  // devicePixelRatio slightly increases sharpness on retina devices
  // at the expense of slightly slower render times and larger image sizes.
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = rotate * TO_RADIANS;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();

  // Move the crop origin to the canvas origin (0,0)
  ctx.translate(-cropX, -cropY);
  // Move the origin to the center of the original position
  ctx.translate(centerX, centerY);
  // Rotate around the center
  ctx.rotate(rotateRads);
  // Scale the image
  ctx.scale(scale, scale);
  // Move the center of the image back to the origin (0,0)
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  ctx.restore();
}

export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// Helper to center a crop
function centerCrop(crop: any, mediaWidth: number, mediaHeight: number) {
  return {
    ...crop,
    x: (mediaWidth - crop.width) / 2,
    y: (mediaHeight - crop.height) / 2,
  };
}

// Helper to make an aspect ratio crop
function makeAspectCrop(crop: any, aspect: number, mediaWidth: number, mediaHeight: number) {
  // Simple implementation for default crop creation
  let { width, height } = crop;
  if (crop.unit === '%') {
    width = (mediaWidth * width) / 100;
    height = width / aspect;
  } else {
    height = width / aspect;
  }
  
  return {
    unit: 'px',
    width,
    height,
    x: 0,
    y: 0,
    ...crop // Override with original if needed, but usually we calculate x/y later
  };
}

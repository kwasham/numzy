/**
 * Image compression utility for receipt photos
 * Compresses images to fit within Convex 1MB limit while maintaining quality for OCR
 */

export interface CompressionOptions {
  maxSizeBytes: number;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp';
  onProgress?: (status: string, progress: number) => void;
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeBytes: 900 * 1024, // 900KB to stay safely under 1MB
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Compresses an image file to meet size and dimension requirements
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small enough, return as-is
    if (file.size <= options.maxSizeBytes) {
      options.onProgress?.('File already optimized', 100);
      resolve(file);
      return;
    }

    options.onProgress?.('Loading image...', 10);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        options.onProgress?.('Analyzing image...', 20);
        
        // Calculate new dimensions maintaining aspect ratio
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth,
          options.maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        options.onProgress?.('Resizing image...', 40);

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        options.onProgress?.('Applying compression...', 60);

        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);

        options.onProgress?.('Optimizing file size...', 80);

        // Try different quality levels to meet size requirement
        compressToSize(canvas, options, file.name).then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if image is larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = Math.min(width, maxWidth);
      height = width / aspectRatio;
    } else {
      height = Math.min(height, maxHeight);
      width = height * aspectRatio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Iteratively compress image to meet size requirements
 */
async function compressToSize(
  canvas: HTMLCanvasElement,
  options: CompressionOptions,
  originalFileName: string
): Promise<File> {
  let quality = options.quality;
  const minQuality = 0.1;
  const qualityStep = 0.1;
  let attempt = 0;
  const maxAttempts = Math.ceil((options.quality - minQuality) / qualityStep);

  while (quality >= minQuality) {
    attempt++;
    const progress = 80 + (attempt / maxAttempts) * 15; // Progress from 80% to 95%
    options.onProgress?.(`Optimizing quality (${Math.round(quality * 100)}%)...`, progress);

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, `image/${options.format}`, quality);
    });

    if (!blob) {
      throw new Error('Failed to create blob from canvas');
    }

    // If blob meets size requirement, convert to File and return
    if (blob.size <= options.maxSizeBytes) {
      options.onProgress?.('Finalizing compressed image...', 98);
      const fileName = generateCompressedFileName(
        originalFileName,
        options.format
      );
      const file = new File([blob], fileName, {
        type: `image/${options.format}`,
        lastModified: Date.now(),
      });
      options.onProgress?.('Compression complete!', 100);
      return file;
    }

    // Reduce quality and try again
    quality -= qualityStep;
  }

  // If we can't meet size requirements even at minimum quality,
  // try reducing dimensions further
  options.onProgress?.('Reducing image dimensions...', 85);
  const newWidth = Math.round(canvas.width * 0.8);
  const newHeight = Math.round(canvas.height * 0.8);

  const smallerCanvas = document.createElement('canvas');
  const smallerCtx = smallerCanvas.getContext('2d');

  if (!smallerCtx) {
    throw new Error('Failed to create smaller canvas context');
  }

  smallerCanvas.width = newWidth;
  smallerCanvas.height = newHeight;
  smallerCtx.imageSmoothingEnabled = true;
  smallerCtx.imageSmoothingQuality = 'high';
  smallerCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

  // Try again with smaller dimensions
  return compressToSize(
    smallerCanvas,
    { ...options, quality: 0.8 },
    originalFileName
  );
}

/**
 * Generate appropriate filename for compressed image
 */
function generateCompressedFileName(
  originalName: string,
  format: string
): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExt}_compressed.${format}`;
}

/**
 * Validate if file is an image that can be compressed
 */
export function isCompressibleImage(file: File): boolean {
  const compressibleTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  return (
    compressibleTypes.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  );
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

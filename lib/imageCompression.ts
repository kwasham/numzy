/**
 * Image Compression Utility for Convex File Storage
 * 
 * This utility compresses images to fit within Convex's 1MB storage limit
 * while maintaining quality suitable for OCR processing.
 */

export interface CompressionOptions {
  maxSizeBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  quality: number;
  dimensions: {
    width: number;
    height: number;
  };
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeBytes: 1024 * 1024, // 1MB - Convex limit
  initialQuality: 0.9,
  minQuality: 0.3,
  maxWidth: 2048,
  maxHeight: 2048,
  onProgress: () => {},
};

// Export as DEFAULT_COMPRESSION_OPTIONS for external use
export const DEFAULT_COMPRESSION_OPTIONS = DEFAULT_OPTIONS;

/**
 * Gets image dimensions without loading the full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimensions'));
    };

    img.src = url;
  });
}

/**
 * Loads an image file and returns an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculates optimal dimensions while maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if too large
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Compresses an image file to fit within size constraints
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // If file is already within limits, return as-is
  if (originalSize <= opts.maxSizeBytes) {
    return file;
  }

  opts.onProgress?.(10);

  // Load image and get dimensions
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const img = await loadImage(file);
  opts.onProgress?.(30);

  // Calculate optimal dimensions
  const { width, height } = calculateOptimalDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  );

  canvas.width = width;
  canvas.height = height;

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  opts.onProgress?.(50);

  // Compress with quality reduction until size target is met
  let quality = opts.initialQuality;
  let compressedFile: File;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        quality
      );
    });

    compressedFile = new File([blob], file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    opts.onProgress?.((50 + (attempts / maxAttempts) * 40));

    if (compressedFile.size <= opts.maxSizeBytes || quality <= opts.minQuality) {
      break;
    }

    // Reduce quality for next attempt
    quality = Math.max(quality * 0.8, opts.minQuality);
    attempts++;
  } while (attempts < maxAttempts);

  opts.onProgress?.(100);

  return compressedFile;
}

/**
 * Estimates the compressed file size based on dimensions and quality
 */
export function estimateCompressedSize(
  width: number,
  height: number,
  quality: number
): number {
  // Rough estimation based on JPEG compression characteristics
  const pixels = width * height;
  const bytesPerPixel = quality * 3; // RGB channels
  const compressionFactor = 0.1 + (quality * 0.4); // JPEG compression efficiency
  
  return Math.round(pixels * bytesPerPixel * compressionFactor);
}

/**
 * Validates if a file is a supported image format
 */
export function isValidImageFile(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Creates a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a preview URL to free memory
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if a file is a compressible image type
 */
export function isCompressibleImage(file: File): boolean {
  const compressibleTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ];
  
  return compressibleTypes.includes(file.type.toLowerCase());
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Check if a file is an image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Converts a File to ArrayBuffer for Convex storage
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to ArrayBuffer'));
      }
    };
    
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

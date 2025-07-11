'use client';

import React, { useRef } from 'react';
import uploadPDF from '../actions/uploadPDF';
import { useCallback, useState } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSchematicEntitlement } from '@schematichq/schematic-react';
import { Button } from './ui/button';
import {
  AlertCircle,
  CheckCircle,
  CloudUpload,
  ArrowDownCircle,
} from 'lucide-react';
import {
  compressImage,
  isCompressibleImage,
  formatFileSize,
  DEFAULT_COMPRESSION_OPTIONS,
} from '@/lib/imageCompression';

function PDFDropzone() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useUser();
  const {
    value: isFeatureEnabled,
    featureUsageExceeded,
    featureAllocation,
  } = useSchematicEntitlement('scans');

  const sensors = useSensors(useSensor(PointerSensor));

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!user) {
        alert('Please sign in to upload files');
        return;
      }

      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(
        file =>
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf') ||
          isCompressibleImage(file)
      );

      if (validFiles.length === 0) {
        alert('Please upload only PDF files or images (JPG, PNG, HEIC, WebP).');
        return;
      }

      setIsUploading(true);
      setCompressionStatus('');
      setCompressionProgress(0);

      try {
        // Upload files
        const newUploadedFiles: string[] = [];

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          let fileToUpload = file;

          // Compress images if needed
          if (isCompressibleImage(file)) {
            const originalSize = formatFileSize(file.size);
            setCompressionStatus(
              `Compressing image: ${file.name} (${originalSize})...`
            );
            setCompressionProgress(0);

            try {
              fileToUpload = await compressImage(file, {
                ...DEFAULT_COMPRESSION_OPTIONS,
                onProgress: (progress: number) => {
                  setCompressionStatus(`Compressing...`);
                  setCompressionProgress(progress);
                },
              });
              const compressedSize = formatFileSize(fileToUpload.size);
              setCompressionStatus(
                `✓ Image compressed from ${originalSize} to ${compressedSize}`
              );
              setCompressionProgress(100);

              // Show compression results for 1.5 seconds
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (compressionError) {
              console.error('Compression failed:', compressionError);
              alert(
                `Failed to compress ${file.name}. Please try a smaller image.`
              );
              continue;
            }
          }

          // Create a FormData object to use with the server action
          const formData = new FormData();
          formData.append('file', fileToUpload);

          setCompressionStatus(`Processing with AI: ${fileToUpload.name}...`);
          setCompressionProgress(10);

          // Simulate AI processing progress
          const processingInterval = setInterval(() => {
            setCompressionProgress(prev => {
              if (prev < 90) return prev + 10;
              return prev;
            });
          }, 400); // Slower progress to simulate AI processing

          try {
            // Call the server action to handle the upload
            const result = await uploadPDF(formData);

            if (!result.success) {
              throw new Error(result.error);
            }

            setCompressionStatus(
              `✓ Receipt processed successfully: ${fileToUpload.name}`
            );
            setCompressionProgress(100);
            newUploadedFiles.push(fileToUpload.name);

            // Show completion status for 2 seconds before processing next file
            if (i < validFiles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } finally {
            clearInterval(processingInterval);
          }
        }
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

        // Show final completion status for 3 seconds before clearing
        setCompressionStatus(`✅ All receipts processed successfully!`);
        setCompressionProgress(100);

        setTimeout(() => {
          setUploadedFiles([]);
          setCompressionStatus('');
          setCompressionProgress(0);
        }, 3000);

        router.push('/receipts');
      } catch (error) {
        console.error('Upload failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Show more user-friendly error messages
        let userMessage = errorMessage;
        if (errorMessage.includes('1MB limit')) {
          userMessage = 'File too large. Please use files smaller than 1MB.';
        } else if (errorMessage.includes('API request failed')) {
          userMessage =
            'Receipt processing service is unavailable. Please try again later.';
        } else if (errorMessage.includes('Not Authorized')) {
          userMessage = 'Please sign in to upload receipts.';
        } else if (errorMessage.includes('file type')) {
          userMessage =
            'Please upload only PDF files or images (JPG, PNG, HEIC, WebP).';
        }

        alert(`Upload failed: ${userMessage}`);
      } finally {
        setIsUploading(false);
        setCompressionStatus('');
        setCompressionProgress(0);
      }
    },
    [user, router]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);

      if (!user) {
        alert('Please sign in to upload files');
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [user, handleUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleUpload(e.target.files);
      }
    },
    [handleUpload]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isUserSignedIn = !!user;
  const canUpload = isUserSignedIn && isFeatureEnabled;

  return (
    <DndContext sensors={sensors}>
      <div className="w-full max-w-md mx-auto">
        <div
          onDragOver={canUpload ? handleDragOver : undefined}
          onDragLeave={canUpload ? handleDragLeave : undefined}
          onDrop={canUpload ? handleDrop : e => e.preventDefault()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} ${!canUpload ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
              <p className="mb-2">
                {compressionStatus.includes('Compressing')
                  ? 'Compressing Image...'
                  : compressionStatus.includes('Processing with AI')
                    ? 'Processing Receipt with AI...'
                    : 'Processing...'}
              </p>
              {compressionStatus && (
                <div className="w-full max-w-md">
                  <div className="flex items-center text-sm text-blue-600 mb-2">
                    <ArrowDownCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{compressionStatus}</span>
                  </div>
                  {compressionProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${compressionProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !isUserSignedIn ? (
            <>
              <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Please sign in to upload files
              </p>
            </>
          ) : (
            <>
              <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop receipts here, or click to select files
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Supports PDF files and photos (JPG, PNG, HEIC). Large images
                will be automatically compressed.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf,.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isFeatureEnabled}
                onClick={triggerFileInput}
              >
                {isFeatureEnabled ? 'Select files' : 'Upgrade to upload files'}
              </Button>
            </>
          )}
        </div>

        <div className="mt-4">
          {featureUsageExceeded && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0">
                <span>
                  You have exceeded your limit of {featureAllocation} scans.
                  Please upgrade to continue.
                </span>
              </AlertCircle>
            </div>
          )}
        </div>
        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium">Uploaded Files</h3>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              {uploadedFiles.map((fileName, i) => (
                <li key={i} className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  {fileName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default PDFDropzone;

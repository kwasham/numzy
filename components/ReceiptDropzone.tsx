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
  Image,
  FileText,
} from 'lucide-react';
import {
  compressImage,
  isValidImageFile,
  isPDF,
  isCompressibleImage,
  formatFileSize,
  CompressionResult,
} from '@/lib/imageCompression';

function ReceiptDropzone() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<{
    [key: string]: { isCompressing: boolean; result?: CompressionResult };
  }>({});
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
      const validFiles = fileArray.filter(file => {
        return isValidImageFile(file) || isPDF(file);
      });

      if (validFiles.length === 0) {
        alert(
          'Please upload valid receipt files (images: JPG, PNG, WEBP, HEIC or PDF documents).'
        );
        return;
      }

      if (validFiles.length !== fileArray.length) {
        const invalidCount = fileArray.length - validFiles.length;
        alert(
          `${invalidCount} file(s) were skipped. Only image files and PDFs are supported.`
        );
      }

      setIsUploading(true);

      try {
        // Upload files with compression
        const newUploadedFiles: string[] = [];

        for (const file of validFiles) {
          let fileToUpload = file;

          // Compress image files if they're too large
          if (isCompressibleImage(file) && file.size > 1024 * 1024) {
            setCompressionStatus(prev => ({
              ...prev,
              [file.name]: { isCompressing: true },
            }));

            try {
              const originalSize = file.size;
              const compressedFile = await compressImage(file, {
                maxSizeBytes: 1024 * 1024, // 1MB limit
                onProgress: progress => {
                  // Could add progress indicator here
                  console.log(
                    `Compressing ${file.name}: ${Math.round(progress * 100)}%`
                  );
                },
              });

              fileToUpload = compressedFile;
              const compressionRatio =
                (originalSize - compressedFile.size) / originalSize;

              setCompressionStatus(prev => ({
                ...prev,
                [file.name]: {
                  isCompressing: false,
                  result: {
                    file: compressedFile,
                    originalSize,
                    compressedSize: compressedFile.size,
                    compressionRatio,
                    quality: 0.8, // estimate
                    dimensions: { width: 0, height: 0 }, // we'll skip dimensions for now
                  },
                },
              }));

              console.log(
                `Compressed ${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)} (${Math.round(compressionRatio * 100)}% reduction)`
              );
            } catch (error) {
              console.error(`Failed to compress ${file.name}:`, error);
              setCompressionStatus(prev => ({
                ...prev,
                [file.name]: { isCompressing: false },
              }));
              // Continue with original file if compression fails
            }
          }

          // Create a FormData object to use with the server action
          const formData = new FormData();
          formData.append('file', fileToUpload);

          // Call the server action to handle the upload
          const result = await uploadPDF(formData);

          if (!result.success) {
            throw new Error(result.error);
          }

          newUploadedFiles.push(file.name);
        }
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

        // Clear uploaded files list and compression status after 5 seconds
        setTimeout(() => {
          setUploadedFiles([]);
          setCompressionStatus({});
        }, 5000);

        router.push('/receipts');
      } catch (error) {
        console.error('Upload failed:', error);
        alert(
          `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsUploading(false);
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
              <p>Uploading...</p>
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
              <div className="flex items-center justify-center mb-3">
                <Image className="h-8 w-8 text-gray-400 mr-2" />
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-2 text-sm text-gray-600 text-center">
                Drag and drop receipt images or PDF files here, or click to
                select files
              </p>
              <p className="mt-1 text-xs text-gray-500 text-center">
                Supports: JPG, PNG, WEBP, HEIC, PDF • Images over 1MB will be
                automatically compressed
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf,.heic,.heif"
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
              <AlertCircle className="h-5 w-5 mr-2 shrink-0">
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
            <ul className="mt-2 text-sm text-gray-600 space-y-2">
              {uploadedFiles.map((fileName, i) => {
                const compressionInfo = compressionStatus[fileName];
                return (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">{fileName}</div>
                      {compressionInfo?.result && (
                        <div className="text-xs text-gray-500 mt-1">
                          Compressed:{' '}
                          {formatFileSize(compressionInfo.result.originalSize)}{' '}
                          →{' '}
                          {formatFileSize(
                            compressionInfo.result.compressedSize
                          )}
                          (
                          {Math.round(
                            compressionInfo.result.compressionRatio * 100
                          )}
                          % reduction)
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Show compression status for files being processed */}
        {Object.entries(compressionStatus).some(
          ([_, status]) => status.isCompressing
        ) && (
          <div className="mt-4">
            <h3 className="font-medium">Compressing Images...</h3>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              {Object.entries(compressionStatus)
                .filter(([_, status]) => status.isCompressing)
                .map(([fileName, _]) => (
                  <li key={fileName} className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Compressing {fileName}...
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default ReceiptDropzone;

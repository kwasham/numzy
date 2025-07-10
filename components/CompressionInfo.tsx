'use client';

import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function CompressionInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-blue-800 font-semibold text-sm mb-1">
            Image Compression
          </h3>
          <p className="text-blue-700 text-sm mb-2">
            iPhone photos are automatically compressed to work with our system.
            This ensures fast uploads while maintaining quality for receipt
            processing.
          </p>
          <div className="text-xs text-blue-600 space-y-1">
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Original quality preserved for text recognition</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Reduced file size for faster processing</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Supports iPhone HEIC, JPG, PNG, and PDF files</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

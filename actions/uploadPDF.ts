'use server';

import { currentUser } from '@clerk/nextjs/server';
import convex from '@/lib/convexClient';
import { getFileDownloadUrl } from './getFileDownloadUrl';
import { api } from '../convex/_generated/api';
import { client } from '../lib/schematic';

interface Location {
  city: string | null;
  state: string | null;
  zipcode: string | null;
}

interface LineItem {
  description: string | null;
  product_code: string | null;
  category: string | null;
  item_price: string | null;
  sale_price: string | null;
  quantity: string | null;
  total: string | null;
}

interface ReceiptDetails {
  merchant: string | null;
  location: Location;
  time: string | null;
  items: LineItem[];
  transaction_id: string | null;
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  handwritten_notes: string[];
}

interface AuditDecision {
  not_travel_related: boolean;
  amount_over_limit: boolean;
  math_error: boolean;
  handwritten_x: boolean;
  reasoning: string;
  needs_audit: boolean;
}

interface ReceiptProcessingResult {
  receipt_details: ReceiptDetails;
  audit_decision: AuditDecision;
  processing_successful: boolean;
  error_message: string | null;
}

const API_BASE_URL = 'http://localhost:8000';

// // Query receipts needing audit:
// const auditReceipts = await convex.query(api.receipts.getReceiptsNeedingAudit, {
//     userId: user.id
// })

// // Get receipt statistics:
// const stats = await convex.query(api.receipts.getReceiptStats, {
//     userId: user.id
// })

export default async function uploadFile(formData: FormData) {
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Not Authorized' };
  }

  try {
    // Get the file from the form data
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type - accept images and PDFs
    const isValidImage =
      file.type.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].some(ext =>
        file.name.toLowerCase().endsWith(`.${ext}`)
      );

    const isValidPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isValidImage && !isValidPdf) {
      return {
        success: false,
        error:
          'Only image files (JPG, PNG, GIF, WebP, HEIC) and PDF files are allowed',
      };
    }

    // Get the upload URL from convex
    const uploadUrl = await convex.mutation(api.receipts.generateUploadUrl, {});

    // Convert file to arrayBuffer for fetch api
    const arrayBuffer = await file.arrayBuffer();

    // Upload the file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
      },
      body: new Uint8Array(arrayBuffer),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
    }

    const { storageId } = await uploadResponse.json();

    // Create initial receipt record with new schema
    const receiptId = await convex.mutation(api.receipts.storeReceipt, {
      userId: user.id,
      fileId: storageId,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });

    const fileUrl = await getFileDownloadUrl(storageId);

    // Process receipt with FastAPI
    let processingResult: ReceiptProcessingResult | null = null;

    try {
      // Create a new FormData for the FastAPI call
      const fastApiFormData = new FormData();
      fastApiFormData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/process-receipt`, {
        method: 'POST',
        body: fastApiFormData,
      });

      if (response.ok) {
        processingResult = await response.json();
        console.log('Processing result:', processingResult);

        // Update the receipt with all extracted data using new schema
        await convex.mutation(api.receipts.updateReceiptWithProcessingResult, {
          id: receiptId,
          processingResult: {
            // Processing status
            processing_successful: processingResult.processing_successful,
            error_message: processingResult.error_message || undefined,

            // Receipt details
            receipt_details: {
              merchant: processingResult.receipt_details.merchant || undefined,
              location: {
                city:
                  processingResult.receipt_details.location.city || undefined,
                state:
                  processingResult.receipt_details.location.state || undefined,
                zipcode:
                  processingResult.receipt_details.location.zipcode ||
                  undefined,
              },
              time: processingResult.receipt_details.time || undefined, //
              transaction_id:
                processingResult.receipt_details.transaction_id || undefined,
              subtotal: processingResult.receipt_details.subtotal || undefined,
              tax: processingResult.receipt_details.tax || undefined,
              total: processingResult.receipt_details.total || undefined,
              handwritten_notes:
                processingResult.receipt_details.handwritten_notes || [],
              items:
                processingResult.receipt_details?.items.map(item => ({
                  description: item.description || undefined,
                  product_code: item.product_code || undefined,
                  category: item.category || undefined,
                  item_price: item.item_price || undefined,
                  sale_price: item.sale_price || undefined,
                  quantity: item.quantity || undefined,
                  total: item.total || undefined,
                })) || [],
            },

            // Audit decision
            audit_decision: {
              not_travel_related:
                processingResult.audit_decision.not_travel_related,
              amount_over_limit:
                processingResult.audit_decision.amount_over_limit,
              math_error: processingResult.audit_decision.math_error,
              handwritten_x: processingResult.audit_decision.handwritten_x,
              reasoning: processingResult.audit_decision.reasoning,
              needs_audit: processingResult.audit_decision.needs_audit,
            },
          },
        });

        // Track the scan event
        await client.track({
          event: 'scan',
          company: {
            id: user.id,
          },
          user: {
            id: user.id,
          },
        });
      } else {
        console.error('FastAPI request failed:', response.statusText);

        // Update with error status
        await convex.mutation(api.receipts.updateReceiptWithError, {
          id: receiptId,
          error_message: `API request failed: ${response.statusText}`,
        });
      }
    } catch (error) {
      console.error('Error processing receipt with FastAPI:', error);

      // Update with error status
      await convex.mutation(api.receipts.updateReceiptWithError, {
        id: receiptId,
        error_message:
          error instanceof Error ? error.message : 'Processing failed',
      });
    }

    return {
      success: true,
      data: {
        receiptId,
        fileName: file.name,
        fileType: isValidPdf ? 'pdf' : 'image',
        processingResult,
        processingSuccessful: processingResult?.processing_successful || false,
      },
    };
  } catch (error) {
    console.error('Server action upload error', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

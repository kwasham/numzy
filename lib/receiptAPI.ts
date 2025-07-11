/**
 * API client for communicating with the Python receipt processing server
 */

export interface ReceiptProcessingResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

export interface ProcessedReceiptData {
  merchant: string;
  total: string;
  subtotal: string;
  tax: string;
  date: string;
  time: string;
  transaction_id: string;
  location_city: string;
  location_state: string;
  location_zipcode: string;
  items: Array<{
    description: string;
    quantity: string;
    item_price: string;
    total: string;
  }>;
  handwritten_notes: string[];
  needs_audit: boolean;
  not_travel_related: boolean;
  amount_over_limit: boolean;
  math_error: boolean;
  handwritten_x: boolean;
  audit_reasoning: string;
  confidence_score: number;
  processing_time: number;
}

class ReceiptProcessingAPI {
  private baseUrl: string;

  constructor() {
    // In development, this will proxy to your local Python server
    // In production, it will use the deployed Vercel Python functions
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api' // This will be proxied to localhost:8000
      : '/api';
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async processReceipt(file: File): Promise<ReceiptProcessingResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/process-receipt`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to process receipt');
      }

      return result;
    } catch (error) {
      console.error('Error processing receipt:', error);
      return {
        success: false,
        message: 'Failed to process receipt',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateReceipt(receiptData: any): Promise<ReceiptProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to validate receipt');
      }

      return result;
    } catch (error) {
      console.error('Error validating receipt:', error);
      return {
        success: false,
        message: 'Failed to validate receipt',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getReceipt(receiptId: string): Promise<ReceiptProcessingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/receipt/${receiptId}`);
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to get receipt');
      }

      return result;
    } catch (error) {
      console.error('Error getting receipt:', error);
      return {
        success: false,
        message: 'Failed to get receipt',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export a singleton instance
export const receiptAPI = new ReceiptProcessingAPI();

// Export utility functions
export const formatReceiptData = (data: any): ProcessedReceiptData => {
  return {
    merchant: data.merchant || 'Unknown Merchant',
    total: data.total || '$0.00',
    subtotal: data.subtotal || '$0.00',
    tax: data.tax || '$0.00',
    date: data.date || '',
    time: data.time || '',
    transaction_id: data.transaction_id || '',
    location_city: data.location_city || '',
    location_state: data.location_state || '',
    location_zipcode: data.location_zipcode || '',
    items: data.items || [],
    handwritten_notes: data.handwritten_notes || [],
    needs_audit: data.needs_audit || false,
    not_travel_related: data.not_travel_related || false,
    amount_over_limit: data.amount_over_limit || false,
    math_error: data.math_error || false,
    handwritten_x: data.handwritten_x || false,
    audit_reasoning: data.audit_reasoning || '',
    confidence_score: data.confidence_score || 0,
    processing_time: data.processing_time || 0,
  };
};

export default receiptAPI;

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ChevronLeft,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Receipt as ReceiptIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Building,
  CreditCard,
  FileCheck,
  AlertCircle,
  Download,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useSchematicFlag } from '@schematichq/schematic-react';
import { getFileDownloadUrl } from '@/actions/getFileDownloadUrl';
import { deleteReceipt } from '@/actions/deleteReceipt';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function Receipt() {
  const params = useParams<{ id: string }>();
  const [receiptId, setReceiptId] = useState<Id<'receipts'> | null>(null);
  const router = useRouter();
  const isSummariesEnabled = useSchematicFlag('summary');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch receipt details
  const receipt = useQuery(
    api.receipts.getReceiptById,
    receiptId ? { id: receiptId } : 'skip'
  );

  async function handleDownload() {
    if (!receipt || !receipt.fileId) return;
    try {
      setIsDownloading(true);
      const result = await getFileDownloadUrl(receipt.fileId);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.downloadUrl) {
        const response = await fetch(result.downloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = receipt.fileName || 'receipt.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDeleteReceipt() {
    if (!receiptId) return;

    if (
      window.confirm(
        'Are you sure you want to delete this receipt? This action cannot be undone.'
      )
    ) {
      try {
        setIsDeleting(true);
        const result = await deleteReceipt(receiptId);

        if (!result.success) {
          throw new Error(result.error);
        }

        router.push('/receipts');
      } catch (error) {
        console.error('Error deleting receipt:', error);
        alert('Failed to delete receipt. Please try again later');
        setIsDeleting(false);
      }
    }
  }

  // Convert the URL string ID to a Convex ID
  useEffect(() => {
    try {
      const id = params.id as Id<'receipts'>;
      setReceiptId(id);
    } catch (error) {
      console.error('Invalid receipt ID:', error);
      router.push('/');
    }
  }, [params.id, router]);

  // Loading state
  if (receipt === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt details...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (receipt == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Receipt Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The receipt you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/receipts"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Receipts
          </Link>
        </div>
      </div>
    );
  }

  // Format data helpers
  const uploadDate = new Date(receipt.uploadedAt).toLocaleString();
  const hasProcessedData = receipt.processing_successful && receipt.merchant;
  const fullLocation = [
    receipt.location_city,
    receipt.location_state,
    receipt.location_zipcode,
  ]
    .filter(Boolean)
    .join(', ');

  // Status configuration
  const getStatusConfig = (
    status: string,
    processing_successful: boolean,
    needs_audit: boolean
  ) => {
    if (status === 'pending') {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Processing',
      };
    }
    if (status === 'error' || !processing_successful) {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Failed',
      };
    }
    if (needs_audit) {
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertTriangle,
        label: 'Needs Audit',
      };
    }
    return {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: 'Processed',
    };
  };

  const statusConfig = getStatusConfig(
    receipt.status,
    receipt.processing_successful,
    receipt.needs_audit
  );
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%236366f1\" fill-opacity=\"0.03\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      
      <div className="relative z-10 container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <nav className="mb-8">
            <Link
              href="/receipts"
              className="group inline-flex items-center px-4 py-2 text-gray-600 hover:text-indigo-600 bg-white/60 backdrop-blur-sm rounded-full border border-white/20 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Receipts
            </Link>
          </nav>

          {/* Hero Header */}
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden mb-8 group hover:shadow-3xl transition-all duration-500">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z\"/%3E%3C/g%3E%3C/svg%3E')]"></div>
            
            <div className="relative z-10 p-8">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl"></div>
                    <div className="relative bg-white/20 backdrop-blur-sm p-4 rounded-2xl border border-white/30">
                      <ReceiptIcon className="h-8 w-8" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2 tracking-tight">
                      {receipt.fileDisplayName || receipt.fileName}
                    </h1>
                    <p className="text-white/80 text-lg flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Uploaded {uploadDate}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-6 py-3 rounded-2xl border-2 border-white/30 backdrop-blur-sm transition-all duration-300 ${
                      receipt.needs_audit 
                        ? 'bg-orange-500/20 text-orange-100' 
                        : 'bg-green-500/20 text-green-100'
                    }`}
                  >
                    <StatusIcon className="h-5 w-5 mr-2" />
                    <span className="font-semibold text-lg">{statusConfig.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatFileSize(receipt.size)}
                </div>
                <div className="text-gray-500 font-medium">File Size</div>
              </div>
            </div>

            <div className="group relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="w-8 h-8 bg-green-500/20 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {receipt.mimeType.split('/')[1].toUpperCase()}
                </div>
                <div className="text-gray-500 font-medium">File Type</div>
              </div>
            </div>

            <div className="group relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {receipt.items?.length || 0}
                </div>
                <div className="text-gray-500 font-medium">Items</div>
              </div>
            </div>

            <div className="group relative bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="w-8 h-8 bg-amber-500/20 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  {receipt.total || 'N/A'}
                </div>
                <div className="text-gray-500 font-medium">Total Amount</div>
              </div>
            </div>
          </div>

          {/* Processing Error */}
          {receipt.error_message && (
            <div className="relative bg-red-50/80 backdrop-blur-xl border border-red-200/50 rounded-2xl p-6 mb-8 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5 rounded-2xl"></div>
              <div className="relative flex items-start space-x-4">
                <div className="flex-shrink-0 p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 mb-2 text-lg">
                    Processing Error
                  </h3>
                  <p className="text-red-700 leading-relaxed">{receipt.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {hasProcessedData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Merchant Information */}
              <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"></div>
                <div className="relative">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6">
                    <div className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Building className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">Merchant</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {receipt.merchant && (
                      <div className="group/item">
                        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                          Business Name
                        </p>
                        <p className="font-bold text-gray-900 text-lg group-hover/item:text-emerald-600 transition-colors">
                          {receipt.merchant}
                        </p>
                      </div>
                    )}
                    {fullLocation && (
                      <div className="flex items-start space-x-3 group/item">
                        <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-xl mt-1">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Location
                          </p>
                          <p className="text-gray-900 group-hover/item:text-emerald-600 transition-colors">
                            {fullLocation}
                          </p>
                        </div>
                      </div>
                    )}
                    {receipt.transaction_id && (
                      <div className="group/item">
                        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                          Transaction ID
                        </p>
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 group-hover/item:border-emerald-200 transition-colors">
                          <p className="font-mono text-sm text-gray-900 break-all">
                            {receipt.transaction_id}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10"></div>
                <div className="relative">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
                    <div className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">Transaction</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {receipt.transaction_date && (
                      <div className="flex items-center space-x-3 group/item">
                        <div className="flex-shrink-0 p-2 bg-blue-100 rounded-xl">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Date
                          </p>
                          <p className="text-gray-900 group-hover/item:text-blue-600 transition-colors">
                            {new Date(receipt.transaction_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {receipt.subtotal && (
                      <div className="group/item">
                        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                          Subtotal
                        </p>
                        <p className="text-gray-900 text-lg font-semibold group-hover/item:text-blue-600 transition-colors">
                          {receipt.subtotal}
                        </p>
                      </div>
                    )}
                    {receipt.tax && (
                      <div className="group/item">
                        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                          Tax
                        </p>
                        <p className="text-gray-900 text-lg font-semibold group-hover/item:text-blue-600 transition-colors">
                          {receipt.tax}
                        </p>
                      </div>
                    )}
                    {receipt.total && (
                      <div className="flex items-center space-x-3 group/item">
                        <div className="flex-shrink-0 p-2 bg-green-100 rounded-xl">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Total
                          </p>
                          <p className="text-2xl font-bold text-green-600 group-hover/item:scale-110 transition-transform">
                            {receipt.total}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Status */}
              <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10"></div>
                <div className="relative">
                  <div
                    className={`px-6 py-6 ${
                      receipt.needs_audit 
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600' 
                        : 'bg-gradient-to-r from-green-600 to-emerald-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3 text-white">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">Audit Status</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="text-center group/status">
                      <div className="relative inline-block">
                        <div
                          className={`absolute inset-0 blur-lg opacity-30 rounded-2xl ${
                            receipt.needs_audit ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                        ></div>
                        <div
                          className={`relative text-4xl font-black tracking-tight px-6 py-4 rounded-2xl border-2 transition-all duration-300 group-hover/status:scale-105 ${
                            receipt.needs_audit
                              ? 'text-orange-600 bg-orange-50 border-orange-200'
                              : 'text-green-600 bg-green-50 border-green-200'
                          }`}
                        >
                          {receipt.needs_audit ? 'NEEDS AUDIT' : 'APPROVED'}
                        </div>
                      </div>
                      <div className="text-gray-500 font-semibold mt-3 uppercase tracking-wider">
                        Status
                      </div>
                    </div>
                    {receipt.audit_reasoning && (
                      <div className="group/reason">
                        <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                          Reason
                        </p>
                        <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-4 max-h-32 overflow-y-auto group-hover/reason:border-violet-200 transition-colors">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {receipt.audit_reasoning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          {receipt.items && receipt.items.length > 0 && (
            <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden mb-8 group hover:shadow-2xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
              <div className="relative">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-6">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Package className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">Items Breakdown</h3>
                    <div className="ml-auto bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-sm font-semibold">{receipt.items.length} items</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-white/5">
                          <TableHead className="text-gray-700 font-bold">Description</TableHead>
                          <TableHead className="text-right text-gray-700 font-bold">Quantity</TableHead>
                          <TableHead className="text-right text-gray-700 font-bold">Unit Price</TableHead>
                          <TableHead className="text-right text-gray-700 font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipt.items.map((item: any, index: number) => (
                          <TableRow 
                            key={index}
                            className="border-white/20 hover:bg-purple-50/50 transition-colors group/row"
                          >
                            <TableCell className="font-semibold text-gray-900 group-hover/row:text-purple-700 transition-colors">
                              {item.description || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 group-hover/row:text-purple-600 transition-colors">
                              {item.quantity || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 group-hover/row:text-purple-600 transition-colors">
                              {item.unit_price || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-900 group-hover/row:text-purple-700 transition-colors">
                              {item.total_price || 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Card (if enabled) */}
          {isSummariesEnabled && receipt.summary && (
            <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden mb-8 group hover:shadow-2xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5"></div>
              <div className="relative">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-6">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">AI Summary</h3>
                    <div className="ml-auto flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        AI Generated
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 text-6xl text-indigo-200 font-serif">"</div>
                    <p className="text-gray-700 leading-relaxed text-lg pl-8 pr-4 italic">
                      {receipt.summary}
                    </p>
                    <div className="absolute -bottom-4 -right-2 text-6xl text-indigo-200 font-serif rotate-180">"</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Section */}
          <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 p-8 group hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 rounded-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Quick Actions</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500 font-medium">Ready</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="group/btn relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <div className="relative flex flex-col items-center space-y-3">
                    <div className="p-3 bg-white/20 rounded-xl group-hover/btn:bg-white/30 transition-colors">
                      <Download className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-lg">
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </span>
                    <span className="text-blue-100 text-sm">Get a copy</span>
                  </div>
                </button>

                <button
                  onClick={handleDeleteReceipt}
                  disabled={isDeleting}
                  className="group/btn relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-rose-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <div className="relative flex flex-col items-center space-y-3">
                    <div className="p-3 bg-white/20 rounded-xl group-hover/btn:bg-white/30 transition-colors">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-lg">
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </span>
                    <span className="text-red-100 text-sm">Remove forever</span>
                  </div>
                </button>

                {receipt.fileId && (
                  <button
                    onClick={() => {
                      window.open(`/api/files/${receipt.fileId}`, '_blank');
                    }}
                    className="group/btn relative overflow-hidden bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-slate-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <div className="relative flex flex-col items-center space-y-3">
                      <div className="p-3 bg-white/20 rounded-xl group-hover/btn:bg-white/30 transition-colors">
                        <ExternalLink className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-lg">View Original</span>
                      <span className="text-gray-100 text-sm">Open in new tab</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default Receipt;

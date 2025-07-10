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
  Star,
  TrendingUp,
  Calendar,
  User,
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

  useEffect(() => {
    if (params?.id) {
      setReceiptId(params.id as Id<'receipts'>);
    }
  }, [params?.id]);

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

  async function handleDelete() {
    if (!receipt) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this receipt? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const result = await deleteReceipt(receipt._id);

      if (result.success) {
        router.push('/receipts');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'processing':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="relative">
          {/* Animated background circles */}
          <div className="absolute -inset-20 opacity-30">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-12 shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 text-center font-medium">
              Loading receipt details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Header */}
        <div className="mb-8">
          <Link
            href="/receipts"
            className="group inline-flex items-center space-x-3 text-gray-600 hover:text-gray-900 transition-all duration-300 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Back to Receipts</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {receipt.fileDisplayName || receipt.fileName}
                </h1>
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border text-sm font-medium ${getStatusColor(receipt.status)}`}
                  >
                    {getStatusIcon(receipt.status)}
                    <span className="capitalize">
                      {receipt.status || 'Unknown'}
                    </span>
                  </span>
                  {receipt.uploadedAt && (
                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(receipt.uploadedAt).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
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
                <p className="text-red-700 leading-relaxed">
                  {receipt.error_message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {receipt.total || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {receipt.items?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tax Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {receipt.tax || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">File Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(receipt.size)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Receipt Details - Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Merchant Information */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <span>Merchant Information</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Merchant Name
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {receipt.merchant || 'Not available'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Transaction ID
                    </label>
                    <p className="text-gray-900 mt-1">
                      {receipt.transaction_id || 'Not available'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>Location</span>
                    </label>
                    <p className="text-gray-900 mt-1 leading-relaxed">
                      {[
                        receipt.location_city,
                        receipt.location_state,
                        receipt.location_zipcode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span>Transaction Details</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                  <label className="text-sm font-medium text-gray-600">
                    Time
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {receipt.time || 'Not available'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                  <label className="text-sm font-medium text-gray-600">
                    Subtotal
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {receipt.subtotal || 'Not available'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                  <label className="text-sm font-medium text-gray-600">
                    Tax
                  </label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {receipt.tax || 'Not available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            {receipt.items && receipt.items.length > 0 && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <ReceiptIcon className="h-5 w-5 text-white" />
                  </div>
                  <span>Items Purchased</span>
                </h2>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableHead className="font-semibold">Item</TableHead>
                        <TableHead className="font-semibold">
                          Quantity
                        </TableHead>
                        <TableHead className="font-semibold">
                          Item Price
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipt.items.map((item, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-gray-50/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium">
                            {item.description || `Item ${index + 1}`}
                          </TableCell>
                          <TableCell>{item.quantity || '1'}</TableCell>
                          <TableCell>{item.item_price || 'N/A'}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.total || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Handwritten Notes */}
            {receipt.handwritten_notes &&
              receipt.handwritten_notes.length > 0 && (
                <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span>Handwritten Notes</span>
                  </h2>

                  <div className="space-y-3">
                    {receipt.handwritten_notes.map((note, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200"
                      >
                        <p className="text-gray-700 leading-relaxed">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Right Column - Actions & Summary */}
          <div className="space-y-8">
            {/* Action Buttons */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !receipt.fileId}
                  className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                  </span>
                </button>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Receipt'}</span>
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>Financial Summary</span>
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {receipt.subtotal || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium text-gray-900">
                    {receipt.tax || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 border border-green-200">
                  <span className="font-semibold text-green-900">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold text-green-900">
                    {receipt.total || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Reason */}
            {isSummariesEnabled && receipt.audit_reasoning && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-purple-600" />
                  <span>Audit Analysis</span>
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 max-h-64 overflow-y-auto">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {receipt.audit_reasoning}
                  </p>
                </div>
              </div>
            )}

            {/* Audit Status */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Audit Status</span>
              </h3>

              <div className="space-y-3">
                <div
                  className={`text-center p-4 rounded-xl border-2 ${
                    receipt.needs_audit
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  <div className="text-2xl font-bold">
                    {receipt.needs_audit ? 'NEEDS AUDIT' : 'APPROVED'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div
                    className={`p-3 rounded-lg border ${
                      receipt.not_travel_related
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    <div className="font-medium">Travel Related</div>
                    <div>{receipt.not_travel_related ? 'No' : 'Yes'}</div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      receipt.amount_over_limit
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    <div className="font-medium">Amount OK</div>
                    <div>
                      {receipt.amount_over_limit
                        ? 'Over Limit'
                        : 'Within Limit'}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      receipt.math_error
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    <div className="font-medium">Math Check</div>
                    <div>{receipt.math_error ? 'Error Found' : 'Correct'}</div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${
                      receipt.handwritten_x
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    <div className="font-medium">Handwritten X</div>
                    <div>{receipt.handwritten_x ? 'Present' : 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
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

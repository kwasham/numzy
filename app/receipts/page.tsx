import React from 'react';
import ReceiptDropzone from '@/components/ReceiptDropzone';
import ReceiptList from '@/components/ReceiptList';

function Receipts() {
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ReceiptDropzone />
        <ReceiptList />
      </div>
    </div>
  );
}

export default Receipts;

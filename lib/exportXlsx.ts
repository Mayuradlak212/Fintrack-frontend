import * as XLSX from 'xlsx';
import { Transaction } from '../types';

export function exportTransactionsToXlsx(transactions: Transaction[], filename = 'transactions') {
  const rows = transactions.map((tx) => ({
    'Transaction ID': tx.id,
    Date: new Date(tx.date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }),
    Type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    Description: tx.description,
    Category: tx.category,
    Amount: tx.type === 'credit' ? tx.amount : -tx.amount,
    Currency: 'INR',
    Location: tx.location_text ?? '',
    'Has Receipt': tx.receiptBase64 ? 'Yes' : 'No',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 38 }, // Transaction ID
    { wch: 16 }, // Date
    { wch: 10 }, // Type
    { wch: 36 }, // Description
    { wch: 18 }, // Category
    { wch: 14 }, // Amount
    { wch: 8  }, // Currency
    { wch: 24 }, // Location
    { wch: 12 }, // Has Receipt
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const safeFilename = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

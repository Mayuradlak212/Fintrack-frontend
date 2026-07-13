import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionForm, TransactionState, SummaryData } from '../types';
import { fetchApi } from '../lib/api';



const initialState: TransactionState = {
  transactions: [],
  summary: null,
  isLoading: false,
  isFetched: false,
  error: null,
};

type BackendTransaction = Omit<Transaction, 'createdAt' | 'updatedAt' | 'receiptBase64' | 'receiptName' | 'receiptMimeType'> & {
  created_at?: string;
  updated_at?: string;
  receipt_base64?: string;
  receipt_name?: string;
  receipt_mime_type?: string;
  createdAt?: string;
  updatedAt?: string;
  receiptBase64?: string;
  receiptName?: string;
  receiptMimeType?: string;
};

function mapTx(t: BackendTransaction): Transaction {
  return {
    ...t,
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt,
    receiptBase64: t.receipt_base64 || t.receiptBase64,
    receiptName: t.receipt_name || t.receiptName,
    receiptMimeType: t.receipt_mime_type || t.receiptMimeType,
  };
}

export const fetchAllTransactions = createAsyncThunk('transactions/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const data = await fetchApi<{ items: BackendTransaction[] }>('/api/transactions?page=1&per_page=10000');
    return data.items.map(mapTx);
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to fetch transactions');
  }
});

export const fetchSummary = createAsyncThunk('transactions/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const data = await fetchApi<SummaryData>('/api/transactions/summary');
    return data;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to fetch summary');
  }
});

export const addTransaction = createAsyncThunk('transactions/add', async (tx: TransactionForm, { rejectWithValue }) => {
  try {
    const payload = {
      ...tx,
      receipt_base64: tx.receiptBase64,
      receipt_name: tx.receiptName,
      receipt_mime_type: tx.receiptMimeType,
    };
    const newTx = await fetchApi<BackendTransaction>('/api/transactions', { method: 'POST', data: payload });
    return mapTx(newTx);
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to add transaction');
  }
});

export const updateTransaction = createAsyncThunk('transactions/update', async ({ id, tx }: { id: string, tx: TransactionForm }, { rejectWithValue }) => {
  try {
    const payload = {
      ...tx,
      receipt_base64: tx.receiptBase64,
      receipt_name: tx.receiptName,
      receipt_mime_type: tx.receiptMimeType,
    };
    const updatedTx = await fetchApi<BackendTransaction>(`/api/transactions/${id}`, { method: 'PATCH', data: payload });
    return mapTx(updatedTx);
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to update transaction');
  }
});

export const deleteTransaction = createAsyncThunk('transactions/delete', async (id: string, { rejectWithValue }) => {
  try {
    await fetchApi(`/api/transactions/${id}`, { method: 'DELETE' });
    return id;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to delete transaction');
  }
});

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    resetTransactions(state) {
      state.transactions = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchAllTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isFetched = true;
        state.transactions = action.payload;
      })
      .addCase(fetchAllTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.isFetched = true;
        state.error = action.payload as string;
      })
      // Fetch Summary
      .addCase(fetchSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSummary.fulfilled, (state, action: PayloadAction<SummaryData>) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add
      .addCase(addTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        state.transactions.unshift(action.payload);
        state.summary = null;
      })
      // Update
      .addCase(updateTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        const index = state.transactions.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
        state.summary = null;
      })
      // Delete
      .addCase(deleteTransaction.fulfilled, (state, action: PayloadAction<string>) => {
        state.transactions = state.transactions.filter((t) => t.id !== action.payload);
        state.summary = null;
      });
  }
});

export const { resetTransactions } = transactionSlice.actions;
export default transactionSlice.reducer;

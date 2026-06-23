import { z } from 'zod';

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export const TransactionTypeSchema = z.enum(['credit', 'debit']);

export const CategorySchema = z.enum([
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Housing',
  'Salary',
  'Investment',
  'Transfer',
  'Other',
]);

// ─── Transaction ──────────────────────────────────────────────────────────────

export const TransactionSchema = z.object({
  id: z.string().min(1),
  type: TransactionTypeSchema,
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(200),
  category: CategorySchema,
  date: z.string().datetime({ message: 'Invalid date' }),
  receiptBase64: z.string().optional(),
  receiptName: z.string().optional(),
  receiptMimeType: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Schema for creating/editing — omits server-generated fields */
export const TransactionFormSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ─── User ─────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1),
});

// ─── Login form ───────────────────────────────────────────────────────────────

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type TransactionType   = z.infer<typeof TransactionTypeSchema>;
export type Category          = z.infer<typeof CategorySchema>;
export type Transaction       = z.infer<typeof TransactionSchema>;
export type TransactionForm   = z.infer<typeof TransactionFormSchema>;
export type User              = z.infer<typeof UserSchema>;
export type LoginForm         = z.infer<typeof LoginFormSchema>;

// ─── Context types (contain functions — kept as TS types, not Zod schemas) ────

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

export interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (tx: TransactionForm) => void;
  updateTransaction: (id: string, tx: TransactionForm) => void;
  deleteTransaction: (id: string) => void;
}

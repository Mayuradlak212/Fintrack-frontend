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
  receiptBase64: z.string().nullish(),
  receiptName: z.string().nullish(),
  receiptMimeType: z.string().nullish(),
  // For backend compatibility mapping
  receipt_base64: z.string().nullish(),
  receipt_name: z.string().nullish(),
  receipt_mime_type: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  location_text: z.string().nullish(),
  created_at: z.string().datetime().nullish(),
  updated_at: z.string().datetime().nullish(),
  createdAt: z.string().datetime().nullish(),
  updatedAt: z.string().datetime().nullish(),
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
  avatar_base64: z.string().nullish(),
  avatar_mime_type: z.string().nullish(),
  phone: z.string().nullish(),
});

// ─── Login/Register form ──────────────────────────────────────────────────────

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

// ─── Inferred TypeScript types ────────────────────────────────────────────────

export type TransactionType   = z.infer<typeof TransactionTypeSchema>;
export type Category          = z.infer<typeof CategorySchema>;
export type Transaction       = z.infer<typeof TransactionSchema>;
export type TransactionForm   = z.infer<typeof TransactionFormSchema>;
export type User              = z.infer<typeof UserSchema>;
export type LoginForm         = z.infer<typeof LoginFormSchema>;
export type RegisterForm      = z.infer<typeof RegisterFormSchema>;

// ─── Redux State Interfaces ───────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface PaginatedFetchParams {
  page: number;
  per_page?: number;
  type?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;
}

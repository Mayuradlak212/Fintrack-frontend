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
  // For backend compatibility mapping
  receipt_base64: z.string().optional(),
  receipt_name: z.string().optional(),
  receipt_mime_type: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location_text: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
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
  avatar_base64: z.string().optional(),
  avatar_mime_type: z.string().optional(),
  phone: z.string().optional(),
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

// ─── Context types (contain functions — kept as TS types, not Zod schemas) ────

export interface AuthContextType {
  user: User | null;
  login: (data: LoginForm) => Promise<boolean>;
  register: (data: RegisterForm) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (tx: TransactionForm) => void;
  updateTransaction: (id: string, tx: TransactionForm) => void;
  deleteTransaction: (id: string) => void;
}

export type Business = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
};

export type Account = {
  id: string;
  business_id: string;
  name: string;
  account_type: string;
  initial_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
};

export type Category = {
  id: string;
  name: string;
  category_type: 'revenue' | 'expense' | 'other';
  status: 'active' | 'inactive';
};

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'completed' | 'cancelled';

export type Transaction = {
  id: string;
  transaction_date: string;
  business_id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  description: string | null;
  transfer_to_account_id: string | null;
  status: TransactionStatus;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
};

export type TransactionWithDetails = Transaction & {
  business?: Business;
  account?: Account;
  category?: Category;
  transfer_to_account?: Account;
};

export type IncomeBreakdownItem = {
  name: string;
  percent: number;
  amount: number;
  account_id: string;
  is_manual?: boolean;
};

export type CreateIncomeBreakdownPayload = {
  transaction_date: string;
  business_id: string;
  category_id: string;
  total_amount: number;
  description: string;
  allocations: IncomeBreakdownItem[];
};

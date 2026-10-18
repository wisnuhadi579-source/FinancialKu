import { supabase } from './supabaseClient';
import type { Business, Account, Category, Transaction, TransactionType, TransactionStatus, CreateIncomeBreakdownPayload } from '../types';
import { formatCurrency } from '../lib/utils';

export const businessService = {
  async getAll() {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Business[];
  }
};

export const accountService = {
  async getByBusiness(businessId: string | 'all') {
    let query = supabase.from('accounts').select('*');
    if (businessId !== 'all') {
      query = query.eq('business_id', businessId);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data as Account[];
  }
};

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Category[];
  }
};

export const transactionService = {
  async getTransactions(filters: {
    businessId?: string | 'all';
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase.from('transactions').select('*');

    if (filters.businessId && filters.businessId !== 'all') {
      query = query.eq('business_id', filters.businessId);
    }
    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'status'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, status: 'completed' }])
      .select();
    if (error) throw error;
    return data[0] as Transaction;
  },

  async createIncomeWithBreakdown(payload: CreateIncomeBreakdownPayload) {
    const refNumber = `INC-${Date.now()}`;
    const nonZeroAllocations = payload.allocations.filter(a => a.amount > 0);

    if (nonZeroAllocations.length === 0) {
      throw new Error('Tidak ada alokasi nominal lebih dari 0 yang dapat disimpan.');
    }

    const records = nonZeroAllocations.map(alloc => ({
      transaction_date: payload.transaction_date,
      business_id: payload.business_id,
      account_id: alloc.account_id,
      category_id: payload.category_id,
      transaction_type: 'income' as const,
      amount: alloc.amount,
      description: payload.description
        ? `${payload.description} [${alloc.name} ${alloc.percent}%]`
        : `Pemasukan [${alloc.name} ${alloc.percent}%]`,
      reference_number: refNumber,
      notes: `Alokasi ${alloc.name} (${alloc.percent}%) dari total ${formatCurrency(payload.total_amount)}`,
      status: 'completed' as const
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(records)
      .select();

    if (error) throw error;
    return data as Transaction[];
  },

  async cancelTransaction(id: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  },

  async cancelTransactionBatch(referenceNumber: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('reference_number', referenceNumber);
    if (error) throw error;
  }
};

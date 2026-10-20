import { supabase } from './supabaseClient';
import type { 
  Business, 
  Account, 
  Category, 
  Transaction, 
  TransactionType, 
  TransactionStatus, 
  CreateIncomeBreakdownPayload 
} from '../types';
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

  /**
   * Menyimpan transaksi pemasukan dengan auto breakdown ke banyak akun.
   * Pertama mencoba fungsi PostgreSQL RPC atomik jika telah terpasang di database,
   * jika belum terpasang akan fallback secara aman ke batch insert standar Supabase.
   */
  async createIncomeWithBreakdown(payload: CreateIncomeBreakdownPayload) {
    const nonZeroAllocations = payload.allocations.filter(a => a.amount > 0);

    if (nonZeroAllocations.length === 0) {
      throw new Error('Tidak ada alokasi nominal lebih dari 0 yang dapat disimpan.');
    }

    const dateStr = payload.transaction_date.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const refNumber = `INC-${dateStr}-${randomSuffix}`;

    // 1. Coba panggil RPC PostgreSQL create_income_allocation jika tersedia
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_income_allocation', {
        p_transaction_date: payload.transaction_date,
        p_business_id: payload.business_id,
        p_category_id: payload.category_id,
        p_total_amount: payload.total_amount,
        p_description: payload.description || '',
        p_reference_number: refNumber,
        p_allocations: nonZeroAllocations.map(a => ({
          account_id: a.account_id,
          name: a.name,
          percent: a.percent,
          amount: a.amount,
        }))
      });

      if (!rpcError && rpcData) {
        return rpcData as Transaction[];
      }
    } catch {
      // Abaikan error RPC jika belum terpasang di Supabase dan lanjut ke batch insert
    }

    // 2. Fallback: Batch insert atomik bawaan PostgREST
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
    // Coba RPC cancel_single_transaction jika ada
    try {
      const { error: rpcError } = await supabase.rpc('cancel_single_transaction', { p_transaction_id: id });
      if (!rpcError) return;
    } catch {
      // Fallback
    }

    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  },

  async cancelTransactionBatch(referenceNumber: string) {
    // Coba RPC cancel_income_allocation_batch jika ada
    try {
      const { error: rpcError } = await supabase.rpc('cancel_income_allocation_batch', { p_reference_number: referenceNumber });
      if (!rpcError) return;
    } catch {
      // Fallback
    }

    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('reference_number', referenceNumber);
    if (error) throw error;
  }
};

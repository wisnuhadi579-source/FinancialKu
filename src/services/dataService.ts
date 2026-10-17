import { supabase } from './supabaseClient';
import type { Business, Account, Category, Transaction, TransactionType, TransactionStatus } from '../types';

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

  async cancelTransaction(id: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  }
};

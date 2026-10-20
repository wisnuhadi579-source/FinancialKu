
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ArrowRightLeft,
  Search,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  CreditCard,
  Tag,
  FileText,
  Ban,
  RotateCcw,
  PieChart,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  GuideButton
} from '@/src/components/Common';
import {
  businessService,
  accountService,
  categoryService,
  transactionService
} from '@/src/services/dataService';
import {
  getAllocationRulesForBusiness,
  matchAccountForAllocation,
  calculateDeterministicAllocations,
  validateAllocationRules
} from '@/src/lib/allocationConfig';
import type {
  Business,
  Account,
  Category,
  Transaction,
  TransactionType,
  TransactionWithDetails
} from '@/src/types';
import { cn, formatCurrency } from '@/src/lib/utils';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const initialBizId = searchParams.get('businessId') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [filters, setFilters] = useState({
    businessId: initialBizId,
    startDate: '',
    endDate: '',
    search: '',
    type: 'all'
  });

  useEffect(() => {
    const bId = searchParams.get('businessId');

    if (bId) {
      setFilters(prev => ({ ...prev, businessId: bId }));
    }
  }, [searchParams]);

  const [showForm, setShowForm] = useState<{
    type: TransactionType | null;
    open: boolean;
  }>({
    type: null,
    open: false
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters.businessId, filters.startDate, filters.endDate]);

  const fetchMetadata = async () => {
    try {
      const [rawBiz, rawAccs, rawCats] = await Promise.all([
        businessService.getAll(),
        accountService.getByBusiness('all'),
        categoryService.getAll()
      ]);

      const biz = rawBiz.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      const accs = rawAccs.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      const cats = rawCats.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      setBusinesses(biz);
      setAccounts(accs);
      setCategories(cats);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load metadata', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);

    try {
      const rawTxs = await transactionService.getTransactions({
        businessId: filters.businessId,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });

      const txs = rawTxs.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      setTransactions(txs);
      setError(null);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load transactions', err);
      setError('Gagal memuat daftar transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const enrichedTransactions = useMemo(() => {
    const uniqueTxs = transactions.filter(
      (tx, index, self) =>
        index === self.findIndex(t => t.id === tx.id)
    );

    return uniqueTxs.map(tx => ({
      ...tx,
      business: businesses.find(b => b.id === tx.business_id),
      account: accounts.find(a => a.id === tx.account_id),
      category: categories.find(c => c.id === tx.category_id),
      transfer_to_account: accounts.find(
        a => a.id === tx.transfer_to_account_id
      )
    })) as TransactionWithDetails[];
  }, [transactions, businesses, accounts, categories]);

  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter(tx => {
      if (
        filters.type !== 'all' &&
        tx.transaction_type !== filters.type
      ) {
        return false;
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.category?.name || '').toLowerCase();
        const acc = (tx.account?.name || '').toLowerCase();
        const biz = (tx.business?.name || '').toLowerCase();
        const ref = (tx.reference_number || '').toLowerCase();

        const match =
          desc.includes(query) ||
          cat.includes(query) ||
          acc.includes(query) ||
          biz.includes(query) ||
          ref.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [enrichedTransactions, filters]);

  const handleCancelTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const sameBatch = tx.reference_number
      ? transactions.filter(
          t =>
            t.reference_number === tx.reference_number &&
            t.id !== id &&
            t.status === 'completed'
        )
      : [];

    let confirmMsg = 'Apakah Anda yakin ingin membatalkan transaksi ini?';

    if (sameBatch.length > 0) {
      confirmMsg =
        `Transaksi ini adalah bagian dari alokasi pemasukan bersama ` +
        `${sameBatch.length} akun lainnya (Ref: ${tx.reference_number}). ` +
        'Batalkan seluruh alokasi pemasukan ini?';
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      if (sameBatch.length > 0 && tx.reference_number) {
        await transactionService.cancelTransactionBatch(tx.reference_number);
      } else {
        await transactionService.cancelTransaction(id);
      }

      await fetchTransactions();
      await fetchMetadata();
    } catch (err: any) {
      alert(
        'Gagal membatalkan transaksi: ' +
        (err.message || 'Terjadi kesalahan')
      );
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (formData.is_breakdown && formData.allocations) {
        await transactionService.createIncomeWithBreakdown(formData);
      } else {
        await transactionService.createTransaction(formData);
      }

      setShowForm({ type: null, open: false });

      await fetchTransactions();
      await fetchMetadata();
    } catch (err: any) {
      const isRls =
        err.code === '42501' ||
        err.message?.includes('violates row-level security');

      const rlsMsg = isRls
        ? '\n\nCatatan: Izin penambahan transaksi belum aktif di Supabase. Pastikan RLS Policy INSERT untuk tabel "transactions" sudah diaktifkan di Supabase SQL Editor.'
        : '';

      alert(
        'Gagal menyimpan transaksi: ' +
        (err.message || 'Terjadi kesalahan') +
        rlsMsg
      );
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Transaksi"
        description="Catat dan pantau semua arus kas bisnis Anda di sini."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton
              title="Transaksi"
              content={`Halaman Transaksi digunakan untuk mencatat semua uang masuk, uang keluar, dan perpindahan uang antar rekening.

PEMASUKAN: Uang masuk ke bisnis Anda dengan auto breakdown ke kantong akun sesuai persentase bisnis.
PENGELUARAN: Biaya operasional atau belanja bisnis dari satu rekening.
TRANSFER: Pemindahan saldo antar rekening Anda sendiri. Transfer tidak dihitung sebagai pemasukan atau pengeluaran bisnis.`}
            />

            <button
              onClick={() => setShowForm({ type: 'income', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
            >
              <Plus size={16} />
              Pemasukan
            </button>

            <button
              onClick={() => setShowForm({ type: 'expense', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-900/20 cursor-pointer"
            >
              <Plus size={16} />
              Pengeluaran
            </button>

            <button
              onClick={() => setShowForm({ type: 'transfer', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              <ArrowRightLeft size={16} />
              Transfer
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={filters.search}
            onChange={e =>
              setFilters(prev => ({ ...prev, search: e.target.value }))
            }
            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white"
          />
        </div>

        <div>
          <select
            value={filters.businessId}
            onChange={e =>
              setFilters(prev => ({ ...prev, businessId: e.target.value }))
            }
            className="w-full bg-black border border-white/10 rounded-xl text-sm text-white focus:ring-0 cursor-pointer py-3 px-4 appearance-none"
          >
            <option key="all-businesses" value="all">
              Semua Bisnis
            </option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filters.type}
            onChange={e =>
              setFilters(prev => ({ ...prev, type: e.target.value }))
            }
            className="w-full bg-black border border-white/10 rounded-xl text-sm text-white focus:ring-0 cursor-pointer py-3 px-4 appearance-none"
          >
            <option value="all">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl px-4">
          <Calendar size={16} className="text-gray-500 shrink-0" />
          <div className="flex items-center gap-2 w-full">
            <input
              type="date"
              value={filters.startDate}
              onChange={e =>
                setFilters(prev => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full bg-transparent border-none text-[11px] text-white focus:ring-0 cursor-pointer py-3"
            />
            <span className="text-gray-600">-</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e =>
                setFilters(prev => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full bg-transparent border-none text-[11px] text-white focus:ring-0 cursor-pointer py-3"
            />
          </div>
        </div>

        <button
          onClick={() =>
            setFilters({
              businessId: 'all',
              startDate: '',
              endDate: '',
              search: '',
              type: 'all'
            })
          }
          className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer py-3"
        >
          Reset Filter
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          message="Tidak ditemukan transaksi yang sesuai."
          action={
            <button
              onClick={() =>
                setFilters({
                  businessId: 'all',
                  startDate: '',
                  endDate: '',
                  search: '',
                  type: 'all'
                })
              }
              className="text-amber-500 text-xs font-bold uppercase tracking-widest hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          }
        />
      ) : (
        <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Jenis
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Bisnis / Akun
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Kategori / Ket.
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">
                    Nominal
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map(tx => (
                  <tr
                    key={tx.id}
                    className={cn(
                      'hover:bg-white/[0.02] transition-colors group',
                      tx.status === 'cancelled' && 'opacity-40'
                    )}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">
                        {format(
                          new Date(tx.transaction_date),
                          'dd MMM yyyy'
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                        {format(new Date(tx.created_at), 'HH:mm')}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md',
                          tx.transaction_type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : tx.transaction_type === 'expense'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-blue-500/10 text-blue-500'
                        )}
                      >
                        {tx.transaction_type === 'income' ? (
                          <Plus size={10} />
                        ) : tx.transaction_type === 'expense' ? (
                          <Trash2 size={10} />
                        ) : (
                          <ArrowRightLeft size={10} />
                        )}
                        {tx.transaction_type}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-white uppercase tracking-tight">
                        {tx.business?.name || 'Unknown Business'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                        <CreditCard size={10} />
                        <span className="text-[10px] font-medium">
                          {tx.account?.name || 'Unknown Account'}
                        </span>

                        {tx.transaction_type === 'transfer' && (
                          <>
                            <ArrowRightLeft size={10} className="mx-1" />
                            <span className="text-[10px] font-medium text-blue-400">
                              {tx.transfer_to_account?.name || 'Unknown Account'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                        <Tag size={12} className="text-amber-500/50" />
                        {tx.category?.name ||
                          (tx.transaction_type === 'transfer'
                            ? 'Transfer Saldo'
                            : 'Tanpa kategori')}
                      </div>

                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                        {tx.description || '-'}
                      </p>

                      {tx.reference_number && (
                        <p className="text-[9px] font-mono text-gray-600 mt-0.5">
                          Ref: {tx.reference_number}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <p
                        className={cn(
                          'text-sm font-mono font-bold tabular-nums',
                          tx.transaction_type === 'income'
                            ? 'text-emerald-500'
                            : tx.transaction_type === 'expense'
                              ? 'text-red-400'
                              : 'text-blue-400'
                        )}
                      >
                        {tx.transaction_type === 'expense' ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {tx.status === 'completed' ? (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500/50">
                          <CheckCircle2 size={10} />
                          LUNAS
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500/50">
                          <Ban size={10} />
                          BATAL
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {tx.status === 'completed' && (
                        <button
                          onClick={() => handleCancelTransaction(tx.id)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Batalkan Transaksi"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showForm.open && (
        <TransactionForm
          type={showForm.type!}
          businesses={businesses}
          accounts={accounts}
          categories={categories}
          initialBusinessId={filters.businessId}
          onClose={() => setShowForm({ type: null, open: false })}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

function TransactionForm({
  type,
  businesses,
  accounts,
  categories,
  initialBusinessId,
  onClose,
  onSubmit
}: {
  type: TransactionType;
  businesses: Business[];
  accounts: Account[];
  categories: Category[];
  initialBusinessId?: string;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const defaultBizId =
    initialBusinessId && initialBusinessId !== 'all'
      ? initialBusinessId
      : businesses[0]?.id || '';

  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [businessId, setBusinessId] = useState(defaultBizId);
  const [accountId, setAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  type AllocationItemState = {
    key: string;
    name: string;
    percent: number;
    amount: number;
    account_id: string;
    is_manual: boolean;
    description?: string;
  };

  const [allocations, setAllocations] = useState<AllocationItemState[]>([]);
  const [showManualConflictPrompt, setShowManualConflictPrompt] =
    useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const businessAccounts = useMemo(() => {
    return accounts.filter(a => a.business_id === businessId);
  }, [accounts, businessId]);

  const selectedSourceAccount = useMemo(() => {
    return businessAccounts.find(a => a.id === accountId);
  }, [businessAccounts, accountId]);

  const projectedExpenseBalance = selectedSourceAccount
    ? selectedSourceAccount.current_balance - (amount || 0)
    : 0;

  const isExpenseDeficit = Boolean(
    selectedSourceAccount &&
    amount > 0 &&
    projectedExpenseBalance < 0
  );

  useEffect(() => {
    if (accountId && !businessAccounts.some(a => a.id === accountId)) {
      setAccountId('');
    }

    if (
      transferToAccountId &&
      !businessAccounts.some(a => a.id === transferToAccountId)
    ) {
      setTransferToAccountId('');
    }
  }, [businessAccounts, accountId, transferToAccountId]);

  const selectedBusiness = useMemo(() => {
    return businesses.find(b => b.id === businessId);
  }, [businesses, businessId]);

  const currentRules = useMemo(() => {
    return getAllocationRulesForBusiness(selectedBusiness);
  }, [selectedBusiness]);

  const rulesValidation = useMemo(() => {
    return validateAllocationRules(currentRules);
  }, [currentRules]);

  const availableCategories = useMemo(() => {
    return categories.filter(c =>
      type === 'income'
        ? c.category_type === 'revenue'
        : type === 'expense'
          ? c.category_type === 'expense'
          : false
    );
  }, [categories, type]);

  useEffect(() => {
    if (type !== 'income') return;

    const rules = currentRules;
    const calculated = calculateDeterministicAllocations(amount, rules);

    const items: AllocationItemState[] = rules.map((rule, idx) => {
      const matched = matchAccountForAllocation(
        businessAccounts,
        rule.name,
        rule.percent
      );

      return {
        key: `alloc-${idx}-${rule.name}`,
        name: rule.name,
        percent: rule.percent,
        amount: calculated[idx]?.amount || 0,
        account_id: matched?.id || '',
        is_manual: false,
        description: rule.description
      };
    });

    setAllocations(items);
    setShowManualConflictPrompt(false);
    setPendingAmount(null);

    // Kategori boleh kosong. Jika kategori belum dipilih,
    // sistem boleh memberi kategori awal yang bisa dihapus oleh pengguna.
    if (!categoryId && availableCategories.length > 0) {
      const defaultCat =
        availableCategories.find(c =>
          c.name.toLowerCase().includes('jual')
        ) || availableCategories[0];

      if (defaultCat) setCategoryId(defaultCat.id);
    }
  }, [businessId, type, selectedBusiness, businessAccounts]);

  const hasManualEdit = useMemo(() => {
    return allocations.some(a => a.is_manual);
  }, [allocations]);

  const totalAllocated = useMemo(() => {
    return allocations.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );
  }, [allocations]);

  const allocationDiff = amount - totalAllocated;
  const isAllocationBalanced = amount > 0 && allocationDiff === 0;
  const hasUnmappedAccount = allocations.some(
    a => a.amount > 0 && !a.account_id
  );
  const hasNegativeAllocation = allocations.some(a => a.amount < 0);

  const handleTotalAmountChange = (newAmount: number) => {
    const validAmount = Math.max(0, Math.floor(newAmount || 0));
    setAmount(validAmount);

    if (type === 'income') {
      if (hasManualEdit) {
        setPendingAmount(validAmount);
        setShowManualConflictPrompt(true);
      } else {
        const calculated = calculateDeterministicAllocations(
          validAmount,
          currentRules
        );

        setAllocations(prev =>
          prev.map((item, idx) => ({
            ...item,
            amount: calculated[idx]?.amount ?? 0,
            is_manual: false
          }))
        );
      }
    }
  };

  const handleRecalculateFromPercentage = () => {
    const targetAmount =
      pendingAmount !== null ? pendingAmount : amount;

    const calculated = calculateDeterministicAllocations(
      targetAmount,
      currentRules
    );

    setAllocations(prev =>
      prev.map((item, idx) => ({
        ...item,
        amount: calculated[idx]?.amount ?? 0,
        is_manual: false
      }))
    );

    setShowManualConflictPrompt(false);
    setPendingAmount(null);
  };

  const handleKeepManualNominals = () => {
    setShowManualConflictPrompt(false);
    setPendingAmount(null);
  };

  const handleAllocationAmountChange = (
    index: number,
    newAllocAmount: number
  ) => {
    const validAllocAmount = Math.max(
      0,
      Math.floor(newAllocAmount || 0)
    );

    setAllocations(prev => {
      const next = [...prev];

      next[index] = {
        ...next[index],
        amount: validAllocAmount,
        is_manual: true
      };

      return next;
    });

    setShowManualConflictPrompt(false);
  };

  const handleAllocationAccountChange = (
    index: number,
    newAccountId: string
  ) => {
    setAllocations(prev => {
      const next = [...prev];

      next[index] = {
        ...next[index],
        account_id: newAccountId
      };

      return next;
    });
  };

  const handleResetAllocations = () => {
    const calculated = calculateDeterministicAllocations(
      amount,
      currentRules
    );

    setAllocations(prev =>
      prev.map((item, idx) => ({
        ...item,
        amount: calculated[idx]?.amount ?? 0,
        is_manual: false
      }))
    );

    setShowManualConflictPrompt(false);
    setPendingAmount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!transactionDate) {
      return alert('Tanggal transaksi wajib diisi.');
    }

    if (!businessId) {
      return alert('Bisnis wajib dipilih.');
    }

    if (type === 'income') {
      if (amount <= 0) {
        return alert('Nominal pemasukan harus lebih dari 0.');
      }

      // Kategori pemasukan bersifat opsional.
      if (!rulesValidation.valid) {
        return alert(
          `Konfigurasi persentase bisnis belum valid (${rulesValidation.totalPercent}%). Transaksi tidak dapat disimpan.`
        );
      }

      if (!isAllocationBalanced) {
        if (allocationDiff > 0) {
          return alert(
            `Total alokasi belum mencapai total pemasukan. Sisa belum dialokasikan: ${formatCurrency(allocationDiff)}.`
          );
        }

        return alert(
          `Total alokasi melebihi total pemasukan. Kelebihan alokasi: ${formatCurrency(Math.abs(allocationDiff))}.`
        );
      }

      if (hasUnmappedAccount) {
        return alert(
          'Semua alokasi bernilai lebih dari 0 harus memiliki akun tujuan yang dipilih.'
        );
      }

      if (hasNegativeAllocation) {
        return alert('Nominal alokasi tidak boleh bernilai negatif.');
      }

      setSubmitting(true);

      try {
        await onSubmit({
          is_breakdown: true,
          transaction_date: transactionDate,
          business_id: businessId,
          category_id: categoryId || null,
          total_amount: amount,
          description,
          allocations: allocations.map(a => ({
            name: a.name,
            percent: a.percent,
            amount: a.amount,
            account_id: a.account_id,
            is_manual: a.is_manual
          }))
        });
      } finally {
        setSubmitting(false);
      }
    } else if (type === 'expense') {
      if (!accountId) {
        return alert('Akun sumber pengeluaran wajib dipilih.');
      }

      // Kategori pengeluaran bersifat opsional.
      if (amount <= 0) {
        return alert(
          'Nominal pengeluaran harus berupa angka positif lebih dari 0.'
        );
      }

      if (
        selectedSourceAccount &&
        selectedSourceAccount.current_balance < amount
      ) {
        const proceed = window.confirm(
          `Perhatian: Nominal pengeluaran (${formatCurrency(amount)}) melebihi saldo akun "${selectedSourceAccount.name}" saat ini (${formatCurrency(selectedSourceAccount.current_balance)}).\n\n` +
          `Saldo akhir akun akan menjadi negatif (${formatCurrency(selectedSourceAccount.current_balance - amount)}).\n` +
          'Apakah Anda yakin ingin tetap menyimpan transaksi pengeluaran ini?'
        );

        if (!proceed) return;
      }

      setSubmitting(true);

      try {
        await onSubmit({
          transaction_date: transactionDate,
          business_id: businessId,
          account_id: accountId,
          category_id: categoryId || null,
          amount,
          description: description.trim() || null,
          transaction_type: 'expense',
          transfer_to_account_id: null
        });
      } finally {
        setSubmitting(false);
      }
    } else if (type === 'transfer') {
      if (!accountId) {
        return alert('Akun asal wajib dipilih.');
      }

      if (!transferToAccountId) {
        return alert('Akun tujuan wajib dipilih.');
      }

      if (accountId === transferToAccountId) {
        return alert('Akun asal dan tujuan tidak boleh sama.');
      }

      if (amount <= 0) {
        return alert('Nominal transfer harus lebih dari 0.');
      }

      setSubmitting(true);

      try {
        await onSubmit({
          transaction_date: transactionDate,
          business_id: businessId,
          account_id: accountId,
          transfer_to_account_id: transferToAccountId,
          amount,
          description,
          transaction_type: 'transfer',
          category_id: null
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          'bg-[#121212] border border-white/10 rounded-3xl w-full overflow-hidden shadow-2xl max-h-[92vh] flex flex-col',
          type === 'income' ? 'max-w-2xl sm:max-w-3xl' : 'max-w-xl'
        )}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border',
                type === 'income'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : type === 'expense'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              )}
            >
              {type === 'income' ? (
                <Plus size={20} />
              ) : type === 'expense' ? (
                <Trash2 size={20} />
              ) : (
                <ArrowRightLeft size={20} />
              )}
            </div>

            Tambah{' '}
            {type === 'income'
              ? 'Pemasukan (Auto Breakdown)'
              : type === 'expense'
                ? 'Pengeluaran'
                : 'Transfer'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1"
        >
          {/* Tanggal & Bisnis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Tanggal Transaksi
              </label>

              <div className="relative">
                <Calendar
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={16}
                />

                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={e => setTransactionDate(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Unit Bisnis
              </label>

              <div className="relative">
                <Building
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={16}
                />

                <select
                  required
                  value={businessId}
                  onChange={e => {
                    setBusinessId(e.target.value);
                    setAccountId('');
                    setTransferToAccountId('');
                  }}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none cursor-pointer"
                >
                  <option key="select-business" value="" disabled>
                    Pilih Bisnis
                  </option>

                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Kategori pemasukan */}
          {type === 'income' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Kategori Pemasukan (Opsional)
              </label>

              <div className="relative">
                <Tag
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={16}
                />

                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none cursor-pointer"
                >
                  <option value="">Tanpa kategori</option>

                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {type === 'expense'
                      ? 'Akun Sumber Pengeluaran'
                      : 'Dari Rekening'}
                  </label>

                  <div className="relative">
                    <CreditCard
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                      size={16}
                    />

                    <select
                      required
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none cursor-pointer"
                    >
                      <option key="select-account" value="" disabled>
                        -- Pilih Akun Sumber --
                      </option>

                      {businessAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(a.current_balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {businessAccounts.length === 0 && (
                    <p className="text-[11px] text-amber-400">
                      ⚠️ Belum ada akun rekening untuk unit bisnis ini. Buat
                      akun di menu Akun & Kas.
                    </p>
                  )}
                </div>

                {type === 'transfer' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Ke Rekening
                    </label>

                    <div className="relative">
                      <CreditCard
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                        size={16}
                      />

                      <select
                        required
                        value={transferToAccountId}
                        onChange={e =>
                          setTransferToAccountId(e.target.value)
                        }
                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Pilih Akun Tujuan
                        </option>

                        {businessAccounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.current_balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Kategori Pengeluaran (Opsional)
                    </label>

                    <div className="relative">
                      <Tag
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                        size={16}
                      />

                      <select
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none cursor-pointer"
                      >
                        <option value="">Tanpa kategori</option>

                        {availableCategories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {availableCategories.length === 0 && (
                      <p className="text-[11px] text-amber-400">
                        Belum ada kategori pengeluaran. Transaksi tetap bisa
                        disimpan tanpa kategori.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status & Validasi Saldo Akun Sumber */}
              {type === 'expense' && selectedSourceAccount && (
                <div
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all text-xs space-y-2',
                    isExpenseDeficit
                      ? 'bg-amber-500/[0.08] border-amber-500/30 text-amber-200'
                      : 'bg-white/[0.02] border-white/10 text-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-gray-500" />
                      Saldo Akun{' '}
                      <strong className="text-white font-medium">
                        {selectedSourceAccount.name}
                      </strong>
                      :
                    </span>

                    <span className="font-mono font-bold text-white text-sm">
                      {formatCurrency(selectedSourceAccount.current_balance)}
                    </span>
                  </div>

                  {amount > 0 && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                      <span className="text-gray-400">
                        Estimasi Saldo Setelah Pengeluaran:
                      </span>

                      <span
                        className={cn(
                          'font-mono font-bold text-sm',
                          isExpenseDeficit
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {formatCurrency(projectedExpenseBalance)}
                      </span>
                    </div>
                  )}

                  {isExpenseDeficit && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      <AlertTriangle
                        size={15}
                        className="shrink-0 mt-0.5 text-amber-400"
                      />

                      <span>
                        <strong>Peringatan Defisit:</strong> Pengeluaran
                        sebesar {formatCurrency(amount)} melebihi saldo akun
                        saat ini (
                        {formatCurrency(selectedSourceAccount.current_balance)}
                        ). Saldo akan berkurang menjadi minus{' '}
                        {formatCurrency(Math.abs(projectedExpenseBalance))}.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nominal Utama */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {type === 'income'
                ? 'Total Nominal Pemasukan Utuh (IDR)'
                : 'Nominal Transaksi (IDR)'}
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold">
                Rp
              </span>

              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={amount || ''}
                onChange={e =>
                  handleTotalAmountChange(Number(e.target.value))
                }
                className="w-full bg-white/[0.05] border border-amber-500/20 rounded-2xl py-4 pl-12 pr-4 text-2xl font-mono font-bold text-white focus:border-amber-500 focus:ring-0 transition-all tabular-nums"
              />
            </div>

            {amount > 0 && (
              <p className="text-xs text-amber-400 font-mono pl-1">
                {formatCurrency(amount)}
              </p>
            )}
          </div>

          {/* Prompt jika nominal berubah setelah edit alokasi manual */}
          {type === 'income' && showManualConflictPrompt && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  size={18}
                  className="shrink-0 mt-0.5 text-amber-400"
                />

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    Nominal total diubah menjadi {formatCurrency(amount)},
                    sementara Anda telah memiliki alokasi manual.
                  </p>

                  <p className="text-[11px] text-amber-200/80">
                    Pilih opsi penyesuaian yang Anda inginkan:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRecalculateFromPercentage}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  1. Hitung Ulang Berdasarkan Persentase
                </button>

                <button
                  type="button"
                  onClick={handleKeepManualNominals}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  2. Pertahankan Nominal Manual & Perbarui Selisih
                </button>
              </div>
            </div>
          )}

          {/* Auto Breakdown Pemasukan */}
          {type === 'income' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <PieChart size={16} className="text-amber-500" />
                    Breakdown Alokasi Otomatis (
                    {selectedBusiness?.name || 'Bisnis'})
                  </h4>

                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Dihitung otomatis sesuai persentase bisnis. Nominal setiap
                    alokasi dapat diedit secara manual.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetAllocations}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors self-start sm:self-auto cursor-pointer"
                  title="Kembalikan semua alokasi ke persentase otomatis"
                >
                  <RotateCcw size={12} />
                  Reset ke Persentase Otomatis
                </button>
              </div>

              {!rulesValidation.valid && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Konfigurasi persentase untuk unit bisnis ini tidak
                    berjumlah 100% (total saat ini:{' '}
                    {rulesValidation.totalPercent}%). Transaksi tidak dapat
                    disimpan sampai konfigurasi diperbaiki.
                  </span>
                </div>
              )}

              {/* Daftar Alokasi */}
              <div className="space-y-3">
                {allocations.map((item, idx) => (
                  <div
                    key={item.key}
                    className={cn(
                      'p-4 bg-white/[0.02] border rounded-2xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4 group transition-all',
                      item.is_manual
                        ? 'border-amber-500/30 bg-amber-500/[0.02]'
                        : 'border-white/5 hover:border-amber-500/20'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {item.name}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400">
                          {item.percent}%
                        </span>

                        {item.is_manual && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Manual
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {item.description}
                        </p>
                      )}

                      {/* Akun untuk setiap alokasi */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <CreditCard
                          size={12}
                          className={
                            item.account_id
                              ? 'text-gray-500'
                              : 'text-amber-500'
                          }
                        />

                        <select
                          value={item.account_id}
                          onChange={e =>
                            handleAllocationAccountChange(idx, e.target.value)
                          }
                          className={cn(
                            'text-xs rounded-lg px-2.5 py-1.5 border focus:ring-0 cursor-pointer bg-[#121212] max-w-full sm:max-w-xs',
                            item.account_id
                              ? 'border-white/10 text-gray-300 focus:border-amber-500/50'
                              : 'border-amber-500/50 text-amber-400 bg-amber-500/5'
                          )}
                        >
                          <option value="" disabled>
                            -- Pilih Akun Rekening --
                          </option>

                          {businessAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.current_balance)})
                            </option>
                          ))}
                        </select>

                        {!item.account_id && item.amount > 0 && (
                          <span className="text-[10px] font-bold text-red-400">
                            ⚠️ Akun belum dipilih
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nominal Alokasi */}
                    <div className="w-full sm:w-48 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                          Rp
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={item.amount || ''}
                          placeholder="0"
                          onChange={e =>
                            handleAllocationAmountChange(
                              idx,
                              Number(e.target.value)
                            )
                          }
                          className={cn(
                            'w-full bg-white/[0.03] border rounded-xl py-2 pl-9 pr-3 text-sm font-mono font-bold text-white focus:ring-0 transition-all tabular-nums text-right',
                            item.is_manual
                              ? 'border-amber-500/50 text-amber-300 bg-amber-500/5'
                              : 'border-white/10 focus:border-amber-500/50'
                          )}
                        />
                      </div>

                      <p className="text-[10px] font-mono text-gray-500 text-right mt-1">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ringkasan Alokasi */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-400">Total Pemasukan:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatCurrency(amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-400">
                    Total Seluruh Alokasi:
                  </span>

                  <span
                    className={cn(
                      'font-mono font-bold text-sm',
                      isAllocationBalanced
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    )}
                  >
                    {formatCurrency(totalAllocated)}
                  </span>
                </div>

                <div className="h-px bg-white/5" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Status Alokasi
                  </span>

                  {amount === 0 ? (
                    <span className="text-xs text-gray-500 italic">
                      Masukkan nominal total
                    </span>
                  ) : isAllocationBalanced ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      <CheckCircle2 size={14} />
                      Alokasi Sesuai (100% - {formatCurrency(amount)})
                    </div>
                  ) : allocationDiff > 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                      <AlertCircle size={14} />
                      Kurang {formatCurrency(allocationDiff)} (Belum
                      dialokasikan)
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                      <AlertCircle size={14} />
                      Lebih {formatCurrency(Math.abs(allocationDiff))}{' '}
                      (Melebihi total)
                    </div>
                  )}
                </div>

                {hasUnmappedAccount && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle
                      size={16}
                      className="shrink-0 mt-0.5"
                    />
                    <span>
                      Ada alokasi bernilai lebih dari 0 yang belum memiliki
                      akun tujuan. Silakan pilih akun rekening yang sesuai
                      pada baris alokasi di atas.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keterangan */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Keterangan / Catatan
            </label>

            <div className="relative">
              <FileText
                className="absolute left-4 top-4 text-gray-600"
                size={16}
              />

              <textarea
                placeholder="Tulis catatan transaksi di sini (misal: Penjualan produk/jasa)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white min-h-[90px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                (type === 'income' &&
                  (!isAllocationBalanced ||
                    hasUnmappedAccount ||
                    !rulesValidation.valid ||
                    hasNegativeAllocation)) ||
                // Kategori tidak menjadi syarat penyimpanan pengeluaran.
                (type === 'expense' && (!accountId || amount <= 0)) ||
                (type === 'transfer' &&
                  (!accountId ||
                    !transferToAccountId ||
                    accountId === transferToAccountId ||
                    amount <= 0))
              }
              className={cn(
                'flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                  : type === 'expense'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
              )}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

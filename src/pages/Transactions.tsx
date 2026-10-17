import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowRightLeft, 
  Filter, 
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
  Ban
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

  const [showForm, setShowForm] = useState<{ type: TransactionType | null; open: boolean }>({
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

      // Deduplicate by ID
      const biz = rawBiz.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const accs = rawAccs.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const cats = rawCats.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      console.log(`[FinanceKu] Metadata loaded: Biz ${biz.length}, Accs ${accs.length}, Cats ${cats.length}`);
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

      // Deduplicate by ID
      const txs = rawTxs.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      console.log(`[FinanceKu] Transactions loaded: ${txs.length}`);
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
    // Deduplicate by ID just in case the database has duplicates
    const uniqueTxs = transactions.filter((tx, index, self) =>
      index === self.findIndex((t) => t.id === tx.id)
    );

    return uniqueTxs.map(tx => ({
      ...tx,
      business: businesses.find(b => b.id === tx.business_id),
      account: accounts.find(a => a.id === tx.account_id),
      category: categories.find(c => c.id === tx.category_id),
      transfer_to_account: accounts.find(a => a.id === tx.transfer_to_account_id)
    })) as TransactionWithDetails[];
  }, [transactions, businesses, accounts, categories]);

  const filteredTransactions = useMemo(() => {
    let result = enrichedTransactions;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(tx => 
        tx.description?.toLowerCase().includes(search) ||
        tx.account?.name.toLowerCase().includes(search) ||
        tx.category?.name.toLowerCase().includes(search) ||
        tx.business?.name.toLowerCase().includes(search)
      );
    }

    if (filters.type !== 'all') {
      result = result.filter(tx => tx.transaction_type === filters.type);
    }

    return result;
  }, [enrichedTransactions, filters.search, filters.type]);

  const handleCancelTransaction = async (id: string) => {
    if (!window.confirm('Batalkan transaksi ini? Transaksi yang dibatalkan tidak akan dihitung dalam laporan.')) return;
    try {
      await transactionService.cancelTransaction(id);
      fetchTransactions();
    } catch (err: any) {
      alert('Gagal membatalkan transaksi.');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      await transactionService.createTransaction(formData);
      setShowForm({ type: null, open: false });
      fetchTransactions();
      // Also refresh accounts in metadata for updated balances if needed
      fetchMetadata();
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    }
  };

  if (error) return <ErrorState message={error} onRetry={fetchTransactions} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Transaksi" 
        description="Catat dan pantau semua arus kas bisnis Anda di sini."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton 
              title="Transaksi" 
              content="Halaman Transaksi digunakan untuk mencatat semua uang masuk, uang keluar, dan perpindahan uang antar rekening.

PEMASUKAN: Uang masuk ke bisnis Anda.
PENGELUARAN: Biaya operasional atau belanja bisnis.
TRANSFER: Pemindahan saldo antar rekening Anda sendiri. Transfer tidak dihitung sebagai pemasukan atau pengeluaran bisnis." 
            />
            
            <button 
              onClick={() => setShowForm({ type: 'income', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
            >
              <Plus size={16} />
              Pemasukan
            </button>
            <button 
              onClick={() => setShowForm({ type: 'expense', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
            >
              <Plus size={16} />
              Pengeluaran
            </button>
            <button 
              onClick={() => setShowForm({ type: 'transfer', open: true })}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
            >
              <ArrowRightLeft size={16} />
              Transfer
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            placeholder="Cari transaksi..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white"
          />
        </div>

        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-4">
          <Building size={16} className="text-gray-500" />
          <select 
            value={filters.businessId}
            onChange={(e) => setFilters(prev => ({ ...prev, businessId: e.target.value }))}
            className="w-full bg-black border-none text-sm text-white focus:ring-0 cursor-pointer py-3 appearance-none"
          >
            <option key="all-businesses" value="all">Semua Bisnis</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-4">
          <Filter size={16} className="text-gray-500" />
          <select 
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full bg-black border-none text-sm text-white focus:ring-0 cursor-pointer py-3 appearance-none"
          >
            <option value="all">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-4">
          <Calendar size={16} className="text-gray-500" />
          <div className="flex items-center gap-2 w-full">
            <input 
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full bg-black border-none text-[10px] text-white focus:ring-0 cursor-pointer py-3"
            />
            <span className="text-gray-600">-</span>
            <input 
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full bg-black border-none text-[10px] text-white focus:ring-0 cursor-pointer py-3"
            />
          </div>
        </div>

        <button 
          onClick={() => setFilters({ businessId: 'all', startDate: '', endDate: '', search: '', type: 'all' })}
          className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
              onClick={() => setFilters({ businessId: 'all', startDate: '', endDate: '', search: '', type: 'all' })}
              className="text-amber-500 text-xs font-bold uppercase tracking-widest hover:underline"
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Jenis</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Bisnis / Akun</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Kategori / Ket.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Nominal</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className={cn(
                    "hover:bg-white/[0.02] transition-colors group",
                    tx.status === 'cancelled' && "opacity-40"
                  )}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{format(new Date(tx.transaction_date), 'dd MMM yyyy')}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">{format(new Date(tx.created_at), 'HH:mm')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                        tx.transaction_type === 'income' ? "bg-emerald-500/10 text-emerald-500" :
                        tx.transaction_type === 'expense' ? "bg-red-500/10 text-red-500" :
                        "bg-blue-500/10 text-blue-500"
                      )}>
                        {tx.transaction_type === 'income' ? <Plus size={10} /> : 
                         tx.transaction_type === 'expense' ? <Trash2 size={10} /> : 
                         <ArrowRightLeft size={10} />}
                        {tx.transaction_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-white uppercase tracking-tight">{tx.business?.name || 'Unknown Business'}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                        <CreditCard size={10} />
                        <span className="text-[10px] font-medium">{tx.account?.name || 'Unknown Account'}</span>
                        {tx.transaction_type === 'transfer' && (
                          <>
                            <ArrowRightLeft size={10} className="mx-1" />
                            <span className="text-[10px] font-medium text-blue-400">{tx.transfer_to_account?.name || 'Unknown Account'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                        <Tag size={12} className="text-amber-500/50" />
                        {tx.category?.name || 'Transfer Saldo'}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{tx.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        tx.transaction_type === 'income' ? "text-emerald-500" : 
                        tx.transaction_type === 'expense' ? "text-red-400" : 
                        "text-blue-400"
                      )}>
                        {tx.transaction_type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
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
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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
          onClose={() => setShowForm({ type: null, open: false })}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

function TransactionForm({ type, businesses, accounts, categories, onClose, onSubmit }: {
  type: TransactionType;
  businesses: Business[];
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    business_id: businesses[0]?.id || '',
    account_id: '',
    category_id: '',
    amount: 0,
    description: '',
    transfer_to_account_id: '',
    transaction_type: type
  });

  const filteredAccounts = accounts.filter(a => a.business_id === formData.business_id);
  const filteredCategories = categories.filter(c => 
    type === 'income' ? c.category_type === 'revenue' : 
    type === 'expense' ? c.category_type === 'expense' : 
    false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.transaction_date) return alert('Tanggal wajib diisi.');
    if (!formData.business_id) return alert('Bisnis wajib dipilih.');
    if (!formData.account_id) return alert('Akun wajib dipilih.');
    if (type !== 'transfer' && !formData.category_id) return alert('Kategori wajib dipilih.');
    if (type === 'transfer' && !formData.transfer_to_account_id) return alert('Akun tujuan wajib dipilih.');
    if (type === 'transfer' && formData.account_id === formData.transfer_to_account_id) return alert('Akun asal dan tujuan tidak boleh sama.');
    if (formData.amount <= 0) return alert('Nominal harus lebih dari 0.');

    onSubmit({
      ...formData,
      category_id: type === 'transfer' ? null : formData.category_id,
      transfer_to_account_id: type === 'transfer' ? formData.transfer_to_account_id : null
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              type === 'income' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
              type === 'expense' ? "bg-red-500/10 border-red-500/20 text-red-500" :
              "bg-blue-500/10 border-blue-500/20 text-blue-500"
            )}>
              {type === 'income' ? <Plus size={20} /> : type === 'expense' ? <Trash2 size={20} /> : <ArrowRightLeft size={20} />}
            </div>
            Tambah {type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transfer'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input 
                  type="date"
                  required
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bisnis</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <select 
                  required
                  value={formData.business_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_id: e.target.value, account_id: '', transfer_to_account_id: '' }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none"
                >
                  <option key="select-business" value="" disabled>Pilih Bisnis</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {type === 'income' ? 'Akun Tujuan' : type === 'expense' ? 'Akun Sumber' : 'Dari Rekening'}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <select 
                  required
                  value={formData.account_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none"
                >
                  <option key="select-account" value="" disabled>Pilih Akun</option>
                  {filteredAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance)})</option>
                  ))}
                </select>
              </div>
            </div>

            {type === 'transfer' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ke Rekening</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <select 
                    required
                    value={formData.transfer_to_account_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, transfer_to_account_id: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none"
                  >
                    <option value="" disabled>Pilih Akun Tujuan</option>
                    {filteredAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Kategori</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <select 
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white appearance-none"
                  >
                    <option key="select-category" value="" disabled>Pilih Kategori</option>
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nominal (IDR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold">Rp</span>
              <input 
                type="number"
                required
                min="1"
                placeholder="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full bg-white/[0.05] border border-amber-500/20 rounded-2xl py-5 pl-12 pr-4 text-2xl font-mono font-bold text-white focus:border-amber-500 focus:ring-0 transition-all tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Keterangan</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 text-gray-600" size={16} />
              <textarea 
                placeholder="Tulis catatan di sini..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 focus:ring-0 transition-all text-white min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
            >
              Batal
            </button>
            <button 
              type="submit"
              className={cn(
                "flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl",
                type === 'income' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20" :
                type === 'expense' ? "bg-red-600 hover:bg-red-500 shadow-red-900/20" :
                "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
              )}
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

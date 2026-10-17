import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Wallet, 
  Plus, 
  ArrowRightLeft,
  Calendar,
  Building
} from 'lucide-react';
import { 
  StatCard, 
  PageHeader, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  GuideButton
} from '@/src/components/Common';
import { businessService, accountService, transactionService, categoryService } from '@/src/services/dataService';
import type { Business, Account, Category, Transaction } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState({
    start: '', // Default to empty for 'Semua Periode'
    end: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBusiness, dateRange]);

  const fetchInitialData = async () => {
    try {
      const [rawBiz, rawCats] = await Promise.all([
        businessService.getAll(),
        categoryService.getAll()
      ]);
      
      // Deduplicate by ID
      const biz = rawBiz.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const cats = rawCats.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      console.log(`[FinanceKu] Businesses loaded: ${biz.length}`);
      console.log(`[FinanceKu] Categories loaded: ${cats.length}`);
      setBusinesses(biz);
      setCategories(cats);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load metadata', err);
      // Don't set error here, let fetchDashboardData handle it if critical
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [rawAccs, rawTxs] = await Promise.all([
        accountService.getByBusiness(selectedBusiness),
        transactionService.getTransactions({
          businessId: selectedBusiness,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined
        })
      ]);
      
      // Deduplicate by ID
      const accs = rawAccs.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const txs = rawTxs.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      
      console.log(`[FinanceKu] Accounts loaded: ${accs.length}`);
      console.log(`[FinanceKu] Transactions loaded: ${txs.length}`);
      
      setAccounts(accs);
      setTransactions(txs);
      setError(null);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load dashboard data', err);
      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeTxs = transactions.filter(t => t.status === 'completed');
    
    const income = activeTxs
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = activeTxs
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    
    return {
      income,
      expense,
      diff: income - expense,
      currentBalance
    };
  }, [transactions, accounts]);

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
    }));
  }, [transactions, businesses, accounts, categories]);

  const chartData = useMemo(() => {
    const data: Record<string, { date: string, income: number, expense: number }> = {};
    const activeTxs = transactions.filter(t => t.status === 'completed');
    
    activeTxs.forEach(tx => {
      if (tx.transaction_type === 'transfer') return;
      
      const day = format(new Date(tx.transaction_date), 'dd/MM');
      if (!data[day]) {
        data[day] = { date: day, income: 0, expense: 0 };
      }
      
      if (tx.transaction_type === 'income') {
        data[day].income += tx.amount;
      } else {
        data[day].expense += tx.amount;
      }
    });
    
    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  if (error) return <ErrorState message={error} onRetry={fetchDashboardData} />;

  const getBusinessName = (id: string) => businesses.find(b => b.id === id)?.name || 'Unknown';
  const getCategoryName = (id: string | null) => categories.find(c => c.id === id)?.name || 'Transfer Saldo';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Dashboard" 
        description="Ringkasan performa keuangan bisnis Anda dalam satu tampilan."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton 
              title="Dashboard" 
              content="Halaman Dashboard memberikan gambaran cepat tentang kesehatan keuangan Anda. Anda dapat melihat total pemasukan, pengeluaran, selisih (profit/loss), dan saldo saat ini berdasarkan periode dan bisnis yang dipilih." 
            />
            
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Building size={16} className="text-gray-400" />
              <select 
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="bg-black border-none text-sm font-medium text-white focus:ring-0 cursor-pointer"
              >
                <option key="all-businesses" value="all">Semua Bisnis</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Calendar size={16} className="text-gray-400" />
              <div className="flex items-center gap-2">
                <select 
                  className="bg-black border-none text-xs font-medium text-white focus:ring-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setDateRange({ start: '', end: '' });
                    } else if (e.target.value === 'this_month') {
                      setDateRange({ 
                        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
                      });
                    }
                  }}
                  defaultValue={dateRange.start === '' ? 'all' : 'this_month'}
                >
                  <option value="all">Semua Periode</option>
                  <option value="this_month">Bulan Ini</option>
                </select>
                
                {dateRange.start !== '' && (
                  <>
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-transparent border-none text-xs font-medium text-white focus:ring-0 cursor-pointer w-28"
                    />
                    <span className="text-gray-600 text-xs">-</span>
                    <input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-transparent border-none text-xs font-medium text-white focus:ring-0 cursor-pointer w-28"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        }
      />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Pemasukan" 
              value={stats.income} 
              icon={TrendingUp}
              className="border-l-4 border-l-emerald-500/50"
            />
            <StatCard 
              title="Total Pengeluaran" 
              value={stats.expense} 
              icon={TrendingDown}
              className="border-l-4 border-l-red-500/50"
            />
            <StatCard 
              title="Selisih (Net)" 
              value={stats.diff} 
              icon={Scale}
              className={cn(
                "border-l-4",
                stats.diff >= 0 ? "border-l-amber-500/50" : "border-l-orange-500/50"
              )}
            />
            <StatCard 
              title="Saldo Saat Ini" 
              value={stats.currentBalance} 
              icon={Wallet}
              className="border-l-4 border-l-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-white tracking-tight">Tren Arus Kas</h3>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-gray-400">Pemasukan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-gray-400">Pengeluaran</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-[350px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#ffffff30" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#ffffff30" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `Rp${val / 1000}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          itemStyle={{ padding: '0' }}
                        />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                      Belum ada transaksi pada periode ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Transactions Snippet */}
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white tracking-tight">Transaksi Terbaru</h3>
                  <Plus size={20} className="text-gray-600" />
                </div>
                
                {enrichedTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {enrichedTransactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-amber-500/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            tx.transaction_type === 'income' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            tx.transaction_type === 'expense' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                            "bg-blue-500/10 border-blue-500/20 text-blue-500"
                          )}>
                            {tx.transaction_type === 'income' ? <TrendingUp size={18} /> : 
                             tx.transaction_type === 'expense' ? <TrendingDown size={18} /> : 
                             <ArrowRightLeft size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white line-clamp-1">{tx.description || 'Tanpa keterangan'}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                              {format(new Date(tx.transaction_date), 'dd MMM yyyy')} · {tx.business?.name || 'Bisnis'} · {tx.account?.name || 'Akun'}
                            </p>
                          </div>
                        </div>
                        <p className={cn(
                          "text-sm font-mono font-bold tabular-nums ml-4 shrink-0",
                          tx.transaction_type === 'income' ? "text-emerald-500" : 
                          tx.transaction_type === 'expense' ? "text-red-500" : 
                          "text-blue-500"
                        )}>
                          {tx.transaction_type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-600 text-sm italic">
                    Belum ada transaksi pada periode ini.
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Stats: Account Balances */}
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold text-white tracking-tight mb-6">Saldo Rekening</h3>
                <div className="space-y-4">
                  {accounts.map(acc => (
                    <div key={acc.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{acc.name}</p>
                        <Wallet size={14} className="text-gray-600" />
                      </div>
                      <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-tighter">
                        {getBusinessName(acc.business_id)}
                      </p>
                      <p className="text-xl font-mono font-bold text-white tabular-nums">
                        {formatCurrency(acc.current_balance)}
                      </p>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <p className="text-center py-4 text-gray-600 text-sm italic">Belum ada akun.</p>
                  )}
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Scale size={120} className="text-amber-500" />
                </div>
                <h4 className="text-amber-500 text-xs font-black uppercase tracking-widest mb-2">Info Bisnis</h4>
                <p className="text-white text-sm leading-relaxed relative z-10">
                  {stats.diff > 0 
                    ? "Bisnis Anda menghasilkan profit. Pertimbangkan untuk menyisihkan dana cadangan." 
                    : stats.diff < 0 
                    ? "Pengeluaran melebihi pemasukan. Cek kembali daftar pengeluaran untuk efisiensi."
                    : "Belum ada pergerakan kas yang signifikan. Mulai catat transaksi Anda sekarang."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

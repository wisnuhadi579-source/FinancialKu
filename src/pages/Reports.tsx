import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Building, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Scale,
  PieChart as PieIcon,
  Filter
} from 'lucide-react';
import { 
  PageHeader, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  GuideButton,
  StatCard
} from '@/src/components/Common';
import { businessService, transactionService, categoryService, accountService } from '@/src/services/dataService';
import type { Business, Transaction, Category, Account } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Reports() {
  const [searchParams] = useSearchParams();
  const initialBizId = searchParams.get('businessId') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>(initialBizId);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const bId = searchParams.get('businessId');
    if (bId) {
      setSelectedBusiness(bId);
    }
  }, [searchParams]);
  const [dateRange, setDateRange] = useState({
    start: '', // Default to empty for 'Semua Periode'
    end: ''
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedBusiness, dateRange]);

  const fetchMetadata = async () => {
    try {
      const [rawBiz, rawCats] = await Promise.all([
        businessService.getAll(),
        categoryService.getAll()
      ]);

      // Deduplicate by ID
      const biz = rawBiz.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const cats = rawCats.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      console.log(`[FinanceKu] Reports metadata loaded: Biz ${biz.length}, Cats ${cats.length}`);
      setBusinesses(biz);
      setCategories(cats);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load metadata', err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const rawTxs = await transactionService.getTransactions({
        businessId: selectedBusiness,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      });

      // Deduplicate by ID
      const txs = rawTxs.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      console.log(`[FinanceKu] Reports transactions loaded: ${txs.length}`);
      setTransactions(txs);
      setError(null);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load reports data', err);
      setError('Gagal memuat data laporan.');
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
      
    return { income, expense, diff: income - expense };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { id: string, name: string, value: number, type: string }> = {};
    const activeTxs = transactions.filter(t => t.status === 'completed' && t.category_id);
    
    activeTxs.forEach(tx => {
      if (tx.transaction_type === 'transfer') return;
      
      const category = categories.find(c => c.id === tx.category_id);
      const catName = category?.name || 'Lain-lain';
      const catId = tx.category_id!;
      
      if (!breakdown[catId]) {
        breakdown[catId] = { id: catId, name: catName, value: 0, type: tx.transaction_type };
      }
      breakdown[catId].value += tx.amount;
    });
    
    const incomeCategories = Object.values(breakdown).filter(b => b.type === 'income').sort((a, b) => b.value - a.value);
    const expenseCategories = Object.values(breakdown).filter(b => b.type === 'expense').sort((a, b) => b.value - a.value);
    
    return { incomeCategories, expenseCategories };
  }, [transactions, categories]);

  const businessBreakdown = useMemo(() => {
    if (selectedBusiness !== 'all') return null;
    
    const breakdown: Record<string, { id: string, name: string, income: number, expense: number }> = {};
    const activeTxs = transactions.filter(t => t.status === 'completed');
    
    activeTxs.forEach(tx => {
      const biz = businesses.find(b => b.id === tx.business_id);
      const bizName = biz?.name || 'Unknown';
      const bizId = tx.business_id;
      
      if (!breakdown[bizId]) {
        breakdown[bizId] = { id: bizId, name: bizName, income: 0, expense: 0 };
      }
      
      if (tx.transaction_type === 'income') breakdown[bizId].income += tx.amount;
      if (tx.transaction_type === 'expense') breakdown[bizId].expense += tx.amount;
    });
    
    return Object.values(breakdown).map(b => ({ ...b, diff: b.income - b.expense }));
  }, [transactions, businesses, selectedBusiness]);

  if (error) return <ErrorState message={error} onRetry={fetchReportData} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Laporan Keuangan" 
        description="Analisis performa bisnis Anda melalui data transaksi yang terperinci."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton 
              title="Laporan" 
              content="Halaman Laporan menyajikan ringkasan keuangan dalam periode tertentu. 

TOTAL PEMASUKAN: Semua uang yang masuk ke bisnis.
TOTAL PENGELUARAN: Semua biaya yang dikeluarkan bisnis.
SELISIH: Hasil dari Pemasukan dikurangi Pengeluaran (Profit/Loss).

Laporan Kategori membantu Anda memahami dari mana asal pemasukan terbesar dan ke mana pengeluaran terbanyak dialokasikan." 
            />
            
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Building size={16} className="text-gray-400" />
              <select 
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-white focus:ring-0 cursor-pointer"
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
                  className="bg-transparent border-none text-xs font-medium text-white focus:ring-0 cursor-pointer"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>

          {/* Business Breakdown Table (If All Businesses selected) */}
          {businessBreakdown && businessBreakdown.length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <Building size={20} className="text-amber-500" />
                Breakdown per Bisnis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                      <th className="pb-4">Nama Bisnis</th>
                      <th className="pb-4 text-right">Pemasukan</th>
                      <th className="pb-4 text-right">Pengeluaran</th>
                      <th className="pb-4 text-right">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {businessBreakdown.map((b) => (
                      <tr key={b.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 text-sm font-bold text-white uppercase tracking-tight">{b.name}</td>
                        <td className="py-4 text-right text-sm font-mono text-emerald-500 tabular-nums">{formatCurrency(b.income)}</td>
                        <td className="py-4 text-right text-sm font-mono text-red-400 tabular-nums">{formatCurrency(b.expense)}</td>
                        <td className={cn(
                          "py-4 text-right text-sm font-mono font-bold tabular-nums",
                          b.diff >= 0 ? "text-amber-500" : "text-orange-400"
                        )}>
                          {formatCurrency(b.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Income by Category */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
              <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                <TrendingUp size={20} className="text-emerald-500" />
                Pemasukan per Kategori
              </h3>
              
              {categoryBreakdown.incomeCategories.length > 0 ? (
                <div className="space-y-8">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown.incomeCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryBreakdown.incomeCategories.map((entry) => (
                            <Cell key={`cell-${entry.id}`} fill={COLORS[categoryBreakdown.incomeCategories.indexOf(entry) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {categoryBreakdown.incomeCategories.map((cat, i) => (
                      <div key={cat.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-gray-300">{cat.name}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-white tabular-nums">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState message="Belum ada data pemasukan." />
              )}
            </div>

            {/* Expense by Category */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
              <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                <TrendingDown size={20} className="text-red-500" />
                Pengeluaran per Kategori
              </h3>
              
              {categoryBreakdown.expenseCategories.length > 0 ? (
                <div className="space-y-8">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown.expenseCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryBreakdown.expenseCategories.map((entry) => (
                            <Cell key={`cell-${entry.id}`} fill={COLORS[categoryBreakdown.expenseCategories.indexOf(entry) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    {categoryBreakdown.expenseCategories.map((cat, i) => (
                      <div key={cat.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-gray-300">{cat.name}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-white tabular-nums">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState message="Belum ada data pengeluaran." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

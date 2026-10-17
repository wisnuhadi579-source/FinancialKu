import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Scale,
  ArrowRight,
  X,
  Wallet,
  ReceiptText,
  BarChart3,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { 
  PageHeader, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  GuideButton
} from '@/src/components/Common';
import { businessService, accountService, transactionService } from '@/src/services/dataService';
import type { Business, Account, Transaction } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Businesses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessStats, setBusinessStats] = useState<Record<string, any>>({});
  const [selectedDetailBusiness, setSelectedDetailBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rawBiz = await businessService.getAll();
      
      // Deduplicate by ID
      const biz = rawBiz.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      
      setBusinesses(biz);

      // Default to All Period for the business summary to show historical data
      const stats: Record<string, any> = {};
      
      await Promise.all(biz.map(async (b) => {
        const [accs, txs] = await Promise.all([
          accountService.getByBusiness(b.id),
          transactionService.getTransactions({
            businessId: b.id
            // No date filters for overall business health
          })
        ]);

        const activeTxs = txs.filter(t => t.status === 'completed');
        const income = activeTxs.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = activeTxs.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = accs.reduce((sum, a) => sum + a.current_balance, 0);

        stats[b.id] = { 
          income, 
          expense, 
          balance, 
          accounts: accs, 
          recentTransactions: activeTxs.slice(0, 5) 
        };
      }));
      
      console.log(`[FinanceKu] Business stats loaded for ${biz.length} businesses`);
      setBusinessStats(stats);
      setError(null);
    } catch (err: any) {
      console.error('[FinanceKu] Failed to load business data', err);
      setError('Gagal memuat data bisnis.');
    } finally {
      setLoading(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Daftar Bisnis" 
        description="Kelola performa keuangan di berbagai unit bisnis Anda."
        action={
          <GuideButton 
            title="Bisnis" 
            content="Halaman Bisnis memberikan ringkasan performa untuk setiap unit bisnis yang Anda miliki. Anda dapat melihat saldo total setiap bisnis dan perbandingan pemasukan vs pengeluaran pada periode berjalan." 
          />
        }
      />

      {loading ? (
        <LoadingState />
      ) : businesses.length === 0 ? (
        <EmptyState message="Belum ada bisnis yang terdaftar." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {businesses.map((biz) => {
            const stats = businessStats[biz.id] || { income: 0, expense: 0, balance: 0 };
            return (
              <div key={biz.id} className="bg-white/5 border border-white/5 rounded-3xl p-8 group hover:border-amber-500/30 transition-all flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-900/10">
                    <Building2 size={28} />
                  </div>
                  <div className="px-4 py-1.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                    ID: {biz.slug}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{biz.name}</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-8">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Unit Bisnis Aktif
                </div>

                <div className="space-y-6">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Saldo Bisnis</p>
                    <p className="text-2xl font-mono font-bold text-white tabular-nums">{formatCurrency(stats.balance)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Income</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-emerald-500 tabular-nums">{formatCurrency(stats.income)}</p>
                    </div>
                    <div className="p-4 bg-red-500/[0.03] border border-red-500/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={12} className="text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Expense</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-red-400 tabular-nums">{formatCurrency(stats.expense)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Scale size={14} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Selisih Periode</span>
                    </div>
                    <p className={cn(
                      "text-xs font-mono font-bold tabular-nums",
                      (stats.income - stats.expense) >= 0 ? "text-amber-500" : "text-orange-400"
                    )}>
                      {formatCurrency(stats.income - stats.expense)}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedDetailBusiness(biz)}
                  className="mt-8 flex items-center justify-center gap-2 w-full py-4 bg-white/5 hover:bg-amber-500 hover:text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer"
                >
                  Lihat Detail
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Business Detail Modal */}
      {selectedDetailBusiness && (
        <BusinessDetailModal 
          business={selectedDetailBusiness}
          stats={businessStats[selectedDetailBusiness.id] || { income: 0, expense: 0, balance: 0, accounts: [], recentTransactions: [] }}
          onClose={() => setSelectedDetailBusiness(null)}
          onNavigate={(path) => {
            setSelectedDetailBusiness(null);
            navigate(path);
          }}
        />
      )}
    </div>
  );
}

function BusinessDetailModal({
  business,
  stats,
  onClose,
  onNavigate
}: {
  business: Business;
  stats: {
    income: number;
    expense: number;
    balance: number;
    accounts?: Account[];
    recentTransactions?: Transaction[];
  };
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const accounts = stats.accounts || [];
  const recentTransactions = stats.recentTransactions || [];
  const diff = stats.income - stats.expense;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{business.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                  {business.status || 'Aktif'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {business.slug}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Saldo</p>
              <p className="text-lg font-mono font-bold text-white tabular-nums">{formatCurrency(stats.balance)}</p>
            </div>
            <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Pemasukan</p>
              <p className="text-lg font-mono font-bold text-emerald-500 tabular-nums">{formatCurrency(stats.income)}</p>
            </div>
            <div className="p-4 bg-red-500/[0.03] border border-red-500/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Pengeluaran</p>
              <p className="text-lg font-mono font-bold text-red-400 tabular-nums">{formatCurrency(stats.expense)}</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Selisih Net</p>
              <p className={cn(
                "text-lg font-mono font-bold tabular-nums",
                diff >= 0 ? "text-amber-500" : "text-orange-400"
              )}>
                {formatCurrency(diff)}
              </p>
            </div>
          </div>

          {/* Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Wallet size={14} className="text-amber-500" />
                Daftar Rekening ({accounts.length})
              </h4>
              <button 
                onClick={() => onNavigate(`/accounts?businessId=${business.id}`)}
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 uppercase tracking-wider cursor-pointer"
              >
                Kelola di Akun <ExternalLink size={10} />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-xs text-gray-500 italic">
                Belum ada rekening yang terdaftar pada unit bisnis ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{acc.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{acc.account_type || 'General'}</p>
                    </div>
                    <p className="text-sm font-mono font-bold text-white tabular-nums">
                      {formatCurrency(acc.current_balance)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ReceiptText size={14} className="text-amber-500" />
                Transaksi Terbaru ({recentTransactions.length})
              </h4>
              <button 
                onClick={() => onNavigate(`/transactions?businessId=${business.id}`)}
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 uppercase tracking-wider cursor-pointer"
              >
                Lihat Semua <ExternalLink size={10} />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-xs text-gray-500 italic">
                Belum ada transaksi tercatat untuk unit bisnis ini.
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        tx.transaction_type === 'income' ? "bg-emerald-500" :
                        tx.transaction_type === 'expense' ? "bg-red-500" : "bg-blue-500"
                      )} />
                      <div>
                        <p className="text-xs font-bold text-white line-clamp-1">{tx.description || 'Tanpa keterangan'}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {format(new Date(tx.transaction_date), 'dd MMM yyyy')} · <span className="capitalize">{tx.transaction_type}</span>
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      "text-xs font-mono font-bold tabular-nums",
                      tx.transaction_type === 'income' ? "text-emerald-500" :
                      tx.transaction_type === 'expense' ? "text-red-400" : "text-blue-400"
                    )}>
                      {tx.transaction_type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Quick Links */}
        <div className="p-6 bg-white/[0.02] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate(`/transactions?businessId=${business.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <ReceiptText size={14} />
              Transaksi
            </button>
            <button
              onClick={() => onNavigate(`/accounts?businessId=${business.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <CreditCard size={14} />
              Rekening
            </button>
            <button
              onClick={() => onNavigate(`/reports?businessId=${business.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <BarChart3 size={14} />
              Laporan
            </button>
          </div>
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

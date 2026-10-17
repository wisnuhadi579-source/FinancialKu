import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Building, 
  ArrowUpRight, 
  ArrowDownLeft,
  CreditCard,
  CircleDollarSign
} from 'lucide-react';
import { 
  PageHeader, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  GuideButton,
  StatCard
} from '@/src/components/Common';
import { businessService, accountService } from '@/src/services/dataService';
import type { Business, Account } from '@/src/types';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useSearchParams } from 'react-router-dom';

export default function Accounts() {
  const [searchParams] = useSearchParams();
  const initialBizId = searchParams.get('businessId') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>(initialBizId);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const bId = searchParams.get('businessId');
    if (bId) {
      setSelectedBusiness(bId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [selectedBusiness]);

  const fetchInitialData = async () => {
    try {
      const rawBiz = await businessService.getAll();
      // Deduplicate by ID
      const biz = rawBiz.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      setBusinesses(biz);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const rawData = await accountService.getByBusiness(selectedBusiness);
      // Deduplicate by ID
      const data = rawData.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      setAccounts(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data rekening.');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  }, [accounts]);

  const groupedAccounts = useMemo(() => {
    const grouped: Record<string, { businessId: string; business: Business | undefined; accounts: Account[] }> = {};
    
    accounts.forEach(acc => {
      const bizId = acc.business_id || 'unassigned';
      if (!grouped[bizId]) {
        grouped[bizId] = {
          businessId: bizId,
          business: businesses.find(b => b.id === bizId),
          accounts: []
        };
      }
      grouped[bizId].accounts.push(acc);
    });
    
    return Object.values(grouped);
  }, [accounts, businesses]);

  if (error) return <ErrorState message={error} onRetry={fetchAccounts} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Akun & Rekening" 
        description="Kelola semua wadah uang bisnis Anda, mulai dari rekening bank hingga kas kecil."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton 
              title="Akun / Rekening" 
              content="Halaman Akun menampilkan daftar rekening atau 'kantong uang' yang Anda miliki dalam bisnis. 

Saldo awal: Saldo saat pertama kali akun dibuat.
Saldo saat ini: Saldo real-time hasil dari saldo awal ditambah semua pemasukan dan dikurangi semua pengeluaran.

Pastikan untuk memilih bisnis yang tepat untuk melihat rekening yang relevan." 
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
          </div>
        }
      />

      <div className="space-y-12">
        <StatCard 
          title="Total Saldo Terpilih" 
          value={totalBalance} 
          icon={CircleDollarSign}
          className="bg-amber-500/5 border-amber-500/20"
        />

        {loading ? (
          <LoadingState />
        ) : groupedAccounts.length === 0 ? (
          <EmptyState message="Belum ada rekening untuk bisnis ini." />
        ) : (
          groupedAccounts.map(({ businessId, business, accounts }) => (
            <div key={`group-${businessId}`} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  {business?.name || (businessId !== 'unassigned' ? `Bisnis: ${businessId}` : 'Tanpa Bisnis')}
                </h2>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-white/5 border border-white/5 rounded-3xl p-8 group hover:border-amber-500/30 transition-all flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-amber-500 transition-colors">
                        <Wallet size={24} />
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        acc.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                      )}>
                        {acc.status}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-1">{acc.name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">
                      {acc.account_type || 'General Account'}
                    </p>

                    <div className="space-y-4 mt-auto">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Saldo Awal</span>
                        <span className="text-gray-400 font-mono">{formatCurrency(acc.initial_balance)}</span>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">Saldo Saat Ini</span>
                        <span className="text-xl font-mono font-bold text-white tabular-nums">
                          {formatCurrency(acc.current_balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


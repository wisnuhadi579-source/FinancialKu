
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Building,
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart as PieIcon,
  Filter,
  Wallet,
  Printer,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Percent,
  Banknote
} from 'lucide-react';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  GuideButton,
  StatCard
} from '@/src/components/Common';
import { saveGlobalPosData } from '@/src/lib/globalPosStore';
import {
  businessService,
  transactionService,
  categoryService,
  accountService
} from '@/src/services/dataService';
import {
  getAllocationRulesForBusiness,
  matchAccountForAllocation,
  calculateDeterministicAllocations,
  calculateGlobalPosAllocations,
  getProfitPercentageForBusiness,
  GLOBAL_POS_RULES,
  type AllocationRule,
  type GlobalPosRule
} from '@/src/lib/allocationConfig';
import type { Business, Transaction, Category, Account } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear
} from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const CATEGORY_COLORS = [
  '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

type PeriodOption =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'month_year';

const MONTH_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBizId = searchParams.get('businessId') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>(initialBizId);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [period, setPeriod] = useState<PeriodOption>('all');

  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Filter tambahan: bulan dan tahun yang dipilih.
  const today = new Date();
  const currentYear = today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(
    String(today.getMonth() + 1).padStart(2, '0')
  );

  const [selectedYear, setSelectedYear] = useState(
    String(currentYear)
  );

  // Daftar tahun: 10 tahun ke belakang sampai 10 tahun ke depan.
  const yearOptions = useMemo(() => {
    return Array.from(
      { length: 21 },
      (_, index) => String(currentYear - 10 + index)
    );
  }, [currentYear]);

  useEffect(() => {
    const bId = searchParams.get('businessId');

    if (bId) {
      setSelectedBusiness(bId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInitialMetadata();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedBusiness, dateRange]);

  const fetchInitialMetadata = async () => {
    try {
      const [rawBiz, rawCats, rawAccs] = await Promise.all([
        businessService.getAll(),
        categoryService.getAll(),
        accountService.getByBusiness('all')
      ]);

      // Deduplicate by ID.
      const biz = rawBiz.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      const cats = rawCats.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      const accs = rawAccs.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      setBusinesses(biz);
      setCategories(cats);
      setAccounts(accs);
    } catch (err: any) {
      console.error(
        '[FinanceKu] Gagal memuat metadata laporan:',
        err
      );
    }
  };

  const fetchReportData = async () => {
    setLoading(true);

    try {
      const [rawTxs, rawAccs] = await Promise.all([
        transactionService.getTransactions({
          businessId: selectedBusiness,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined
        }),
        accountService.getByBusiness(selectedBusiness)
      ]);

      // Deduplicate by ID.
      const txs = rawTxs.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      const accs = rawAccs.filter(
        (item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
      );

      setTransactions(txs);
      setAccounts(accs);
      setError(null);
    } catch (err: any) {
      console.error(
        '[FinanceKu] Gagal memuat data laporan:',
        err
      );

      setError('Gagal memuat data laporan keuangan.');
    } finally {
      setLoading(false);
    }
  };

  // Mengubah filter periode.
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod);

    const now = new Date();

    if (newPeriod === 'all') {
      setDateRange({
        start: '',
        end: ''
      });
      return;
    }

    if (newPeriod === 'this_month') {
      setDateRange({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      });
      return;
    }

    if (newPeriod === 'last_month') {
      const lastMonth = subMonths(now, 1);

      setDateRange({
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      });
      return;
    }

    if (newPeriod === 'this_year') {
      setDateRange({
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd')
      });
      return;
    }

    if (newPeriod === 'month_year') {
      const month = Number(selectedMonth);
      const year = Number(selectedYear);

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      setDateRange({
        start: format(monthStart, 'yyyy-MM-dd'),
        end: format(monthEnd, 'yyyy-MM-dd')
      });
      return;
    }

    if (newPeriod === 'custom') {
      // Mulai dari tanggal hari ini agar tidak membawa
      // rentang tanggal lama dari filter sebelumnya.
      const todayString = format(now, 'yyyy-MM-dd');

      setDateRange({
        start: todayString,
        end: todayString
      });
    }
  };

  // Mengubah bulan atau tahun yang dipilih.
  const handleMonthYearChange = (
    month: string,
    year: string
  ) => {
    const safeMonth = Math.min(
      12,
      Math.max(1, Number(month) || 1)
    );

    const safeYear = Math.min(
      9999,
      Math.max(1900, Number(year) || currentYear)
    );

    const monthString = String(safeMonth).padStart(2, '0');
    const yearString = String(safeYear);

    setSelectedMonth(monthString);
    setSelectedYear(yearString);

    const monthStart = new Date(
      safeYear,
      safeMonth - 1,
      1
    );

    const monthEnd = new Date(
      safeYear,
      safeMonth,
      0
    );

    setDateRange({
      start: format(monthStart, 'yyyy-MM-dd'),
      end: format(monthEnd, 'yyyy-MM-dd')
    });
  };

  // Unit bisnis yang sedang aktif dipilih.
  const currentBusinessObj = useMemo(() => {
    if (selectedBusiness === 'all') return null;

    return businesses.find(
      b => b.id === selectedBusiness
    ) || null;
  }, [businesses, selectedBusiness]);

  // Statistik Keuangan Utama.
  // Pemasukan dan pengeluaran tetap menghitung seluruh transaksi.
  // Profit Bersih (Net) khusus dihitung dari transaksi pada akun bernama "Profit",
  // sama seperti logika Profit Net di Dashboard.
  const coreStats = useMemo(() => {
    const activeTxs = transactions.filter(
      t => t.status === 'completed'
    );

    const income = activeTxs
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expense = activeTxs
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Batasi akun berdasarkan bisnis yang dipilih.
    const relevantAccounts = selectedBusiness === 'all'
      ? accounts
      : accounts.filter(
          a => a.business_id === selectedBusiness
        );

    const profitAccountIds = new Set(
      relevantAccounts
        .filter(account => /profit/i.test(account.name || ''))
        .map(account => account.id)
    );

    // Hanya pemasukan dan pengeluaran pada akun Profit.
    // Transaksi transfer tidak dihitung sebagai laba/rugi, agar konsisten
    // dengan perhitungan Profit Net pada Dashboard.
    const netProfit = activeTxs.reduce((sum, transaction) => {
      if (!profitAccountIds.has(transaction.account_id)) {
        return sum;
      }

      const amount = Number(transaction.amount) || 0;

      if (transaction.transaction_type === 'income') {
        return sum + amount;
      }

      if (transaction.transaction_type === 'expense') {
        return sum - amount;
      }

      return sum;
    }, 0);

    // Saldo kas/rekening real-time dari Supabase.
    const totalLiquidBalance = relevantAccounts.reduce(
      (sum, a) => sum + (a.current_balance || 0),
      0
    );

    return {
      income,
      expense,
      netProfit,
      totalLiquidBalance,
      isProfitPositive: netProfit > 0
    };
  }, [transactions, accounts, selectedBusiness]);

  // Breakdown performa per bisnis.
  // Kolom Profit Bersih tiap bisnis juga mengambil transaksi dari akun Profit,
  // bukan selisih total pemasukan dikurangi total pengeluaran.
  const businessMatrix = useMemo(() => {
    const activeTxs = transactions.filter(
      t => t.status === 'completed'
    );

    return businesses.map(biz => {
      const bizTxs = activeTxs.filter(
        t => t.business_id === biz.id
      );

      const bizIncome = bizTxs
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const bizExpense = bizTxs
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const bizAccounts = accounts.filter(
        a => a.business_id === biz.id
      );

      const profitAccountIds = new Set(
        bizAccounts
          .filter(account => /profit/i.test(account.name || ''))
          .map(account => account.id)
      );

      const netProfit = bizTxs.reduce((sum, transaction) => {
        if (!profitAccountIds.has(transaction.account_id)) {
          return sum;
        }

        const amount = Number(transaction.amount) || 0;

        if (transaction.transaction_type === 'income') {
          return sum + amount;
        }

        if (transaction.transaction_type === 'expense') {
          return sum - amount;
        }

        return sum;
      }, 0);

      const profitPercent = getProfitPercentageForBusiness(biz);

      const profitAllocation = Math.round(
        (bizIncome * profitPercent) / 100
      );

      const contributionPercent = coreStats.income > 0
        ? Math.round(
            (bizIncome / coreStats.income) * 100
          )
        : 0;

      const bizBalance = bizAccounts.reduce(
        (sum, a) => sum + (a.current_balance || 0),
        0
      );

      return {
        id: biz.id,
        name: biz.name,
        slug: biz.slug,
        income: bizIncome,
        expense: bizExpense,
        netProfit,
        profitPercent,
        profitAllocation,
        contributionPercent,
        liquidBalance: bizBalance
      };
    });
  }, [businesses, transactions, accounts, coreStats.income]);

  // Ringkasan alokasi dana rekening berdasarkan aturan bisnis.
  const businessAllocationsSummary = useMemo(() => {
    const activeTxs = transactions.filter(
      t => t.status === 'completed'
    );

    const targetBusinesses = currentBusinessObj
      ? [currentBusinessObj]
      : businesses;

    return targetBusinesses.map(biz => {
      const rules = getAllocationRulesForBusiness(biz);

      const bizAccounts = accounts.filter(
        a => a.business_id === biz.id
      );

      const bizTxs = activeTxs.filter(
        t => t.business_id === biz.id
      );

      const bizIncome = bizTxs
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const deterministicAllocations =
        calculateDeterministicAllocations(
          bizIncome,
          rules
        );

      const allocationItems = rules.map(rule => {
        const matchedAccount = matchAccountForAllocation(
          bizAccounts,
          rule.name,
          rule.percent
        );

        const deterministicItem =
          deterministicAllocations.find(
            d => d.name === rule.name
          );

        const newAllocation = deterministicItem
          ? deterministicItem.amount
          : 0;

        let spentInPeriod = 0;
        let actualIncomingInPeriod = 0;

        if (matchedAccount) {
          spentInPeriod = bizTxs
            .filter(
              t =>
                t.account_id === matchedAccount.id &&
                t.transaction_type === 'expense'
            )
            .reduce((sum, t) => sum + t.amount, 0);

          actualIncomingInPeriod = bizTxs
            .filter(
              t =>
                t.account_id === matchedAccount.id &&
                t.transaction_type === 'income'
            )
            .reduce((sum, t) => sum + t.amount, 0);
        }

        const initialBalance = matchedAccount
          ? matchedAccount.initial_balance
          : 0;

        const currentBalance = matchedAccount
          ? matchedAccount.current_balance
          : 0;

        return {
          ruleName: rule.name,
          percent: rule.percent,
          description: rule.description,
          account: matchedAccount,
          initialBalance,
          newAllocation,
          actualIncomingInPeriod,
          spentInPeriod,
          currentBalance,
          isProfitPocket: rule.name
            .toLowerCase()
            .includes('profit')
        };
      });

      return {
        business: biz,
        income: bizIncome,
        rules,
        allocations: allocationItems
      };
    });
  }, [
    currentBusinessObj,
    businesses,
    accounts,
    transactions
  ]);

  // Empat Pos Global Pemilik.
 const globalPosData = useMemo(() => {
  const targetBusinesses = currentBusinessObj
    ? [currentBusinessObj]
    : businesses;

  let totalProfitNet = 0;

  targetBusinesses.forEach((business) => {
    // Ambil akun milik bisnis ini
    const businessAccounts = accounts.filter(
      (account) => account.business_id === business.id
    );

    // Temukan akun Profit berdasarkan aturan alokasi bisnis
    const profitRules = getAllocationRulesForBusiness(business).filter(
      (rule) => rule.name.toLowerCase().includes("profit")
    );

    const profitAccounts = profitRules
      .map((rule) =>
        matchAccountForAllocation(
          businessAccounts,
          rule.name,
          rule.percent
        )
      )
      .filter((account): account is Account => Boolean(account));

    const profitAccountIds = new Set(
      profitAccounts.map((account) => account.id)
    );

    // Hitung hanya transaksi pada bisnis dan periode yang sedang dipilih
    const businessTransactions = transactions.filter(
      (transaction) =>
        transaction.business_id === business.id &&
        transaction.status === "completed"
    );

    businessTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (transaction.transaction_type === "income") {
        // Pemasukan yang masuk langsung ke akun Profit
        if (profitAccountIds.has(transaction.account_id)) {
          totalProfitNet += amount;
        }
      } else if (transaction.transaction_type === "expense") {
        // Pengeluaran yang dibebankan ke akun Profit
        if (profitAccountIds.has(transaction.account_id)) {
          totalProfitNet -= amount;
        }
      } else if (transaction.transaction_type === "transfer") {
        // Uang keluar dari akun Profit
        if (profitAccountIds.has(transaction.account_id)) {
          totalProfitNet -= amount;
        }

        // Uang masuk ke akun Profit
        if (
          transaction.transfer_to_account_id &&
          transaction.transfer_to_account_id !== transaction.account_id &&
          profitAccountIds.has(transaction.transfer_to_account_id)
        ) {
          totalProfitNet += amount;
        }
      }
    });
  });

  // Jangan membagikan profit negatif
  const availableProfit = Math.max(0, Math.round(totalProfitNet));

  // Satu sumber perhitungan untuk empat pos
  const calculatedItems =
    calculateGlobalPosAllocations(availableProfit);

  return {
    availableProfit,
    hasAvailableProfit: availableProfit > 0,
    items: calculatedItems,
  };
}, [
  currentBusinessObj,
  businesses,
  accounts,
  transactions,
]);
// Sinkronisasi Empat Pos Global ke Dashboard.
useEffect(() => {
  if (loading) return;

  saveGlobalPosData({
    personal:
      globalPosData.items.find(
        item => item.key === 'personal'
      )?.amount ?? 0,

    investment:
      globalPosData.items.find(
        item => item.key === 'investment'
      )?.amount ?? 0,

    rihlah:
      globalPosData.items.find(
        item => item.key === 'rihlah'
      )?.amount ?? 0,

    sedekah:
      globalPosData.items.find(
        item => item.key === 'sedekah'
      )?.amount ?? 0,

    updatedAt: new Date().toISOString()
  });
}, [loading, globalPosData]);

  // Breakdown kategori pemasukan dan pengeluaran.
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<
      string,
      {
        id: string;
        name: string;
        value: number;
        type: string;
      }
    > = {};

    const activeTxs = transactions.filter(
      t => t.status === 'completed' && t.category_id
    );

    activeTxs.forEach(tx => {
      // Transfer tidak dimasukkan ke breakdown kategori.
      if (tx.transaction_type === 'transfer') return;

      const category = categories.find(
        c => c.id === tx.category_id
      );

      const catName = category?.name || 'Lain-lain';
      const catId = tx.category_id!;

      if (!breakdown[catId]) {
        breakdown[catId] = {
          id: catId,
          name: catName,
          value: 0,
          type: tx.transaction_type
        };
      }

      breakdown[catId].value += tx.amount;
    });

    const incomeCategories = Object.values(breakdown)
      .filter(b => b.type === 'income')
      .sort((a, b) => b.value - a.value);

    const expenseCategories = Object.values(breakdown)
      .filter(b => b.type === 'expense')
      .sort((a, b) => b.value - a.value);

    return {
      incomeCategories,
      expenseCategories
    };
  }, [transactions, categories]);

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchReportData}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 print:p-0 print:space-y-4">
      {/* Header Halaman & Kontrol Filter */}
      <PageHeader
        title="Laporan Keuangan"
        description="Analisis performa bisnis, pantau alokasi dana rekening, dan hitung pembagian 4 Pos Global secara terstruktur."
        action={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <GuideButton
              title="Laporan & Pos Global"
              content={`Halaman Laporan menyajikan analisis performa bisnis dan alokasi dana secara lengkap:

1. TOTAL PEMASUKAN: Seluruh uang masuk dari penjualan/layanan yang tercatat lunas.
2. TOTAL PENGELUARAN: Seluruh biaya operasional atau pengeluaran bisnis.
3. PROFIT BERSIH (NET): Dihitung dari pemasukan dikurangi pengeluaran yang tercatat langsung pada akun bernama Profit di setiap bisnis. Transfer tidak dihitung sebagai laba/rugi.
4. ALOKASI DANA BISNIS: Pembagian dana sesuai persentase yang telah ditentukan:
   - Brand Jamu Herbal: Affiliate 20%, Kas 10%, HPP 50%, Profit 20%.
   - Brand Akademi Spiritual: Affiliate 20%, Kas 10%, Profit 70%, Bagi Hasil 0%.
   - Brand Pakar Digital: Marketing 50%, Profit 50%.
5. EMPAT POS GLOBAL PEMILIK:
   - Personal (50%): Kebutuhan pribadi dan operasional owner.
   - Investment (30%): Tabungan dan investasi masa depan.
   - Rihlah (10%): Liburan dan rekreasi keluarga.
   - Sedekah (10%): Zakat dan sedekah sosial.
* Pos Global hanya dialokasikan dari Profit Bersih yang tersedia (> 0). Jika profit nihil atau negatif, alokasi pos otomatis 0 untuk mencegah pembagian dana fiktif.`}
            />

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Cetak Laporan Keuangan"
            >
              <Printer size={15} />
              <span>Cetak Laporan</span>
            </button>

            {/* Filter Unit Bisnis */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
              <Building size={16} className="text-amber-500" />

              <select
                value={selectedBusiness}
                onChange={(e) => {
                  const businessId = e.target.value;

                  setSelectedBusiness(businessId);

                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);

                    if (businessId === 'all') {
                      next.delete('businessId');
                    } else {
                      next.set('businessId', businessId);
                    }

                    return next;
                  });
                }}
                className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer"
              >
                <option
                  key="all-businesses"
                  value="all"
                  className="bg-[#121212] text-white"
                >
                  🏢 Semua Bisnis (Konsolidasi)
                </option>

                {businesses.map(b => (
                  <option
                    key={b.id}
                    value={b.id}
                    className="bg-[#121212] text-white"
                  >
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Periode */}
            <div className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
              <Calendar
                size={16}
                className="text-amber-500 shrink-0"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer"
                  value={period}
                  onChange={(e) =>
                    handlePeriodChange(
                      e.target.value as PeriodOption
                    )
                  }
                >
                  <option
                    value="all"
                    className="bg-[#121212] text-white"
                  >
                    Semua Periode
                  </option>

                  <option
                    value="this_month"
                    className="bg-[#121212] text-white"
                  >
                    Bulan Ini
                  </option>

                  <option
                    value="last_month"
                    className="bg-[#121212] text-white"
                  >
                    Bulan Lalu
                  </option>

                  <option
                    value="this_year"
                    className="bg-[#121212] text-white"
                  >
                    Tahun Ini
                  </option>

                  <option
                    value="custom"
                    className="bg-[#121212] text-white"
                  >
                    Pilih Tanggal
                  </option>

                  <option
                    value="month_year"
                    className="bg-[#121212] text-white"
                  >
                    Pilih Bulan dan Tahun
                  </option>
                </select>

                {/* Filter berdasarkan tanggal awal dan akhir */}
                {period === 'custom' && (
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                    <input
                      type="date"
                      aria-label="Tanggal mulai"
                      value={dateRange.start}
                      onChange={(e) => {
                        setDateRange(prev => ({
                          ...prev,
                          start: e.target.value
                        }));
                      }}
                      className="bg-transparent border-none text-xs font-mono text-white focus:ring-0 cursor-pointer w-32"
                    />

                    <span className="text-gray-500 text-xs">
                      -
                    </span>

                    <input
                      type="date"
                      aria-label="Tanggal akhir"
                      value={dateRange.end}
                      min={dateRange.start || undefined}
                      onChange={(e) => {
                        setDateRange(prev => ({
                          ...prev,
                          end: e.target.value
                        }));
                      }}
                      className="bg-transparent border-none text-xs font-mono text-white focus:ring-0 cursor-pointer w-32"
                    />
                  </div>
                )}

                {/* Filter berdasarkan bulan dan tahun */}
                {period === 'month_year' && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-white/10 pl-2">
                    <select
                      aria-label="Pilih bulan laporan"
                      value={selectedMonth}
                      onChange={(e) => {
                        handleMonthYearChange(
                          e.target.value,
                          selectedYear
                        );
                      }}
                      className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer"
                    >
                      {MONTH_OPTIONS.map(month => (
                        <option
                          key={month.value}
                          value={month.value}
                          className="bg-[#121212] text-white"
                        >
                          {month.label}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Pilih tahun laporan"
                      value={selectedYear}
                      onChange={(e) => {
                        handleMonthYearChange(
                          selectedMonth,
                          e.target.value
                        );
                      }}
                      className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer"
                    >
                      {yearOptions.map(year => (
                        <option
                          key={year}
                          value={year}
                          className="bg-[#121212] text-white"
                        >
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* Banner Identitas Filter Aktif */}
      <div className="bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Building size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                Mode Tampilan Laporan
              </span>

              <span className="text-xs text-gray-500">
                •
              </span>

              <span className="text-xs font-medium text-gray-400">
                {currentBusinessObj
                  ? currentBusinessObj.name
                  : 'Konsolidasi Seluruh Portofolio'}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              {currentBusinessObj
                ? `Laporan Finansial: ${currentBusinessObj.name}`
                : 'Laporan Gabungan Seluruh Bisnis'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 font-mono">
            {dateRange.start && dateRange.end
              ? `${format(new Date(`${dateRange.start}T00:00:00`), 'dd MMM yyyy')} - ${format(new Date(`${dateRange.end}T00:00:00`), 'dd MMM yyyy')}`
              : 'Semua Periode Transaksi'}
          </div>

          {currentBusinessObj && (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-bold">
              Target Profit: {getProfitPercentageForBusiness(currentBusinessObj)}%
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Menghitung laporan finansial dan alokasi dana..." />
      ) : (
        <>
          {/* Empat StatCards Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Pemasukan"
              value={coreStats.income}
              icon={TrendingUp}
              subtitle="Pemasukan kotor tercatat"
              className="border-l-4 border-l-emerald-500/70"
            />

            <StatCard
              title="Total Pengeluaran"
              value={coreStats.expense}
              icon={TrendingDown}
              subtitle="Beban operasional & biaya"
              className="border-l-4 border-l-red-500/70"
            />

            <StatCard
              title="Profit Bersih (Net)"
              value={coreStats.netProfit}
              icon={Scale}
              subtitle={
                coreStats.isProfitPositive
                  ? 'Surplus (Laba Operasional)'
                  : 'Defisit (Perlu Efisiensi)'
              }
              className={cn(
                'border-l-4',
                coreStats.isProfitPositive
                  ? 'border-l-amber-500/70'
                  : 'border-l-orange-500/70'
              )}
            />

            <StatCard
              title="Likuiditas Rekening"
              value={coreStats.totalLiquidBalance}
              icon={Wallet}
              subtitle="Total saldo kas di Supabase"
              className="border-l-4 border-l-blue-500/70"
            />
          </div>

          {/* BAGIAN 1: TABEL KINERJA BISNIS GABUNGAN */}
          {selectedBusiness === 'all' && (
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-3">
                    <Building size={20} className="text-amber-500" />
                    Performa Finansial per Unit Bisnis
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Bandingkan kontribusi omset, pengeluaran, margin keuntungan, dan aturan alokasi profit antar bisnis.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Total Unit Bisnis Aktif
                  </span>

                  <p className="text-base font-bold text-white font-mono">
                    {businesses.length} Bisnis
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                      <th className="pb-4">Unit Bisnis</th>
                      <th className="pb-4 text-center">Aturan Profit</th>
                      <th className="pb-4 text-right">Pemasukan</th>
                      <th className="pb-4 text-right">Pengeluaran</th>
                      <th className="pb-4 text-right">Profit Bersih</th>
                      <th className="pb-4 text-right">Kontribusi</th>
                      <th className="pb-4 text-center">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {businessMatrix.map(b => (
                      <tr
                        key={b.id}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4">
                          <p className="text-sm font-bold text-white uppercase tracking-tight">
                            {b.name}
                          </p>

                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Saldo Rekening: {formatCurrency(b.liquidBalance)}
                          </p>
                        </td>

                        <td className="py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/20">
                            <Percent size={11} />
                            {b.profitPercent}%
                          </span>
                        </td>

                        <td className="py-4 text-right text-sm font-mono text-emerald-500 tabular-nums font-semibold">
                          {formatCurrency(b.income)}
                        </td>

                        <td className="py-4 text-right text-sm font-mono text-red-400 tabular-nums">
                          {formatCurrency(b.expense)}
                        </td>

                        <td className="py-4 text-right text-sm font-mono font-bold tabular-nums">
                          <span className={cn(
                            b.netProfit >= 0
                              ? 'text-amber-500'
                              : 'text-orange-400'
                          )}>
                            {formatCurrency(b.netProfit)}
                          </span>
                        </td>

                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-mono font-bold text-gray-300">
                              {b.contributionPercent}%
                            </span>

                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, b.contributionPercent)}%`
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedBusiness(b.id);
                              setSearchParams({ businessId: b.id });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Detail</span>
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-white/10 font-bold text-white bg-white/[0.01]">
                      <td className="py-4 text-xs uppercase tracking-wider text-amber-500">
                        Total Konsolidasi
                      </td>

                      <td className="py-4 text-center text-xs text-gray-500">
                        -
                      </td>

                      <td className="py-4 text-right text-sm font-mono text-emerald-400 tabular-nums">
                        {formatCurrency(coreStats.income)}
                      </td>

                      <td className="py-4 text-right text-sm font-mono text-red-400 tabular-nums">
                        {formatCurrency(coreStats.expense)}
                      </td>

                      <td className="py-4 text-right text-sm font-mono text-amber-400 tabular-nums">
                        {formatCurrency(coreStats.netProfit)}
                      </td>

                      <td className="py-4 text-right text-xs font-mono text-gray-400">
                        100%
                      </td>

                      <td className="py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* BAGIAN 2: RINGKASAN ALOKASI DANA REKENING */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Layers size={20} className="text-amber-500" />
                  Ringkasan Alokasi Dana Rekening (Aturan Persentase)
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Melacak saldo awal akun, alokasi baru periode ini, dana terpakai, dan sisa saldo tersedia yang tersimpan di Supabase.
                </p>
              </div>

              {currentBusinessObj && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
                  <ShieldCheck size={14} />
                  <span>
                    Aturan {currentBusinessObj.name} Terverifikasi 100%
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {businessAllocationsSummary.map(bizSummary => (
                <div
                  key={bizSummary.business.id}
                  className="bg-black/30 border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                        {bizSummary.business.name.charAt(0)}
                      </div>

                      <h4 className="font-bold text-white text-sm sm:text-base tracking-tight uppercase">
                        {bizSummary.business.name}
                      </h4>
                    </div>

                    <div className="text-xs text-gray-400 font-mono">
                      Dasar Omset Periode Ini:{' '}
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(bizSummary.income)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                          <th className="pb-3">Pos Alokasi</th>
                          <th className="pb-3 text-center">Aturan %</th>
                          <th className="pb-3">Akun Terhubung (Supabase)</th>
                          <th className="pb-3 text-right">Saldo Awal</th>
                          <th className="pb-3 text-right">Alokasi Baru (+)</th>
                          <th className="pb-3 text-right">Dana Terpakai (-)</th>
                          <th className="pb-3 text-right">Sisa Saldo Tersedia</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5 font-mono">
                        {bizSummary.allocations.map((alloc, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'font-bold font-sans',
                                  alloc.isProfitPocket
                                    ? 'text-amber-400 font-extrabold'
                                    : 'text-white'
                                )}>
                                  {alloc.ruleName}
                                </span>

                                {alloc.isProfitPocket && (
                                  <span className="text-[9px] font-black font-sans uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    PROFIT
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                                {alloc.description}
                              </p>
                            </td>

                            <td className="py-3.5 text-center">
                              <span className="font-bold text-amber-500">
                                {alloc.percent}%
                              </span>
                            </td>

                            <td className="py-3.5 pr-2 font-sans">
                              {alloc.account ? (
                                <div className="flex items-center gap-1.5 text-gray-300">
                                  <Wallet size={12} className="text-gray-500" />
                                  <span className="font-medium text-xs text-white">
                                    {alloc.account.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-400/80 bg-orange-500/10 px-2 py-0.5 rounded">
                                  <AlertTriangle size={10} />
                                  Belum dipetakan
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 text-right text-gray-400 tabular-nums">
                              {formatCurrency(alloc.initialBalance)}
                            </td>

                            <td className="py-3.5 text-right text-emerald-400 font-bold tabular-nums">
                              +{formatCurrency(alloc.newAllocation)}
                            </td>

                            <td className="py-3.5 text-right text-red-400 tabular-nums">
                              {alloc.spentInPeriod > 0
                                ? `-${formatCurrency(alloc.spentInPeriod)}`
                                : 'Rp 0'}
                            </td>

                            <td className="py-3.5 text-right font-bold tabular-nums">
                              <span className={cn(
                                alloc.currentBalance >= 0
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              )}>
                                {formatCurrency(alloc.currentBalance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BAGIAN 3: EMPAT POS GLOBAL PEMILIK */}
          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/30">
                    Pos Eksekutif Pemilik
                  </span>

                  <span className="text-xs text-gray-500">•</span>

                  <span className="text-xs font-semibold text-gray-400">
                    Aturan Paten 50:30:10:10
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2.5">
                  <Sparkles size={20} className="text-amber-500" />
                  Empat Pos Global (Berdasarkan Profit Bersih Tersedia)
                </h3>

                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Perhitungan pembagian profit bersih bisnis ke pos pemilik: Personal (50%), Investment (30%), Rihlah (10%), dan Sedekah (10%). Sistem memastikan dana tidak dialokasikan ganda dan hanya membagi profit yang nyata tersedia.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 min-w-[220px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Basis Profit Bersih Tersedia
                </p>

                <p className={cn(
                  'text-2xl font-bold font-mono tabular-nums mt-1',
                  globalPosData.hasAvailableProfit
                    ? 'text-amber-400'
                    : 'text-gray-500'
                )}>
                  {formatCurrency(globalPosData.availableProfit)}
                </p>

                <p className="text-[10px] text-gray-500 mt-1">
                  {currentBusinessObj
                    ? `Profit bersih ${currentBusinessObj.name}`
                    : 'Profit bersih konsolidasi'}
                </p>
              </div>
            </div>

            {!globalPosData.hasAvailableProfit ? (
              <div className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-6 flex items-start gap-4">
                <AlertTriangle
                  className="text-orange-400 shrink-0 mt-0.5"
                  size={24}
                />

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-orange-300">
                    Tidak Ada Profit Bersih yang Tersedia untuk Dibagikan
                  </h4>

                  <p className="text-xs text-orange-200/70 leading-relaxed">
                    Sistem mendeteksi profit bersih pada periode ini belum menghasilkan surplus (senilai {formatCurrency(coreStats.netProfit)}). Sesuai prinsip kehati-hatian finansial, dana pada 4 Pos Global tidak dialokasikan secara fiktif untuk mencegah over-alokasi atau pembagian ganda sebelum kas laba terealisasi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {globalPosData.items.map(pos => (
                    <div
                      key={pos.key}
                      className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-3 transition-all hover:border-white/20 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border font-sans',
                          pos.badgeBg
                        )}>
                          {pos.name}
                        </span>

                        <span className="text-sm font-bold text-white font-mono">
                          {pos.percent}%
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Nominal Alokasi
                        </p>

                        <h4 className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
                          {formatCurrency(pos.amount)}
                        </h4>
                      </div>

                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pos.percent}%`,
                            backgroundColor: pos.color
                          }}
                        />
                      </div>

                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        {pos.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <CheckCircle2
                      size={15}
                      className="text-emerald-500"
                    />

                    <span>
                      Total pembagian 4 pos dihitung deterministik tepat 100%:
                    </span>

                    <span className="font-mono font-bold text-white">
                      {formatCurrency(
                        globalPosData.items.reduce(
                          (sum, item) => sum + item.amount,
                          0
                        )
                      )}
                    </span>
                  </div>

                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    Zero Rounding Error
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BAGIAN 4: BREAKDOWN KATEGORI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pemasukan per Kategori */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <TrendingUp size={20} className="text-emerald-500" />
                Pemasukan per Kategori
              </h3>

              {categoryBreakdown.incomeCategories.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown.incomeCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categoryBreakdown.incomeCategories.map(
                            (entry, idx) => (
                              <Cell
                                key={`income-cell-${entry.id}`}
                                fill={
                                  CATEGORY_COLORS[
                                    idx % CATEGORY_COLORS.length
                                  ]
                                }
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#121212',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          formatter={(val: any) => [
                            formatCurrency(Number(val)),
                            'Nominal'
                          ]}
                        />

                        <Legend
                          verticalAlign="bottom"
                          height={36}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {categoryBreakdown.incomeCategories.map(
                      (cat, i) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[
                                    i % CATEGORY_COLORS.length
                                  ]
                              }}
                            />

                            <span className="font-medium text-gray-300">
                              {cat.name}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-white tabular-nums">
                            {formatCurrency(cat.value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState message="Belum ada data pemasukan pada periode ini." />
              )}
            </div>

            {/* Pengeluaran per Kategori */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 sm:p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <TrendingDown size={20} className="text-red-500" />
                Pengeluaran per Kategori
              </h3>

              {categoryBreakdown.expenseCategories.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown.expenseCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categoryBreakdown.expenseCategories.map(
                            (entry, idx) => (
                              <Cell
                                key={`expense-cell-${entry.id}`}
                                fill={
                                  CATEGORY_COLORS[
                                    idx % CATEGORY_COLORS.length
                                  ]
                                }
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#121212',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          formatter={(val: any) => [
                            formatCurrency(Number(val)),
                            'Nominal'
                          ]}
                        />

                        <Legend
                          verticalAlign="bottom"
                          height={36}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {categoryBreakdown.expenseCategories.map(
                      (cat, i) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[
                                    i % CATEGORY_COLORS.length
                                  ]
                              }}
                            />

                            <span className="font-medium text-gray-300">
                              {cat.name}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-white tabular-nums">
                            {formatCurrency(cat.value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState message="Belum ada data pengeluaran pada periode ini." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

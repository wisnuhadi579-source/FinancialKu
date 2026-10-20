import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Plus,
  ArrowRightLeft,
  Calendar,
  Building,
  PiggyBank,
  Heart,
  Plane,
  UserRound,
  RefreshCw
} from 'lucide-react';
import {
  StatCard,
  PageHeader,
  LoadingState,
  ErrorState,
  GuideButton
} from '@/src/components/Common';
import {
  businessService,
  accountService,
  transactionService,
  categoryService
} from '@/src/services/dataService';
import type {
  Business,
  Account,
  Category,
  Transaction
} from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  parseISO,
  isValid
} from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type PeriodOption =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'month_year';

const toDateString = (date: Date) =>
  format(date, 'yyyy-MM-dd');

const getPeriodRange = (
  period: PeriodOption,
  now = new Date()
) => {
  if (period === 'this_month') {
    return {
      start: toDateString(startOfMonth(now)),
      end: toDateString(endOfMonth(now))
    };
  }

  if (period === 'last_month') {
    const lastMonth = subMonths(now, 1);

    return {
      start: toDateString(startOfMonth(lastMonth)),
      end: toDateString(endOfMonth(lastMonth))
    };
  }

  if (period === 'this_year') {
    return {
      start: toDateString(startOfYear(now)),
      end: toDateString(endOfYear(now))
    };
  }

  return { start: '', end: '' };
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState('all');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [period, setPeriod] =
    useState<PeriodOption>('all');

  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'MM')
  );

  const [selectedYear, setSelectedYear] = useState(
    format(new Date(), 'yyyy')
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [
    selectedBusiness,
    dateRange.start,
    dateRange.end
  ]);

  const fetchInitialData = async () => {
    try {
      const [rawBiz, rawCats] = await Promise.all([
        businessService.getAll(),
        categoryService.getAll()
      ]);

      setBusinesses(
        rawBiz.filter(
          (item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        )
      );

      setCategories(
        rawCats.filter(
          (item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        )
      );
    } catch (err) {
      console.error(
        '[FinanceKu] Gagal memuat metadata:',
        err
      );
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

      setAccounts(
        rawAccs.filter(
          (item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        )
      );

      setTransactions(
        rawTxs.filter(
          (item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        )
      );

      setError(null);
    } catch (err) {
      console.error(
        '[FinanceKu] Gagal memuat data dashboard:',
        err
      );

      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (
    newPeriod: PeriodOption
  ) => {
    setPeriod(newPeriod);

    if (newPeriod === 'custom') {
      setDateRange({ start: '', end: '' });
      return;
    }

    if (newPeriod === 'month_year') {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);

      if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 9999 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        return;
      }

      const date = new Date(year, month - 1, 1);

      setDateRange({
        start: toDateString(startOfMonth(date)),
        end: toDateString(endOfMonth(date))
      });

      return;
    }

    setDateRange(getPeriodRange(newPeriod));
  };

  const handleMonthYearChange = (
    month: string,
    year: string
  ) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 1900 ||
      numericYear > 9999 ||
      !Number.isInteger(numericMonth) ||
      numericMonth < 1 ||
      numericMonth > 12
    ) {
      return;
    }

    const date = new Date(
      numericYear,
      numericMonth - 1,
      1
    );

    setPeriod('month_year');

    setDateRange({
      start: toDateString(startOfMonth(date)),
      end: toDateString(endOfMonth(date))
    });
  };

  // ============================================================
  // STATISTIK DASHBOARD
  //
  // Profit Net diambil dari transaksi completed pada akun yang
  // namanya mengandung "Profit".
  //
  // Profit Net = pemasukan akun Profit - pengeluaran akun Profit
  //
  // Perhitungan mengikuti filter bisnis dan periode aktif.
  // Transfer tidak dihitung sebagai pemasukan/pengeluaran profit.
  // ============================================================

  const stats = useMemo(() => {
    const activeTxs = transactions.filter(
      t => t.status === 'completed'
    );

    const income = activeTxs
      .filter(t => t.transaction_type === 'income')
      .reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );

    const expense = activeTxs
      .filter(t => t.transaction_type === 'expense')
      .reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );

    const profitAccountIds = new Set(
      accounts
        .filter(acc => /profit/i.test(acc.name || ''))
        .map(acc => acc.id)
    );

    const profitTransactions = activeTxs.filter(
      tx =>
        profitAccountIds.has(tx.account_id) &&
        (
          tx.transaction_type === 'income' ||
          tx.transaction_type === 'expense'
        )
    );

    const profitNet = profitTransactions.reduce(
      (sum, tx) => {
        const amount = Number(tx.amount || 0);

        if (tx.transaction_type === 'income') {
          return sum + amount;
        }

        if (tx.transaction_type === 'expense') {
          return sum - amount;
        }

        return sum;
      },
      0
    );

    const currentBalance = accounts.reduce(
      (sum, acc) =>
        sum + Number(acc.current_balance || 0),
      0
    );

    return {
      income,
      expense,
      profitNet,
      currentBalance
    };
  }, [transactions, accounts]);

  // ============================================================
  // EMPAT POS DASHBOARD
  //
  // SUMBER NOMINAL: stats.profitNet
  //
  // Tidak membaca nominal dari globalPosStore sehingga tidak
  // memakai nominal lama yang tidak sesuai filter aktif.
  //
  // Jika Profit Net <= 0, empat pos menampilkan
  // "Data belum tersedia".
  // ============================================================

  const allocation = useMemo(() => {
    const profit = stats.profitNet;

    if (profit <= 0) {
      return {
        available: false,
        personal: 0,
        investment: 0,
        rihlah: 0,
        sedekah: 0
      };
    }

    const personal = Math.round(profit * 0.5);
    const investment = Math.round(profit * 0.3);
    const rihlah = Math.round(profit * 0.1);

    // Mengambil sisa agar jumlah keempat pos tepat sama
    // dengan Profit Net, tanpa selisih pembulatan.
    const sedekah =
      profit - personal - investment - rihlah;

    return {
      available: true,
      personal,
      investment,
      rihlah,
      sedekah
    };
  }, [stats.profitNet]);

  const enrichedTransactions = useMemo(() => {
    const uniqueTxs = transactions.filter(
      (tx, index, self) =>
        index === self.findIndex(t => t.id === tx.id)
    );

    return uniqueTxs
      .map(tx => ({
        ...tx,
        business: businesses.find(
          b => b.id === tx.business_id
        ),
        account: accounts.find(
          a => a.id === tx.account_id
        ),
        category: categories.find(
          c => c.id === tx.category_id
        ),
        transfer_to_account: accounts.find(
          a => a.id === tx.transfer_to_account_id
        )
      }))
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      );
  }, [
    transactions,
    businesses,
    accounts,
    categories
  ]);

  const chartData = useMemo(() => {
    const data: Record<
      string,
      {
        date: string;
        income: number;
        expense: number;
        sortKey: string;
      }
    > = {};

    transactions
      .filter(t => t.status === 'completed')
      .forEach(tx => {
        if (tx.transaction_type === 'transfer') return;

        const parsedDate = parseISO(
          tx.transaction_date.slice(0, 10)
        );

        if (!isValid(parsedDate)) return;

        const day = format(parsedDate, 'dd/MM');
        const sortKey = format(
          parsedDate,
          'yyyy-MM-dd'
        );

        if (!data[sortKey]) {
          data[sortKey] = {
            date: day,
            income: 0,
            expense: 0,
            sortKey
          };
        }

        if (tx.transaction_type === 'income') {
          data[sortKey].income += Number(
            tx.amount || 0
          );
        } else if (
          tx.transaction_type === 'expense'
        ) {
          data[sortKey].expense += Number(
            tx.amount || 0
          );
        }
      });

    return Object.values(data)
      .sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey)
      )
      .map(({ sortKey, ...item }) => item);
  }, [transactions]);

  const periodLabel = useMemo(() => {
    if (period === 'all') return 'Semua Periode';
    if (period === 'this_month') return 'Bulan Ini';
    if (period === 'last_month') return 'Bulan Lalu';
    if (period === 'this_year') return 'Tahun Ini';

    if (period === 'month_year') {
      if (!dateRange.start) {
        return 'Pilih Bulan & Tahun';
      }

      const parsedDate = parseISO(dateRange.start);

      return isValid(parsedDate)
        ? format(parsedDate, 'MMMM yyyy')
        : 'Pilih Bulan & Tahun';
    }

    if (dateRange.start && dateRange.end) {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);

      if (isValid(start) && isValid(end)) {
        return `${format(start, 'dd MMM yyyy')} - ${format(
          end,
          'dd MMM yyyy'
        )}`;
      }
    }

    if (dateRange.start) {
      return `Mulai ${dateRange.start}`;
    }

    if (dateRange.end) {
      return `Sampai ${dateRange.end}`;
    }

    return 'Pilih Tanggal';
  }, [period, dateRange]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: 11 },
      (_, index) =>
        String(currentYear - 5 + index)
    );
  }, []);

  const getBusinessName = (id: string) =>
    businesses.find(b => b.id === id)?.name ||
    'Unknown';

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchDashboardData}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Dashboard"
        description="Ringkasan performa keuangan bisnis Anda dalam satu tampilan."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <GuideButton
              title="Dashboard"
              content={`Dashboard menampilkan total pemasukan, total pengeluaran, Profit Net, saldo rekening, dan empat pos.

Profit Net:
- Dihitung dari transaksi completed pada akun yang namanya mengandung "Profit".
- Pemasukan akun Profit menambah Profit Net.
- Pengeluaran akun Profit mengurangi Profit Net.
- Transfer tidak dihitung sebagai profit.
- Perhitungan mengikuti filter bisnis dan periode tanggal.

Empat pos:
- Personal: 50% dari Profit Net.
- Investment: 30% dari Profit Net.
- Rihlah: 10% dari Profit Net.
- Sedekah: sisa nominal agar total alokasi sama dengan Profit Net.
- Empat pos dihitung langsung dari Profit Net Dashboard.
- Jika Profit Net nol atau negatif, empat pos menampilkan "Data belum tersedia".

Filter periode:
- Semua Periode.
- Bulan Ini.
- Bulan Lalu.
- Tahun Ini.
- Pilih Tanggal.
- Pilih Bulan & Tahun.`}
            />

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Building
                size={16}
                className="text-gray-400"
              />

              <select
                value={selectedBusiness}
                onChange={e =>
                  setSelectedBusiness(e.target.value)
                }
                className="bg-black border-none text-sm font-medium text-white focus:ring-0 cursor-pointer"
                aria-label="Pilih bisnis"
              >
                <option value="all">Semua Bisnis</option>

                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Calendar
                size={16}
                className="text-gray-400 shrink-0"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="bg-black border-none text-xs font-medium text-white focus:ring-0 cursor-pointer"
                  value={period}
                  onChange={e =>
                    handlePeriodChange(
                      e.target.value as PeriodOption
                    )
                  }
                  aria-label="Pilih periode laporan dashboard"
                >
                  <option value="all">Semua Periode</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="this_year">Tahun Ini</option>
                  <option value="custom">Pilih Tanggal</option>
                  <option value="month_year">
                    Pilih Bulan &amp; Tahun
                  </option>
                </select>

                {period === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-white/10 pl-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      max={dateRange.end || undefined}
                      onChange={e =>
                        setDateRange(prev => ({
                          ...prev,
                          start: e.target.value,
                          end:
                            prev.end &&
                            e.target.value &&
                            prev.end < e.target.value
                              ? e.target.value
                              : prev.end
                        }))
                      }
                      className="bg-transparent border-none text-xs font-medium text-white focus:ring-0 cursor-pointer w-32"
                      aria-label="Tanggal awal"
                    />

                    <span className="text-gray-600 text-xs">
                      -
                    </span>

                    <input
                      type="date"
                      value={dateRange.end}
                      min={dateRange.start || undefined}
                      onChange={e =>
                        setDateRange(prev => ({
                          ...prev,
                          end: e.target.value
                        }))
                      }
                      className="bg-transparent border-none text-xs font-medium text-white focus:ring-0 cursor-pointer w-32"
                      aria-label="Tanggal akhir"
                    />
                  </div>
                )}

                {period === 'month_year' && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-white/10 pl-2">
                    <select
                      value={selectedMonth}
                      onChange={e =>
                        handleMonthYearChange(
                          e.target.value,
                          selectedYear
                        )
                      }
                      className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs font-medium text-white focus:ring-0 cursor-pointer"
                      aria-label="Pilih bulan"
                    >
                      {[
                        ['01', 'Januari'],
                        ['02', 'Februari'],
                        ['03', 'Maret'],
                        ['04', 'April'],
                        ['05', 'Mei'],
                        ['06', 'Juni'],
                        ['07', 'Juli'],
                        ['08', 'Agustus'],
                        ['09', 'September'],
                        ['10', 'Oktober'],
                        ['11', 'November'],
                        ['12', 'Desember']
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={e =>
                        handleMonthYearChange(
                          selectedMonth,
                          e.target.value
                        )
                      }
                      className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs font-medium text-white focus:ring-0 cursor-pointer"
                      aria-label="Pilih tahun"
                    >
                      {yearOptions.map(year => (
                        <option key={year} value={year}>
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

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar
            size={15}
            className="text-amber-500"
          />

          <span>Periode aktif:</span>

          <span className="font-bold text-white">
            {periodLabel}
          </span>
        </div>

        <div className="text-xs text-gray-400">
          Bisnis:{' '}
          <span className="font-semibold text-white">
            {selectedBusiness === 'all'
              ? 'Semua Bisnis'
              : getBusinessName(selectedBusiness)}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* KARTU STATISTIK */}
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
              title="Profit Net"
              value={stats.profitNet}
              icon={Scale}
              className={cn(
                'border-l-4',
                stats.profitNet >= 0
                  ? 'border-l-amber-500/50'
                  : 'border-l-orange-500/50'
              )}
            />

            <StatCard
              title="Saldo Saat Ini"
              value={stats.currentBalance}
              icon={Wallet}
              className="border-l-4 border-l-blue-500/50"
            />
          </div>

          {/* ================================================== */}
          {/* EMPAT POS — LANGSUNG DARI PROFIT NET DASHBOARD      */}
          {/* ================================================== */}

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Empat Pos Global
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Nominal dihitung langsung dari Profit Net
                  sesuai filter bisnis dan periode aktif.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-300 hover:bg-white/10 transition-all"
              >
                <RefreshCw size={14} />
                Segarkan
              </button>
            </div>

            {!allocation.available ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <Wallet
                  size={28}
                  className="mx-auto text-gray-500 mb-3"
                />

                <p className="text-sm font-semibold text-white">
                  Data belum tersedia
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  Tidak ada Profit Net positif untuk bisnis
                  dan periode yang sedang dipilih. Empat pos
                  akan dihitung kembali saat Profit Net tersedia.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  {/* PERSONAL */}
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-sky-300">
                        Personal
                      </div>

                      <UserRound
                        size={20}
                        className="text-sky-400"
                      />
                    </div>

                    <p className="text-2xl font-bold text-white font-mono tabular-nums">
                      {formatCurrency(allocation.personal)}
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                      Pos personal · 50% dari Profit Net
                    </p>
                  </div>

                  {/* INVESTMENT */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                        Investment
                      </div>

                      <PiggyBank
                        size={20}
                        className="text-emerald-400"
                      />
                    </div>

                    <p className="text-2xl font-bold text-white font-mono tabular-nums">
                      {formatCurrency(allocation.investment)}
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                      Pos investasi · 30% dari Profit Net
                    </p>
                  </div>

                  {/* RIHLAH */}
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
                        Rihlah
                      </div>

                      <Plane
                        size={20}
                        className="text-amber-400"
                      />
                    </div>

                    <p className="text-2xl font-bold text-white font-mono tabular-nums">
                      {formatCurrency(allocation.rihlah)}
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                      Pos rihlah · 10% dari Profit Net
                    </p>
                  </div>

                  {/* SEDEKAH */}
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-rose-300">
                        Sedekah
                      </div>

                      <Heart
                        size={20}
                        className="text-rose-400"
                      />
                    </div>

                    <p className="text-2xl font-bold text-white font-mono tabular-nums">
                      {formatCurrency(allocation.sedekah)}
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                      Pos sedekah · 10% dari Profit Net
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 flex flex-wrap justify-between gap-2">
                  <span className="text-xs text-gray-400">
                    Total alokasi empat pos
                  </span>

                  <span className="text-sm font-bold font-mono text-white">
                    {formatCurrency(
                      allocation.personal +
                      allocation.investment +
                      allocation.rihlah +
                      allocation.sedekah
                    )}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Sumber nominal: Profit Net Dashboard sebesar{' '}
                  {formatCurrency(stats.profitNet)}. Nilai empat
                  pos diperbarui otomatis ketika filter bisnis
                  atau periode berubah. Angka ini merupakan
                  perhitungan alokasi, bukan transaksi
                  pemindahan dana.
                </p>
              </>
            )}
          </section>

          {/* GRAFIK DAN TRANSAKSI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* TREN ARUS KAS */}
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Tren Arus Kas
                  </h3>

                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />

                      <span className="text-gray-400">
                        Pemasukan
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />

                      <span className="text-gray-400">
                        Pengeluaran
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#ffffff05"
                        />

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
                          tickFormatter={val =>
                            `Rp${val / 1000}k`
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#121212',
                            border:
                              '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          itemStyle={{ padding: '0' }}
                          formatter={(
                            value: any,
                            name: any
                          ) => [
                            formatCurrency(Number(value)),
                            name === 'income'
                              ? 'Pemasukan'
                              : 'Pengeluaran'
                          ]}
                        />

                        <Bar
                          dataKey="income"
                          name="income"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />

                        <Bar
                          dataKey="expense"
                          name="expense"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                      Belum ada transaksi pada periode ini.
                    </div>
                  )}
                </div>
              </div>

              {/* TRANSAKSI TERBARU */}
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Transaksi Terbaru
                  </h3>

                  <Plus
                    size={20}
                    className="text-gray-600"
                  />
                </div>

                {enrichedTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {enrichedTransactions
                      .slice(0, 10)
                      .map(tx => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-amber-500/20 transition-all"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                                tx.transaction_type === 'income'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                  : tx.transaction_type === 'expense'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                              )}
                            >
                              {tx.transaction_type === 'income' ? (
                                <TrendingUp size={18} />
                              ) : tx.transaction_type === 'expense' ? (
                                <TrendingDown size={18} />
                              ) : (
                                <ArrowRightLeft size={18} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white line-clamp-1">
                                {tx.description ||
                                  'Tanpa keterangan'}
                              </p>

                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                                {format(
                                  parseISO(
                                    tx.transaction_date.slice(0, 10)
                                  ),
                                  'dd MMM yyyy'
                                )}{' '}
                                · {tx.business?.name || 'Bisnis'} ·{' '}
                                {tx.account?.name || 'Akun'}
                              </p>
                            </div>
                          </div>

                          <p
                            className={cn(
                              'text-sm font-mono font-bold tabular-nums ml-4 shrink-0',
                              tx.transaction_type === 'income'
                                ? 'text-emerald-500'
                                : tx.transaction_type === 'expense'
                                ? 'text-red-500'
                                : 'text-blue-500'
                            )}
                          >
                            {tx.transaction_type === 'expense'
                              ? '-'
                              : '+'}
                            {formatCurrency(
                              Number(tx.amount || 0)
                            )}
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

            {/* SIDEBAR */}
            <div className="space-y-8">
              {/* SALDO REKENING */}
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <h3 className="text-lg font-bold text-white tracking-tight mb-6">
                  Saldo Rekening
                </h3>

                <div className="space-y-4">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {acc.name}
                        </p>

                        <Wallet
                          size={14}
                          className="text-gray-600"
                        />
                      </div>

                      <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-tighter">
                        {getBusinessName(acc.business_id)}
                      </p>

                      <p className="text-xl font-mono font-bold text-white tabular-nums">
                        {formatCurrency(
                          Number(acc.current_balance || 0)
                        )}
                      </p>
                    </div>
                  ))}

                  {accounts.length === 0 && (
                    <p className="text-center py-4 text-gray-600 text-sm italic">
                      Belum ada akun.
                    </p>
                  )}
                </div>
              </div>

              {/* INFO BISNIS */}
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Scale
                    size={120}
                    className="text-amber-500"
                  />
                </div>

                <h4 className="text-amber-500 text-xs font-black uppercase tracking-widest mb-2">
                  Info Bisnis
                </h4>

                <p className="text-white text-sm leading-relaxed relative z-10">
                  {stats.profitNet > 0
                    ? 'Profit Net pada periode terpilih bernilai positif berdasarkan transaksi akun Profit. Nominal empat pos mengikuti Profit Net ini.'
                    : stats.profitNet < 0
                    ? 'Profit Net pada periode terpilih bernilai negatif. Empat pos tidak dialokasikan karena tidak ada Profit Net positif.'
                    : 'Belum ada Profit Net dari transaksi akun Profit pada periode terpilih. Periksa transaksi yang sudah berstatus selesai dan nama akun Profit.'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
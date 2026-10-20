import React, { useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Leaf,
  Monitor,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Info,
  ChevronRight,
  ShieldCheck,
  Scale,
  Coins,
  Sparkles,
  Layers,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/src/components/Common';
import {
  BUSINESS_ALLOCATION_RULES,
  GLOBAL_POS_RULES,
  calculateDeterministicAllocations,
  calculateGlobalPosAllocations,
  AllocationRule,
  GlobalPosRule,
} from '@/src/lib/allocationConfig';

type SectionId = 'dashboard' | 'akademi' | 'jamu' | 'pakar';

const sections: {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tag: string;
}[] = [
  {
    id: 'dashboard',
    title: 'Panduan Umum & 4 Pos Global',
    subtitle: 'Alur keuangan, prinsip sistem, dan 4 Pos Global Pemilik',
    icon: LayoutDashboard,
    tag: 'Sistem & Owner',
  },
  {
    id: 'akademi',
    title: 'Akademi Spiritual',
    subtitle: 'Aturan 100%: Affiliate 20%, Kas 10%, Profit 70%, Bagi Hasil 0%',
    icon: GraduationCap,
    tag: 'Jasa & Edukasi',
  },
  {
    id: 'jamu',
    title: 'Jamu Herbal',
    subtitle: 'Aturan 100%: Affiliate 20%, Kas 10%, HPP 50%, Profit 20%',
    icon: Leaf,
    tag: 'Produk Fisik',
  },
  {
    id: 'pakar',
    title: 'Pakar Digital',
    subtitle: 'Aturan 100%: Marketing 50%, Profit 50%',
    icon: Monitor,
    tag: 'Agency & Ads',
  },
];

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function Notice({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'success';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
    warning: 'border-red-500/20 bg-red-500/5 text-red-300',
    success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
  };

  const icons = {
    info: <Info size={19} className="mt-0.5 shrink-0 text-amber-400" />,
    warning: <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-400" />,
    success: <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-400" />,
  };

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${styles[type]}`}>
      {icons[type]}
      <div className="text-gray-300">{children}</div>
    </div>
  );
}

function Instruction({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 font-bold text-amber-400 shadow-sm shadow-amber-500/5">
        {number}
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-white">{title}</h4>
        <div className="mt-1 text-sm leading-6 text-gray-400">{children}</div>
      </div>
    </div>
  );
}

/**
 * Tabel simulasi alokasi unit bisnis berbasis kalkulasi deterministik
 */
function BusinessAllocationSimulationTable({
  rules,
  amount,
  businessName,
}: {
  rules: AllocationRule[];
  amount: number;
  businessName: string;
}) {
  const calculatedRows = calculateDeterministicAllocations(amount, rules);
  const totalPercent = rules.reduce((sum, r) => sum + r.percent, 0);
  const totalAllocated = calculatedRows.reduce((sum, r) => sum + r.amount, 0);

  // Ambil nominal profit untuk referensi 4 Pos Global
  const profitRow = calculatedRows.find((r) => r.name.toLowerCase().includes('profit'));
  const profitAmount = profitRow ? profitRow.amount : 0;
  const profitPercent = profitRow ? profitRow.percent : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <div className="flex flex-col justify-between gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h4 className="font-bold text-white">Aturan Alokasi {businessName}</h4>
          <p className="mt-0.5 text-xs text-gray-400">
            Dasar pemasukan kotor: <span className="font-semibold text-amber-400">{formatRupiah(amount)}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <CheckCircle2 size={13} /> Total Aturan: {totalPercent}% (Tepat 100%)
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-5 py-3 font-medium">Pos Alokasi Akun</th>
              <th className="px-5 py-3 text-center font-medium">Persentase</th>
              <th className="px-5 py-3 text-right font-medium">Nominal Perhitungan</th>
              <th className="px-5 py-3 font-medium">Keterangan Akun Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {calculatedRows.map((row) => {
              const ruleConfig = rules.find((r) => r.name === row.name);
              const isProfit = row.name.toLowerCase().includes('profit');
              return (
                <tr
                  key={row.name}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    isProfit ? 'bg-amber-500/[0.04]' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {isProfit && <Coins size={15} className="text-amber-400" />}
                      <span className={`font-semibold ${isProfit ? 'text-amber-300' : 'text-white'}`}>
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-amber-400">
                    {row.percent}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                    {formatRupiah(row.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {ruleConfig?.description || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-amber-500/20 bg-amber-500/5">
            <tr>
              <td className="px-5 py-3.5 font-bold text-white">Total Pemasukan Dialokasikan</td>
              <td className="px-5 py-3.5 text-center font-bold text-amber-400">{totalPercent}%</td>
              <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                {formatRupiah(totalAllocated)}
              </td>
              <td className="px-5 py-3.5 text-xs text-emerald-400 font-medium">
                Alokasi seimbang (Selisih: Rp0)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {profitAmount > 0 && (
        <div className="border-t border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Porsi Profit Bisnis ({profitPercent}%):{' '}
              <strong className="text-white font-mono">{formatRupiah(profitAmount)}</strong>
            </span>
            <span className="text-gray-400">
              *Hanya profit bersih yang sudah bebas dari pengeluaran riil yang dapat disalurkan ke 4 Pos Global Pemilik.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tabel & Kartu 4 Pos Global Pemilik
 */
function GlobalPosSimulation({
  availableProfit,
  onProfitChange,
}: {
  availableProfit: number;
  onProfitChange: (val: string) => void;
}) {
  const calculatedPos = calculateGlobalPosAllocations(availableProfit);
  const totalAllocated = calculatedPos.reduce((sum, p) => sum + p.amount, 0);
  const isZeroOrNegative = availableProfit <= 0;

  return (
    <div className="space-y-6">
      {/* Input Profit Bersih */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <label
              htmlFor="global-profit-input"
              className="block text-sm font-semibold text-white"
            >
              Simulasi Profit Bersih Tersedia (Rp)
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Dasar 4 Pos Global adalah <strong>laba bersih yang sudah terealisasi</strong> setelah dikurangi seluruh pengeluaran operasional dan HPP riil.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[5000000, 10000000, 25000000, 50000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onProfitChange(preset.toString())}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
              >
                {formatRupiah(preset).replace(',00', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
              Rp
            </span>
            <input
              id="global-profit-input"
              type="number"
              min="0"
              step="10000"
              value={availableProfit}
              onChange={(e) => onProfitChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-4 font-mono text-sm font-semibold text-white outline-none transition-colors focus:border-amber-500/50"
              placeholder="0"
            />
          </div>
          <div className="text-xs text-gray-400">
            Status alokasi:{' '}
            {isZeroOrNegative ? (
              <span className="font-semibold text-red-400">
                Profit Rp0 / Negatif (Alokasi dinonaktifkan / Rp0)
              </span>
            ) : (
              <span className="font-semibold text-emerald-400">
                Tersedia {formatRupiah(availableProfit)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Kartu 4 Pos Global */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {calculatedPos.map((pos) => {
          return (
            <div
              key={pos.key}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-5 transition-all hover:border-white/20"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${pos.badgeBg}`}
                  >
                    {pos.percent}%
                  </span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pos Global
                  </span>
                </div>
                <h4 className="mt-3 text-base font-bold text-white">{pos.name}</h4>
                <p className="mt-1 text-xs leading-5 text-gray-400">{pos.description}</p>
              </div>

              <div className="mt-5 border-t border-white/5 pt-3">
                <span className="text-[11px] font-medium text-gray-400">Nominal Terhitung:</span>
                <div className="mt-0.5 font-mono text-lg font-extrabold text-white">
                  {formatRupiah(pos.amount)}
                </div>
                {/* Progress bar visual */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: isZeroOrNegative ? '0%' : `${pos.percent}%`,
                      backgroundColor: pos.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabel Ringkasan 4 Pos Global */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
        <div className="border-b border-white/10 px-5 py-3.5">
          <h4 className="text-sm font-bold text-white">Ringkasan Tabulasi 4 Pos Global</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Nama Pos Global</th>
                <th className="px-5 py-3 text-center font-medium">Persentase</th>
                <th className="px-5 py-3 text-right font-medium">Nominal Hasil Alokasi</th>
                <th className="px-5 py-3 font-medium">Fungsi Alokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {calculatedPos.map((pos) => (
                <tr key={pos.key} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold text-white">{pos.name}</td>
                  <td className="px-5 py-3 text-center font-semibold text-amber-400">
                    {pos.percent}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-white">
                    {formatRupiah(pos.amount)}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{pos.description}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-amber-500/20 bg-amber-500/5">
              <tr>
                <td className="px-5 py-3.5 font-bold text-white">Total Pos Global</td>
                <td className="px-5 py-3.5 text-center font-bold text-amber-400">100%</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                  {formatRupiah(totalAllocated)}
                </td>
                <td className="px-5 py-3.5 text-xs text-emerald-400 font-medium">
                  {isZeroOrNegative
                    ? 'Tidak ada dana profit yang dapat dibagi'
                    : 'Dialokasikan penuh (100% dari profit bersih)'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Manual() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');

  // Simulasi nominal pemasukan per bisnis (default: Rp1.000.000)
  const [businessIncomeSim, setBusinessIncomeSim] = useState('1000000');

  // Simulasi profit bersih untuk 4 Pos Global (default: Rp10.000.000)
  const [globalProfitSim, setGlobalProfitSim] = useState('10000000');

  const parsedBusinessIncome = Number(businessIncomeSim);
  const businessIncomeAmount =
    Number.isFinite(parsedBusinessIncome) && parsedBusinessIncome >= 0
      ? parsedBusinessIncome
      : 0;

  const parsedGlobalProfit = Number(globalProfitSim);
  const globalProfitAmount =
    Number.isFinite(parsedGlobalProfit) && parsedGlobalProfit >= 0
      ? parsedGlobalProfit
      : 0;

  const active = sections.find((s) => s.id === activeSection)!;
  const ActiveIcon = active.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader
        title="Panduan Penggunaan FinanceKu"
        description="Petunjuk operasional pencatatan transaksi, sinkronisasi aturan alokasi bisnis, dan pembagian 4 Pos Global Pemilik."
      />

      {/* 4 Submenu Navigasi Utama */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const selected = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={selected}
              className={`group relative rounded-2xl border p-5 text-left transition-all ${
                selected
                  ? 'border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                  : 'border-white/10 bg-white/[0.03] hover:border-amber-500/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                    selected
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-gray-400 group-hover:text-gray-200'
                  }`}
                >
                  <Icon size={22} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    {section.tag}
                  </span>
                  <ChevronRight
                    size={16}
                    className={`transition-transform duration-200 ${
                      selected ? 'translate-x-0.5 text-amber-400' : 'text-gray-600'
                    }`}
                  />
                </div>
              </div>
              <h3
                className={`mt-4 font-bold ${
                  selected ? 'text-amber-400' : 'text-white'
                }`}
              >
                {section.title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-gray-400 line-clamp-2">
                {section.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Konten Submenu Aktif */}
      <section className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-8">
        {/* Header Bagian Terpilih */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <ActiveIcon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white sm:text-2xl">{active.title}</h2>
                <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 sm:inline-block">
                  {active.tag}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{active.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 text-xs text-gray-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Sinkron dengan allocationConfig.ts</span>
          </div>
        </div>

        {/* 1. KONTEN SUBMENU: PANDUAN UMUM */}
        {activeSection === 'dashboard' && (
          <div className="space-y-8">
            {/* Disclaimer Perbankan & Tidak Otomatis Transfer */}
            <Notice type="info">
              <strong className="text-white">Penting — Batasan & Cara Kerja Aplikasi:</strong>
              <br />
              Kalkulasi alokasi di FinanceKu bersifat <em>administratif/ledger internal</em> pada sistem pencatatan. Aplikasi ini <strong>tidak pernah melakukan auto-debet atau transfer uang otomatis antar rekening Bank Jago / bank fisik lainnya</strong>. Mutasi fisik uang di perbankan tetap dilakukan secara manual oleh pemilik/pengelola keuangan.
            </Notice>

            {/* Alur Kerja Keuangan */}
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <BookOpen size={20} className="text-amber-400" />
                Alur Pencatatan Keuangan di FinanceKu
              </h3>
              <div className="space-y-4">
                <Instruction number={1} title="Pencatatan Pemasukan & Alokasi Persentase Bisnis">
                  Saat transaksi penjualan masuk, catat melalui menu <strong>Transaksi &gt; Pemasukan</strong>. Pilih bisnis terkait. Sistem secara otomatis menghitung pembagian ke akun-akun kantong berdasarkan aturan persentase bisnis (Jamu Herbal, Akademi Spiritual, atau Pakar Digital).
                </Instruction>
                <Instruction number={2} title="Pencatatan Pengeluaran Operasional Riil">
                  Biaya riil (seperti sewa, server, operasional harian, belanja bahan, atau iklan aktual) dicatat sebagai <strong>Pengeluaran</strong>. Nominal harus mengurangi akun sumber yang bersangkutan. <em>Jangan mencatat alokasi HPP atau Marketing sebagai biaya tunai jika belum ada pembayaran nyata ke pihak ketiga</em>.
                </Instruction>
                <Instruction number={3} title="Transfer Mutasi Antar Kantong">
                  Pemindahan dana antar kantong/rekening dicatat melalui jenis transaksi <strong>Transfer</strong>. Transfer bukan pemasukan baru dan bukan pengeluaran bisnis.
                </Instruction>
                <Instruction number={4} title="Pemeriksaan Laporan & Penentuan Profit Bersih">
                  Buka menu <strong>Laporan</strong> untuk memantau performa per bisnis atau konsolidasi seluruh bisnis. Profit bersih dihitung dari <strong>Total Pemasukan dikurangi Total Pengeluaran Aktual</strong> pada periode tersebut.
                </Instruction>
                <Instruction number={5} title="Distribusi ke 4 Pos Global Pemilik">
                  Setelah profit bersih periode tersebut diketahui dan dana benar-benar tersedia, pemilik dapat membaginya ke dalam <strong>4 Pos Global (Personal 50%, Investment 30%, Rihlah 10%, Sedekah 10%)</strong>.
                </Instruction>
              </div>
            </div>

            {/* Diagram Alur: Omzet -> Bisnis -> Biaya Riil -> Profit -> 4 Pos Global */}
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers size={17} className="text-amber-400" />
                Hierarki Pembagian Keuangan (Mencegah Double Counting)
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                Pemisahan tegas antara alokasi operasional bisnis dengan hak profit bersih pemilik.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">Tahap 1</span>
                  <div className="mt-1 font-bold text-white">Pemasukan Kotor</div>
                  <p className="mt-1 text-xs text-gray-400">Uang hasil penjualan produk/jasa dari customer</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-center">
                  <span className="text-[11px] font-semibold text-amber-500 uppercase">Tahap 2</span>
                  <div className="mt-1 font-bold text-amber-300">Alokasi Internal Bisnis</div>
                  <p className="mt-1 text-xs text-gray-400">Dibagi ke Affiliate, Kas, HPP/Marketing, dan Profit</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 text-center">
                  <span className="text-[11px] font-semibold text-red-400 uppercase">Tahap 3</span>
                  <div className="mt-1 font-bold text-red-300">Biaya Riil Dikeluarkan</div>
                  <p className="mt-1 text-xs text-gray-400">Pengeluaran aktual operasional & pembayaran vendor</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-center">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase">Tahap 4</span>
                  <div className="mt-1 font-bold text-emerald-300">4 Pos Global Pemilik</div>
                  <p className="mt-1 text-xs text-gray-400">50% Personal, 30% Invest, 10% Rihlah, 10% Sedekah</p>
                </div>
              </div>
            </div>

            {/* Simulasi Interaktif 4 Pos Global */}
            <div>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <PieChart size={20} className="text-amber-400" />
                  Simulasi 4 Pos Global Pemilik
                </h3>
                <span className="text-xs text-gray-400">
                  Total Aturan: <strong>100%</strong> (Personal 50%, Investment 30%, Rihlah 10%, Sedekah 10%)
                </span>
              </div>

              <GlobalPosSimulation
                availableProfit={globalProfitAmount}
                onProfitChange={(val) => setGlobalProfitSim(val)}
              />
            </div>

            {/* Arti Angka Laporan */}
            <div>
              <h3 className="mb-3 font-bold text-white">Arti Angka Pada Laporan Keuangan</h3>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <TrendingUp size={20} className="mb-2 text-emerald-400" />
                  <h4 className="font-semibold text-white">Total Pemasukan</h4>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Seluruh arus kas masuk penjualan pada rentang periode yang dipilih.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <TrendingDown size={20} className="mb-2 text-red-400" />
                  <h4 className="font-semibold text-white">Total Pengeluaran</h4>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Seluruh pengeluaran riil yang dicatat. Transfer antar kantong tidak dihitung biaya.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <BarChart3 size={20} className="mb-2 text-amber-400" />
                  <h4 className="font-semibold text-white">Profit Bersih</h4>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Selisih pemasukan dikurangi pengeluaran. Menjadi dasar pembagian 4 Pos Global.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <Wallet size={20} className="mb-2 text-blue-400" />
                  <h4 className="font-semibold text-white">Saldo Akun</h4>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Posisi dana fisik yang tersimpan di rekening atau kantong saat ini.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. KONTEN SUBMENU: AKADEMI SPIRITUAL */}
        {activeSection === 'akademi' && (
          <div className="space-y-7">
            <Notice type="info">
              <strong className="text-white">Aturan Resmi Brand Akademi Spiritual:</strong>
              <br />
              Setiap pemasukan dibagi otomatis menjadi: <strong>Affiliate 20%</strong>, <strong>Kas 10%</strong>, <strong>Profit 70%</strong>, dan <strong>Bagi Hasil 0%</strong> (Total: 100%).
            </Notice>

            <div>
              <h3 className="mb-4 font-bold text-white">Alur Operasional Akademi Spiritual</h3>
              <div className="space-y-4">
                <Instruction number={1} title="Pencatatan Penjualan Kelas/Membership">
                  Buka menu Transaksi &gt; Pemasukan. Pilih <strong>Brand Akademi Spiritual</strong>, akun tujuan, dan nominal omzet. Sistem akan mengkalkulasi porsi Affiliate (20%), Kas (10%), dan Profit (70%).
                </Instruction>
                <Instruction number={2} title="Kantong Bagi Hasil (0%)">
                  Saat ini persentase Bagi Hasil ditetapkan 0% dan dicadangkan jika di masa depan ada investor/partner kerja sama baru tanpa perlu merombak struktur akun.
                </Instruction>
                <Instruction number={3} title="Pencairan Komisi Affiliate">
                  Saat membayar komisi affiliate, catat transaksi melalui <strong>Pengeluaran</strong> dengan akun sumber kantong Affiliate. Jangan memotong dari kas operasional atau profit.
                </Instruction>
                <Instruction number={4} title="Pemisahan Alokasi dari Pengeluaran Riil">
                  Alokasi persentase di aplikasi hanyalah pembagian ledger internal. Jika ada biaya zoom, website, atau honor pemateri, catat sebagai transaksi pengeluaran riil.
                </Instruction>
              </div>
            </div>

            {/* Input Simulasi & Tabel */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="akademi-amount-input" className="text-sm font-semibold text-white">
                  Nominal Simulasi Pemasukan Akademi Spiritual (Rp)
                </label>
                <div className="flex gap-2">
                  {[1000000, 5000000, 10000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBusinessIncomeSim(val.toString())}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                    >
                      {formatRupiah(val).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="akademi-amount-input"
                type="number"
                min="0"
                step="50000"
                value={businessIncomeSim}
                onChange={(e) => setBusinessIncomeSim(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm font-semibold text-white outline-none focus:border-amber-500/50 sm:max-w-xs"
              />
            </div>

            <BusinessAllocationSimulationTable
              businessName="Akademi Spiritual"
              amount={businessIncomeAmount}
              rules={BUSINESS_ALLOCATION_RULES['akademi-spiritual']}
            />
          </div>
        )}

        {/* 3. KONTEN SUBMENU: JAMU HERBAL */}
        {activeSection === 'jamu' && (
          <div className="space-y-7">
            <Notice type="info">
              <strong className="text-white">Aturan Resmi Brand Jamu Herbal:</strong>
              <br />
              Setiap pemasukan dibagi otomatis menjadi: <strong>Affiliate 20%</strong>, <strong>Kas 10%</strong>, <strong>HPP & Produksi 50%</strong>, dan <strong>Profit 20%</strong> (Total: 100%).
            </Notice>

            <div>
              <h3 className="mb-4 font-bold text-white">Alur Operasional Jamu Herbal</h3>
              <div className="space-y-4">
                <Instruction number={1} title="Pencatatan Penjualan Produk Jamu">
                  Catat pemasukan penjualan produk jamu pada menu Transaksi. Pilih <strong>Brand Jamu Herbal</strong>. Sistem langsung menghitung alokasi HPP 50%, Affiliate 20%, Kas 10%, dan Profit 20%.
                </Instruction>
                <Instruction number={2} title="Penggunaan Dana HPP & Produksi (50%)">
                  Alokasi 50% disiapkan untuk belanja bahan baku, botol, kemasan, ekstraksi herbal, dan ongkos produksi. Pengeluaran tunai riil dicatat saat pembelian barang dilakukan ke supplier.
                </Instruction>
                <Instruction number={3} title="Pencegahan Pencatatan Dobel (Anti-Double Counting)">
                  Jangan langsung mengurangi saldo kas saat alokasi HPP baru terbentuk. Alokasi adalah batas/pos pagu anggaran di aplikasi. Pengurangan uang kas di database Supabase hanya terjadi ketika ada transaksi Pengeluaran riil yang disimpan.
                </Instruction>
                <Instruction number={4} title="Penyaluran Profit Bersih (20%)">
                  Setelah seluruh pengeluaran produksi dan operasional terbayar, sisa profit 20% ini dievaluasi pada menu Laporan sebelum disalurkan ke 4 Pos Global Pemilik.
                </Instruction>
              </div>
            </div>

            {/* Input Simulasi & Tabel */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="jamu-amount-input" className="text-sm font-semibold text-white">
                  Nominal Simulasi Pemasukan Jamu Herbal (Rp)
                </label>
                <div className="flex gap-2">
                  {[1000000, 3000000, 10000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBusinessIncomeSim(val.toString())}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                    >
                      {formatRupiah(val).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="jamu-amount-input"
                type="number"
                min="0"
                step="50000"
                value={businessIncomeSim}
                onChange={(e) => setBusinessIncomeSim(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm font-semibold text-white outline-none focus:border-amber-500/50 sm:max-w-xs"
              />
            </div>

            <BusinessAllocationSimulationTable
              businessName="Jamu Herbal"
              amount={businessIncomeAmount}
              rules={BUSINESS_ALLOCATION_RULES['jamu-herbal']}
            />
          </div>
        )}

        {/* 4. KONTEN SUBMENU: PAKAR DIGITAL */}
        {activeSection === 'pakar' && (
          <div className="space-y-7">
            <Notice type="info">
              <strong className="text-white">Aturan Resmi Brand Pakar Digital:</strong>
              <br />
              Setiap pemasukan dibagi otomatis menjadi: <strong>Marketing 50%</strong> dan <strong>Profit 50%</strong> (Total: 100%).
            </Notice>

            <div>
              <h3 className="mb-4 font-bold text-white">Alur Operasional Pakar Digital</h3>
              <div className="space-y-4">
                <Instruction number={1} title="Pencatatan Penjualan Jasa/Produk Digital">
                  Catat fee project, retainer jasa, atau produk digital di bawah <strong>Brand Pakar Digital</strong>. Sistem akan menghitung pembagian 50% untuk cadangan Marketing dan 50% untuk Profit bisnis.
                </Instruction>
                <Instruction number={2} title="Alokasi Marketing (50%)">
                  Pos Marketing 50% dialokasikan untuk anggaran iklan (Meta Ads, Google Ads, TikTok Ads) serta tools otomasi. Biaya iklan riil dicatat sebagai transaksi Pengeluaran saat top-up saldo iklan atau saat kartu kredit ditagih.
                </Instruction>
                <Instruction number={3} title="Pencegahan Pencatatan Dobel">
                  Pagu Marketing 50% tidak boleh dianggap sebagai biaya hangus sampai uang benar-benar dibelanjakan. Sisa dana marketing yang belum terpakai tetap tercatat di saldo akun terkait.
                </Instruction>
                <Instruction number={4} title="Penyaluran Profit Bersih (50%)">
                  Bagian 50% profit bisnis dapat ditarik untuk kepentingan pemilik melalui 4 Pos Global setelah kewajiban operasional bulanan tertutup.
                </Instruction>
              </div>
            </div>

            {/* Input Simulasi & Tabel */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="pakar-amount-input" className="text-sm font-semibold text-white">
                  Nominal Simulasi Pemasukan Pakar Digital (Rp)
                </label>
                <div className="flex gap-2">
                  {[1000000, 5000000, 20000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBusinessIncomeSim(val.toString())}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                    >
                      {formatRupiah(val).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="pakar-amount-input"
                type="number"
                min="0"
                step="50000"
                value={businessIncomeSim}
                onChange={(e) => setBusinessIncomeSim(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm font-semibold text-white outline-none focus:border-amber-500/50 sm:max-w-xs"
              />
            </div>

            <BusinessAllocationSimulationTable
              businessName="Pakar Digital"
              amount={businessIncomeAmount}
              rules={BUSINESS_ALLOCATION_RULES['pakar-digital']}
            />
          </div>
        )}

        {/* Footer Catatan Validasi & Transparansi */}
        <div className="border-t border-white/10 pt-5">
          <p className="flex items-start gap-2 text-xs leading-5 text-gray-500">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>
              Seluruh simulasi di halaman ini murni bersifat kalkulasi interaktif di peramban (browser). Tidak ada data yang dikirim, disimpan ke database Supabase, atau mempengaruhi saldo rekening aktual.
            </span>
          </p>
        </div>
      </section>

      {/* Banner Edukasi & Prinsip Integritas Keuangan */}
      <section className="flex flex-col items-start gap-5 rounded-3xl border border-amber-500/15 bg-amber-500/[0.04] p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <HelpCircle size={30} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">Prinsip Pokok Integritas Keuangan FinanceKu</h3>
          <p className="mt-1.5 text-sm leading-6 text-gray-400">
            1. <strong>Disiplin Transaksi Riil:</strong> Catat mutasi tepat waktu saat uang benar-benar berpindah.<br />
            2. <strong>Pemisahan Entitas:</strong> Jangan mencampuradukkan pengeluaran pribadi dengan operasional bisnis.<br />
            3. <strong>Anti Double Counting:</strong> Alokasi persentase omzet adalah penetapan pagu internal, sedangkan beban riil adalah pengeluaran tunai aktual.<br />
            4. <strong>4 Pos Global dari Profit Bersih:</strong> Dana Personal, Investasi, Rihlah, dan Sedekah dihitung dari profit bersih yang benar-benar tersedia, bukan dari omzet kotor.
          </p>
        </div>
      </section>
    </div>
  );
}

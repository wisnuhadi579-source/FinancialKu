
import React, { useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Leaf,
  Monitor,
  ReceiptText,
  Wallet,
  Building2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart,
  Info,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/src/components/Common';

type SectionId = 'dashboard' | 'akademi' | 'jamu' | 'pakar';

type Allocation = {
  name: string;
  percent: number;
  description: string;
};

const sections: {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'dashboard',
    title: 'Panduan Umum',
    subtitle: 'Dashboard dan alur keuangan seluruh bisnis',
    icon: LayoutDashboard,
  },
  {
    id: 'akademi',
    title: 'Akademi Spiritual',
    subtitle: 'Panduan pencatatan Brand Akademi Spiritual',
    icon: GraduationCap,
  },
  {
    id: 'jamu',
    title: 'Jamu Herbal',
    subtitle: 'Panduan pencatatan Brand Jamu Herbal',
    icon: Leaf,
  },
  {
    id: 'pakar',
    title: 'Pakar Digital',
    subtitle: 'Panduan pencatatan Brand Pakar Digital',
    icon: Monitor,
  },
];

const generalAllocation: Allocation[] = [
  {
    name: 'Sedekah',
    percent: 10,
    description: 'Dana untuk sedekah',
  },
  {
    name: 'Rihlah',
    percent: 10,
    description: 'Dana perjalanan dan rekreasi',
  },
  {
    name: 'Tabungan',
    percent: 30,
    description: 'Dana simpanan dan cadangan',
  },
  {
    name: 'Kebutuhan dan Investasi',
    percent: 50,
    description: 'Dana kebutuhan pribadi dan investasi',
  },
];

const businessAllocations: Record<
  Exclude<SectionId, 'dashboard'>,
  Allocation[]
> = {
  akademi: [
    {
      name: 'Affiliate',
      percent: 20,
      description: 'Dana untuk kantong affiliate',
    },
    {
      name: 'Kas',
      percent: 10,
      description: 'Dana kas bisnis',
    },
    {
      name: 'Profit',
      percent: 10,
      description: 'Dana keuntungan bisnis',
    },
    {
      name: 'HPP dan Bagi Hasil',
      percent: 60,
      description: 'Dana biaya pokok dan bagi hasil',
    },
  ],
  jamu: [
    {
      name: 'Affiliate',
      percent: 20,
      description: 'Dana untuk kantong affiliate',
    },
    {
      name: 'HPP',
      percent: 50,
      description: 'Dana harga pokok dan produksi',
    },
    {
      name: 'Profit',
      percent: 30,
      description: 'Dana keuntungan bisnis',
    },
  ],
  pakar: [
    {
      name: 'Marketing',
      percent: 50,
      description: 'Dana promosi dan pemasaran',
    },
    {
      name: 'Profit',
      percent: 50,
      description: 'Dana keuntungan bisnis',
    },
  ],
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function AllocationTable({
  rows,
  amount,
  title,
}: {
  rows: Allocation[];
  amount: number;
  title: string;
}) {
  const totalPercent = rows.reduce((sum, row) => sum + row.percent, 0);
  const totalAllocation = rows.reduce(
    (sum, row) => sum + (amount * row.percent) / 100,
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="border-b border-white/10 px-5 py-4">
        <h4 className="font-bold text-white">{title}</h4>
        <p className="mt-1 text-sm text-gray-400">
          Dasar perhitungan: {formatRupiah(amount)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-5 py-3 font-medium">Alokasi</th>
              <th className="px-5 py-3 text-right font-medium">Persentase</th>
              <th className="px-5 py-3 text-right font-medium">Nominal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="px-5 py-4">
                  <div className="font-medium text-white">{row.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {row.description}
                  </div>
                </td>
                <td className="px-5 py-4 text-right text-amber-400">
                  {row.percent}%
                </td>
                <td className="px-5 py-4 text-right font-semibold text-white">
                  {formatRupiah((amount * row.percent) / 100)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t border-amber-500/20 bg-amber-500/5">
            <tr>
              <td className="px-5 py-4 font-bold text-white">Total</td>
              <td className="px-5 py-4 text-right font-bold text-amber-400">
                {totalPercent}%
              </td>
              <td className="px-5 py-4 text-right font-bold text-white">
                {formatRupiah(totalAllocation)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPercent !== 100 && (
        <div className="flex items-start gap-2 border-t border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          Total persentase belum mencapai 100%. Periksa kembali aturan alokasi.
        </div>
      )}
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 font-bold text-amber-400">
        {number}
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-white">{title}</h4>
        <div className="mt-1 text-sm leading-6 text-gray-400">{children}</div>
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <Info size={20} className="mt-0.5 shrink-0 text-amber-400" />
      <div className="text-sm leading-6 text-gray-300">{children}</div>
    </div>
  );
}

export default function Manual() {
  const [activeSection, setActiveSection] =
    useState<SectionId>('dashboard');

  // Contoh simulasi saja. Tidak mengambil saldo atau transaksi dari database.
  const [exampleAmount, setExampleAmount] = useState('1000000');

  const parsedAmount = Number(exampleAmount);
  const amount =
    Number.isFinite(parsedAmount) && parsedAmount >= 0
      ? parsedAmount
      : 0;

  const active = sections.find(
    (section) => section.id === activeSection
  )!;

  const ActiveIcon = active.icon;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader
        title="Panduan Penggunaan FinanceKu"
        description="Petunjuk pencatatan, pembagian dana, dan pembacaan laporan untuk setiap unit bisnis."
      />

      {/* Empat submenu panduan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const selected = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={selected}
              className={`group rounded-2xl border p-5 text-left transition-all ${
                selected
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-amber-500/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  <Icon size={23} />
                </div>
                <ChevronRight
                  size={18}
                  className={
                    selected ? 'text-amber-400' : 'text-gray-600'
                  }
                />
              </div>
              <h3
                className={`mt-4 font-bold ${
                  selected ? 'text-amber-400' : 'text-white'
                }`}
              >
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-5 text-gray-400">
                {section.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Konten submenu terpilih */}
      <section className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-8">
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <ActiveIcon size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {active.title}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {active.subtitle}
            </p>
          </div>
        </div>

        {activeSection === 'dashboard' && (
          <>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <BookOpen size={20} className="text-amber-400" />
                Cara kerja FinanceKu
              </h3>
              <div className="space-y-5">
                <Instruction number={1} title="Catat setiap pemasukan">
                  Setiap ada penjualan atau uang masuk, buka menu Transaksi,
                  pilih Pemasukan, tentukan bisnis, akun tujuan, kategori,
                  tanggal, dan nominal yang sesuai.
                </Instruction>
                <Instruction number={2} title="Catat setiap pengeluaran">
                  Setiap ada pembelian, biaya operasional, atau uang keluar,
                  catat melalui menu Transaksi sebagai Pengeluaran. Pilih
                  akun sumber dan kategori yang benar.
                </Instruction>
                <Instruction number={3} title="Catat pemindahan antar kantong">
                  Jika uang dipindahkan dari satu rekening Bank Jago ke
                  rekening lain, gunakan jenis transaksi Transfer. Transfer
                  bukan pendapatan atau biaya baru.
                </Instruction>
                <Instruction number={4} title="Cocokkan dengan rekening asli">
                  Pastikan setiap transaksi yang dicatat sesuai dengan
                  mutasi rekening dan kantong Bank Jago. Periksa juga saldo
                  pada menu Akun / Rekening.
                </Instruction>
                <Instruction number={5} title="Evaluasi laporan setiap bulan">
                  Pilih bisnis dan periode yang ingin diperiksa. Baca total
                  pemasukan, total pengeluaran, selisih bersih, saldo, dan
                  simulasi alokasi dana sebelum melakukan pembagian manual.
                </Instruction>
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <PieChart size={20} className="text-amber-400" />
                Simulasi pembagian pendapatan bersih
              </h3>
              <p className="mb-4 text-sm leading-6 text-gray-400">
                Masukkan nominal untuk melihat contoh pembagian. Angka ini
                hanya simulasi dan tidak mengubah transaksi atau saldo.
              </p>

              <label
                htmlFor="manual-example-amount"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Pendapatan bersih untuk simulasi (Rp)
              </label>
              <input
                id="manual-example-amount"
                type="number"
                min="0"
                step="1000"
                value={exampleAmount}
                onChange={(event) => setExampleAmount(event.target.value)}
                className="mb-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-500/50 sm:max-w-sm"
              />

              <AllocationTable
                title="Alokasi Umum"
                rows={generalAllocation}
                amount={amount}
              />
            </div>

            <Notice>
              Pembagian umum di atas merupakan aturan penggunaan dana
              setelah pendapatan bersih ditentukan. Jangan menjumlahkan
              pemasukan kotor sebagai pendapatan bersih. Pastikan dasar
              nominal yang dipakai benar sebelum membagi dana.
            </Notice>

            <div>
              <h3 className="mb-3 font-bold text-white">
                Arti angka pada laporan
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4">
                  <TrendingUp size={20} className="mb-2 text-emerald-400" />
                  <h4 className="font-semibold text-white">Total pemasukan</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Seluruh pemasukan yang tercatat dalam periode terpilih.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <TrendingDown size={20} className="mb-2 text-red-400" />
                  <h4 className="font-semibold text-white">Total pengeluaran</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Seluruh biaya yang tercatat dalam periode tersebut.
                    Transfer antar rekening tidak dihitung sebagai biaya.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <BarChart3 size={20} className="mb-2 text-amber-400" />
                  <h4 className="font-semibold text-white">Selisih bersih</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Total pemasukan dikurangi total pengeluaran yang
                    termasuk dalam perhitungan laporan.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <Wallet size={20} className="mb-2 text-blue-400" />
                  <h4 className="font-semibold text-white">Saldo rekening</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    Posisi uang yang tercatat pada rekening. Saldo bukan
                    hal yang sama dengan pendapatan bersih.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'akademi' && (
          <>
            <Notice>
              Gunakan akun yang terdaftar untuk Brand Akademi Spiritual.
              Persentase berikut mengikuti aturan pembagian yang ditentukan
              untuk bisnis ini.
            </Notice>
            <div>
              <h3 className="mb-4 font-bold text-white">
                Alur pencatatan penjualan
              </h3>
              <div className="space-y-5">
                <Instruction number={1} title="Catat penjualan">
                  Buka menu Transaksi, pilih Pemasukan, lalu pilih Brand
                  Akademi Spiritual, akun penerima, kategori Penjualan,
                  tanggal, dan nominal transaksi.
                </Instruction>
                <Instruction number={2} title="Bagi dana secara manual">
                  Setelah pemasukan tercatat, pindahkan dana sesuai
                  kebutuhan ke kantong affiliate, kas, profit, serta HPP
                  dan bagi hasil.
                </Instruction>
                <Instruction number={3} title="Catat pemindahan uang">
                  Jika dana benar-benar dipindahkan antar rekening yang
                  terdaftar dalam bisnis yang sama, catat melalui Transfer.
                  Jangan mencatat pemindahan tersebut sebagai pemasukan
                  atau pengeluaran baru.
                </Instruction>
              </div>
            </div>
            <AllocationTable
              title="Aturan Pembagian Akademi Spiritual"
              rows={businessAllocations.akademi}
              amount={amount}
            />
            <label
              htmlFor="akademi-example"
              className="block text-sm text-gray-300"
            >
              Nominal simulasi (Rp)
            </label>
            <input
              id="akademi-example"
              type="number"
              min="0"
              step="1000"
              value={exampleAmount}
              onChange={(event) => setExampleAmount(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-500/50 sm:max-w-sm"
            />
          </>
        )}

        {activeSection === 'jamu' && (
          <>
            <Notice>
              Semua transaksi Jamu Herbal dicatat menggunakan bisnis dan
              rekening Brand Jamu Herbal. Pembagian di bawah dilakukan
              secara manual, bukan transfer otomatis dari aplikasi.
            </Notice>
            <div className="space-y-5">
              <Instruction number={1} title="Catat penjualan jamu">
                Pada menu Transaksi, pilih Pemasukan, bisnis Brand Jamu
                Herbal, akun penerima, kategori Penjualan, dan nominal
                uang yang benar-benar diterima.
              </Instruction>
              <Instruction number={2} title="Sisihkan dana HPP">
                Alokasikan 50% sesuai aturan internal untuk kebutuhan
                bahan baku, produksi, dan biaya pokok produk.
              </Instruction>
              <Instruction number={3} title="Catat semua realisasi">
                Catat pengeluaran yang benar-benar terjadi sebagai
                Pengeluaran. Alokasi dana saja tidak otomatis menjadi
                pengeluaran sampai transaksi aktual dicatat.
              </Instruction>
            </div>
            <AllocationTable
              title="Aturan Pembagian Jamu Herbal"
              rows={businessAllocations.jamu}
              amount={amount}
            />
            <label
              htmlFor="jamu-example"
              className="block text-sm text-gray-300"
            >
              Nominal simulasi (Rp)
            </label>
            <input
              id="jamu-example"
              type="number"
              min="0"
              step="1000"
              value={exampleAmount}
              onChange={(event) => setExampleAmount(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-500/50 sm:max-w-sm"
            />
          </>
        )}

        {activeSection === 'pakar' && (
          <>
            <Notice>
              Gunakan bisnis Brand Pakar Digital ketika mencatat transaksi
              produk digital, jasa, atau pendapatan lainnya yang terkait
              dengan unit bisnis tersebut.
            </Notice>
            <div className="space-y-5">
              <Instruction number={1} title="Catat pendapatan">
                Masukkan transaksi penjualan melalui menu Transaksi sebagai
                Pemasukan dan pilih akun Brand Pakar Digital yang menerima
                uang.
              </Instruction>
              <Instruction number={2} title="Alokasikan dana marketing">
                Sisihkan 50% sesuai aturan internal untuk kebutuhan
                pemasaran. Catat biaya iklan atau promosi ketika uang
                benar-benar dibelanjakan.
              </Instruction>
              <Instruction number={3} title="Alokasikan dana profit">
                Sisihkan 50% untuk profit sesuai kebijakan internal.
                Bedakan dana yang baru dialokasikan dengan laba bersih
                yang sudah dihitung dari pendapatan dan biaya aktual.
              </Instruction>
            </div>
            <AllocationTable
              title="Aturan Pembagian Pakar Digital"
              rows={businessAllocations.pakar}
              amount={amount}
            />
            <label
              htmlFor="pakar-example"
              className="block text-sm text-gray-300"
            >
              Nominal simulasi (Rp)
            </label>
            <input
              id="pakar-example"
              type="number"
              min="0"
              step="1000"
              value={exampleAmount}
              onChange={(event) => setExampleAmount(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-500/50 sm:max-w-sm"
            />
          </>
        )}

        <div className="border-t border-white/10 pt-5">
          <p className="flex items-start gap-2 text-xs leading-5 text-gray-500">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            Panduan ini menjelaskan prosedur pencatatan dan simulasi
            pembagian. Nominal contoh tidak disimpan ke database dan tidak
            memindahkan saldo rekening.
          </p>
        </div>
      </section>

      <section className="flex flex-col items-start gap-5 rounded-3xl border border-amber-500/10 bg-amber-500/5 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <HelpCircle size={30} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            Prinsip utama pencatatan
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Catat transaksi sesuai pergerakan uang yang benar-benar
            terjadi. Gunakan Transfer untuk perpindahan antar rekening,
            Pengeluaran untuk biaya aktual, dan laporan untuk mengevaluasi
            hasil usaha. Simulasi alokasi tidak menggantikan pencatatan
            transaksi.
          </p>
        </div>
      </section>
    </div>
  );
}

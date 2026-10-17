import React from 'react';
import { 
  BookOpen, 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  Building2, 
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';
import { PageHeader } from '@/src/components/Common';

export default function Manual() {
  const sections = [
    {
      id: 'intro',
      title: '1. Pengenalan',
      icon: BookOpen,
      content: 'FinanceKu adalah aplikasi pencatat keuangan bisnis sederhana yang dirancang untuk membantu pemilik bisnis memantau arus kas tanpa kerumitan sistem akuntansi yang berat. Fokus utama kami adalah membantu Anda mencatat apa yang masuk, apa yang keluar, dan di mana uang tersebut berada.'
    },
    {
      id: 'dashboard',
      title: '2. Dashboard',
      icon: LayoutDashboard,
      content: 'Dashboard adalah pusat kendali Anda. Di sini Anda dapat melihat ringkasan total pemasukan, pengeluaran, selisih (keuntungan/kerugian), dan saldo kas saat ini. Grafik Tren Arus Kas membantu Anda melihat pola pergerakan uang harian dalam periode yang dipilih.'
    },
    {
      id: 'transactions',
      title: '3. Transaksi',
      icon: ReceiptText,
      content: 'Halaman Transaksi mencatat setiap pergerakan uang. Anda dapat mencari transaksi berdasarkan keterangan, memfilter berdasarkan bisnis, atau melihat rentang tanggal tertentu. Anda juga dapat membatalkan transaksi jika terjadi kesalahan pencatatan.'
    },
    {
      id: 'income',
      title: '4. Pemasukan',
      icon: TrendingUp,
      content: 'Gunakan tombol "+ Pemasukan" untuk mencatat uang yang masuk ke bisnis Anda. Anda wajib memilih bisnis yang bersangkutan, akun/rekening tujuan (di mana uang diterima), dan kategori pemasukan (seperti Penjualan, Jasa, atau Produk Digital).'
    },
    {
      id: 'expense',
      title: '5. Pengeluaran',
      icon: TrendingDown,
      content: 'Gunakan tombol "+ Pengeluaran" untuk mencatat setiap biaya atau belanja bisnis. Anda wajib menentukan akun sumber (dari mana uang diambil) dan kategori pengeluaran (seperti Marketing, Gaji, atau Operasional).'
    },
    {
      id: 'transfer',
      title: '6. Transfer',
      icon: ArrowRightLeft,
      content: 'Fitur Transfer digunakan untuk memindahkan saldo antar rekening yang Anda miliki (misalnya dari Rekening Penjualan ke Rekening Operasional). Penting dicatat bahwa Transfer TIDAK dihitung sebagai pemasukan atau pengeluaran bisnis karena total saldo bisnis Anda tetap sama.'
    },
    {
      id: 'accounts',
      title: '7. Akun / Rekening',
      icon: Wallet,
      content: 'Halaman ini menampilkan semua "kantong uang" atau rekening yang Anda daftarkan. Anda dapat memantau saldo saat ini di setiap rekening secara real-time. Saldo dihitung secara otomatis berdasarkan transaksi yang terjadi.'
    },
    {
      id: 'reports',
      title: '8. Laporan',
      icon: BarChart3,
      content: 'Halaman Laporan memberikan analisis lebih mendalam. Anda dapat melihat breakdown pemasukan dan pengeluaran berdasarkan kategori dalam bentuk diagram lingkaran, serta perbandingan performa antar unit bisnis jika Anda mengelola lebih dari satu bisnis.'
    },
    {
      id: 'businesses',
      title: '9. Bisnis',
      icon: Building2,
      content: 'Jika Anda memiliki beberapa unit bisnis atau brand (misalnya: Akademi Spiritual dan Jamu Herbal), Anda dapat memantau semuanya dalam satu aplikasi. Halaman Bisnis memberikan ringkasan saldo dan selisih kas per unit bisnis.'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader 
        title="Panduan Penggunaan" 
        description="Pelajari cara mengoptimalkan penggunaan FinanceKu untuk memantau kesehatan keuangan bisnis Anda."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sections.map((section) => (
          <div key={section.id} className="bg-white/5 border border-white/5 rounded-3xl p-8 hover:border-amber-500/30 transition-all flex flex-col group">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
              <section.icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-4">{section.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-amber-500/5 border border-amber-500/10 rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 shrink-0">
          <HelpCircle size={40} />
        </div>
        <div>
          <h4 className="text-xl font-bold text-white mb-2">Butuh bantuan lebih lanjut?</h4>
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
            Jika Anda memiliki pertanyaan teknis atau membutuhkan bantuan dalam mengatur struktur bisnis Anda, 
            silakan hubungi tim dukungan kami melalui email di support@financeku.com.
          </p>
        </div>
      </div>
    </div>
  );
}

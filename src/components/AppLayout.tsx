import React, { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  Building2, 
  BarChart3, 
  BookOpen, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transaksi', icon: ReceiptText },
  { path: '/accounts', label: 'Akun / Rekening', icon: Wallet },
  { path: '/businesses', label: 'Bisnis', icon: Building2 },
  { path: '/reports', label: 'Laporan', icon: BarChart3 },
  { path: '/manual', label: 'Panduan', icon: BookOpen },
];

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-50">
        <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/50 rounded flex items-center justify-center">
            <span className="text-amber-500 font-black">F</span>
          </div>
          <span>Financial<span className="text-amber-500">KU</span></span>
        </Link>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-40 bg-[#0a0a0a] transform transition-transform duration-300 md:relative md:translate-x-0 md:inset-auto md:w-64 md:border-r md:border-white/5 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:block">
          <Link to="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/50 rounded flex items-center justify-center">
              <span className="text-amber-500 font-black">W</span>
            </div>
            <span>Financial<span className="text-amber-500">KU</span></span>
          </Link>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-medium">Pencatat Keuangan Bisnis</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group",
                isActive 
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors",
                "group-hover:text-amber-500"
              )} />
              {item.label}
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500">Versi 1.0.0</p>
            <p className="text-sm font-medium text-white mt-1">FinanceKu Premium</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl hidden md:flex items-center justify-between px-8 sticky top-0 z-30">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Workspace</h2>
          <div className="flex items-center gap-4">
            {/* User Profile or Notification Placeholder */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-white">
              DH
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>

        <footer className="p-4 border-t border-white/5 text-center text-[10px] text-gray-600 uppercase tracking-tighter">
          FinanceKu &copy; 2026 · Pencatat Keuangan Bisnis Modern
        </footer>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

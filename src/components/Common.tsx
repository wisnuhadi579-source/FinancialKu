import React from 'react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { Loader2, AlertCircle, Inbox, HelpCircle, BookOpen, X } from 'lucide-react';

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: {
  title: string;
  value: number;
  subtitle?: string;
  icon?: any;
  trend?: { value: number; label: string; positive: boolean };
  className?: string;
}) {
  return (
    <div className={cn("bg-white/5 border border-white/5 rounded-2xl p-6 transition-all hover:border-amber-500/30 group", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{title}</p>
          <h3 className={cn(
            "text-2xl font-bold mt-2 font-mono tabular-nums",
            value < 0 ? "text-red-400" : "text-white"
          )}>
            {formatCurrency(value)}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-3 text-[10px] font-bold uppercase",
              trend.positive ? "text-emerald-500" : "text-red-500"
            )}>
              <span>{trend.positive ? '↑' : '↓'} {trend.value}%</span>
              <span className="text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-white/5 rounded-xl group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
            <Icon size={20} className="text-gray-400 group-hover:text-amber-500" />
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingState({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
      <p className="text-gray-500 text-sm font-medium tracking-wide">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Gagal memuat data.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-red-500/10 bg-red-500/5 rounded-2xl">
      <AlertCircle className="text-red-500 mb-4" size={40} />
      <p className="text-red-400 text-sm font-medium mb-4">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'Belum ada data.', action }: { message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-white/5 bg-white/5 rounded-2xl border-dashed">
      <Inbox className="text-gray-600 mb-4" size={40} />
      <p className="text-gray-500 text-sm font-medium mb-6">{message}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
        {description && <p className="text-gray-500 mt-2 text-sm max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

export function GuideButton({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
      >
        <BookOpen size={14} />
        📖 Panduan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <HelpCircle size={18} className="text-amber-500" />
                </div>
                Panduan {title}
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-wrap">
                {content}
              </p>
            </div>
            <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-amber-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-400 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

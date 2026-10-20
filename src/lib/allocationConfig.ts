import type { Business, Account } from '../types';

export type AllocationRule = {
  name: string;
  percent: number;
  description: string;
};

/**
 * Aturan persentase alokasi untuk setiap unit bisnis sesuai spesifikasi FinanceKu:
 * A. Brand Jamu Herbal: Affiliate 20%, Kas 10%, HPP & Produksi 50%, Profit 20% (Total: 100%)
 * B. Brand Akademi Spiritual: Affiliate 20%, Kas 10%, Profit 70%, Bagi Hasil 0% (Total: 100%)
 * C. Brand Pakar Digital: Marketing 50%, Profit 50% (Total: 100%)
 */
export const BUSINESS_ALLOCATION_RULES: Record<string, AllocationRule[]> = {
  'jamu-herbal': [
    { name: 'Affiliate', percent: 20, description: 'Kantong affiliate komisi penjualan' },
    { name: 'Kas', percent: 10, description: 'Dana kas operasional bisnis' },
    { name: 'HPP & Produksi', percent: 50, description: 'Harga Pokok Produksi dan belanja bahan' },
    { name: 'Profit', percent: 20, description: 'Keuntungan bersih bisnis' },
  ],
  'akademi-spiritual': [
    { name: 'Affiliate', percent: 20, description: 'Kantong affiliate komisi' },
    { name: 'Kas', percent: 10, description: 'Dana kas operasional bisnis' },
    { name: 'Profit', percent: 70, description: 'Keuntungan bersih bisnis' },
    { name: 'Bagi Hasil', percent: 0, description: 'Dana cadangan bagi hasil (0%)' },
  ],
  'pakar-digital': [
    { name: 'Marketing', percent: 50, description: 'Dana promosi, iklan, dan pemasaran' },
    { name: 'Profit', percent: 50, description: 'Keuntungan bersih bisnis' },
  ],
};

/**
 * Validasi apakah kumpulan aturan alokasi memiliki total persentase tepat 100%.
 */
export function validateAllocationRules(rules: AllocationRule[]): { valid: boolean; totalPercent: number } {
  const totalPercent = rules.reduce((sum, r) => sum + r.percent, 0);
  return {
    valid: totalPercent === 100,
    totalPercent,
  };
}

/**
 * Mendapatkan aturan alokasi untuk bisnis berdasarkan slug atau nama bisnis.
 */
export function getAllocationRulesForBusiness(business?: Business | null): AllocationRule[] {
  if (!business) return [];
  const slug = (business.slug || '').toLowerCase();
  const name = (business.name || '').toLowerCase();

  if (slug.includes('jamu') || name.includes('jamu')) {
    return BUSINESS_ALLOCATION_RULES['jamu-herbal'];
  }
  if (slug.includes('akademi') || name.includes('akademi') || name.includes('spiritual')) {
    return BUSINESS_ALLOCATION_RULES['akademi-spiritual'];
  }
  if (slug.includes('pakar') || name.includes('pakar') || name.includes('digital')) {
    return BUSINESS_ALLOCATION_RULES['pakar-digital'];
  }

  // Fallback standar 100% jika ada unit bisnis baru tanpa konfigurasi khusus
  return [{ name: 'Kas Operasional', percent: 100, description: 'Alokasi penuh ke kas' }];
}

/**
 * Pencocokan cerdas antara nama alokasi dengan akun rekening yang tersedia di database Supabase.
 * Menggunakan normalisasi nama, substring matching, dan mapping kata kunci/sinonim.
 */
export function matchAccountForAllocation(
  businessAccounts: Account[],
  allocationName: string,
  expectedPercent: number
): Account | undefined {
  if (!businessAccounts || businessAccounts.length === 0) return undefined;

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normAlloc = clean(allocationName);

  // 1. Pencocokan langsung (exact atau substring) pada nama akun
  const directMatch = businessAccounts.find(acc => {
    const accNorm = clean(acc.name);
    return accNorm.includes(normAlloc) || normAlloc.includes(accNorm);
  });
  if (directMatch) return directMatch;

  // 2. Kamus kata kunci & alias untuk pencocokan semantik
  const synonymMap: Record<string, string[]> = {
    affiliate: ['affiliate', 'afiliasi', 'komisi'],
    kas: ['kas', 'cash', 'operasional', 'bank'],
    hpp: ['hpp', 'produksi', 'bahan', 'cogs', 'belanja'],
    produksi: ['produksi', 'hpp', 'bahan', 'belanja'],
    profit: ['profit', 'laba', 'keuntungan', 'net'],
    bagihasil: ['bagihasil', 'bagi hasil', 'investor', 'dividen', 'syirkah'],
    marketing: ['marketing', 'iklan', 'promosi', 'ads', 'pemasaran'],
  };

  for (const [key, aliases] of Object.entries(synonymMap)) {
    if (normAlloc.includes(clean(key)) || aliases.some(a => normAlloc.includes(clean(a)))) {
      const matchedBySynonym = businessAccounts.find(acc => {
        const accNorm = clean(acc.name);
        return aliases.some(alias => accNorm.includes(clean(alias)));
      });
      if (matchedBySynonym) return matchedBySynonym;
    }
  }

  // 3. Pencocokan berdasarkan income_percentage jika tersimpan di kolom akun
  const byPercent = businessAccounts.filter(acc => (acc as any).income_percentage === expectedPercent);
  if (byPercent.length === 1) return byPercent[0];

  // 4. Jika hanya ada satu akun pada bisnis tersebut, jadikan fallback
  if (businessAccounts.length === 1) return businessAccounts[0];

  return undefined;
}

/**
 * Perhitungan pembagian alokasi deterministik dengan rounding reconciliation
 * Memastikan total(alokasi) === totalAmount tanpa selisih 1 rupiah pun akibat pembulatan desimal.
 */
export function calculateDeterministicAllocations(
  totalAmount: number,
  rules: AllocationRule[]
): { name: string; percent: number; amount: number }[] {
  if (!totalAmount || totalAmount <= 0) {
    return rules.map(r => ({ name: r.name, percent: r.percent, amount: 0 }));
  }

  const positiveTotal = Math.max(0, Math.floor(totalAmount));
  let allocatedSum = 0;

  const result = rules.map(r => {
    if (r.percent === 0) {
      return { name: r.name, percent: 0, amount: 0 };
    }
    const calculated = Math.round((positiveTotal * r.percent) / 100);
    allocatedSum += calculated;
    return {
      name: r.name,
      percent: r.percent,
      amount: calculated,
    };
  });

  // Rekonsiliasi selisih pembulatan ke alokasi dengan persentase terbesar
  const diff = positiveTotal - allocatedSum;
  if (diff !== 0) {
    let targetIdx = 0;
    let highestPercent = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].percent > highestPercent) {
        highestPercent = result[i].percent;
        targetIdx = i;
      }
    }
    result[targetIdx].amount += diff;
  }

  return result;
}

/**
 * Konfigurasi 4 Pos Global Pemilik sesuai aturan FinanceKu:
 * 1. Personal: 50%
 * 2. Investment: 30%
 * 3. Rihlah: 10%
 * 4. Sedekah: 10%
 * Total = 100%
 */
export type GlobalPosRule = {
  key: string;
  name: string;
  percent: number;
  description: string;
  color: string;
  badgeBg: string;
};

export const GLOBAL_POS_RULES: GlobalPosRule[] = [
  {
    key: 'personal',
    name: 'Personal',
    percent: 50,
    description: 'Kebutuhan primer, keluarga, dan operasional harian owner',
    color: '#3b82f6',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    key: 'investment',
    name: 'Investment',
    percent: 30,
    description: 'Tabungan jangka panjang, dana darurat, dan pengembangan portofolio',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    key: 'rihlah',
    name: 'Rihlah',
    percent: 10,
    description: 'Perjalanan, liburan keluarga, silaturahmi, dan refreshing pikiran',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    key: 'sedekah',
    name: 'Sedekah',
    percent: 10,
    description: 'Zakat mal, infaq sosial, sedekah produktif, dan keberkahan harta',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
];

/**
 * Mendapatkan persentase alokasi profit untuk suatu unit bisnis.
 * Jamu Herbal: 20%, Akademi Spiritual: 70%, Pakar Digital: 50%.
 */
export function getProfitPercentageForBusiness(business?: Business | null): number {
  const rules = getAllocationRulesForBusiness(business);
  const profitRule = rules.find(r => r.name.toLowerCase().includes('profit'));
  return profitRule ? profitRule.percent : 0;
}

/**
 * Menghitung pembagian deterministik 4 Pos Global berdasarkan profit yang tersedia.
 * Mencegah pembagian ganda dan tidak mengalokasikan jika profit <= 0.
 */
export function calculateGlobalPosAllocations(availableProfit: number): {
  key: string;
  name: string;
  percent: number;
  amount: number;
  description: string;
  color: string;
  badgeBg: string;
}[] {
  if (!availableProfit || availableProfit <= 0) {
    return GLOBAL_POS_RULES.map(pos => ({
      ...pos,
      amount: 0,
    }));
  }

  const positiveProfit = Math.max(0, Math.floor(availableProfit));
  let allocatedSum = 0;

  const result = GLOBAL_POS_RULES.map(pos => {
    const calculated = Math.round((positiveProfit * pos.percent) / 100);
    allocatedSum += calculated;
    return {
      ...pos,
      amount: calculated,
    };
  });

  // Rekonsiliasi rounding ke pos dengan persentase terbesar (Personal 50%)
  const diff = positiveProfit - allocatedSum;
  if (diff !== 0 && result.length > 0) {
    result[0].amount += diff;
  }

  return result;
}


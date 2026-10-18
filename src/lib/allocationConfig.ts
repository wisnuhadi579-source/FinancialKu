import type { Business, Account } from '../types';

export type AllocationRule = {
  name: string;
  percent: number;
  description: string;
};

/**
 * Aturan persentase alokasi untuk setiap unit bisnis sesuai spesifikasi FinanceKu:
 * A. Brand Jamu Herbal: Affiliate 20%, Kas 10%, HPP 50%, Profit 20%
 * B. Brand Akademi Spiritual: Affiliate 20%, Kas 10%, Profit 70%, Bagi Hasil 0%
 * C. Brand Pakar Digital: Marketing 50%, Profit 50%
 */
export const BUSINESS_ALLOCATION_RULES: Record<string, AllocationRule[]> = {
  'jamu-herbal': [
    { name: 'Affiliate', percent: 20, description: 'Kantong affiliate komisi penjualan' },
    { name: 'Kas', percent: 10, description: 'Dana kas operasional bisnis' },
    { name: 'HPP', percent: 50, description: 'Harga Pokok Produksi dan belanja bahan' },
    { name: 'Profit', percent: 20, description: 'Keuntungan bersih bisnis' },
  ],
  'akademi-spiritual': [
    { name: 'Affiliate', percent: 20, description: 'Kantong affiliate komisi' },
    { name: 'Kas', percent: 10, description: 'Dana kas operasional bisnis' },
    { name: 'Profit', percent: 70, description: 'Keuntungan bersih bisnis' },
    { name: 'Bagi Hasil', percent: 0, description: 'Dana cadangan bagi hasil' },
  ],
  'pakar-digital': [
    { name: 'Marketing', percent: 50, description: 'Dana promosi, iklan, dan pemasaran' },
    { name: 'Profit', percent: 50, description: 'Keuntungan bersih bisnis' },
  ],
};

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

  // Fallback standar 100% jika ada unit bisnis baru tanpa aturan khusus
  return [{ name: 'Kas Operasional', percent: 100, description: 'Alokasi penuh ke kas' }];
}

/**
 * Pencocokan cerdas antara nama alokasi dengan akun rekening yang tersedia di database Supabase.
 */
export function matchAccountForAllocation(
  businessAccounts: Account[],
  allocationName: string,
  expectedPercent: number
): Account | undefined {
  if (!businessAccounts || businessAccounts.length === 0) return undefined;

  const normAlloc = allocationName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Pencocokan kata kunci pada nama akun (contoh: "Affiliate" -> "AS - Affiliate", "JH - Kas" -> "Kas")
  const byKeyword = businessAccounts.find(acc => {
    const accNorm = acc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return accNorm.includes(normAlloc) || normAlloc.includes(accNorm);
  });
  if (byKeyword) return byKeyword;

  // 2. Pencocokan berdasarkan income_percentage jika tersimpan di database
  const byPercent = businessAccounts.filter(acc => (acc as any).income_percentage === expectedPercent);
  if (byPercent.length === 1) return byPercent[0];

  // 3. Fallback jika hanya ada satu akun
  if (businessAccounts.length === 1) return businessAccounts[0];

  return undefined;
}

/**
 * Perhitungan pembagian alokasi deterministik dengan rounding reconciliation
 * Memastikan total(alokasi) === totalAmount tanpa selisih 1 rupiah pun akibat floating point.
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

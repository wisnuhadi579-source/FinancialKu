export type GlobalPosData = {
  personal: number;
  investment: number;
  rihlah: number;
  sedekah: number;
  updatedAt: string;
};

const STORAGE_KEY = 'financeku_global_pos_data';

export function saveGlobalPosData(data: GlobalPosData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('financeku-global-pos-updated'));
}

export function getGlobalPosData(): GlobalPosData | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as GlobalPosData : null;
  } catch {
    return null;
  }
}
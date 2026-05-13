import { TransferStore } from '../types/Transfer';

const STORAGE_KEY = 'transfer-store';

export function saveTransferStore(store: TransferStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadTransferStore(): TransferStore {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {
      pending: [],
      paired: [],
      exported: []
    };
  }
  return JSON.parse(stored);
}

export function clearTransferStore(): void {
  localStorage.removeItem(STORAGE_KEY);
}

import { ExcelEntry } from './Entry';

export interface Transfer {
  id: string;
  accountNumber: string;
  accountCode: string;
  date: string;
  amount: string;
  historico: string;
  centroCusto: string;
  direction: 'OUT' | 'IN';
  status: 'PENDING' | 'PAIRED' | 'EXPORTED';
  pairedWith?: string;
  counterpartAccount?: string;
  original: ExcelEntry;
  importedAt: Date;
}

export interface TransferPair {
  id: string;
  outTransfer: Transfer;
  inTransfer: Transfer;
  matchScore: number;
  matchedAt: Date;
  exported: boolean;
}

export interface TransferStore {
  pending: Transfer[];
  paired: TransferPair[];
  exported: string[];
}

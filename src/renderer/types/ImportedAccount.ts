import { ProcessedEntry } from './Entry';
import { ContaBancariaMapping } from './Mapping';

export interface ImportedAccount {
  id: string;
  contaBancaria: ContaBancariaMapping;
  lancamentos: ProcessedEntry[];
  saldo: number;
  importedAt: Date;
  lastUpdated: Date;
  exported: boolean;
  exportedAt?: Date;
}

export interface ImportedAccountsStore {
  accounts: ImportedAccount[];
}

export interface BalanceteItem {
  codigo: string;
  nome: string;
  nivel: number;
  saldoDevedor: number;
  saldoCredor: number;
  saldo: number;
}

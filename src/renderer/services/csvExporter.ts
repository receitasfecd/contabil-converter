import Papa from 'papaparse';
import { ProcessedEntry } from '../types/Entry';
import { TransferPair } from '../types/Transfer';
import { ImportedAccount } from '../types/ImportedAccount';
import { CSV_HEADERS } from '../../shared/constants';

export function generateCSV(entries: ProcessedEntry[]): string {
  // Validar lançamentos antes de exportar
  const invalidEntries = entries.filter(entry => {
    // Sem débito ou sem crédito
    if (!entry.debito || !entry.credito) return true;
    // Débito igual ao crédito
    if (entry.debito === entry.credito) return true;
    return false;
  });

  if (invalidEntries.length > 0) {
    throw new Error(
      `Não é possível exportar: ${invalidEntries.length} lançamento(s) inválido(s).\n` +
      `Verifique se todos os lançamentos têm débito E crédito preenchidos e diferentes.`
    );
  }

  const rows = entries.map((entry) => ({
    Data: entry.data,
    Débito: entry.debito,
    Crédito: entry.credito,
    'Centro de Custo': entry.centroCusto,
    Histórico: entry.historico || 'SEM HISTÓRICO INFORMADO',
    Valor: entry.valor,
  }));

  const csv = Papa.unparse(rows, {
    quotes: [true, false, false, false, false, false],
    delimiter: ';',
    header: false,
    columns: CSV_HEADERS,
  });

  // Adicionar BOM para compatibilidade com Excel
  return '﻿' + csv;
}

export function generateTransferCSV(pairs: TransferPair[]): string {
  // Validar transferências antes de exportar
  const invalidPairs = pairs.filter(pair => {
    const debito = pair.outTransfer.accountCode;
    const credito = pair.inTransfer.accountCode;

    // Sem débito ou sem crédito
    if (!debito || !credito) return true;
    // Débito igual ao crédito
    if (debito === credito) return true;
    return false;
  });

  if (invalidPairs.length > 0) {
    throw new Error(
      `Não é possível exportar: ${invalidPairs.length} transferência(s) inválida(s).\n` +
      `Verifique se todas as transferências têm débito E crédito preenchidos e diferentes.`
    );
  }

  const rows = pairs.map((pair) => ({
    Data: pair.outTransfer.date,
    Débito: pair.outTransfer.accountCode,
    Crédito: pair.inTransfer.accountCode,
    'Centro de Custo': pair.outTransfer.centroCusto,
    Histórico: pair.outTransfer.historico || 'SEM HISTÓRICO INFORMADO',
    Valor: pair.outTransfer.amount,
  }));

  const csv = Papa.unparse(rows, {
    quotes: [true, false, false, false, false, false],
    delimiter: ';',
    header: false,
    columns: CSV_HEADERS,
  });

  // Adicionar BOM para compatibilidade com Excel
  return '﻿' + csv;
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function generateFilename(
  numeroConta: string,
  tipoAplicacao?: 'A' | 'A2' | 'A3' | null
): string {
  const suffix = tipoAplicacao || '';
  return `${numeroConta}${suffix}.csv`;
}

export function generateTransferFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `transferencias-${date}.csv`;
}

export function generateBatchCSV(accounts: ImportedAccount[]): string {
  const allRows: any[] = [];

  accounts.forEach(account => {
    account.lancamentos.forEach(entry => {
      allRows.push({
        Data: entry.data,
        Débito: entry.debito,
        Crédito: entry.credito,
        'Centro de Custo': entry.centroCusto,
        Histórico: entry.historico || 'SEM HISTÓRICO INFORMADO',
        Valor: entry.valor,
      });
    });
  });

  const csv = Papa.unparse(allRows, {
    quotes: [true, false, false, false, false, false],
    delimiter: ';',
    header: false,
    columns: CSV_HEADERS,
  });

  return '﻿' + csv;
}

export function generateBatchFilename(accountCount: number): string {
  const date = new Date().toISOString().split('T')[0];
  return `lancamentos-lote-${accountCount}-contas-${date}.csv`;
}

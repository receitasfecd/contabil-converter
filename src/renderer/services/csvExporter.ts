import Papa from 'papaparse';
import { ProcessedEntry } from '../types/Entry';
import { TransferPair } from '../types/Transfer';
import { ImportedAccount } from '../types/ImportedAccount';
import { CSV_HEADERS } from '../../shared/constants';

function cleanString(val: string | undefined | null): string {
  if (!val) return '';
  return val
    .replace(/[\r\n]+/g, ' ') // Remove quebras de linha
    .replace(/;/g, ' ')      // Remove ponto e vírgula para não quebrar o CSV (substitui por espaço)
    .replace(/\s\s+/g, ' ')  // Remove espaços duplos resultantes
    .trim();
}

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
    'Centro de Custo': cleanString(entry.centroCusto),
    Histórico: cleanString(entry.historico) || 'SEM HISTORICO',
    Valor: entry.valor,
  }));

  const csv = Papa.unparse(rows, {
    quotes: false,
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

  const rows = pairs.map((pair) => {
    const parseBrazilianValue = (valStr: string): number => {
      if (!valStr) return 0;
      return parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
    };

    const valOut = parseBrazilianValue(pair.outTransfer.amount);
    const valIn = parseBrazilianValue(pair.inTransfer.amount);
    const minVal = Math.min(valOut, valIn);
    const valorEfetivoStr = minVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      Data: pair.outTransfer.date,
      Débito: pair.outTransfer.accountCode,
      Crédito: pair.inTransfer.accountCode,
      'Centro de Custo': cleanString(pair.outTransfer.centroCusto),
      Histórico: cleanString(pair.outTransfer.historico) || 'SEM HISTORICO',
      Valor: valorEfetivoStr,
    };
  });

  const csv = Papa.unparse(rows, {
    quotes: false,
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
  const cleanName = (numeroConta + suffix).replace(/[^a-z0-9]/gi, '');
  return `${cleanName.substring(0, 8).toUpperCase()}.csv`;
}

export function generateTransferFilename(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  // Formato: T+DDHHMM (7 caracteres) ou just DDHHMMSS (8 caracteres)
  return `${day}${hour}${min}${sec}.csv`;
}

export function generateBatchCSV(accounts: ImportedAccount[]): string {
  const allRows: any[] = [];

  accounts.forEach(account => {
    account.lancamentos.forEach(entry => {
      allRows.push({
        Data: entry.data,
        Débito: entry.debito,
        Crédito: entry.credito,
        'Centro de Custo': cleanString(entry.centroCusto),
        Histórico: cleanString(entry.historico) || 'SEM HISTORICO',
        Valor: entry.valor,
      });
    });
  });

  const csv = Papa.unparse(allRows, {
    quotes: false,
    delimiter: ';',
    header: false,
    columns: CSV_HEADERS,
  });

  return '﻿' + csv;
}

export function generateBatchFilename(accountCount: number): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  // L + DD + HH + MM = 7 caracteres
  return `L${day}${hour}${min}.csv`;
}

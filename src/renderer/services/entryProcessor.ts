import { ExcelEntry, ProcessedEntry, ValidationResult } from '../types/Entry';
import { ClassificacaoMapping, ContaBancariaMapping } from '../types/Mapping';
import { Transfer } from '../types/Transfer';
import { formatDate, formatCurrency, generateId } from '../utils/formatters';
import { isTransferencia, validateEntry } from '../utils/validators';
import { isTaxaAdministracao, addTaxaAdministracao } from './taxaAdministracaoService';

export function processEntries(
  entries: ExcelEntry[],
  classificacoes: ClassificacaoMapping[],
  contaBancaria: ContaBancariaMapping
): ProcessedEntry[] {
  const processedEntries: ProcessedEntry[] = [];

  for (const entry of entries) {
    try {
      let processed: ProcessedEntry;

      if (isTransferencia(entry)) {
        processed = processTransferencia(entry, contaBancaria.codigoContabil);
      } else {
        const mapping = classificacoes.find(
          (m) => m.classificacaoFinanceira === entry.classificacaoFinanceira
        );
        processed = processFinanceiro(entry, mapping, contaBancaria.codigoContabil);
      }

      // Validar entrada
      const validation = validateEntry(
        entry,
        classificacoes.find(
          (m) => m.classificacaoFinanceira === entry.classificacaoFinanceira
        )
      );

      processed.warnings = validation.warnings;
      processed.errors = validation.errors;

      // Validar se débito e crédito são iguais
      if (processed.debito && processed.credito && processed.debito === processed.credito) {
        if (!processed.errors) processed.errors = [];
        processed.errors.push('Débito e Crédito são iguais - lançamento inválido');
      }

      processedEntries.push(processed);
    } catch (error) {
      console.error('Erro ao processar entrada:', error);
    }
  }

  return processedEntries;
}

export function processEntriesWithTransferSeparation(
  entries: ExcelEntry[],
  classificacoes: ClassificacaoMapping[],
  contaBancaria: ContaBancariaMapping
): {
  financialEntries: ProcessedEntry[];
  transfers: Transfer[];
} {
  const financialEntries: ProcessedEntry[] = [];
  const transfers: Transfer[] = [];

  for (const entry of entries) {
    try {
      const isTransfer = isTransferencia(entry);

      if (isTransfer) {
        // Criar Transfer ao invés de ProcessedEntry
        const transfer: Transfer = {
          id: crypto.randomUUID(),
          accountNumber: contaBancaria.numeroConta,
          accountCode: contaBancaria.codigoContabil,
          date: formatDate(entry.data),
          amount: formatCurrency(entry.valorDebito || entry.valorCredito!),
          historico: entry.historico,
          centroCusto: entry.codigoCentroCusto,
          direction: entry.valorDebito ? 'OUT' : 'IN',
          status: 'PENDING',
          original: entry,
          importedAt: new Date()
        };

        // Verificar se é taxa de administração
        if (isTaxaAdministracao(transfer)) {
          addTaxaAdministracao(transfer);
        }

        transfers.push(transfer);
      } else {
        // Processar como lançamento financeiro normal
        const mapping = classificacoes.find(
          (m) => m.classificacaoFinanceira === entry.classificacaoFinanceira
        );

        if (mapping) {
          const processed = processFinanceiro(entry, mapping, contaBancaria.codigoContabil);

          // Validar entrada
          const validation = validateEntry(entry, mapping);
          processed.warnings = validation.warnings;
          processed.errors = validation.errors;

          // Validar se débito e crédito são iguais
          if (processed.debito && processed.credito && processed.debito === processed.credito) {
            if (!processed.errors) processed.errors = [];
            processed.errors.push('Débito e Crédito são iguais - lançamento inválido');
          }

          financialEntries.push(processed);
        }
      }
    } catch (error) {
      console.error('Erro ao processar entrada:', error);
    }
  }

  return { financialEntries, transfers };
}

function processFinanceiro(
  entry: ExcelEntry,
  mapping: ClassificacaoMapping | undefined,
  contaBancaria: string
): ProcessedEntry {
  if (entry.valorDebito) {
    // DESPESA: Débito = classificação contábil, Crédito = conta banco
    return {
      id: generateId(),
      data: formatDate(entry.data),
      debito: mapping?.classificacaoContabil || '',
      credito: contaBancaria,
      centroCusto: entry.codigoCentroCusto,
      historico: entry.historico,
      valor: formatCurrency(entry.valorDebito),
      tipo: 'FINANCEIRO',
      original: entry,
    };
  } else {
    // RECEITA: Débito = conta banco, Crédito = classificação contábil
    return {
      id: generateId(),
      data: formatDate(entry.data),
      debito: contaBancaria,
      credito: mapping?.classificacaoContabil || '',
      centroCusto: entry.codigoCentroCusto,
      historico: entry.historico,
      valor: formatCurrency(entry.valorCredito!),
      tipo: 'FINANCEIRO',
      original: entry,
    };
  }
}

function processTransferencia(
  entry: ExcelEntry,
  contaBancaria: string
): ProcessedEntry {
  if (entry.valorDebito) {
    // Saída de dinheiro - contrapartida vazia
    return {
      id: generateId(),
      data: formatDate(entry.data),
      debito: contaBancaria,
      credito: '', // Vazio - será preenchido no Nasajon
      centroCusto: entry.codigoCentroCusto,
      historico: entry.historico,
      valor: formatCurrency(entry.valorDebito),
      tipo: 'TRANSFERENCIA',
      original: entry,
    };
  } else {
    // Entrada de dinheiro - contrapartida vazia
    return {
      id: generateId(),
      data: formatDate(entry.data),
      debito: '', // Vazio - será preenchido no Nasajon
      credito: contaBancaria,
      centroCusto: entry.codigoCentroCusto,
      historico: entry.historico,
      valor: formatCurrency(entry.valorCredito!),
      tipo: 'TRANSFERENCIA',
      original: entry,
    };
  }
}

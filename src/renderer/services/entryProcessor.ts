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
      // PRIORIDADE 1: Se tem campo TIPO explícito no Excel, usar ele
      if (entry.tipo === 'TAXA') {
        console.log(`🏷️ TIPO EXPLÍCITO: TAXA detectada - ${entry.historico}`);

        const taxa: Transfer = {
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

        try {
          const taxaAdicionada = addTaxaAdministracao(taxa);
          console.log(`💾 Taxa adicionada à store com ID: ${taxaAdicionada.id}, Status: ${taxaAdicionada.status}`);
        } catch (error) {
          console.error(`❌ Erro ao adicionar taxa à store:`, error);
        }

        transfers.push(taxa);
        continue;
      }

      if (entry.tipo === 'TRANSFERENCIA') {
        console.log(`🏷️ TIPO EXPLÍCITO: TRANSFERENCIA detectada - ${entry.historico}`);

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

        transfers.push(transfer);
        continue;
      }

      if (entry.tipo === 'FINANCEIRO') {
        console.log(`🏷️ TIPO EXPLÍCITO: FINANCEIRO detectado - ${entry.historico}`);

        const mapping = classificacoes.find(
          (m) => m.classificacaoFinanceira === entry.classificacaoFinanceira
        );

        if (mapping) {
          const processed = processFinanceiro(entry, mapping, contaBancaria.codigoContabil);
          const validation = validateEntry(entry, mapping);
          processed.warnings = validation.warnings;
          processed.errors = validation.errors;

          if (processed.debito && processed.credito && processed.debito === processed.credito) {
            if (!processed.errors) processed.errors = [];
            processed.errors.push('Débito e Crédito são iguais - lançamento inválido');
          }

          financialEntries.push(processed);
        }
        continue;
      }

      // PRIORIDADE 2: Se não tem tipo explícito, usar detecção automática
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

      // Criar objeto temporário de transferência para verificar se é Taxa de Administração
      // Mesmo que não tenha sido detectado como transferência padrão (ex: histórico não contém "transferência da conta")
      const tempTransfer: Transfer = {
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

      const isTaxa = isTaxaAdministracao(tempTransfer);

      if (isTransfer || isTaxa) {
        // Tratar como transferência
        // A adição à loja de taxas é feita centralizadamente pelo AppContext.addTransfersPairAndTaxas
        if (isTaxa) {
          console.log(`✅ Taxa de Administração detectada: ${tempTransfer.historico}`);
        }

        transfers.push(tempTransfer);
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

import { ExcelEntry, ValidationResult } from '../types/Entry';
import { ClassificacaoMapping } from '../types/Mapping';
import { TRANSFER_HISTORICO_PATTERNS, TRANSFER_DOCUMENTO_PATTERNS } from '../../shared/constants';

export function isTransferencia(entry: ExcelEntry): boolean {
  const matchHistorico = TRANSFER_HISTORICO_PATTERNS.some(pattern =>
    pattern.test(entry.historico)
  );

  const matchDocumento = TRANSFER_DOCUMENTO_PATTERNS.some(pattern =>
    pattern.test(entry.documento)
  );

  return matchHistorico || matchDocumento;
}

export function validateEntry(
  entry: ExcelEntry,
  mapping?: ClassificacaoMapping
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validações obrigatórias
  if (!entry.data) {
    errors.push('Data é obrigatória');
  }

  if (!entry.historico || entry.historico.trim() === '') {
    errors.push('Histórico é obrigatório');
  }

  if (!entry.valorDebito && !entry.valorCredito) {
    errors.push('Deve ter valor em débito ou crédito');
  }

  if (entry.valorDebito && entry.valorCredito) {
    warnings.push('Lançamento com débito E crédito - verificar');
  }

  // Validação de mapeamento para registros financeiros
  if (!isTransferencia(entry) && !mapping) {
    errors.push(
      `Classificação financeira "${entry.classificacaoFinanceira}" não mapeada`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

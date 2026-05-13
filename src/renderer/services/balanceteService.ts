import { ProcessedEntry } from '../types/Entry';
import { BalanceteItem } from '../types/ImportedAccount';
import { mappingService } from './mappingService';

export function generateBalancete(lancamentos: ProcessedEntry[]): BalanceteItem[] {
  const planoContas = mappingService.getPlanoContas();
  const balanceteMap = new Map<string, BalanceteItem>();

  // Inicializar todas as contas do plano de contas
  planoContas.forEach((conta) => {
    balanceteMap.set(conta.codigo, {
      codigo: conta.codigo,
      nome: conta.nome,
      nivel: conta.nivel,
      saldoDevedor: 0,
      saldoCredor: 0,
      saldo: 0,
    });
  });

  // Processar lançamentos
  lancamentos.forEach((lancamento) => {
    const valor = parseFloat(lancamento.valor.replace(/\./g, '').replace(',', '.'));

    // Processar débito
    if (lancamento.debito) {
      const debito = balanceteMap.get(lancamento.debito);
      if (debito) {
        debito.saldoDevedor += valor;
        debito.saldo += valor;
      } else {
        // Criar conta se não existir no plano
        balanceteMap.set(lancamento.debito, {
          codigo: lancamento.debito,
          nome: lancamento.debito,
          nivel: contarNivel(lancamento.debito),
          saldoDevedor: valor,
          saldoCredor: 0,
          saldo: valor,
        });
      }
    }

    // Processar crédito
    if (lancamento.credito) {
      const credito = balanceteMap.get(lancamento.credito);
      if (credito) {
        credito.saldoCredor += valor;
        credito.saldo -= valor;
      } else {
        // Criar conta se não existir no plano
        balanceteMap.set(lancamento.credito, {
          codigo: lancamento.credito,
          nome: lancamento.credito,
          nivel: contarNivel(lancamento.credito),
          saldoDevedor: 0,
          saldoCredor: valor,
          saldo: -valor,
        });
      }
    }
  });

  // Filtrar apenas contas com saldo e ordenar
  const balancete = Array.from(balanceteMap.values())
    .filter((item) => item.saldoDevedor !== 0 || item.saldoCredor !== 0)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  return balancete;
}

function contarNivel(codigo: string): number {
  // Contar quantos pontos tem no código para determinar o nível
  return (codigo.match(/\./g) || []).length + 1;
}

export function exportBalanceteToCSV(balancete: BalanceteItem[]): string {
  const header = 'Código;Nome;Nível;Saldo Devedor;Saldo Credor;Saldo\n';

  const rows = balancete.map((item) => {
    const saldoDevedor = formatCurrency(item.saldoDevedor);
    const saldoCredor = formatCurrency(item.saldoCredor);
    const saldo = formatCurrency(Math.abs(item.saldo));
    const saldoTipo = item.saldo >= 0 ? 'D' : 'C';

    return `${item.codigo};${item.nome};${item.nivel};${saldoDevedor};${saldoCredor};${saldo} ${saldoTipo}`;
  }).join('\n');

  return '﻿' + header + rows; // BOM para Excel
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function downloadBalanceteCSV(balancete: BalanceteItem[], filename: string): void {
  const csv = exportBalanceteToCSV(balancete);
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

import { ImportedAccount, ImportedAccountsStore } from '../types/ImportedAccount';
import { ProcessedEntry } from '../types/Entry';
import { ContaBancariaMapping } from '../types/Mapping';
import { loadTransferStore, saveTransferStore } from './transferStore';
import { mappingService } from './mappingService';
import { clearTaxasByAccount } from './taxaAdministracaoService';

const STORAGE_KEY = 'imported-accounts-store';

export function loadImportedAccounts(): ImportedAccountsStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accounts: parsed.accounts.map((acc: any) => ({
          ...acc,
          importedAt: new Date(acc.importedAt),
          lastUpdated: new Date(acc.lastUpdated),
        })),
      };
    }
  } catch (error) {
    console.error('Erro ao carregar contas importadas:', error);
  }

  return { accounts: [] };
}

export function saveImportedAccounts(store: ImportedAccountsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Erro ao salvar contas importadas:', error);
  }
}

export function addOrUpdateImportedAccount(
  contaBancaria: ContaBancariaMapping,
  lancamentos: ProcessedEntry[]
): ImportedAccount {
  const store = loadImportedAccounts();

  // Calcular saldo
  const saldo = calculateSaldo(lancamentos);

  // Verificar se conta já existe
  const existingIndex = store.accounts.findIndex(
    (acc) => acc.contaBancaria.id === contaBancaria.id
  );

  const now = new Date();

  if (existingIndex >= 0) {
    // Atualizar conta existente
    const existing = store.accounts[existingIndex];
    const updated: ImportedAccount = {
      ...existing,
      lancamentos: [...existing.lancamentos, ...lancamentos],
      saldo: existing.saldo + saldo,
      lastUpdated: now,
      exported: false, // Resetar status de exportação ao adicionar novos lançamentos
    };
    store.accounts[existingIndex] = updated;
    saveImportedAccounts(store);
    return updated;
  } else {
    // Criar nova conta
    const newAccount: ImportedAccount = {
      id: `imported-${Date.now()}-${Math.random()}`,
      contaBancaria,
      lancamentos,
      saldo,
      importedAt: now,
      lastUpdated: now,
      exported: false,
    };
    store.accounts.push(newAccount);
    saveImportedAccounts(store);
    return newAccount;
  }
}

export function updateLancamento(
  accountId: string,
  lancamentoId: string,
  updatedLancamento: ProcessedEntry
): void {
  const store = loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    const account = store.accounts[accountIndex];
    const lancamentoIndex = account.lancamentos.findIndex(
      (l) => l.id === lancamentoId
    );

    if (lancamentoIndex >= 0) {
      account.lancamentos[lancamentoIndex] = updatedLancamento;
      account.saldo = calculateSaldo(account.lancamentos);
      account.lastUpdated = new Date();
      saveImportedAccounts(store);
    }
  }
}

export function updateLancamentoHistorico(
  accountId: string,
  lancamentoId: string,
  novoHistorico: string
): void {
  const store = loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    const account = store.accounts[accountIndex];
    const lancamentoIndex = account.lancamentos.findIndex(
      (l) => l.id === lancamentoId
    );

    if (lancamentoIndex >= 0) {
      account.lancamentos[lancamentoIndex].historico = novoHistorico;
      account.lastUpdated = new Date();
      saveImportedAccounts(store);
    }
  }
}

export function deleteLancamento(accountId: string, lancamentoId: string): void {
  const store = loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    const account = store.accounts[accountIndex];
    account.lancamentos = account.lancamentos.filter((l) => l.id !== lancamentoId);
    account.saldo = calculateSaldo(account.lancamentos);
    account.lastUpdated = new Date();
    saveImportedAccounts(store);
  }
}

export function deleteImportedAccount(accountId: string): void {
  const store = loadImportedAccounts();

  // Encontrar a conta antes de excluir para pegar o código contábil
  const account = store.accounts.find((acc) => acc.id === accountId);

  if (account) {
    // Remover a conta
    store.accounts = store.accounts.filter((acc) => acc.id !== accountId);
    saveImportedAccounts(store);

    // Remover transferências relacionadas a esta conta
    const transferStore = loadTransferStore();

    const accountCode = account.contaBancaria.codigoContabil;
    const accountNumber = account.contaBancaria.numeroConta;

    // Filtrar transferências pendentes
    const pendingBefore = transferStore.pending.length;
    transferStore.pending = transferStore.pending.filter(
      (t) => t.accountCode !== accountCode && t.accountNumber !== accountNumber
    );

    // Filtrar pares que envolvem esta conta
    const pairedBefore = transferStore.paired.length;
    transferStore.paired = transferStore.paired.filter(
      (pair) =>
        pair.outTransfer.accountCode !== accountCode &&
        pair.inTransfer.accountCode !== accountCode &&
        pair.outTransfer.accountNumber !== accountNumber &&
        pair.inTransfer.accountNumber !== accountNumber
    );

    // Remover IDs exportados relacionados aos pares removidos
    const exportedBefore = transferStore.exported.length;
    const removedPairIds = new Set<string>();
    transferStore.paired.forEach(pair => removedPairIds.add(pair.id));
    transferStore.exported = transferStore.exported.filter(id => !removedPairIds.has(id));

    saveTransferStore(transferStore);

    // Remover taxas de administração relacionadas a esta conta
    clearTaxasByAccount(accountNumber);
  }
}

// Sincronizar dados das contas importadas com o mapeamento atualizado
export function syncImportedAccountsWithMapping(): void {
  const store = loadImportedAccounts();
  const contasBancarias = mappingService.getContasBancarias();

  let updated = false;

  store.accounts.forEach(account => {
    // Encontrar a conta bancária atualizada no mapeamento
    const updatedConta = contasBancarias.find(
      (c: any) => c.id === account.contaBancaria.id
    );

    if (updatedConta) {
      // Verificar se há diferenças
      if (
        account.contaBancaria.banco !== updatedConta.banco ||
        account.contaBancaria.numeroConta !== updatedConta.numeroConta ||
        account.contaBancaria.codigoContabil !== updatedConta.codigoContabil ||
        account.contaBancaria.descricao !== updatedConta.descricao ||
        account.contaBancaria.tipoAplicacao !== updatedConta.tipoAplicacao
      ) {
        // Atualizar com os dados mais recentes
        account.contaBancaria = updatedConta;
        updated = true;
      }
    }
  });

  if (updated) {
    saveImportedAccounts(store);
    console.log('✅ Contas importadas sincronizadas com o mapeamento');
  }
}

export function getImportedAccount(accountId: string): ImportedAccount | undefined {
  const store = loadImportedAccounts();
  return store.accounts.find((acc) => acc.id === accountId);
}

export function clearAllImportedAccounts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function calculateSaldo(lancamentos: ProcessedEntry[]): number {
  if (lancamentos.length === 0) return 0;

  console.log(`💰 Calculando saldo de ${lancamentos.length} lançamentos`);

  // O saldo correto é o último saldo do extrato (já vem calculado do Excel)
  const ultimoLancamento = lancamentos[lancamentos.length - 1];

  console.log(`📊 Último lançamento:`, {
    data: ultimoLancamento.data,
    historico: ultimoLancamento.historico.substring(0, 50),
    valor: ultimoLancamento.valor,
    saldoOriginal: ultimoLancamento.original.saldo,
    simbolo: ultimoLancamento.original.simbolo
  });

  if (ultimoLancamento.original && ultimoLancamento.original.saldo !== undefined) {
    // Para contas bancárias (ATIVO), o saldo é sempre o valor absoluto
    // O símbolo D ou C indica apenas a natureza contábil, não o sinal matemático
    const saldoFinal = Math.abs(ultimoLancamento.original.saldo);

    console.log(`✅ Saldo final: ${saldoFinal} (símbolo: ${ultimoLancamento.original.simbolo})`);
    return saldoFinal;
  }

  // Fallback: calcular manualmente
  console.log(`⚠️ Calculando saldo manualmente (fallback)`);
  return lancamentos.reduce((total, lancamento) => {
    const valor = parseFloat(lancamento.valor.replace(/\./g, '').replace(',', '.'));

    // Se é débito na conta bancária (saída de dinheiro), subtrai
    // Se é crédito na conta bancária (entrada de dinheiro), soma
    if (lancamento.original.valorDebito) {
      return total - valor;
    } else {
      return total + valor;
    }
  }, 0);
}

export function getImportProgress(totalContas: number): number {
  const store = loadImportedAccounts();
  if (totalContas === 0) return 0;
  return (store.accounts.length / totalContas) * 100;
}

export function markAccountAsExported(accountId: string): void {
  const store = loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    store.accounts[accountIndex].exported = true;
    store.accounts[accountIndex].exportedAt = new Date();
    saveImportedAccounts(store);
  }
}

export function markMultipleAccountsAsExported(accountIds: string[]): void {
  const store = loadImportedAccounts();
  const now = new Date();

  accountIds.forEach(accountId => {
    const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);
    if (accountIndex >= 0) {
      store.accounts[accountIndex].exported = true;
      store.accounts[accountIndex].exportedAt = now;
    }
  });

  saveImportedAccounts(store);
}

export function getPendingAccounts(): ImportedAccount[] {
  const store = loadImportedAccounts();
  return store.accounts.filter(acc => !acc.exported);
}

export function getExportedAccounts(): ImportedAccount[] {
  const store = loadImportedAccounts();
  return store.accounts.filter(acc => acc.exported);
}

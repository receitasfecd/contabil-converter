import { ImportedAccount, ImportedAccountsStore } from '../types/ImportedAccount';
import { ProcessedEntry } from '../types/Entry';
import { ContaBancariaMapping } from '../types/Mapping';
import { loadTransferStore, saveTransferStore } from './transferStore';
import { mappingService } from './mappingService';
import { clearTaxasByAccount } from './taxaAdministracaoService';
import {
  loadImportedAccountsFromSupabase,
  saveImportedAccountsToSupabase,
  deleteImportedAccountFromSupabase,
  updateImportedAccountInSupabase,
} from './supabaseImportedAccountsService';

const STORAGE_KEY = 'imported-accounts-store';

// Carregar contas importadas (prioriza Supabase, fallback para localStorage)
export async function loadImportedAccounts(): Promise<ImportedAccountsStore> {
  try {
    // Tentar carregar do Supabase primeiro
    const supabaseStore = await loadImportedAccountsFromSupabase();
    if (supabaseStore.accounts.length > 0) {
      return supabaseStore;
    }

    // Fallback: carregar do localStorage
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

// Salvar contas importadas (salva em ambos: Supabase e localStorage)
export async function saveImportedAccounts(store: ImportedAccountsStore): Promise<void> {
  try {
    // Salvar no localStorage (backup)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

    // Salvar no Supabase (compartilhado)
    await saveImportedAccountsToSupabase(store);
  } catch (error) {
    console.error('Erro ao salvar contas importadas:', error);
  }
}

export async function addOrUpdateImportedAccount(
  contaBancaria: ContaBancariaMapping,
  lancamentos: ProcessedEntry[]
): Promise<ImportedAccount> {
  const store = await loadImportedAccounts();

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
    await saveImportedAccounts(store);
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
    await saveImportedAccounts(store);
    return newAccount;
  }
}

export async function updateLancamento(
  accountId: string,
  lancamentoId: string,
  updatedLancamento: ProcessedEntry
): Promise<void> {
  const store = await loadImportedAccounts();
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
      await saveImportedAccounts(store);
    }
  }
}

export async function updateLancamentoHistorico(
  accountId: string,
  lancamentoId: string,
  novoHistorico: string
): Promise<void> {
  const store = await loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    const account = store.accounts[accountIndex];
    const lancamentoIndex = account.lancamentos.findIndex(
      (l) => l.id === lancamentoId
    );

    if (lancamentoIndex >= 0) {
      account.lancamentos[lancamentoIndex].historico = novoHistorico;
      account.lastUpdated = new Date();
      await saveImportedAccounts(store);
    }
  }
}

export async function deleteLancamento(accountId: string, lancamentoId: string): Promise<void> {
  const store = await loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    const account = store.accounts[accountIndex];
    account.lancamentos = account.lancamentos.filter((l) => l.id !== lancamentoId);
    account.saldo = calculateSaldo(account.lancamentos);
    account.lastUpdated = new Date();
    await saveImportedAccounts(store);
  }
}

export async function deleteImportedAccount(accountId: string, transferStore?: any, updateTransferStore?: (store: any) => void): Promise<void> {
  const store = await loadImportedAccounts();

  // Encontrar a conta antes de excluir para pegar o código contábil
  const account = store.accounts.find((acc) => acc.id === accountId);

  if (account) {
    // Remover a conta do Supabase
    await deleteImportedAccountFromSupabase(accountId);

    // Remover a conta do localStorage
    store.accounts = store.accounts.filter((acc) => acc.id !== accountId);
    await saveImportedAccounts(store);

    const accountCode = account.contaBancaria.codigoContabil;
    const accountNumber = account.contaBancaria.numeroConta;

    // Se transferStore foi passado (do AppContext), usar ele
    if (transferStore && updateTransferStore) {
      const updatedStore = { ...transferStore };

      // Filtrar transferências pendentes
      updatedStore.pending = (updatedStore.pending || []).filter(
        (t: any) => t.accountCode !== accountCode && t.accountNumber !== accountNumber
      );

      // Filtrar pares que envolvem esta conta
      updatedStore.paired = (updatedStore.paired || []).filter(
        (pair: any) =>
          pair.outTransfer.accountCode !== accountCode &&
          pair.inTransfer.accountCode !== accountCode &&
          pair.outTransfer.accountNumber !== accountNumber &&
          pair.inTransfer.accountNumber !== accountNumber
      );

      updateTransferStore(updatedStore);
      console.log('✅ Transferências removidas do Supabase via AppContext');
    } else {
      // Fallback: usar localStorage (legado)
      const localTransferStore = loadTransferStore();

      // Filtrar transferências pendentes
      localTransferStore.pending = localTransferStore.pending.filter(
        (t) => t.accountCode !== accountCode && t.accountNumber !== accountNumber
      );

      // Filtrar pares que envolvem esta conta
      localTransferStore.paired = localTransferStore.paired.filter(
        (pair) =>
          pair.outTransfer.accountCode !== accountCode &&
          pair.inTransfer.accountCode !== accountCode &&
          pair.outTransfer.accountNumber !== accountNumber &&
          pair.inTransfer.accountNumber !== accountNumber
      );

      // Remover IDs exportados relacionados aos pares removidos
      const removedPairIds = new Set<string>();
      localTransferStore.paired.forEach(pair => removedPairIds.add(pair.id));
      localTransferStore.exported = localTransferStore.exported.filter(id => !removedPairIds.has(id));

      saveTransferStore(localTransferStore);
      console.log('✅ Transferências removidas do localStorage (legado)');
    }

    // Remover taxas de administração relacionadas a esta conta
    clearTaxasByAccount(accountNumber);
  }
}

// Sincronizar dados das contas importadas com o mapeamento atualizado
export async function syncImportedAccountsWithMapping(): Promise<void> {
  const store = await loadImportedAccounts();
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
    await saveImportedAccounts(store);
    console.log('✅ Contas importadas sincronizadas com o mapeamento');
  }
}

export async function getImportedAccount(accountId: string): Promise<ImportedAccount | undefined> {
  const store = await loadImportedAccounts();
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

export async function getImportProgress(totalContas: number): Promise<number> {
  const store = await loadImportedAccounts();
  if (totalContas === 0) return 0;
  return (store.accounts.length / totalContas) * 100;
}

export async function markAccountAsExported(accountId: string): Promise<void> {
  const store = await loadImportedAccounts();
  const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);

  if (accountIndex >= 0) {
    store.accounts[accountIndex].exported = true;
    store.accounts[accountIndex].exportedAt = new Date();
    await saveImportedAccounts(store);
  }
}

export async function markMultipleAccountsAsExported(accountIds: string[]): Promise<void> {
  const store = await loadImportedAccounts();
  const now = new Date();

  accountIds.forEach(accountId => {
    const accountIndex = store.accounts.findIndex((acc) => acc.id === accountId);
    if (accountIndex >= 0) {
      store.accounts[accountIndex].exported = true;
      store.accounts[accountIndex].exportedAt = now;
    }
  });

  await saveImportedAccounts(store);
}

export async function getPendingAccounts(): Promise<ImportedAccount[]> {
  const store = await loadImportedAccounts();
  return store.accounts.filter(acc => !acc.exported);
}

export async function getExportedAccounts(): Promise<ImportedAccount[]> {
  const store = await loadImportedAccounts();
  return store.accounts.filter(acc => acc.exported);
}

// Função para corrigir valores que perderam casas decimais nos dados já importados
export async function fixImportedAccountValues(accountId: string): Promise<void> {
  console.log('🔧 A re-importação é necessária para corrigir os valores corretamente.');
  alert('Para aplicar a correção, por favor exclua a conta importada e importe o arquivo Excel novamente.');
}

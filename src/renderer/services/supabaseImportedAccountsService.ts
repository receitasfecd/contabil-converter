import { supabase } from './supabaseClient';
import { ImportedAccount, ImportedAccountsStore } from '../types/ImportedAccount';

// Obter user_id do usuário atual
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Usuário não autenticado');
    return null;
  }

  return user.id;
}

// Carregar todas as contas importadas da organização
export async function loadImportedAccountsFromSupabase(): Promise<ImportedAccountsStore> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { accounts: [] };
  }

  const { data, error } = await supabase
    .from('imported_accounts')
    .select('*')
    .order('imported_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar contas importadas:', error);
    return { accounts: [] };
  }

  const accounts: ImportedAccount[] = data.map(row => ({
    id: row.id,
    contaBancaria: row.conta_bancaria,
    lancamentos: row.lancamentos,
    saldo: parseFloat(row.saldo),
    importedAt: new Date(row.imported_at),
    lastUpdated: new Date(row.last_updated),
    exported: row.exported,
    exportedAt: row.exported_at ? new Date(row.exported_at) : undefined,
  }));

  return { accounts };
}

// Salvar contas importadas no Supabase
export async function saveImportedAccountsToSupabase(store: ImportedAccountsStore): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.error('Usuário não autenticado');
    return;
  }

  const rows = store.accounts.map(acc => ({
    id: acc.id,
    organization_id: null,  // Não usar mais organization_id
    user_id: userId,
    conta_bancaria: acc.contaBancaria,
    lancamentos: acc.lancamentos,
    saldo: acc.saldo,
    imported_at: acc.importedAt.toISOString(),
    last_updated: acc.lastUpdated.toISOString(),
    exported: acc.exported,
    exported_at: acc.exportedAt?.toISOString() || null,
  }));

  const { error } = await supabase
    .from('imported_accounts')
    .upsert(rows);

  if (error) {
    console.error('Erro ao salvar contas importadas:', error);
    throw error;
  }
}

// Deletar conta importada do Supabase
export async function deleteImportedAccountFromSupabase(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('imported_accounts')
    .delete()
    .eq('id', accountId);

  if (error) {
    console.error('Erro ao deletar conta importada:', error);
    throw error;
  }
}

// Atualizar conta importada no Supabase
export async function updateImportedAccountInSupabase(account: ImportedAccount): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.error('Usuário não autenticado');
    return;
  }

  const { error } = await supabase
    .from('imported_accounts')
    .update({
      conta_bancaria: account.contaBancaria,
      lancamentos: account.lancamentos,
      saldo: account.saldo,
      last_updated: account.lastUpdated.toISOString(),
      exported: account.exported,
      exported_at: account.exportedAt?.toISOString() || null,
    })
    .eq('id', account.id);

  if (error) {
    console.error('Erro ao atualizar conta importada:', error);
    throw error;
  }
}

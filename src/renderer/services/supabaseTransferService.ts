import { supabase } from './supabaseClient';
import { Transfer, TransferPair, TransferStore } from '../types/Transfer';

// Obter user_id do usuário atual
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Usuário não autenticado');
    return null;
  }

  return user.id;
}

// Carregar todas as transferências da organização
export async function loadTransferStore(): Promise<TransferStore> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { pending: [], paired: [], exported: [] };
  }

  // Carregar transferências
  const { data: transfersData, error: transfersError } = await supabase
    .from('transferencias')
    .select('*')
    .order('imported_at', { ascending: true });

  if (transfersError) {
    console.error('Erro ao carregar transferências:', transfersError);
    return { pending: [], paired: [], exported: [] };
  }

  // Carregar pares
  const { data: pairsData, error: pairsError } = await supabase
    .from('transfer_pairs')
    .select(`
      *,
      out_transfer:out_transfer_id(*),
      in_transfer:in_transfer_id(*)
    `)
    .order('matched_at', { ascending: true });

  if (pairsError) {
    console.error('Erro ao carregar pares:', pairsError);
  }

  // Converter dados do banco para o formato da aplicação
  const transfers: Transfer[] = transfersData.map(row => ({
    id: row.id,
    accountNumber: row.account_number,
    accountCode: row.account_code,
    date: row.data,
    amount: row.amount,
    historico: row.historico,
    centroCusto: row.centro_custo,
    direction: row.direction,
    status: row.status,
    pairedWith: row.paired_with,
    counterpartAccount: row.counterpart_account,
    original: row.original_data,
    importedAt: new Date(row.imported_at),
  }));

  const pairs: TransferPair[] = pairsData?.map(row => ({
    id: row.id,
    outTransfer: {
      id: row.out_transfer.id,
      accountNumber: row.out_transfer.account_number,
      accountCode: row.out_transfer.account_code,
      date: row.out_transfer.data,
      amount: row.out_transfer.amount,
      historico: row.out_transfer.historico,
      centroCusto: row.out_transfer.centro_custo,
      direction: row.out_transfer.direction,
      status: row.out_transfer.status,
      pairedWith: row.out_transfer.paired_with,
      counterpartAccount: row.out_transfer.counterpart_account,
      original: row.out_transfer.original_data,
      importedAt: new Date(row.out_transfer.imported_at),
    },
    inTransfer: {
      id: row.in_transfer.id,
      accountNumber: row.in_transfer.account_number,
      accountCode: row.in_transfer.account_code,
      date: row.in_transfer.data,
      amount: row.in_transfer.amount,
      historico: row.in_transfer.historico,
      centroCusto: row.in_transfer.centro_custo,
      direction: row.in_transfer.direction,
      status: row.in_transfer.status,
      pairedWith: row.in_transfer.paired_with,
      counterpartAccount: row.in_transfer.counterpart_account,
      original: row.in_transfer.original_data,
      importedAt: new Date(row.in_transfer.imported_at),
    },
    matchScore: row.match_score,
    matchedAt: new Date(row.matched_at),
    exported: row.exported,
  })) || [];

  // Separar transferências pendentes
  const pairedIds = new Set<string>();
  pairs.forEach(pair => {
    pairedIds.add(pair.outTransfer.id);
    pairedIds.add(pair.inTransfer.id);
  });

  const pending = transfers.filter(t => t.status === 'PENDING' && !pairedIds.has(t.id));
  const exported = pairs.filter(p => p.exported).map(p => p.id);

  return { pending, paired: pairs, exported };
}

// Salvar transferências no Supabase
export async function saveTransfers(transfers: Transfer[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('Usuário não autenticado');

  const rows = transfers.map(t => ({
    id: t.id,
    user_id: userId,
    account_number: t.accountNumber,
    account_code: t.accountCode,
    data: t.date,
    amount: t.amount,
    historico: t.historico,
    centro_custo: t.centroCusto,
    direction: t.direction,
    status: t.status,
    paired_with: t.pairedWith,
    counterpart_account: t.counterpartAccount,
    original_data: t.original,
    imported_at: t.importedAt.toISOString(),
  }));

  const { error } = await supabase
    .from('transferencias')
    .upsert(rows);

  if (error) {
    console.error('Erro ao salvar transferências:', error);
    throw error;
  }
}

// Salvar pares no Supabase
export async function savePairs(pairs: TransferPair[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('Usuário não autenticado');

  const rows = pairs.map(p => ({
    id: p.id,
    user_id: userId,
    out_transfer_id: p.outTransfer.id,
    in_transfer_id: p.inTransfer.id,
    match_score: p.matchScore,
    matched_at: p.matchedAt.toISOString(),
    exported: p.exported,
  }));

  const { error } = await supabase
    .from('transfer_pairs')
    .upsert(rows);

  if (error) {
    console.error('Erro ao salvar pares:', error);
    throw error;
  }
}

// Deletar transferência
export async function deleteTransferFromDB(transferId: string): Promise<void> {
  const { error } = await supabase
    .from('transferencias')
    .delete()
    .eq('id', transferId);

  if (error) {
    console.error('Erro ao deletar transferência:', error);
    throw error;
  }
}

// Deletar par
export async function deletePairFromDB(pairId: string): Promise<void> {
  const { error } = await supabase
    .from('transfer_pairs')
    .delete()
    .eq('id', pairId);

  if (error) {
    console.error('Erro ao deletar par:', error);
    throw error;
  }
}

// Deletar transferências por conta
export async function deleteTransfersByAccountFromDB(accountNumber: string): Promise<void> {
  const { error } = await supabase
    .from('transferencias')
    .delete()
    .eq('account_number', accountNumber);

  if (error) {
    console.error('Erro ao deletar transferências por conta:', error);
    throw error;
  }
}

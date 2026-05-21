import { supabase } from './supabaseClient';
import { TaxaAdministracao, TaxaAdministracaoStore } from '../types/TaxaAdministracao';

// Helper para carregar todos os registros paginados (reutilizado do supabaseTransferService)
async function fetchAll(table: string, select: string = '*', orderCol: string = 'id'): Promise<any[]> {
  const allData: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + step - 1);

    if (error) {
      console.error(`Erro ao carregar dados da tabela ${table}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      from += step;
      if (data.length < step) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function loadTaxasFromSupabase(): Promise<TaxaAdministracaoStore> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { taxas: [] };

  const data = await fetchAll('taxas_administracao', `
    *,
    transfer_out:transfer_out_id(id, account_number, account_code, data, amount, historico),
    transfer_in:transfer_in_id(id, account_number, account_code, data, amount, historico)
  `, 'created_at');

  const taxas: TaxaAdministracao[] = data.map(row => ({
    id: row.id,
    transferOut: row.transfer_out ? {
      transferId: row.transfer_out.id,
      accountNumber: row.transfer_out.account_number,
      accountCode: row.transfer_out.account_code,
      date: row.transfer_out.data,
      amount: row.transfer_out.amount,
      historico: row.transfer_out.historico,
    } : undefined,
    transferIn: row.transfer_in ? {
      transferId: row.transfer_in.id,
      accountNumber: row.transfer_in.account_number,
      accountCode: row.transfer_in.account_code,
      date: row.transfer_in.data,
      amount: row.transfer_in.amount,
      historico: row.transfer_in.historico,
    } : undefined,
    status: row.status,
    grupoContabil: row.grupo_contabil,
    contaDespesa: row.conta_despesa,
    contaReceita: row.conta_receita,
    pairedAt: row.paired_at ? new Date(row.paired_at) : undefined,
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    exported: row.exported,
    exportedAt: row.exported_at ? new Date(row.exported_at) : undefined,
  }));

  return { taxas };
}

export async function saveTaxaToSupabase(taxa: TaxaAdministracao): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row = {
    id: taxa.id,
    user_id: user.id,
    transfer_out_id: taxa.transferOut?.transferId,
    transfer_in_id: taxa.transferIn?.transferId,
    status: taxa.status,
    grupo_contabil: taxa.grupoContabil,
    conta_despesa: taxa.contaDespesa,
    conta_receita: taxa.contaReceita,
    paired_at: taxa.pairedAt?.toISOString(),
    processed_at: taxa.processedAt?.toISOString(),
    exported: taxa.exported,
    exported_at: taxa.exportedAt?.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('taxas_administracao')
    .upsert(row);

  if (error) {
    console.error('Erro ao salvar taxa no Supabase:', error);
    throw error;
  }
}

export async function deleteTaxaFromSupabase(taxaId: string): Promise<void> {
  const { error } = await supabase
    .from('taxas_administracao')
    .delete()
    .eq('id', taxaId);

  if (error) {
    console.error('Erro ao excluir taxa do Supabase:', error);
    throw error;
  }
}

export async function clearAllTaxasFromSupabase(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('taxas_administracao')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao limpar taxas do Supabase:', error);
    throw error;
  }
}

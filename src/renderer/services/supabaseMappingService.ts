import { supabase } from './supabaseClient';
import { ContaBancariaMapping, ClassificacaoMapping } from '../types';

// Contas Bancárias
export async function loadContasBancarias(): Promise<ContaBancariaMapping[]> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar contas bancárias:', error);
    return [];
  }

  return data.map(row => ({
    numeroConta: row.numero_conta,
    codigoContabil: row.codigo_contabil,
    tipoAplicacao: row.tipo_aplicacao,
    descricao: row.descricao,
  }));
}

export async function saveContasBancarias(contas: ContaBancariaMapping[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Deletar todas as contas existentes do usuário
  await supabase
    .from('contas_bancarias')
    .delete()
    .eq('user_id', user.id);

  // Inserir novas contas
  const rows = contas.map(conta => ({
    user_id: user.id,
    numero_conta: conta.numeroConta,
    codigo_contabil: conta.codigoContabil,
    tipo_aplicacao: conta.tipoAplicacao,
    descricao: conta.descricao,
  }));

  const { error } = await supabase
    .from('contas_bancarias')
    .insert(rows);

  if (error) {
    console.error('Erro ao salvar contas bancárias:', error);
    throw error;
  }
}

// Classificações Contábeis
export async function loadClassificacoes(): Promise<ClassificacaoMapping[]> {
  const { data, error } = await supabase
    .from('classificacoes_contabeis')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar classificações:', error);
    return [];
  }

  return data.map(row => ({
    classificacaoFinanceira: row.classificacao_financeira,
    classificacaoContabil: row.classificacao_contabil,
    descricao: row.descricao,
  }));
}

export async function saveClassificacoes(classificacoes: ClassificacaoMapping[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Deletar todas as classificações existentes do usuário
  await supabase
    .from('classificacoes_contabeis')
    .delete()
    .eq('user_id', user.id);

  // Inserir novas classificações
  const rows = classificacoes.map(classificacao => ({
    user_id: user.id,
    classificacao_financeira: classificacao.classificacaoFinanceira,
    classificacao_contabil: classificacao.classificacaoContabil,
    descricao: classificacao.descricao,
  }));

  const { error } = await supabase
    .from('classificacoes_contabeis')
    .insert(rows);

  if (error) {
    console.error('Erro ao salvar classificações:', error);
    throw error;
  }
}

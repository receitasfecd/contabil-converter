import { supabase } from './supabaseClient';
import { ContaBancariaMapping, ClassificacaoMapping } from '../types';

// Obter organization_id do usuário atual
async function getOrganizationId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .single();

  if (error) {
    console.error('Erro ao obter organization_id:', error);
    return null;
  }

  return data?.organization_id || null;
}

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
  const orgId = await getOrganizationId();
  if (!orgId) throw new Error('Organização não encontrada');

  // Deletar todas as contas existentes da organização
  await supabase
    .from('contas_bancarias')
    .delete()
    .eq('organization_id', orgId);

  // Inserir novas contas
  const rows = contas.map(conta => ({
    organization_id: orgId,
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
  const orgId = await getOrganizationId();
  if (!orgId) throw new Error('Organização não encontrada');

  // Deletar todas as classificações existentes da organização
  await supabase
    .from('classificacoes_contabeis')
    .delete()
    .eq('organization_id', orgId);

  // Inserir novas classificações
  const rows = classificacoes.map(classificacao => ({
    organization_id: orgId,
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

// Plano de Contas
export async function loadPlanoContas(): Promise<any[]> {
  const { data, error } = await supabase
    .from('plano_contas')
    .select('*')
    .order('codigo', { ascending: true });

  if (error) {
    console.error('Erro ao carregar plano de contas:', error);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    tipo: row.tipo,
  }));
}

export async function savePlanoContas(planoContas: any[]): Promise<void> {
  const orgId = await getOrganizationId();
  if (!orgId) throw new Error('Organização não encontrada');

  // Deletar todos os itens existentes da organização
  await supabase
    .from('plano_contas')
    .delete()
    .eq('organization_id', orgId);

  // Inserir novos itens
  const rows = planoContas.map(item => ({
    organization_id: orgId,
    codigo: item.codigo,
    descricao: item.descricao,
    tipo: item.tipo,
  }));

  const { error } = await supabase
    .from('plano_contas')
    .insert(rows);

  if (error) {
    console.error('Erro ao salvar plano de contas:', error);
    throw error;
  }
}

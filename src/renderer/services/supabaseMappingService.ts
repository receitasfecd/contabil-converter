import { supabase } from './supabaseClient';
import { ContaBancariaMapping, ClassificacaoMapping } from '../types';

// Obter user_id do usuário atual
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Usuário não autenticado');
    return null;
  }

  return user.id;
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
    id: row.id,
    numeroConta: row.numero_conta,
    codigoContabil: row.codigo_contabil,
    tipoAplicacao: row.tipo_aplicacao,
    descricao: row.descricao,
    banco: row.banco,
  }));
}

export async function saveContasBancarias(contas: ContaBancariaMapping[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('Usuário não autenticado');

  // Deletar todas as contas existentes do usuário
  await supabase
    .from('contas_bancarias')
    .delete()
    .eq('user_id', userId);

  // Inserir novas contas (preservando IDs se existirem)
  const rows = contas.map(conta => ({
    ...(conta.id && { id: conta.id }), // Preservar ID se existir
    user_id: userId,
    banco: conta.banco,
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
  const userId = await getUserId();
  if (!userId) throw new Error('Usuário não autenticado');

  // Deletar todas as classificações existentes do usuário
  await supabase
    .from('classificacoes_contabeis')
    .delete()
    .eq('user_id', userId);

  // Inserir novas classificações
  const rows = classificacoes.map(classificacao => ({
    user_id: userId,
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
    nome: row.descricao,  // Mapear descricao para nome
    tipo: row.tipo || 'PLANO_CONTAS',
    nivel: 0,  // Adicionar campo nivel
  }));
}

export async function savePlanoContas(planoContas: any[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('Usuário não autenticado');

  // Deletar todos os itens existentes do usuário
  await supabase
    .from('plano_contas')
    .delete()
    .eq('user_id', userId);

  // Inserir novos itens, garantindo que descricao nunca seja null
  const rows = planoContas.map(item => ({
    user_id: userId,
    codigo: item.codigo,
    descricao: item.nome || item.descricao || item.codigo,  // Usar codigo como fallback se descricao for null
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

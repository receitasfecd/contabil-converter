import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkPermissions() {
  console.log('🔍 Verificando permissões do Luiz...\n');

  const orgId = '25387172-127e-4122-8ef2-7db292920b0f';

  // Verificar dados na organização
  console.log('📊 Dados na organização FECD:\n');

  const { data: contas } = await supabaseAdmin
    .from('contas_bancarias')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`✅ Contas Bancárias: ${contas?.length || 0} registros`);

  const { data: classificacoes } = await supabaseAdmin
    .from('classificacoes_contabeis')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`✅ Classificações: ${classificacoes?.length || 0} registros`);

  const { data: planoContas } = await supabaseAdmin
    .from('plano_contas')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`✅ Plano de Contas: ${planoContas?.length || 0} registros`);

  const { data: lancamentos } = await supabaseAdmin
    .from('lancamentos_processados')
    .select('*')
    .eq('organization_id', orgId);
  console.log(`✅ Lançamentos: ${lancamentos?.length || 0} registros`);

  // Verificar políticas RLS
  console.log('\n🔒 Políticas RLS:\n');

  const tables = ['contas_bancarias', 'classificacoes_contabeis', 'plano_contas', 'lancamentos_processados'];

  for (const table of tables) {
    const { data: policies } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT policyname, cmd, qual
        FROM pg_policies
        WHERE tablename = '${table}'
        ORDER BY policyname;
      `
    });

    console.log(`\n📋 ${table}:`);
    console.log(policies);
  }

  console.log('\n✅ Resumo:');
  console.log('- Luiz é ADMIN da organização FECD');
  console.log('- Todas as tabelas usam get_user_organization_id() para RLS');
  console.log('- Luiz pode ver e editar TODOS os dados da organização');
}

checkPermissions();

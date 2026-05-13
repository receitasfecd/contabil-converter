import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkTransfers() {
  console.log('🔍 Verificando transferências...\n');

  // Buscar organização FECD
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, code')
    .eq('code', 'VG9ZB5ZF')
    .single();

  if (!org) {
    console.error('❌ Organização não encontrada');
    return;
  }

  console.log('✅ Organização:', org.name, `(${org.code})`);
  console.log('   ID:', org.id);
  console.log('');

  // Buscar transferências
  const { data: transfers, error: transfersError } = await supabaseAdmin
    .from('transferencias')
    .select('*')
    .eq('organization_id', org.id);

  if (transfersError) {
    console.error('❌ Erro ao buscar transferências:', transfersError);
    return;
  }

  console.log(`📊 Total de transferências: ${transfers?.length || 0}`);

  if (transfers && transfers.length > 0) {
    console.log('\n📋 Primeiras 5 transferências:');
    transfers.slice(0, 5).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.data} - ${t.direction} - ${t.amount} - ${t.account_number}`);
      console.log(`     ${t.historico.substring(0, 60)}...`);
    });
  }

  // Buscar pares
  const { data: pairs, error: pairsError } = await supabaseAdmin
    .from('transfer_pairs')
    .select('*')
    .eq('organization_id', org.id);

  if (pairsError) {
    console.error('❌ Erro ao buscar pares:', pairsError);
    return;
  }

  console.log(`\n🔗 Total de pares: ${pairs?.length || 0}`);

  if (pairs && pairs.length > 0) {
    console.log('\n📋 Primeiros 5 pares:');
    pairs.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. Score: ${p.match_score} - Exportado: ${p.exported ? 'Sim' : 'Não'}`);
    });
  }
}

checkTransfers();

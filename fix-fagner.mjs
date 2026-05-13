import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixFagner() {
  console.log('🔧 Configurando conta do Fagner...\n');

  // Buscar usuário Fagner
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('Erro ao buscar usuários:', usersError);
    return;
  }

  const fagner = users.find(u => u.email === 'fagnersantos@fecd.org.br');

  if (!fagner) {
    console.error('❌ Usuário fagnersantos@fecd.org.br não encontrado');
    return;
  }

  console.log('✅ Usuário encontrado:', fagner.id);

  // Buscar organização FECD
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('code', 'VG9ZB5ZF')
    .single();

  if (orgError || !org) {
    console.error('❌ Organização não encontrada');
    return;
  }

  console.log('✅ Organização encontrada:', org.name, org.id);

  // Verificar se já é membro
  const { data: existingMember } = await supabaseAdmin
    .from('organization_members')
    .select('*')
    .eq('user_id', fagner.id)
    .eq('organization_id', org.id)
    .single();

  if (existingMember) {
    console.log('📊 Já é membro, atualizando para Admin...');

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('organization_members')
      .update({ role: 'admin' })
      .eq('id', existingMember.id)
      .select();

    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError);
      return;
    }

    console.log('✅ Atualizado para Admin:', updated);
  } else {
    console.log('➕ Adicionando à organização como Admin...');

    const { data: newMember, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: fagner.id,
        role: 'admin'
      })
      .select();

    if (memberError) {
      console.error('❌ Erro ao adicionar:', memberError);
      return;
    }

    console.log('✅ Adicionado como Admin:', newMember);
  }
}

fixFagner();

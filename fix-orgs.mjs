import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixMissingOrganizations() {
  console.log('🔍 Verificando usuários sem organização...');

  // Buscar usuários sem organização
  const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ Erro ao buscar usuários:', usersError);
    return;
  }

  console.log(`📊 Total de usuários: ${users.users.length}`);

  for (const user of users.users) {
    // Verificar se usuário já tem organização
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      console.log(`✅ ${user.email} já tem organização`);
      continue;
    }

    console.log(`🔧 Criando organização para ${user.email}...`);

    // Criar organização
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: `Organização de ${user.email}` })
      .select()
      .single();

    if (orgError) {
      console.error(`❌ Erro ao criar organização para ${user.email}:`, orgError);
      continue;
    }

    // Adicionar usuário como owner
    const { error: memberInsertError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner'
      });

    if (memberInsertError) {
      console.error(`❌ Erro ao adicionar membro para ${user.email}:`, memberInsertError);
      continue;
    }

    console.log(`✅ Organização criada para ${user.email}`);
  }

  console.log('🎉 Processo concluído!');
}

fixMissingOrganizations();

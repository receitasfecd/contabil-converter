import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
  console.log('🔍 Buscando usuário luizricardo@fecd.org.br...\n');

  // Buscar o usuário
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('Erro ao buscar usuários:', usersError);
    return;
  }

  const user = users.find(u => u.email === 'luizricardo@fecd.org.br');

  if (!user) {
    console.error('❌ Usuário não encontrado');
    return;
  }

  console.log('✅ Usuário encontrado:', user.id);

  // Buscar organização FECD
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, code')
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
    .eq('user_id', user.id)
    .eq('organization_id', org.id)
    .single();

  if (existingMember) {
    console.log('✅ Usuário já é membro da organização!');
    return;
  }

  // Adicionar à organização
  console.log('➕ Adicionando usuário à organização...');

  const { data: newMember, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'member'
    })
    .select();

  if (memberError) {
    console.error('❌ Erro ao adicionar:', memberError);
    return;
  }

  console.log('✅ Usuário adicionado com sucesso!', newMember);
}

fixUser();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function promoteToAdmin() {
  console.log('🔧 Promovendo Luiz a Admin...\n');

  // Buscar o membro
  const { data: member, error: memberError } = await supabaseAdmin
    .from('organization_members')
    .select('*')
    .eq('user_id', '5621e0f6-811c-4c30-a523-7cef58959aae')
    .single();

  if (memberError) {
    console.error('❌ Erro ao buscar membro:', memberError);
    return;
  }

  console.log('📊 Membro atual:', member);

  // Atualizar para admin
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('id', member.id)
    .select();

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError);
    return;
  }

  console.log('✅ Atualizado com sucesso:', updated);
}

promoteToAdmin();

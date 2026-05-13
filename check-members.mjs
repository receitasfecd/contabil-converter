import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkMembers() {
  console.log('🔍 Verificando membros...\n');

  // Buscar membros direto da tabela
  const { data: members, error: membersError } = await supabaseAdmin
    .from('organization_members')
    .select('*');

  console.log('📊 Membros na tabela organization_members:');
  console.log(members);

  // Buscar da view
  const { data: viewMembers, error: viewError } = await supabaseAdmin
    .from('organization_members_with_email')
    .select('*');

  console.log('\n📧 Membros na view organization_members_with_email:');
  console.log(viewMembers);

  if (viewError) {
    console.error('Erro na view:', viewError);
  }
}

checkMembers();

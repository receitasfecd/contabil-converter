import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Verificando dados no banco...\n');

  // Verificar organizações
  const { data: orgs, error: orgsError } = await supabaseAdmin
    .from('organizations')
    .select('*');

  console.log('📊 Organizações:', orgs);
  if (orgsError) console.error('Erro:', orgsError);

  // Verificar membros
  const { data: members, error: membersError } = await supabaseAdmin
    .from('organization_members')
    .select('*');

  console.log('\n👥 Membros:', members);
  if (membersError) console.error('Erro:', membersError);

  // Verificar view
  const { data: viewData, error: viewError } = await supabaseAdmin
    .from('organization_members_with_email')
    .select('*');

  console.log('\n📧 View com emails:', viewData);
  if (viewError) console.error('Erro:', viewError);
}

checkDatabase();

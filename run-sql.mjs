import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  const sql = `
-- Permitir que owners atualizem roles de membros
DROP POLICY IF EXISTS "Owners can update member roles" ON organization_members;
CREATE POLICY "Owners can update member roles" ON organization_members FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);
`;

  console.log('🔧 Executando SQL...');

  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Sucesso:', data);
  }
}

executeSql();

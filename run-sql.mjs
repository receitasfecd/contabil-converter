import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  const sql = readFileSync('supabase-fix-orgs-function.sql', 'utf-8');

  console.log('🔧 Executando SQL...');

  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Sucesso:', data);
  }
}

executeSql();

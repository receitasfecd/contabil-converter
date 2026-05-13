import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  const sql = `
-- Criar tabela plano_contas
CREATE TABLE IF NOT EXISTS plano_contas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_plano_contas_org ON plano_contas(organization_id);

-- RLS
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view org plano_contas" ON plano_contas;
CREATE POLICY "Users can view org plano_contas" ON plano_contas FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert org plano_contas" ON plano_contas;
CREATE POLICY "Users can insert org plano_contas" ON plano_contas FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update org plano_contas" ON plano_contas;
CREATE POLICY "Users can update org plano_contas" ON plano_contas FOR UPDATE
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete org plano_contas" ON plano_contas;
CREATE POLICY "Users can delete org plano_contas" ON plano_contas FOR DELETE
USING (organization_id = get_user_organization_id());
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

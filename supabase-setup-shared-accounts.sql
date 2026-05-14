-- ============================================
-- SCRIPT COMPLETO: Compartilhamento de Dados por Organização
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Criar tabela de contas importadas compartilhadas
CREATE TABLE IF NOT EXISTS imported_accounts (
  id TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_bancaria JSONB NOT NULL,
  lancamentos JSONB NOT NULL,
  saldo NUMERIC NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  exported BOOLEAN DEFAULT FALSE,
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_imported_accounts_org ON imported_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_user ON imported_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_conta ON imported_accounts((conta_bancaria->>'numeroConta'));

-- 3. Habilitar RLS
ALTER TABLE imported_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas: usuários da mesma organização podem ver/editar
DROP POLICY IF EXISTS "Users can view org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can insert org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can update org imported_accounts" ON imported_accounts;
DROP POLICY IF EXISTS "Users can delete org imported_accounts" ON imported_accounts;

CREATE POLICY "Users can view org imported_accounts" ON imported_accounts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org imported_accounts" ON imported_accounts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org imported_accounts" ON imported_accounts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org imported_accounts" ON imported_accounts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- INSTRUÇÕES:
-- 1. Copie todo este script
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole o script e execute
-- 4. Após executar, faça deploy da aplicação atualizada
-- 5. Todos os usuários da mesma organização verão as contas importadas uns dos outros

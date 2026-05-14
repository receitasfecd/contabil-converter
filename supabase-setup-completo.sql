-- ============================================
-- SCRIPT COMPLETO: Setup de Organizações e Compartilhamento
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Criar tabela de Organizações
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de Membros (relacionamento usuário-organização)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 3. Criar índices para organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- 4. Habilitar RLS nas tabelas de organização
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas para organizations
DROP POLICY IF EXISTS "Users can view own organizations" ON organizations;
CREATE POLICY "Users can view own organizations" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;
CREATE POLICY "Users can insert organizations" ON organizations FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own organizations" ON organizations;
CREATE POLICY "Users can update own organizations" ON organizations FOR UPDATE
USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- 6. Criar políticas para organization_members
DROP POLICY IF EXISTS "Users can view own memberships" ON organization_members;
CREATE POLICY "Users can view own memberships" ON organization_members FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert memberships" ON organization_members;
CREATE POLICY "Users can insert memberships" ON organization_members FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- 7. Criar tabela de contas importadas compartilhadas
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

-- 8. Criar índices para imported_accounts
CREATE INDEX IF NOT EXISTS idx_imported_accounts_org ON imported_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_user ON imported_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_conta ON imported_accounts((conta_bancaria->>'numeroConta'));

-- 9. Habilitar RLS para imported_accounts
ALTER TABLE imported_accounts ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas para imported_accounts (compartilhamento por organização)
DROP POLICY IF EXISTS "Users can view org imported_accounts" ON imported_accounts;
CREATE POLICY "Users can view org imported_accounts" ON imported_accounts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert org imported_accounts" ON imported_accounts;
CREATE POLICY "Users can insert org imported_accounts" ON imported_accounts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update org imported_accounts" ON imported_accounts;
CREATE POLICY "Users can update org imported_accounts" ON imported_accounts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete org imported_accounts" ON imported_accounts;
CREATE POLICY "Users can delete org imported_accounts" ON imported_accounts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- 11. Criar função para obter organization_id do usuário
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 12. Criar trigger para criar organização automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Criar organização com nome baseado no email
  INSERT INTO organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Minha Empresa'))
  RETURNING id INTO new_org_id;

  -- Adicionar usuário como owner da organização
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_for_new_user();

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- VERIFICAÇÃO: Execute esta query para ver se funcionou
-- SELECT * FROM organizations;
-- SELECT * FROM organization_members;
-- SELECT * FROM imported_accounts;

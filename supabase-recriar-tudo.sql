-- ============================================
-- SCRIPT ALTERNATIVO: Recriar tudo do zero
-- Este script DELETA e RECRIA as tabelas
-- ============================================

-- ATENÇÃO: Isso vai APAGAR todos os dados existentes!
-- Se você tem dados importantes, faça backup primeiro

-- 1. Remover tabelas existentes (se houver)
DROP TABLE IF EXISTS imported_accounts CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 2. Criar tabela de Organizações
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de Membros
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. Criar tabela de contas importadas
CREATE TABLE imported_accounts (
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

-- 5. Criar índices
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_imported_accounts_org ON imported_accounts(organization_id);
CREATE INDEX idx_imported_accounts_user ON imported_accounts(user_id);
CREATE INDEX idx_imported_accounts_conta ON imported_accounts((conta_bancaria->>'numeroConta'));

-- 6. Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_accounts ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas para organizations
CREATE POLICY "Users can view own organizations" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert organizations" ON organizations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own organizations" ON organizations FOR UPDATE
USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- 8. Criar políticas para organization_members
CREATE POLICY "Users can view own memberships" ON organization_members FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert memberships" ON organization_members FOR INSERT
WITH CHECK (true);

-- 9. Criar políticas para imported_accounts
CREATE POLICY "Users can view org imported_accounts" ON imported_accounts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org imported_accounts" ON imported_accounts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org imported_accounts" ON imported_accounts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org imported_accounts" ON imported_accounts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- 10. Criar função auxiliar
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 11. Criar trigger para novos usuários
CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Minha Empresa'))
  RETURNING id INTO new_org_id;

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

-- 12. Criar organizações para usuários existentes
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  FOR user_record IN SELECT id, email FROM auth.users LOOP
    -- Verificar se usuário já tem organização
    IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = user_record.id) THEN
      -- Criar organização
      INSERT INTO organizations (name)
      VALUES ('Organização de ' || COALESCE(user_record.email, 'Usuário'))
      RETURNING id INTO new_org_id;

      -- Adicionar usuário como owner
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (new_org_id, user_record.id, 'owner');
    END IF;
  END LOOP;
END $$;

-- FIM
SELECT 'Setup concluído com sucesso!' as status;

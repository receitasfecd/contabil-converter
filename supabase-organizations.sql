-- Tabela de Organizações
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Membros (relacionamento usuário-organização)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários veem organizações das quais são membros
CREATE POLICY "Users can view own organizations" ON organizations FOR SELECT
USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own memberships" ON organization_members FOR SELECT
USING (user_id = auth.uid());

-- Função auxiliar: obter organization_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ATUALIZAR POLÍTICAS EXISTENTES: trocar user_id por organization_id

-- Contas Bancárias
DROP POLICY IF EXISTS "Users can view own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can insert own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can update own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can delete own contas_bancarias" ON contas_bancarias;

ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_org ON contas_bancarias(organization_id);

CREATE POLICY "Users can view org contas_bancarias" ON contas_bancarias FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org contas_bancarias" ON contas_bancarias FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org contas_bancarias" ON contas_bancarias FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org contas_bancarias" ON contas_bancarias FOR DELETE
USING (organization_id = get_user_organization_id());

-- Classificações Contábeis
DROP POLICY IF EXISTS "Users can view own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can insert own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can update own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can delete own classificacoes" ON classificacoes_contabeis;

ALTER TABLE classificacoes_contabeis ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_classificacoes_org ON classificacoes_contabeis(organization_id);

CREATE POLICY "Users can view org classificacoes" ON classificacoes_contabeis FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org classificacoes" ON classificacoes_contabeis FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org classificacoes" ON classificacoes_contabeis FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org classificacoes" ON classificacoes_contabeis FOR DELETE
USING (organization_id = get_user_organization_id());

-- Lançamentos Processados
DROP POLICY IF EXISTS "Users can view own lancamentos" ON lancamentos_processados;
DROP POLICY IF EXISTS "Users can insert own lancamentos" ON lancamentos_processados;
DROP POLICY IF EXISTS "Users can update own lancamentos" ON lancamentos_processados;
DROP POLICY IF EXISTS "Users can delete own lancamentos" ON lancamentos_processados;

ALTER TABLE lancamentos_processados ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lancamentos_org ON lancamentos_processados(organization_id);

CREATE POLICY "Users can view org lancamentos" ON lancamentos_processados FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org lancamentos" ON lancamentos_processados FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org lancamentos" ON lancamentos_processados FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org lancamentos" ON lancamentos_processados FOR DELETE
USING (organization_id = get_user_organization_id());

-- Transferências
DROP POLICY IF EXISTS "Users can view own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can insert own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can update own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can delete own transferencias" ON transferencias;

ALTER TABLE transferencias ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_transferencias_org ON transferencias(organization_id);

CREATE POLICY "Users can view org transferencias" ON transferencias FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org transferencias" ON transferencias FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org transferencias" ON transferencias FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org transferencias" ON transferencias FOR DELETE
USING (organization_id = get_user_organization_id());

-- Transfer Pairs
DROP POLICY IF EXISTS "Users can view own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can insert own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can update own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can delete own transfer_pairs" ON transfer_pairs;

ALTER TABLE transfer_pairs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_transfer_pairs_org ON transfer_pairs(organization_id);

CREATE POLICY "Users can view org transfer_pairs" ON transfer_pairs FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org transfer_pairs" ON transfer_pairs FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org transfer_pairs" ON transfer_pairs FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org transfer_pairs" ON transfer_pairs FOR DELETE
USING (organization_id = get_user_organization_id());

-- Taxa Config
DROP POLICY IF EXISTS "Users can view own taxa_config" ON taxa_config;
DROP POLICY IF EXISTS "Users can insert own taxa_config" ON taxa_config;
DROP POLICY IF EXISTS "Users can update own taxa_config" ON taxa_config;
DROP POLICY IF EXISTS "Users can delete own taxa_config" ON taxa_config;

ALTER TABLE taxa_config ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_taxa_config_org ON taxa_config(organization_id);

CREATE POLICY "Users can view org taxa_config" ON taxa_config FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org taxa_config" ON taxa_config FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org taxa_config" ON taxa_config FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org taxa_config" ON taxa_config FOR DELETE
USING (organization_id = get_user_organization_id());

-- Contas Importadas
DROP POLICY IF EXISTS "Users can view own contas_importadas" ON contas_importadas;
DROP POLICY IF EXISTS "Users can insert own contas_importadas" ON contas_importadas;
DROP POLICY IF EXISTS "Users can update own contas_importadas" ON contas_importadas;
DROP POLICY IF EXISTS "Users can delete own contas_importadas" ON contas_importadas;

ALTER TABLE contas_importadas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contas_importadas_org ON contas_importadas(organization_id);

CREATE POLICY "Users can view org contas_importadas" ON contas_importadas FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org contas_importadas" ON contas_importadas FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org contas_importadas" ON contas_importadas FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org contas_importadas" ON contas_importadas FOR DELETE
USING (organization_id = get_user_organization_id());

-- Trigger: criar organização automaticamente ao criar usuário
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_for_new_user();

-- Migrar tabelas de transferências para modelo de organização

-- 1. Adicionar coluna organization_id às tabelas
ALTER TABLE transferencias ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE transfer_pairs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Preencher organization_id baseado no user_id existente
UPDATE transferencias t
SET organization_id = om.organization_id
FROM organization_members om
WHERE t.user_id = om.user_id AND t.organization_id IS NULL;

UPDATE transfer_pairs tp
SET organization_id = om.organization_id
FROM organization_members om
WHERE tp.user_id = om.user_id AND tp.organization_id IS NULL;

-- 3. Remover políticas antigas baseadas em user_id
DROP POLICY IF EXISTS "Users can view own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can insert own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can update own transferencias" ON transferencias;
DROP POLICY IF EXISTS "Users can delete own transferencias" ON transferencias;

DROP POLICY IF EXISTS "Users can view own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can insert own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can update own transfer_pairs" ON transfer_pairs;
DROP POLICY IF EXISTS "Users can delete own transfer_pairs" ON transfer_pairs;

-- 4. Criar novas políticas baseadas em organization_id
CREATE POLICY "Members can view org transferencias" ON transferencias
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert org transferencias" ON transferencias
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update org transferencias" ON transferencias
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete org transferencias" ON transferencias
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view org transfer_pairs" ON transfer_pairs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert org transfer_pairs" ON transfer_pairs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update org transfer_pairs" ON transfer_pairs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete org transfer_pairs" ON transfer_pairs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transferencias_org ON transferencias(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pairs_org ON transfer_pairs(organization_id);

-- 6. Remover índices antigos baseados em user_id
DROP INDEX IF EXISTS idx_transferencias_user;
DROP INDEX IF EXISTS idx_transfer_pairs_user;

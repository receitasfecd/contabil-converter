-- ============================================
-- CORRIGIR TABELAS DE MAPEAMENTO
-- Adicionar organization_id e atualizar políticas RLS
-- ============================================

-- 1. Adicionar coluna organization_id às tabelas de mapeamento
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE classificacoes_contabeis
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE plano_contas
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Adicionar coluna banco se não existir
ALTER TABLE contas_bancarias
ADD COLUMN IF NOT EXISTS banco TEXT;

-- 3. Atualizar registros existentes com organization_id do usuário
UPDATE contas_bancarias cb
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = cb.user_id
  LIMIT 1
)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

UPDATE classificacoes_contabeis cc
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = cc.user_id
  LIMIT 1
)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

UPDATE plano_contas pc
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = pc.user_id
  LIMIT 1
)
WHERE organization_id IS NULL AND user_id IS NOT NULL;

-- 4. Remover políticas antigas baseadas em user_id
DROP POLICY IF EXISTS "Users can view own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can insert own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can update own contas_bancarias" ON contas_bancarias;
DROP POLICY IF EXISTS "Users can delete own contas_bancarias" ON contas_bancarias;

DROP POLICY IF EXISTS "Users can view own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can insert own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can update own classificacoes" ON classificacoes_contabeis;
DROP POLICY IF EXISTS "Users can delete own classificacoes" ON classificacoes_contabeis;

DROP POLICY IF EXISTS "Users can view own plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can insert own plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can update own plano_contas" ON plano_contas;
DROP POLICY IF EXISTS "Users can delete own plano_contas" ON plano_contas;

-- 5. Criar novas políticas baseadas em organization_id
CREATE POLICY "Users can view org contas_bancarias" ON contas_bancarias FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org contas_bancarias" ON contas_bancarias FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org contas_bancarias" ON contas_bancarias FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org contas_bancarias" ON contas_bancarias FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view org classificacoes" ON classificacoes_contabeis FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org classificacoes" ON classificacoes_contabeis FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org classificacoes" ON classificacoes_contabeis FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org classificacoes" ON classificacoes_contabeis FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view org plano_contas" ON plano_contas FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org plano_contas" ON plano_contas FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org plano_contas" ON plano_contas FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org plano_contas" ON plano_contas FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_org ON contas_bancarias(organization_id);
CREATE INDEX IF NOT EXISTS idx_classificacoes_org ON classificacoes_contabeis(organization_id);
CREATE INDEX IF NOT EXISTS idx_plano_contas_org ON plano_contas(organization_id);

-- FIM
SELECT 'Tabelas de mapeamento corrigidas com sucesso!' as status;

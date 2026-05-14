-- Tabela de Contas Importadas (extratos bancários)
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_imported_accounts_org ON imported_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_user ON imported_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_accounts_conta ON imported_accounts((conta_bancaria->>'numeroConta'));

-- RLS
ALTER TABLE imported_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários da mesma organização podem ver/editar
CREATE POLICY "Users can view org imported_accounts" ON imported_accounts FOR SELECT
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert org imported_accounts" ON imported_accounts FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update org imported_accounts" ON imported_accounts FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete org imported_accounts" ON imported_accounts FOR DELETE
USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

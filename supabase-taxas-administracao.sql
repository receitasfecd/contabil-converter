-- Tabela de Taxas de Administração
CREATE TABLE IF NOT EXISTS taxas_administracao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transfer_out_id UUID REFERENCES transferencias(id) ON DELETE SET NULL,
  transfer_in_id UUID REFERENCES transferencias(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- 'PENDING_OUT', 'PENDING_IN', 'PAIRED', 'PROCESSED'
  grupo_contabil TEXT,
  conta_despesa TEXT,
  conta_receita TEXT,
  paired_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  exported BOOLEAN DEFAULT FALSE,
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_taxas_adm_user ON taxas_administracao(user_id);
CREATE INDEX IF NOT EXISTS idx_taxas_adm_status ON taxas_administracao(status);

-- RLS
ALTER TABLE taxas_administracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own taxas_administracao" ON taxas_administracao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own taxas_administracao" ON taxas_administracao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own taxas_administracao" ON taxas_administracao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own taxas_administracao" ON taxas_administracao FOR DELETE USING (auth.uid() = user_id);

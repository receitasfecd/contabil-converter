-- Tabela de usuários (usa auth.users do Supabase)
-- Não precisa criar, já existe

-- Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_conta TEXT NOT NULL,
  codigo_contabil TEXT NOT NULL,
  tipo_aplicacao TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Classificações Contábeis
CREATE TABLE IF NOT EXISTS classificacoes_contabeis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  classificacao_financeira TEXT NOT NULL,
  classificacao_contabil TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Lançamentos Processados
CREATE TABLE IF NOT EXISTS lancamentos_processados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  debito TEXT,
  credito TEXT,
  centro_custo TEXT,
  historico TEXT,
  valor TEXT NOT NULL,
  tipo TEXT, -- 'financial', 'transfer', 'tax'
  status TEXT, -- 'valid', 'warning', 'error'
  validation_messages JSONB,
  original_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Transferências
CREATE TABLE IF NOT EXISTS transferencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_code TEXT NOT NULL,
  data TEXT NOT NULL,
  amount TEXT NOT NULL,
  historico TEXT,
  centro_custo TEXT,
  direction TEXT NOT NULL, -- 'OUT' ou 'IN'
  status TEXT NOT NULL, -- 'PENDING', 'PAIRED', 'EXPORTED'
  paired_with UUID REFERENCES transferencias(id),
  counterpart_account TEXT,
  original_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pares de Transferências
CREATE TABLE IF NOT EXISTS transfer_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  out_transfer_id UUID REFERENCES transferencias(id) ON DELETE CASCADE,
  in_transfer_id UUID REFERENCES transferencias(id) ON DELETE CASCADE,
  match_score INTEGER,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configuração de Taxas
CREATE TABLE IF NOT EXISTS taxa_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  classificacao_despesa TEXT NOT NULL,
  classificacao_receita TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, conta_bancaria_id)
);

-- Tabela de Contas Importadas do Nasajon
CREATE TABLE IF NOT EXISTS contas_importadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT, -- 'Sintética' ou 'Analítica'
  nivel INTEGER,
  aceita_lancamento BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_user ON contas_bancarias(user_id);
CREATE INDEX IF NOT EXISTS idx_classificacoes_user ON classificacoes_contabeis(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user ON lancamentos_processados(user_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_user ON transferencias(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pairs_user ON transfer_pairs(user_id);
CREATE INDEX IF NOT EXISTS idx_taxa_config_user ON taxa_config(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_importadas_user ON contas_importadas(user_id);

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE classificacoes_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_importadas ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários só podem ver/editar seus próprios dados
CREATE POLICY "Users can view own contas_bancarias" ON contas_bancarias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contas_bancarias" ON contas_bancarias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contas_bancarias" ON contas_bancarias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contas_bancarias" ON contas_bancarias FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own classificacoes" ON classificacoes_contabeis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own classificacoes" ON classificacoes_contabeis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own classificacoes" ON classificacoes_contabeis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own classificacoes" ON classificacoes_contabeis FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own lancamentos" ON lancamentos_processados FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lancamentos" ON lancamentos_processados FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lancamentos" ON lancamentos_processados FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lancamentos" ON lancamentos_processados FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transferencias" ON transferencias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transferencias" ON transferencias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transferencias" ON transferencias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transferencias" ON transferencias FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transfer_pairs" ON transfer_pairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transfer_pairs" ON transfer_pairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transfer_pairs" ON transfer_pairs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transfer_pairs" ON transfer_pairs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own taxa_config" ON taxa_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own taxa_config" ON taxa_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own taxa_config" ON taxa_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own taxa_config" ON taxa_config FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contas_importadas" ON contas_importadas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contas_importadas" ON contas_importadas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contas_importadas" ON contas_importadas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contas_importadas" ON contas_importadas FOR DELETE USING (auth.uid() = user_id);

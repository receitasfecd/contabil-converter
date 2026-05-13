-- Adicionar coluna de código único para cada organização
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Função para gerar código único de 8 caracteres
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem caracteres confusos (0, O, 1, I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Gerar códigos para organizações existentes
UPDATE organizations
SET code = generate_org_code()
WHERE code IS NULL;

-- Trigger para gerar código automaticamente ao criar nova organização
CREATE OR REPLACE FUNCTION set_org_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_org_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_org_code ON organizations;
CREATE TRIGGER trigger_set_org_code
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_org_code();

-- Permitir que membros leiam o código da sua organização
CREATE POLICY "Members can read their organization code" ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

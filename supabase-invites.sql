-- Tabela de Convites
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON organization_invites(email);

-- RLS
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Políticas: membros da organização podem ver convites
CREATE POLICY "Members can view org invites" ON organization_invites FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
));

-- Apenas owners e admins podem criar convites
CREATE POLICY "Admins can create invites" ON organization_invites FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Apenas owners e admins podem deletar convites
CREATE POLICY "Admins can delete invites" ON organization_invites FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Atualizar políticas de organization_members para permitir inserção via convite
CREATE POLICY "Users can join via invite" ON organization_members FOR INSERT
WITH CHECK (
  -- Permitir se houver convite válido para o email do usuário
  EXISTS (
    SELECT 1 FROM organization_invites
    WHERE organization_invites.organization_id = organization_members.organization_id
    AND organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND organization_invites.status = 'pending'
    AND organization_invites.expires_at > NOW()
  )
);

-- Apenas owners podem deletar membros
CREATE POLICY "Owners can delete members" ON organization_members FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Apenas owners podem atualizar roles
CREATE POLICY "Owners can update member roles" ON organization_members FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Função para aceitar convite
CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT)
RETURNS JSON AS $$
DECLARE
  invite_record RECORD;
  user_email TEXT;
  result JSON;
BEGIN
  -- Obter email do usuário atual
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  -- Buscar convite válido
  SELECT * INTO invite_record
  FROM organization_invites
  WHERE token = invite_token
  AND email = user_email
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- Verificar se usuário já é membro
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = invite_record.organization_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Você já é membro desta organização');
  END IF;

  -- Adicionar usuário à organização
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (invite_record.organization_id, auth.uid(), invite_record.role);

  -- Marcar convite como aceito
  UPDATE organization_invites
  SET status = 'accepted'
  WHERE id = invite_record.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', invite_record.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar token único
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger para não criar organização se usuário aceitar convite primeiro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  pending_invite RECORD;
BEGIN
  -- Verificar se há convite pendente para este email
  SELECT * INTO pending_invite
  FROM organization_invites
  WHERE email = NEW.email
  AND status = 'pending'
  AND expires_at > NOW()
  LIMIT 1;

  IF FOUND THEN
    -- Não criar organização, usuário vai aceitar convite
    RETURN NEW;
  END IF;

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_for_new_user();

-- Atualizar trigger para não criar organização se usuário está entrando via link público
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pending_invite RECORD;
BEGIN
  -- Verificar se existe convite pendente para este email
  SELECT * INTO pending_invite
  FROM organization_invites
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  -- Se existe convite pendente, não criar organização
  -- O convite será aceito manualmente
  IF pending_invite.id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Se não existe convite, criar nova organização
  INSERT INTO organizations (name)
  VALUES (NEW.email)
  RETURNING id INTO pending_invite;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (pending_invite.id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

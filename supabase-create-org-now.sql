-- ============================================
-- CRIAR ORGANIZAÇÃO PARA O USUÁRIO ATUAL
-- ============================================

DO $$
DECLARE
  new_org_id UUID;
  current_user_id UUID;
BEGIN
  -- Pegar o ID do usuário atual
  current_user_id := auth.uid();

  -- Verificar se já tem organização
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = current_user_id) THEN
    -- Criar nova organização
    INSERT INTO organizations (name)
    VALUES ('Minha Organização')
    RETURNING id INTO new_org_id;

    -- Associar usuário à organização
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, current_user_id, 'owner');

    RAISE NOTICE 'Organização criada com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário já tem organização';
  END IF;
END $$;

-- Verificar resultado
SELECT om.organization_id, om.role, o.name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

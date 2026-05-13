-- Script para verificar e corrigir usuários sem organização

-- 1. Ver usuários sem organização
SELECT
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN organization_members om ON au.id = om.user_id
WHERE om.id IS NULL;

-- 2. Criar organização para usuários que não têm
-- Execute este bloco para cada usuário sem organização

DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  -- Para cada usuário sem organização
  FOR user_record IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN organization_members om ON au.id = om.user_id
    WHERE om.id IS NULL
  LOOP
    -- Criar organização
    INSERT INTO organizations (name)
    VALUES ('Organização de ' || user_record.email)
    RETURNING id INTO new_org_id;

    -- Adicionar usuário como owner
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, user_record.id, 'owner');

    RAISE NOTICE 'Organização criada para: %', user_record.email;
  END LOOP;
END $$;

-- 3. Verificar se todos têm organização agora
SELECT
  au.email,
  o.name as organizacao,
  om.role
FROM auth.users au
JOIN organization_members om ON au.id = om.user_id
JOIN organizations o ON om.organization_id = o.id;

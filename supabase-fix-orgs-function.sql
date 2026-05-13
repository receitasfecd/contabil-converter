-- Função para criar organizações para usuários que não têm
CREATE OR REPLACE FUNCTION fix_missing_organizations()
RETURNS TABLE(email TEXT, action TEXT) AS $$
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

    -- Retornar resultado
    email := user_record.email;
    action := 'Organização criada';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a função
SELECT * FROM fix_missing_organizations();

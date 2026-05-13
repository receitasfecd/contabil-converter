-- Dar permissão para a view acessar auth.users
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Recriar a view com as permissões corretas
DROP VIEW IF EXISTS organization_members_with_email;

CREATE VIEW organization_members_with_email AS
SELECT
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.created_at,
  au.email
FROM organization_members om
JOIN auth.users au ON om.user_id = au.id;

-- Permitir acesso à view
GRANT SELECT ON organization_members_with_email TO authenticated;
GRANT SELECT ON organization_members_with_email TO service_role;

-- Aplicar RLS
ALTER VIEW organization_members_with_email SET (security_invoker = true);

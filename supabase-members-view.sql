-- View para expor emails dos membros da organização
-- Permite que membros vejam emails de outros membros da mesma org

CREATE OR REPLACE VIEW organization_members_with_email AS
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

-- RLS na view: usuários só veem membros da própria organização
ALTER VIEW organization_members_with_email SET (security_invoker = true);

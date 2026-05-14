-- ============================================
-- VERIFICAR ORGANIZAÇÕES DO USUÁRIO
-- ============================================

-- Ver todas as organizações
SELECT * FROM organizations;

-- Ver todos os membros de organizações
SELECT om.*, u.email
FROM organization_members om
LEFT JOIN auth.users u ON u.id = om.user_id;

-- Ver se o usuário atual tem organização
SELECT om.organization_id, om.role, o.name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

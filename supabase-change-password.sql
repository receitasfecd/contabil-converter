-- ============================================
-- ALTERAR SENHA DO USUÁRIO
-- ============================================

-- Alterar senha do usuário jhonataleal@fecd.org.br
UPDATE auth.users
SET
  encrypted_password = crypt('Fecd@2024', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'jhonataleal@fecd.org.br';

-- Verificar se foi atualizado
SELECT id, email, updated_at
FROM auth.users
WHERE email = 'jhonataleal@fecd.org.br';

-- Desabilitar o trigger automático que cria organização
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover a função também
DROP FUNCTION IF EXISTS handle_new_user();

-- Permitir que usuários autenticados se adicionem a organizações via código público
CREATE POLICY "Users can join organizations via public link" ON organization_members FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  organization_id IN (
    SELECT id FROM organizations WHERE code IS NOT NULL
  )
);

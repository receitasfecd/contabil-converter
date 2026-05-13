-- Permitir que owners atualizem o nome da organização
CREATE POLICY "Owners can update organization name" ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

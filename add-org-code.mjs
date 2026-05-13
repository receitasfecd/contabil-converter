import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function addOrgCode() {
  console.log('🔧 Gerando códigos para organizações...\n');

  // Buscar organizações existentes
  const { data: orgs, error: orgsError } = await supabaseAdmin
    .from('organizations')
    .select('id, code, name');

  if (orgsError) {
    console.error('Erro ao buscar organizações:', orgsError);
    return;
  }

  console.log('📊 Organizações encontradas:', orgs);

  // Gerar código para cada organização sem código
  for (const org of orgs) {
    if (!org.code) {
      const code = generateOrgCode();
      const { error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ code })
        .eq('id', org.id);

      if (updateError) {
        console.error(`Erro ao atualizar ${org.name}:`, updateError);
      } else {
        console.log(`✅ ${org.name}: ${code}`);
      }
    } else {
      console.log(`✅ ${org.name}: ${org.code} (já existe)`);
    }
  }
}

function generateOrgCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

addOrgCode();

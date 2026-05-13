import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function importPlanoContas() {
  console.log('📥 Importando Plano de Contas...\n');

  // Ler arquivo
  const data = JSON.parse(fs.readFileSync('dados-completos-final.json', 'utf8'));

  if (!data.planoContas || data.planoContas.length === 0) {
    console.error('❌ Nenhum plano de contas encontrado no arquivo');
    return;
  }

  console.log(`📊 Encontrados ${data.planoContas.length} itens no arquivo`);

  // Buscar organização FECD
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('code', 'VG9ZB5ZF')
    .single();

  if (orgError || !org) {
    console.error('❌ Organização não encontrada');
    return;
  }

  console.log('✅ Organização encontrada:', org.id);

  // Preparar dados
  const rows = data.planoContas.map((item) => ({
    organization_id: org.id,
    codigo: item.codigo,
    descricao: item.nome || item.descricao || '',
    tipo: item.tipo || null,
  }));

  console.log(`💾 Salvando ${rows.length} itens no Supabase...`);

  // Deletar existentes
  await supabaseAdmin
    .from('plano_contas')
    .delete()
    .eq('organization_id', org.id);

  // Inserir novos
  const { data: inserted, error } = await supabaseAdmin
    .from('plano_contas')
    .insert(rows)
    .select();

  if (error) {
    console.error('❌ Erro ao importar:', error);
    return;
  }

  console.log(`✅ ${inserted.length} itens importados com sucesso!`);
}

importPlanoContas();

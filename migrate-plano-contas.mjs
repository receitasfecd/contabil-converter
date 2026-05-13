import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cole aqui o conteúdo do seu localStorage planoContas
// Você pode pegar isso abrindo o DevTools (F12) no navegador e digitando:
// localStorage.getItem('planoContas')
const planoContasData = [
  // Cole os dados aqui
];

async function migratePlanoContas() {
  console.log('🔄 Migrando Plano de Contas para Supabase...\n');

  if (planoContasData.length === 0) {
    console.log('⚠️  Nenhum dado para migrar. Por favor, cole os dados do localStorage no script.');
    console.log('\nPara obter os dados:');
    console.log('1. Abra o navegador em https://contabil-converter-three.vercel.app');
    console.log('2. Pressione F12 para abrir DevTools');
    console.log('3. Vá na aba Console');
    console.log('4. Digite: localStorage.getItem("planoContas")');
    console.log('5. Copie o resultado e cole no script\n');
    return;
  }

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
  const rows = planoContasData.map((item: any) => ({
    organization_id: org.id,
    codigo: item.codigo,
    descricao: item.descricao,
    tipo: item.tipo,
  }));

  console.log(`📊 Migrando ${rows.length} itens...`);

  // Inserir no Supabase
  const { data, error } = await supabaseAdmin
    .from('plano_contas')
    .insert(rows)
    .select();

  if (error) {
    console.error('❌ Erro ao migrar:', error);
    return;
  }

  console.log(`✅ ${data.length} itens migrados com sucesso!`);
}

migratePlanoContas();

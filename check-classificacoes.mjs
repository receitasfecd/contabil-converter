import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkClassificacoes() {
  console.log('🔍 Buscando classificações no banco...');

  const { data, error } = await supabaseAdmin
    .from('classificacoes_contabeis')
    .select('id, user_id, classificacao_financeira, classificacao_contabil, descricao');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`📊 Total de classificações encontradas: ${data.length}`);

  const countByUser = {};
  data.forEach(row => {
    countByUser[row.user_id] = (countByUser[row.user_id] || 0) + 1;
  });

  console.log('📊 Contagem por usuário:', countByUser);

  // Mostrar amostra para cada usuário
  for (const userId in countByUser) {
    const samples = data.filter(row => row.user_id === userId).slice(0, 3);
    console.log(`Amostra para ${userId}:`, samples);
  }
}

checkClassificacoes();

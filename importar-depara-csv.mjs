import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Lista de usuários para os quais atualizaremos o De-Para
const userIds = [
  '8d8347af-db95-4239-8f85-8aa9954f502e', // jhonataleal@fecd.org.br
  '5621e0f6-811c-4c30-a523-7cef58959aae', // luizricardo@fecd.org.br
  'a896963d-8cab-4166-8ab7-8b7c9de8385c'  // fagnersantos@fecd.org.br
];

async function run() {
  console.log('📖 Lendo o arquivo DE _PARA 1.csv...');
  
  if (!fs.existsSync('DE _PARA 1.csv')) {
    console.error('❌ O arquivo DE _PARA 1.csv não foi encontrado na raiz do projeto.');
    return;
  }
  
  const csvContent = fs.readFileSync('DE _PARA 1.csv', 'latin1'); // latin1 preserva a codificação Windows-1252/ISO-8859-1 do Excel

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';'
  });

  const rows = parsed.data;
  console.log(`📊 Encontradas ${rows.length} linhas no CSV.`);

  // Mapear linhas para o formato do banco
  const csvClassificacoes = rows.map((row) => {
    // Normalizar chaves para contornar problemas de encoding nas colunas
    const keys = Object.keys(row);
    const codeKey = keys.find(k => k.toLowerCase().includes('cód') || k.toLowerCase().includes('cod') || k.toLowerCase() === 'código');
    const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase() === 'descrição');
    const accKey = keys.find(k => k.toLowerCase().includes('cont') || k.toLowerCase().includes('contábil') || k.toLowerCase() === 'conta contábil');

    const code = codeKey ? String(row[codeKey]).trim() : '';
    const desc = descKey ? String(row[descKey]).trim() : '';
    const acc = accKey ? String(row[accKey]).trim() : '';

    if (!code || !acc) return null;

    return {
      classificacao_financeira: code,
      classificacao_contabil: acc,
      descricao: desc
    };
  }).filter(Boolean);

  console.log(`🧹 Filtradas ${csvClassificacoes.length} classificações válidas do CSV.`);

  if (csvClassificacoes.length === 0) {
    console.error('❌ Nenhuma classificação válida encontrada no CSV. Abortando.');
    return;
  }

  for (const userId of userIds) {
    console.log(`\n👤 Atualizando De-Para para o usuário: ${userId}...`);

    // Buscar classificações atuais do usuário no banco
    const { data: currentDb, error: fetchError } = await supabaseAdmin
      .from('classificacoes_contabeis')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error(`❌ Erro ao buscar classificações para ${userId}:`, fetchError);
      continue;
    }

    console.log(`   Possui atualmente ${currentDb.length} registros no banco.`);

    // Criar um Map para busca rápida das existentes
    const dbMap = new Map(currentDb.map(item => [item.classificacao_financeira, item]));

    const itemsToInsert = [];
    const itemsToUpdate = [];

    for (const csvItem of csvClassificacoes) {
      const existing = dbMap.get(csvItem.classificacao_financeira);
      if (existing) {
        // Se mudou a conta ou descrição, atualizamos
        if (existing.classificacao_contabil !== csvItem.classificacao_contabil || existing.descricao !== csvItem.descricao) {
          itemsToUpdate.push({
            id: existing.id,
            user_id: userId,
            classificacao_financeira: csvItem.classificacao_financeira,
            classificacao_contabil: csvItem.classificacao_contabil,
            descricao: csvItem.descricao
          });
        }
      } else {
        // Novo item
        itemsToInsert.push({
          user_id: userId,
          classificacao_financeira: csvItem.classificacao_financeira,
          classificacao_contabil: csvItem.classificacao_contabil,
          descricao: csvItem.descricao
        });
      }
    }

    console.log(`   Novas inserções: ${itemsToInsert.length}`);
    console.log(`   Atualizações: ${itemsToUpdate.length}`);

    // Executar inserções
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('classificacoes_contabeis')
        .insert(itemsToInsert);

      if (insertError) {
        console.error(`   ❌ Erro ao inserir itens:`, insertError);
      } else {
        console.log(`   ✅ ${itemsToInsert.length} novos itens inseridos com sucesso.`);
      }
    }

    // Executar atualizações
    if (itemsToUpdate.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('classificacoes_contabeis')
        .upsert(itemsToUpdate);

      if (upsertError) {
        console.error(`   ❌ Erro ao atualizar itens:`, upsertError);
      } else {
        console.log(`   ✅ ${itemsToUpdate.length} itens atualizados com sucesso.`);
      }
    }
  }

  console.log('\n🚀 Processamento concluído com sucesso!');
}

run();

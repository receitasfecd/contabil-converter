import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYzNjcyMSwiZXhwIjoyMDk0MjEyNzIxfQ.RjqnptFANAm41WgJAiMz6bRhRZ7kSs-MJtrkjj9Je8E';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runImport() {
  console.log('🚀 Iniciando script de importação automatizada do De-Para...');

  const csvPath = 'C:\\Users\\jhona\\contabil-converter\\DE _PARA 1.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado em: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'latin1');

  // Quebrar por linhas
  const lines = csvContent.split(/\r?\n/);
  console.log(`📊 Total de linhas brutas encontradas no CSV: ${lines.length}`);

  const classificacoes = [];
  const uniqueKeys = new Set();

  // O cabeçalho é a linha 0
  // Grupo Empresarial;Código;Descrição;Conta Contábil;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length >= 4) {
      const grupoEmpresarial = parts[0].trim();
      const codigo = parts[1].trim();
      const descricao = parts[2].trim();
      const contaContabil = parts[3].trim();

      if (codigo && contaContabil) {
        const key = `${codigo}-${contaContabil}`;
        
        // Evitar duplicados exatos no CSV
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key);
          classificacoes.push({
            id: `import-${classificacoes.length + 1}`,
            tipo: 'CLASSIFICACAO',
            classificacaoFinanceira: codigo,
            classificacaoContabil: contaContabil,
            descricao: descricao || `${codigo} (${grupoEmpresarial})`
          });
        }
      }
    }
  }

  console.log(`✅ Total de classificações válidas e únicas processadas: ${classificacoes.length}`);

  if (classificacoes.length === 0) {
    console.error('❌ Nenhuma classificação válida encontrada no arquivo CSV.');
    process.exit(1);
  }

  // 1. Atualizar o Supabase para cada User ID relevante
  const targetUserIds = [
    null, // Global
    '8d8347af-db95-4239-8f85-8aa9954f502e', // Jhonata Leal
    '5621e0f6-811c-4c30-a523-7cef58959aae', // Luiz Ricardo
    'a896963d-8cab-4166-8ab7-8b7c9de8385c'  // Fagner Santos
  ];

  console.log('\n🗄️ Atualizando banco de dados no Supabase...');

  for (const userId of targetUserIds) {
    const label = userId ? `Usuário: ${userId}` : 'Global (null)';
    console.log(`\n🧹 Limpando cadastros antigos para ${label}...`);
    
    let deleteQuery = supabaseAdmin.from('classificacoes_contabeis').delete();
    if (userId === null) {
      deleteQuery = deleteQuery.is('user_id', null);
    } else {
      deleteQuery = deleteQuery.eq('user_id', userId);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      console.error(`❌ Erro ao limpar para ${label}:`, deleteError);
      continue;
    }

    console.log(`📥 Inserindo ${classificacoes.length} novos cadastros para ${label}...`);
    
    // Preparar os dados para inserção em blocos (se o banco tiver limite de tamanho de payload, dividimos em blocos de 200)
    const chunkSize = 200;
    for (let j = 0; j < classificacoes.length; j += chunkSize) {
      const chunk = classificacoes.slice(j, j + chunkSize).map(item => ({
        user_id: userId,
        classificacao_financeira: item.classificacaoFinanceira,
        classificacao_contabil: item.classificacaoContabil,
        descricao: item.descricao
      }));

      const { error: insertError } = await supabaseAdmin
        .from('classificacoes_contabeis')
        .insert(chunk);

      if (insertError) {
        console.error(`❌ Erro ao inserir chunk para ${label}:`, insertError);
        break;
      }
    }
    console.log(`✅ Atualização com sucesso para ${label}!`);
  }

  // 2. Atualizar arquivos JSON locais para manter sincronizado com o Git e offline
  console.log('\n💾 Atualizando arquivos JSON estáticos locais...');

  // Mapeamentos importados (estrutura reduzida)
  const store = {
    classificacoes: classificacoes,
    contasBancarias: [],
    lastExportPath: '',
    preferences: {
      autoSave: true,
      validateOnImport: true
    }
  };

  const importadosPath = 'C:\\Users\\jhona\\contabil-converter\\mapeamentos-importados.json';
  fs.writeFileSync(importadosPath, JSON.stringify(store, null, 2), 'utf-8');
  console.log(`✓ mapeamentos-importados.json atualizado em: ${importadosPath}`);

  // Mapeamentos completo (preservando contasBancarias e planoContas)
  const completoPath = 'C:\\Users\\jhona\\contabil-converter\\mapeamentos-completo.json';
  if (fs.existsSync(completoPath)) {
    try {
      const completoContent = JSON.parse(fs.readFileSync(completoPath, 'utf-8'));
      completoContent.classificacoes = classificacoes;
      fs.writeFileSync(completoPath, JSON.stringify(completoContent, null, 2), 'utf-8');
      console.log(`✓ mapeamentos-completo.json atualizado em: ${completoPath}`);
    } catch (e) {
      console.error('⚠️ Erro ao atualizar mapeamentos-completo.json (preservando outros dados):', e);
    }
  } else {
    fs.writeFileSync(completoPath, JSON.stringify(store, null, 2), 'utf-8');
    console.log(`✓ mapeamentos-completo.json criado em: ${completoPath}`);
  }

  console.log('\n🎉 Processo de importação concluído com sucesso!');
}

runImport().catch(err => {
  console.error('💥 Ocorreu um erro catastrófico:', err);
});

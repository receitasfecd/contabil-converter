const fs = require('fs');
const path = require('path');

// Ler o plano de contas
const planoContasPath = path.join(__dirname, 'plano-contas-2024.json');
const planoContasData = JSON.parse(fs.readFileSync(planoContasPath, 'utf-8'));

// Ler os mapeamentos existentes
const mapeamentosPath = path.join(__dirname, 'mapeamentos-importados.json');
const mapeamentosData = JSON.parse(fs.readFileSync(mapeamentosPath, 'utf-8'));

// Criar um mapa de código -> nome do plano de contas
const planoContasMap = new Map();
planoContasData.planoContas.forEach(conta => {
  planoContasMap.set(conta.codigo, conta.nome);
});

// Enriquecer as classificações com os nomes das contas contábeis
let enrichedCount = 0;
mapeamentosData.classificacoes.forEach(classificacao => {
  const nomeConta = planoContasMap.get(classificacao.classificacaoContabil);
  if (nomeConta) {
    // Adicionar o nome da conta à descrição se ainda não tiver
    if (!classificacao.descricao || classificacao.descricao === '') {
      classificacao.descricao = nomeConta;
      enrichedCount++;
    } else {
      // Se já tem descrição, adicionar o nome da conta entre parênteses
      classificacao.descricao = `${classificacao.descricao} (${nomeConta})`;
      enrichedCount++;
    }
  }
});

// Adicionar o plano de contas ao store completo
const storeCompleto = {
  classificacoes: mapeamentosData.classificacoes,
  contasBancarias: mapeamentosData.contasBancarias || [],
  planoContas: planoContasData.planoContas,
  lastExportPath: '',
  preferences: {
    autoSave: true,
    validateOnImport: true
  }
};

// Salvar o arquivo completo
const outputPath = path.join(__dirname, 'mapeamentos-completo.json');
fs.writeFileSync(outputPath, JSON.stringify(storeCompleto, null, 2), 'utf-8');

console.log('✓ Mapeamentos enriquecidos com sucesso!');
console.log(`  - ${enrichedCount} classificações enriquecidas com nomes das contas`);
console.log(`  - ${storeCompleto.classificacoes.length} classificações totais`);
console.log(`  - ${storeCompleto.planoContas.length} contas no plano de contas`);
console.log(`  - ${storeCompleto.contasBancarias.length} contas bancárias`);
console.log(`\n✓ Arquivo salvo em: ${outputPath}`);
console.log('\nPara usar no aplicativo:');
console.log('1. Abra http://localhost:5173');
console.log('2. Vá em "Mapeamento"');
console.log('3. Clique em "Importar"');
console.log('4. Selecione o arquivo: mapeamentos-completo.json');
console.log('\nAgora você terá:');
console.log('  - Aba "De-Para" com 609 classificações (com nomes das contas)');
console.log('  - Aba "Contas Bancárias" (vazia - cadastre suas contas)');
console.log('  - Aba "Plano de Contas" com 1881 contas em estrutura hierárquica');

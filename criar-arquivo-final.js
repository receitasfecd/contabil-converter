const fs = require('fs');
const path = require('path');

// Ler os arquivos
const mapeamentosPath = path.join(__dirname, 'mapeamentos-completo.json');
const contasPath = path.join(__dirname, 'contas-bancarias-importar.json');

const mapeamentos = JSON.parse(fs.readFileSync(mapeamentosPath, 'utf-8'));
const contas = JSON.parse(fs.readFileSync(contasPath, 'utf-8'));

// Criar arquivo completo final
const dadosCompletos = {
  classificacoes: mapeamentos.classificacoes || [],
  contasBancarias: contas.contasBancarias || [],
  planoContas: mapeamentos.planoContas || [],
  lastExportPath: '',
  preferences: {
    autoSave: true,
    validateOnImport: true
  }
};

// Salvar
const outputPath = path.join(__dirname, 'dados-completos-final.json');
fs.writeFileSync(outputPath, JSON.stringify(dadosCompletos, null, 2), 'utf-8');

console.log('✓ Arquivo completo criado com sucesso!');
console.log('=====================================');
console.log(`  - ${dadosCompletos.classificacoes.length} classificações (De-Para)`);
console.log(`  - ${dadosCompletos.contasBancarias.length} contas bancárias`);
console.log(`  - ${dadosCompletos.planoContas.length} contas no plano`);
console.log('');
console.log(`✓ Arquivo salvo em: ${outputPath}`);
console.log('');
console.log('📥 PARA IMPORTAR NO APLICATIVO:');
console.log('=====================================');
console.log('1. Abra: http://localhost:5174');
console.log('2. Vá em "Mapeamento"');
console.log('3. Clique em "Importar"');
console.log('4. Selecione: dados-completos-final.json');
console.log('');
console.log('✅ Após importar você terá:');
console.log('  - Aba "De-Para": 609 classificações');
console.log('  - Aba "Contas Bancárias": 272 contas');
console.log('  - Aba "Plano de Contas": 1.881 contas');
console.log('');
console.log('🎯 Agora você pode processar seus lançamentos!');

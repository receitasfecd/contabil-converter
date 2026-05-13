const XLSX = require('xlsx');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\10789-1 EXTRATO CC UNIMICRO ANO 2024.xls';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converter para JSON (sem cabeçalho)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Estrutura das primeiras 5 linhas:');
console.log('=====================================\n');

for (let i = 0; i < Math.min(5, data.length); i++) {
  const row = data[i];
  console.log(`Linha ${i + 1}:`);
  console.log(`  Total de colunas: ${row.length}`);

  for (let j = 0; j < row.length; j++) {
    console.log(`  Coluna ${j}: "${row[j]}"`);
  }
  console.log('');
}

console.log('\n=====================================');
console.log('Mapeamento esperado pelo aplicativo:');
console.log('  Coluna 0: Data');
console.log('  Coluna 1: Documento');
console.log('  Coluna 2: Histórico');
console.log('  Coluna 3: Status');
console.log('  Coluna 4: Classificação Financeira');
console.log('  Coluna 5: Centro de Custo');
console.log('  Coluna 6: Valor Débito');
console.log('  Coluna 7: Valor Crédito');
console.log('  Coluna 8: Saldo');
console.log('  Coluna 9: Símbolo (D/C)');

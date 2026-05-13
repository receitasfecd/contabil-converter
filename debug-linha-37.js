const XLSX = require('xlsx');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\10789-1 EXTRATO CC UNIMICRO ANO 2024.xls';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converter para JSON (sem cabeçalho)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Analisando linhas 36, 37, 38:');
console.log('=====================================\n');

for (let i = 35; i <= 37; i++) {
  const row = data[i];

  console.log(`Linha ${i + 1}:`);
  if (!row || row.length === 0) {
    console.log('  LINHA VAZIA');
  } else {
    console.log(`  Total colunas: ${row.length}`);
    for (let j = 0; j < row.length; j++) {
      console.log(`  [${j}]: "${row[j]}"`);
    }
  }
  console.log('');
}

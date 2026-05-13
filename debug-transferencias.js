const XLSX = require('xlsx');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\10789-1 EXTRATO CC UNIMICRO ANO 2024.xls';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converter para JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Analisando transferências no arquivo...\n');
console.log('=====================================\n');

let transferCount = 0;

for (let i = 0; i < data.length; i++) {
  const row = data[i];

  if (!row || row.length === 0 || !row[0]) continue;

  const documento = String(row[1] || '');
  const historico = String(row[2] || '');

  // Verificar se parece ser transferência
  const isTransfer =
    /transferência/i.test(historico) ||
    /transferencia/i.test(historico) ||
    /resgate/i.test(documento) ||
    /aplicação/i.test(documento) ||
    /aplicacao/i.test(documento);

  if (isTransfer) {
    transferCount++;
    console.log(`Linha ${i + 1}:`);
    console.log(`  Documento: "${documento}"`);
    console.log(`  Histórico: "${historico}"`);
    console.log('');
  }
}

console.log('=====================================');
console.log(`Total de transferências encontradas: ${transferCount}`);
console.log(`Total de linhas: ${data.length}`);

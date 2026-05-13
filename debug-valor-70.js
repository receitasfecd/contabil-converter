const XLSX = require('xlsx');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\10789-1 EXTRATO CC UNIMICRO ANO 2024.xls';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converter para JSON (sem cabeçalho)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Buscando lançamentos com valor 70 ou próximo:');
console.log('=====================================\n');

for (let i = 0; i < data.length; i++) {
  const row = data[i];

  if (!row || row.length === 0 || !row[0]) continue;

  const valorDebito = row[7] ? Number(row[7]) : null;
  const valorCredito = row[8] ? Number(row[8]) : null;

  // Buscar valores próximos de 70
  if ((valorDebito && Math.abs(valorDebito - 70) < 5) ||
      (valorCredito && Math.abs(valorCredito - 70) < 5)) {
    console.log(`Linha ${i + 1}:`);
    console.log(`  Data: ${row[0]}`);
    console.log(`  Documento: ${row[1]}`);
    console.log(`  Histórico: ${row[2]}`);
    console.log(`  Classificação: ${row[4]}`);
    console.log(`  Centro Custo: ${row[5]}`);
    console.log(`  Débito: ${valorDebito}`);
    console.log(`  Crédito: ${valorCredito}`);
    console.log(`  Saldo: ${row[9]}`);
    console.log(`  Símbolo: ${row[10]}`);
    console.log('');
  }
}

console.log('\nTodos os valores de débito e crédito:');
console.log('=====================================\n');

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0 || !row[0]) continue;

  const valorDebito = row[7] ? Number(row[7]) : null;
  const valorCredito = row[8] ? Number(row[8]) : null;

  console.log(`Linha ${i + 1}: D=${valorDebito} | C=${valorCredito}`);
}

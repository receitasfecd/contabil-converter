const XLSX = require('xlsx');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\10789-1 EXTRATO CC UNIMICRO ANO 2024.xls';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log('Nome da planilha:', sheetName);
console.log('');

// Converter para JSON (sem cabeçalho)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Total de linhas no arquivo:', data.length);
console.log('');

// Contar linhas não vazias
let linhasValidas = 0;
let linhasVazias = 0;

for (let i = 0; i < data.length; i++) {
  const row = data[i];

  if (!row || row.length === 0 || !row[0]) {
    linhasVazias++;
    console.log(`Linha ${i + 1}: VAZIA`);
  } else {
    linhasValidas++;
    console.log(`Linha ${i + 1}: ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]}`);
  }
}

console.log('');
console.log('=====================================');
console.log('Linhas válidas:', linhasValidas);
console.log('Linhas vazias:', linhasVazias);
console.log('Total:', data.length);

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ler o arquivo Excel
const excelPath = 'C:\\Users\\jhona\\Downloads\\contas bancárias.xlsx';
const workbook = XLSX.readFile(excelPath);

// Pegar a primeira planilha
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Converter para JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Primeiras 20 linhas do arquivo:');
console.log('=====================================');
for (let i = 0; i < Math.min(20, data.length); i++) {
  console.log(`Linha ${i}:`, data[i]);
}

console.log('\n=====================================');
console.log(`Total de linhas: ${data.length}`);
console.log('\nEstrutura detectada:');
console.log('Colunas:', data[0]);

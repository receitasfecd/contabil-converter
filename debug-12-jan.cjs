const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2];
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- BUSCANDO 12/01/2024 ---');

function formatDate(d) {
  if (typeof d === 'number') {
    const date = new Date(Math.round((d - 25569) * 86400 * 1000));
    date.setUTCHours(12);
    return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
  }
  return String(d || '');
}

const output = [];
data.forEach((row, idx) => {
  if (idx >= 1 && idx <= 200) {
     output.push(`L${idx}: ${JSON.stringify(row)}`);
  }
});
require('fs').writeFileSync('dump_excel.txt', output.join('\n'));
console.log('Dump salvo em dump_excel.txt');

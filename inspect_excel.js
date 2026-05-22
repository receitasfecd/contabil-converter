import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = 'C:\\Users\\jhona\\contabil-converter\\CONTAS PARA TESTE 2024\\IMPORTAÇÃO COMPLETA\\40705-4.xls';

try {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- INSPECIONANDO HISTÓRICOS ---');
    jsonData.slice(0, 50).forEach((row, index) => {
        if (row[2]) {
            console.log(`Linha ${index}: "${row[2]}"`);
        }
    });
} catch (err) {
    console.error('Erro ao ler o arquivo:', err);
}

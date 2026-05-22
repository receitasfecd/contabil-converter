import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = 'Z:\\DOCUMENTOS PRESTAÇÃO DE CONTAS - 2024\\ARQUIVOS INCLUÍDOS NO APP\\10807-3 - FECD IBQM LBAH PLO.xls';

try {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- INSPECIONANDO ESTRUTURA DE LINHAS ---');
    jsonData.slice(0, 30).forEach((row, index) => {
        console.log(`Linha ${index}:`, JSON.stringify(row));
    });
} catch (err) {
    console.error('Erro ao ler o arquivo:', err);
}

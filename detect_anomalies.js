import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = 'Z:\\DOCUMENTOS PRESTAÇÃO DE CONTAS - 2024\\ARQUIVOS INCLUÍDOS NO APP\\10807-3 - FECD IBQM LBAH PLO.xls';

try {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- BUSCANDO ANOMALIAS DE LINHAS ---');
    jsonData.forEach((row, index) => {
        const hasDate = row[0] && (typeof row[0] === 'number' || typeof row[0] === 'string');
        const hasValue = row[7] || row[8]; // Débito ou Crédito
        const hasHistory = row[2];

        if (hasDate && (!hasValue || !hasHistory)) {
            console.log(`ANOMALIA Linha ${index}: Possui data mas falta Valor ou Histórico.`);
            console.log(`  Dados: ${JSON.stringify(row)}`);
            // Mostrar a linha de baixo para ver se é continuação
            if (jsonData[index+1]) {
                console.log(`  Linha Seguinte ${index+1}: ${JSON.stringify(jsonData[index+1])}`);
            }
        }
    });
} catch (err) {
    console.error('Erro ao ler o arquivo:', err);
}

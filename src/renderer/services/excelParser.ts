import * as XLSX from 'xlsx';
import { ExcelEntry } from '../types/Entry';
import { parseExcelDate } from '../utils/formatters';

export async function parseExcelFile(file: File): Promise<ExcelEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para JSON (sem cabeçalho, pois dados começam na linha 1)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Primeiro passo: mesclar linhas quebradas
        const mergedData: any[] = [];
        let currentRow: any[] | null = null;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];

          // Pular linhas completamente vazias
          if (!row || row.length === 0) {
            continue;
          }

          // Verificar se a linha tem data (coluna 0)
          const hasDate = row[0] && (typeof row[0] === 'number' || typeof row[0] === 'string');

          if (hasDate) {
            // Linha com data - salvar linha anterior se existir
            if (currentRow) {
              mergedData.push(currentRow);
            }
            // Iniciar nova linha
            currentRow = [...row];
          } else {
            // Linha sem data - é continuação da anterior
            if (currentRow) {
              // Mesclar dados da linha quebrada na linha atual
              for (let j = 0; j < row.length; j++) {
                if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
                  // Se a célula atual está vazia, preencher com o valor da linha quebrada
                  if (!currentRow[j] || currentRow[j] === '' || currentRow[j] === 'undefined') {
                    currentRow[j] = row[j];
                  } else if (j === 2) {
                    // Coluna 2 é o histórico - concatenar se ambos tiverem valor
                    currentRow[j] = String(currentRow[j]) + ' ' + String(row[j]);
                  }
                }
              }
            }
          }
        }

        // Adicionar última linha
        if (currentRow) {
          mergedData.push(currentRow);
        }

        const entries: ExcelEntry[] = [];
        let lastHistorico = '';
        let lastDocumento = '';

        // Processar cada linha mesclada
        for (let i = 0; i < mergedData.length; i++) {
          const row = mergedData[i];

          // Pular linhas vazias
          if (!row || row.length === 0 || !row[0]) {
            continue;
          }

          try {
            // Detectar formato do arquivo baseado no número de colunas
            const numColunas = row.length;

            let entry: ExcelEntry;

            if (numColunas >= 11) {
              // Formato com 11 colunas (coluna 6 vazia)
              const documento = String(row[1] || '');
              let historico = String(row[2] || '').trim();

              // Se histórico está undefined/vazio e é o mesmo documento, usar o histórico anterior
              if ((!historico || historico === 'undefined') && documento === lastDocumento && lastHistorico) {
                historico = lastHistorico;
              }

              entry = {
                data: parseExcelDate(row[0]),
                documento: documento,
                historico: historico,
                status: String(row[3] || ''),
                classificacaoFinanceira: String(row[4] || '').replace(/\s+/g, ''),
                codigoCentroCusto: String(row[5] || ''),
                valorDebito: row[7] ? Number(row[7]) : null,
                valorCredito: row[8] ? Number(row[8]) : null,
                saldo: Number(row[9] || 0),
                simbolo: (row[10] === 'D' || row[10] === 'C') ? row[10] : 'D',
              };

              // Atualizar último histórico e documento válidos
              if (historico && historico !== 'undefined') {
                lastHistorico = historico;
              }
              if (documento) {
                lastDocumento = documento;
              }
            } else {
              // Formato com 10 colunas (formato original)
              const documento = String(row[1] || '');
              let historico = String(row[2] || '').trim();

              // Se histórico está undefined/vazio e é o mesmo documento, usar o histórico anterior
              if ((!historico || historico === 'undefined') && documento === lastDocumento && lastHistorico) {
                historico = lastHistorico;
              }

              entry = {
                data: parseExcelDate(row[0]),
                documento: documento,
                historico: historico,
                status: String(row[3] || ''),
                classificacaoFinanceira: String(row[4] || '').replace(/\s+/g, ''),
                codigoCentroCusto: String(row[5] || ''),
                valorDebito: row[6] ? Number(row[6]) : null,
                valorCredito: row[7] ? Number(row[7]) : null,
                saldo: Number(row[8] || 0),
                simbolo: (row[9] === 'D' || row[9] === 'C') ? row[9] : 'D',
              };

              // Atualizar último histórico e documento válidos
              if (historico && historico !== 'undefined') {
                lastHistorico = historico;
              }
              if (documento) {
                lastDocumento = documento;
              }
            }

            entries.push(entry);
          } catch (error) {
            console.warn(`Erro ao processar linha ${i + 1}:`, error);
          }
        }

        resolve(entries);
      } catch (error) {
        reject(new Error(`Erro ao ler arquivo Excel: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsBinaryString(file);
  });
}

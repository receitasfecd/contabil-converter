import * as XLSX from 'xlsx';
import { ExcelEntry } from '../types/Entry';
import { parseExcelDate } from '../utils/formatters';

// Função para fazer parsing de valores numéricos do Excel
// Os valores do Excel Nasajon já vêm como números corretos (ex: 3150 = R$ 3.150,00)
// NÃO devemos dividir por 100 - a análise do formato de célula (w="3,150.00") confirma
function parseBrazilianNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Se já é número, retornar diretamente sem nenhuma transformação
  if (typeof value === 'number') {
    return value;
  }

  // Se é string, fazer parsing brasileiro
  if (typeof value === 'string') {
    // Remover espaços
    let cleaned = value.trim();

    // Remover pontos (separador de milhar)
    cleaned = cleaned.replace(/\./g, '');

    // Trocar vírgula por ponto (separador decimal)
    cleaned = cleaned.replace(',', '.');

    // Converter para número
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  return null;
}

// Função para corrigir históricos que vêm com espaços indevidos do Excel (artefatos de exportação)
// Ex: "FI NANCEIRA" -> "FINANCEIRA", "LUC HM" -> "LUCHM"
function healHistorico(text: string): string {
  if (!text) return '';
  
  let healed = text;

  // 1. Corrigir palavras específicas do domínio que são frequentemente cortadas por limites de coluna
  const commonWords = [
    'FINANCEIRA', 'APLICACAO', 'APLICAÇÃO', 'PAGAMENTO', 'COBRANCA', 'COBRANÇA', 
    'TRANSFERENCIA', 'TRANSFERÊNCIA', 'HISTORICO', 'HISTÓRICO', 'REFERENTE', 
    'VENCIMENTO', 'LIQUIDACAO', 'LIQUIDAÇÃO', 'RENDIMENTO', 'LUCHM', 'PASSAGEM', 
    'AEREA', 'SERVICOS', 'SERVIÇOS', 'MENSAL', 'SOLICITADO', 'JANEIRO', 'FEVEREIRO',
    'MARCO', 'MARÇO', 'ABRIL', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO',
    'NOVEMBRO', 'DEZEMBRO', 'FUNDACAO', 'FUNDAÇÃO', 'CONFORME', 'PROJETOS', 'CIENTIFICO'
  ];

  commonWords.forEach(word => {
    // Tenta unir a palavra se ela estiver separada por um espaço
    // Começamos de i=1 para pegar casos como "F INANCEIRA"
    for (let i = 1; i < word.length; i++) {
      const p1 = word.substring(0, i);
      const p2 = word.substring(i);
      // Usar a palavra exata com limite de palavra (\b) pode ser perigoso se estiver no meio
      // Mas aqui queremos pegar exatamente o corte.
      // O regex procura p1 seguido de um ou mais espaços seguido de p2
      const regex = new RegExp(`${p1}\\s+${p2}`, 'gi');
      healed = healed.replace(regex, word);
    }
  });

  // 2. Corrigir preposições e artigos cortados (D O -> DO, D A -> DA, D E -> DE)
  healed = healed.replace(/\b(D)\s+(O|A|E)\b/gi, '$1$2');
  healed = healed.replace(/\b(N)\s+(O|A)\b/gi, '$1$2');

  // 3. Corrigir datas cortadas (ex: 2 8/08/2024 -> 28/08/2024)
  healed = healed.replace(/(\d)\s+(\d\/\d\d\/\d\d\d\d)/g, '$1$2');

  // 4. Limpar espaços duplos resultantes
  healed = healed.replace(/\s\s+/g, ' ');

  return healed.trim();
}

// Função para sanitizar os dados do Excel validando com o saldo linha a linha
// Usa o saldo do Excel (que tem casas decimais corretas) como referência
function sanitizeExcelData(entries: ExcelEntry[]): ExcelEntry[] {
  console.log('🔧 Iniciando validação de saldo linha a linha...');
  
  let saldoCalculado: number | null = null;
  let erros = 0;
  let acertos = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const saldoExcel = entry.saldo;
    const simbolo = entry.simbolo; // D = Devedor, C = Credor
    
    // O saldo no Excel tem sinal determinado pelo símbolo D/C
    // D = saldo devedor (banco deve), C = saldo credor (banco tem dinheiro)
    // Para conta bancária de ativo: C = positivo, D = negativo
    const saldoComSinal = simbolo === 'D' ? -saldoExcel : saldoExcel;

    if (saldoCalculado === null) {
      // Primeiro lançamento: definir saldo inicial a partir do Excel

      saldoCalculado = saldoComSinal;
      console.log(`🔧 Linha ${i}: Saldo inicial definido como ${saldoCalculado.toFixed(2)} (Excel: ${saldoExcel}, símbolo: ${simbolo})`);
      acertos++;
      continue;
    }

    // Calcular saldo esperado com base no lançamento
    let saldoEsperado = saldoCalculado;
    if (entry.valorDebito) {
      saldoEsperado -= entry.valorDebito; // Débito = saída
    }
    if (entry.valorCredito) {
      saldoEsperado += entry.valorCredito; // Crédito = entrada
    }

    const diff = Math.abs(saldoEsperado - saldoComSinal);
    
    if (diff < 0.02) {
      acertos++;
      saldoCalculado = saldoComSinal;
    } else {
      erros++;
      if (erros <= 20) {
        console.warn(`⚠️ Linha ${i}: Saldo divergente! Calculado: ${saldoEsperado.toFixed(2)}, Excel: ${saldoComSinal.toFixed(2)}, Diff: ${diff.toFixed(2)}, Deb: ${entry.valorDebito}, Cred: ${entry.valorCredito}`);
      }
      // Seguir com saldo do Excel como referência para não acumular erro
      saldoCalculado = saldoComSinal;
    }
  }

  console.log(`🔧 Validação concluída: ${acertos} acertos, ${erros} divergências de ${entries.length} lançamentos`);
  return entries;
}

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

          // Verificar se a linha parece ter uma data válida
          const isDate = (val: any) => {
            if (!val) return false;
            // Se for número (serial do Excel), verificar se está num range plausível
            if (typeof val === 'number') return val > 30000 && val < 60000;
            if (typeof val === 'string') {
              const str = val.trim();
              return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(str);
            }
            return false;
          };

          // Verificar se a linha possui algum valor financeiro (colunas 6, 7, 8 ou 9)
          const hasValue = row[6] || row[7] || row[8] || row[9];
          const hasDate = isDate(row[0]);

          // Nova lógica de decisão:
          // 1. Se tem data OU tem valor, é um novo lançamento (ou uma nova perna de um lançamento)
          if (hasDate || hasValue) {
            if (currentRow) {
              mergedData.push(currentRow);
            }
            currentRow = [...row];
            
            // Se não tem data mas tem valor, herda a data da linha anterior
            if (!hasDate && mergedData.length > 0) {
              currentRow[0] = mergedData[mergedData.length - 1][0];
            }
          } 
          // 2. Se não tem nada (nem data nem valor) mas temos um lançamento em aberto, mescla as informações
          else if (currentRow) {
            // Mesclar dados da linha quebrada na linha atual (apenas o que estiver faltando)
            // Geralmente é o histórico que cai para a linha de baixo
            for (let j = 0; j < row.length; j++) {
              if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
                // Se a célula atual está vazia, preencher com o valor da linha quebrada
                if (!currentRow[j] || currentRow[j] === '' || currentRow[j] === 'undefined') {
                  currentRow[j] = row[j];
                } else if (j === 2) {
                  // Coluna 2 é o histórico - concatenar sem adicionar espaço extra
                  currentRow[j] = String(currentRow[j]) + String(row[j]);
                }
              }
            }
          }
        }

        // Adicionar última linha
        if (currentRow) {
          mergedData.push(currentRow);
        }

        console.log('📋 Total de linhas após mesclagem:', mergedData.length);
        console.log('📋 Primeiras 3 linhas mescladas:', mergedData.slice(0, 3));

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

            if (numColunas >= 12) {
              // Formato com 12 colunas (com coluna TIPO)
              const documento = String(row[1] || '');
              let historico = String(row[2] || '').trim();

              if ((!historico || historico === 'undefined') && documento === lastDocumento && lastHistorico) {
                historico = lastHistorico;
              }

              // Ler coluna TIPO (coluna 6)
              const tipoRaw = String(row[6] || '').toUpperCase().trim();
              let tipo: 'TAXA' | 'TRANSFERENCIA' | 'FINANCEIRO' | undefined;
              if (tipoRaw === 'TAXA' || tipoRaw === 'TRANSFERENCIA' || tipoRaw === 'FINANCEIRO') {
                tipo = tipoRaw;
              }

              if (i < 10) {
                console.log(`📋 Linha ${i} - Data: ${row[0]}, TIPO: ${tipo}, Histórico: ${String(row[2] || '').substring(0, 50)}`);
              }

              let valorDebito = parseBrazilianNumber(row[7]);
              let valorCredito = parseBrazilianNumber(row[8]);
              let saldo = parseBrazilianNumber(row[9]) || 0;

              entry = {
                data: parseExcelDate(row[0]),
                documento: documento,
                historico: healHistorico(historico),
                status: String(row[3] || ''),
                classificacaoFinanceira: String(row[4] || '').replace(/\s+/g, ''),
                codigoCentroCusto: String(row[5] || ''),
                tipo: tipo,
                valorDebito: valorDebito,
                valorCredito: valorCredito,
                saldo: saldo,
                simbolo: (row[10] === 'D' || row[10] === 'C') ? row[10] : 'D',
              };

              if (historico && historico !== 'undefined') {
                lastHistorico = historico;
              }
              if (documento) {
                lastDocumento = documento;
              }
            } else if (numColunas >= 11) {
              // Formato com 11 colunas (coluna 6 vazia)
              const documento = String(row[1] || '');
              let historico = String(row[2] || '').trim();

              // Se histórico está undefined/vazio e é o mesmo documento, usar o histórico anterior
              if ((!historico || historico === 'undefined') && documento === lastDocumento && lastHistorico) {
                historico = lastHistorico;
              }

              // Log dos valores brutos para debug
              if (i < 10) {
                console.log(`📋 Linha ${i} - Data: ${row[0]}, Valores brutos:`, {
                  valorDebito: row[7],
                  valorDebitoType: typeof row[7],
                  valorCredito: row[8],
                  valorCreditoType: typeof row[8],
                  saldo: row[9],
                  saldoType: typeof row[9],
                  historico: String(row[2] || '').substring(0, 50)
                });
              }

              // Fazer parsing dos valores
              let valorDebito = parseBrazilianNumber(row[7]);
              let valorCredito = parseBrazilianNumber(row[8]);
              let saldo = parseBrazilianNumber(row[9]) || 0;

              entry = {
                data: parseExcelDate(row[0]),
                documento: documento,
                historico: healHistorico(historico),
                status: String(row[3] || ''),
                classificacaoFinanceira: String(row[4] || '').replace(/\s+/g, ''),
                codigoCentroCusto: String(row[5] || ''),
                valorDebito: valorDebito,
                valorCredito: valorCredito,
                saldo: saldo,
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
                historico: healHistorico(historico),
                status: String(row[3] || ''),
                classificacaoFinanceira: String(row[4] || '').replace(/\s+/g, ''),
                codigoCentroCusto: String(row[5] || ''),
                valorDebito: parseBrazilianNumber(row[6]),
                valorCredito: parseBrazilianNumber(row[7]),
                saldo: parseBrazilianNumber(row[8]) || 0,
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

        console.log('📋 Total de entries processadas:', entries.length);
        console.log('📋 Primeiras 3 entries:', entries.slice(0, 3));
        console.log('📋 Primeira entry - saldo:', entries[0]?.saldo);

        // Sanitizar dados antes de retornar
        const sanitizedEntries = sanitizeExcelData(entries);

        resolve(sanitizedEntries);
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

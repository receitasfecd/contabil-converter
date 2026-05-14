const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function limparValor(v) {
  if (v === null || v === undefined || v === '') return 0.0;
  if (typeof v === 'number') return parseFloat(v);
  
  let vStr = String(v).replace('R$', '').replace(/\s/g, '').trim();
  if (!vStr) return 0.0;
  
  if (vStr.includes(',')) {
    vStr = vStr.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(vStr);
  return isNaN(num) ? 0.0 : num;
}

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'number') {
    // Numero de dias Excel a partir de 1900
    const date = new Date(Math.round((d - 25569) * 86400 * 1000));
    // Compensar fuso se der drift de 1 dia na hora
    date.setUTCHours(12);
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  }
  return String(d).trim();
}

function isValidDate(d) {
  if (!d) return false;
  if (typeof d === 'number') return true; // Serial date Excel
  const s = String(d).trim();
  // Regex simples dd/mm/yyyy
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

function convertFile(inputPath) {
  const fileExt = path.extname(inputPath).toLowerCase();
  const outputPath = inputPath.replace(fileExt, '.csv');
  
  console.log(`Lendo: ${path.basename(inputPath)}...`);
  
  try {
    const workbook = XLSX.readFile(inputPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Ler sem header, matriz pura
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
    
    const linhas_mescladas = [];
    let linha_atual = null;
    
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const col_A = row[0];
        
        if (isValidDate(col_A)) {
            if (linha_atual) linhas_mescladas.push(linha_atual);
            linha_atual = [...row];
            // Garante 11 posições
            while (linha_atual.length < 11) linha_atual.push(null);
        } else {
            // Linha CONTINUAÇÃO (sem data na Col A)
            if (linha_atual !== null) {
                // 1. Descrição/Histórico (Col 2 - index 2)
                const historico_extra = String(row[2] || '').trim();
                const atual_hist = String(linha_atual[2] || '').trim();
                if (historico_extra && historico_extra !== 'undefined' && historico_extra !== 'null') {
                     linha_atual[2] = atual_hist ? `${atual_hist} ${historico_extra}` : historico_extra;
                }
                
                // 2. Documento (Col 1 - index 1) se não tiver na principal
                if (row[1] && (!linha_atual[1] || linha_atual[1] === "")) {
                     linha_atual[1] = row[1];
                }
                
                // 3. Classificação Financeira (Col 4 - index 4) se não tiver
                if (row[4] && (!linha_atual[4] || linha_atual[4] === "")) {
                     linha_atual[4] = row[4];
                }
                
                // 4. Centro de Custo (Col 5 - index 5) se não tiver
                if (row[5] && (!linha_atual[5] || linha_atual[5] === "")) {
                     linha_atual[5] = row[5];
                }

                // 5. Status de Conciliação (Col 3)
                if (row[3] && (!linha_atual[3] || linha_atual[3] === "")) {
                    linha_atual[3] = row[3];
                }
            }
        }
    }
    
    if (linha_atual) linhas_mescladas.push(linha_atual);
    
    const registros_validos = [];
    
    for (const row of linhas_mescladas) {
        let rawDate = row[0];
        const data = formatDate(rawDate);
        if (!data) continue;
        
        const documento = String(row[1] || '').trim();
        const historico = String(row[2] || '').trim();
        const info_conciliado = String(row[3] || '').trim().toLowerCase();
        const classif_financeira = String(row[4] || '').replace(/\s+/g, '');
        const centro_custo = String(row[5] || '').trim();
        
        const despesa = limparValor(row[7]); // H (Vem do Nasajon como number raw se tiver sortudo)
        const receita = limparValor(row[8]); // I
        const saldo = limparValor(row[9]);
        const sinal_saldo = String(row[10] || '').trim().toUpperCase();
        
        // Exige algo preenchido
        if (!classif_financeira && !historico) continue;
        
        // Apenas Lançamentos Conciliados
        if (!info_conciliado || info_conciliado === 'não' || info_conciliado === 'nao' || info_conciliado === 'n' || info_conciliado === 'cancelado') {
             continue;
        }
        
        let tipo = "OUTROS";
        let valor = 0.0;
        
        if (despesa > 0) {
            tipo = "DESPESA";
            valor = despesa;
        } else if (receita > 0) {
            tipo = "RECEITA";
            valor = receita;
        }
        
        registros_validos.push({
            Data: data,
            Documento: documento,
            Historico: historico,
            Classificacao: classif_financeira,
            CentroCusto: centro_custo,
            Tipo: tipo,
            Valor: valor.toFixed(2),
            SaldoFinal: saldo.toFixed(2),
            SinalSaldo: sinal_saldo
        });
    }
    
    if (registros_validos.length === 0) {
         console.log(`- ${path.basename(inputPath)} não gerou registros conciliados.`);
         return;
    }
    
    // Gerar CSV com ponto e vírgula
    const header = ['Data', 'Documento', 'Historico', 'Classificacao', 'CentroCusto', 'Tipo', 'Valor', 'SaldoFinal', 'SinalSaldo'];
    const csvContent = [];
    csvContent.push('\uFEFF' + header.join(';')); // Bom pra Excel
    
    for (const r of registros_validos) {
        const line = header.map(h => r[h] !== undefined ? String(r[h]).replace(/;/g, ',').replace(/\n|\r/g, ' ') : '').join(';');
        csvContent.push(line);
    }
    
    fs.writeFileSync(outputPath, csvContent.join('\n'), 'utf8');
    console.log(`- CSV gerado: ${path.basename(outputPath)} (${registros_validos.length} linhas válidas)`);
  } catch (err) {
      console.error(`X Erro no arquivo ${inputPath}:`, err.message);
  }
}

// Rodar em Lote na pasta
const folderPath = process.argv[2];
if (!folderPath) {
    console.log("Forneça a pasta. Exemplo: node nasajon_cleaner.js \"C:\\pasta\\\"");
    process.exit(1);
}

const files = fs.readdirSync(folderPath);
for (const file of files) {
    if (file.toLowerCase().endsWith('.xls') || file.toLowerCase().endsWith('.xlsx')) {
        const fullPath = path.join(folderPath, file);
        convertFile(fullPath);
    }
}

// Debug: Analisar formato real das células do Excel
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'CONTAS PARA TESTE 2024', 'CONTAS PARA TESTE 2024', '14288-1.xls');
console.log('📂 Arquivo:', filePath);

const workbook = XLSX.read(require('fs').readFileSync(filePath), { type: 'buffer', cellStyles: true, cellNF: true });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log('\n📊 Planilha:', sheetName);

// Olhar o range
const range = XLSX.utils.decode_range(worksheet['!ref']);
console.log('📊 Range:', worksheet['!ref'], '→ Linhas:', range.s.r, 'a', range.e.r, ', Colunas:', range.s.c, 'a', range.e.c);

// Verificar as primeiras 20 linhas, focando nas colunas de valor (7, 8, 9 para formato 11 colunas)
console.log('\n=== ANÁLISE DETALHADA DAS CÉLULAS DE VALOR ===\n');

for (let row = 0; row <= Math.min(20, range.e.r); row++) {
  // Verificar se a linha tem data
  const cellA = worksheet[XLSX.utils.encode_cell({r: row, c: 0})];
  if (!cellA) continue;

  const linha = `Linha ${row}`;
  
  // Colunas de débito, crédito e saldo (para 11 colunas: 7, 8, 9)
  const colNames = ['Col 6', 'Col 7 (Deb)', 'Col 8 (Cred)', 'Col 9 (Saldo)', 'Col 10 (Simb)'];
  const cols = [6, 7, 8, 9, 10];
  
  let info = `${linha} - Data: ${cellA.v}`;
  
  for (let ci = 0; ci < cols.length; ci++) {
    const cell = worksheet[XLSX.utils.encode_cell({r: row, c: cols[ci]})];
    if (cell) {
      info += `\n  ${colNames[ci]}: value=${cell.v}, type=${cell.t}, format="${cell.z || 'none'}", w="${cell.w || 'none'}"`;
    }
  }
  
  console.log(info);
  console.log('---');
}

// Agora vamos comparar os dados brutos do sheet_to_json com os dados das células
console.log('\n=== COMPARAÇÃO sheet_to_json vs CÉLULA ===\n');

const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Encontrar a linha 7 que é problemática (valor 3150)
for (let i = 0; i < Math.min(20, jsonData.length); i++) {
  const row = jsonData[i];
  if (!row || row.length === 0 || !row[0]) continue;
  
  const numCols = row.length;
  
  // Identificar colunas de valor baseado no número de colunas
  let debCol, credCol, saldoCol;
  if (numCols >= 11) {
    debCol = 7; credCol = 8; saldoCol = 9;
  } else {
    debCol = 6; credCol = 7; saldoCol = 8;
  }
  
  const deb = row[debCol];
  const cred = row[credCol];
  const saldo = row[saldoCol];
  
  if (deb !== undefined || cred !== undefined) {
    console.log(`Linha ${i} (${numCols} cols):`);
    if (deb !== undefined) console.log(`  Débito:  value=${deb}, type=${typeof deb}, isInt=${Number.isInteger(deb)}`);
    if (cred !== undefined) console.log(`  Crédito: value=${cred}, type=${typeof cred}, isInt=${Number.isInteger(cred)}`);
    if (saldo !== undefined) console.log(`  Saldo:   value=${saldo}, type=${typeof saldo}`);
    
    // Pegar célula original para ver formato
    const debCell = worksheet[XLSX.utils.encode_cell({r: i, c: debCol})];
    const credCell = worksheet[XLSX.utils.encode_cell({r: i, c: credCol})];
    const saldoCell = worksheet[XLSX.utils.encode_cell({r: i, c: saldoCol})];
    
    if (debCell) console.log(`  Débito  (célula): v=${debCell.v}, t=${debCell.t}, z="${debCell.z || ''}", w="${debCell.w || ''}"`);
    if (credCell) console.log(`  Crédito (célula): v=${credCell.v}, t=${credCell.t}, z="${credCell.z || ''}", w="${credCell.w || ''}"`);
    if (saldoCell) console.log(`  Saldo   (célula): v=${saldoCell.v}, t=${saldoCell.t}, z="${saldoCell.z || ''}", w="${saldoCell.w || ''}"`);
    console.log('---');
  }
}

// Verificar TODOS os valores inteiros > 1000 e compará-los com saldo
console.log('\n=== VALORES INTEIROS > 1000 vs SALDO ===\n');

let prevSaldo = null;
let countCorrectDivide = 0;
let countCorrectKeep = 0;
let countAmbiguous = 0;

for (let i = 0; i < jsonData.length; i++) {
  const row = jsonData[i];
  if (!row || row.length === 0 || !row[0]) continue;
  
  const numCols = row.length;
  let debCol, credCol, saldoCol;
  if (numCols >= 11) {
    debCol = 7; credCol = 8; saldoCol = 9;
  } else {
    debCol = 6; credCol = 7; saldoCol = 8;
  }
  
  const deb = row[debCol];
  const cred = row[credCol];
  const saldo = row[saldoCol];
  
  if (saldo === undefined || typeof saldo !== 'number') {
    prevSaldo = null;
    continue;
  }
  
  // Verificar se débito ou crédito são inteiros > 1000
  const checkValue = (val, label) => {
    if (val !== undefined && typeof val === 'number' && val > 1000 && val % 1 === 0) {
      if (prevSaldo !== null) {
        // Testar com valor original vs valor/100
        const diffOriginal = Math.abs((prevSaldo + (label === 'Cred' ? val : -val)) - saldo);
        const diffDivided = Math.abs((prevSaldo + (label === 'Cred' ? val/100 : -val/100)) - saldo);
        
        const shouldDivide = diffDivided < diffOriginal;
        
        if (diffOriginal < 0.02) {
          countCorrectKeep++;
          console.log(`Linha ${i} ${label}: ${val} → MANTER (diff original: ${diffOriginal.toFixed(2)}, diff /100: ${diffDivided.toFixed(2)})`);
        } else if (diffDivided < 0.02) {
          countCorrectDivide++;
          console.log(`Linha ${i} ${label}: ${val} → DIVIDIR por 100 = ${val/100} (diff original: ${diffOriginal.toFixed(2)}, diff /100: ${diffDivided.toFixed(2)})`);
        } else {
          countAmbiguous++;
          console.log(`Linha ${i} ${label}: ${val} → AMBÍGUO (diff original: ${diffOriginal.toFixed(2)}, diff /100: ${diffDivided.toFixed(2)}) saldoAnterior=${prevSaldo}, saldoAtual=${saldo}`);
        }
      }
    }
  };
  
  checkValue(deb, 'Deb');
  checkValue(cred, 'Cred');
  
  prevSaldo = saldo;
}

console.log(`\n📊 RESUMO:`);
console.log(`  Manter original: ${countCorrectKeep}`);
console.log(`  Dividir por 100: ${countCorrectDivide}`);
console.log(`  Ambíguos: ${countAmbiguous}`);

// Verificar formato das células para ver se podemos usar o z (number format)
console.log('\n=== FORMATOS DE NÚMERO ENCONTRADOS ===\n');
const formats = new Set();
for (let row = 0; row <= range.e.r; row++) {
  for (let col = 6; col <= 9; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({r: row, c: col})];
    if (cell && cell.t === 'n') {
      const fmt = cell.z || 'none';
      if (!formats.has(fmt)) {
        formats.add(fmt);
        console.log(`Formato: "${fmt}" (ex: célula ${XLSX.utils.encode_cell({r: row, c: col})}, valor=${cell.v}, w="${cell.w || ''}")`);
      }
    }
  }
}

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ler os dois arquivos
const ccPath = path.join(__dirname, '..', 'NASAJON Contas Correntes.xls');
const appPath = path.join(__dirname, '..', 'NASAJON Contas de Aplicação.xls');

const ccWorkbook = XLSX.readFile(ccPath);
const appWorkbook = XLSX.readFile(appPath);

const ccSheet = ccWorkbook.Sheets[ccWorkbook.SheetNames[0]];
const appSheet = appWorkbook.Sheets[appWorkbook.SheetNames[0]];

const contasCorrentes = XLSX.utils.sheet_to_json(ccSheet);
const aplicacoes = XLSX.utils.sheet_to_json(appSheet);

console.log('📊 Contas Correntes:', contasCorrentes.length);
console.log('📊 Aplicações:', aplicacoes.length);

// Processar contas
const processarConta = (row, tipo) => {
  try {
    const contaCompleta = row['Conta'];
    const banco = row['Banco'];

    if (!contaCompleta || !banco) {
      return null;
    }

    // Extrair número da conta
    // Formato: "99835-7 - FECD CE ANATO (ITAU)" ou "14340-0 A - FECD PROFS ANA PAULA"
    // Formato especial: "21.098-6A - FECD CRISTAL PM APLICAÇAO" (com ponto e letra junto ao dígito)
    let match = contaCompleta.match(/^([\d.]+)-(\d)([A-Z]\d?)?(\s+([A-Z]\d?))?/);

    if (!match) {
      console.log(`⚠️  Formato não reconhecido: ${contaCompleta}`);
      return null;
    }

    const numeroBase = match[1].replace(/\./g, ''); // Remover pontos
    const digito = match[2];
    const numeroConta = numeroBase + digito;
    // Tipo aplicação pode estar junto ao dígito (6A) ou separado (0 A)
    const tipoAplicacao = match[3] || match[5] ? (match[3] || match[5]).trim() : null;

    // Extrair descrição
    const descricaoMatch = contaCompleta.match(/^[\d.-]+([A-Z]\d?)?\s*-\s*(.+)$/);
    const descricao = descricaoMatch ? descricaoMatch[2].trim() : '';

    // Determinar banco
    let bancoCode = null;
    if (banco.toLowerCase().includes('itau') || banco.toLowerCase().includes('itaú')) {
      bancoCode = 'ITAU';
    } else if (banco.toLowerCase().includes('brasil')) {
      bancoCode = 'BB';
    }

    // Validar tipo
    if (tipo === 'CC' && tipoAplicacao) {
      console.log(`⚠️  Conta corrente com tipo aplicação: ${contaCompleta}`);
    }
    if (tipo === 'APP' && !tipoAplicacao) {
      console.log(`⚠️  Aplicação sem tipo: ${contaCompleta}`);
    }

    return {
      numeroConta,
      codigoContabil: tipo === 'CC' ? '11020106' : '11020107',
      descricao,
      tipoAplicacao: tipo === 'APP' ? (tipoAplicacao || 'A') : null,
      banco: bancoCode,
      tipo: tipo, // CC ou APP
      contaOriginal: contaCompleta
    };

  } catch (error) {
    console.log(`❌ Erro ao processar:`, error.message);
    return null;
  }
};

// Processar todas as contas
const todasContas = [];

contasCorrentes.forEach(row => {
  const conta = processarConta(row, 'CC');
  if (conta) todasContas.push(conta);
});

aplicacoes.forEach(row => {
  const conta = processarConta(row, 'APP');
  if (conta) todasContas.push(conta);
});

console.log(`\n✅ Total processado: ${todasContas.length}`);

// Estatísticas
const porTipo = {
  CC: todasContas.filter(c => c.tipo === 'CC').length,
  APP: todasContas.filter(c => c.tipo === 'APP').length
};

const porBanco = {
  BB: todasContas.filter(c => c.banco === 'BB').length,
  ITAU: todasContas.filter(c => c.banco === 'ITAU').length,
  SEM_BANCO: todasContas.filter(c => !c.banco).length
};

console.log(`\n📊 Por Tipo:`);
console.log(`   Contas Correntes: ${porTipo.CC}`);
console.log(`   Aplicações: ${porTipo.APP}`);

console.log(`\n📊 Por Banco:`);
console.log(`   BB: ${porBanco.BB}`);
console.log(`   ITAU: ${porBanco.ITAU}`);
console.log(`   Sem banco: ${porBanco.SEM_BANCO}`);

// Salvar resultado
const outputPath = path.join(__dirname, '..', 'contas-nasajon-processadas.json');
fs.writeFileSync(outputPath, JSON.stringify(todasContas, null, 2));

console.log(`\n💾 Arquivo salvo em: ${outputPath}`);

// Mostrar exemplos
console.log(`\n📋 Exemplos de Contas Correntes:`);
console.log(JSON.stringify(todasContas.filter(c => c.tipo === 'CC').slice(0, 5), null, 2));

console.log(`\n📋 Exemplos de Aplicações:`);
console.log(JSON.stringify(todasContas.filter(c => c.tipo === 'APP').slice(0, 5), null, 2));

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

const contasBancarias = [];
const aplicacoesPorConta = {}; // Contador de aplicações por número de conta

// Identificar grupos de aplicação (códigos que começam com 1105 ou 1106)
const GRUPOS_APLICACAO = ['11050', '11060']; // Prefixos dos grupos de aplicação

// Primeira passagem: identificar todas as contas e suas aplicações
const contasTemp = [];

for (let i = 0; i < data.length; i++) {
  const row = data[i];

  if (!row || row.length < 2) continue;

  const codigo = String(row[0]).trim();
  const nome = String(row[1]).trim();

  // Filtrar apenas contas bancárias (códigos com 8 dígitos e que contenham "C/C" no nome)
  if (codigo.length >= 8 && nome.includes('C/C')) {

    // Extrair número da conta do nome
    // Formato: "BANCO XXX C/C 12.345-6 - DESCRICAO"
    const matchConta = nome.match(/C\/C\s+([\d\.\-]+)/);
    const numeroConta = matchConta ? matchConta[1].replace(/[\.\-]/g, '') : codigo;

    // Extrair descrição (tudo após o número da conta)
    const matchDescricao = nome.match(/C\/C\s+[\d\.\-]+\s*-?\s*(.+)/);
    const descricao = matchDescricao ? matchDescricao[1].trim() : nome;

    // Verificar se está em grupo de aplicação (código começa com 11050 ou 11060)
    const isAplicacao = GRUPOS_APLICACAO.some(grupo => codigo.startsWith(grupo));

    contasTemp.push({
      id: `conta-${i}`,
      tipo: 'CONTA_BANCARIA',
      numeroConta: numeroConta,
      codigoContabil: codigo,
      descricao: descricao,
      isAplicacao: isAplicacao,
      nomeCompleto: nome
    });
  }
}

// Segunda passagem: contar aplicações por número de conta
for (const conta of contasTemp) {
  if (conta.isAplicacao) {
    if (!aplicacoesPorConta[conta.numeroConta]) {
      aplicacoesPorConta[conta.numeroConta] = 0;
    }
    aplicacoesPorConta[conta.numeroConta]++;
  }
}

// Terceira passagem: atribuir tipos de aplicação
const contadorAplicacoes = {}; // Contador atual por número de conta

for (const conta of contasTemp) {
  let tipoAplicacao = null;

  if (conta.isAplicacao) {
    // Inicializar contador se não existir
    if (!contadorAplicacoes[conta.numeroConta]) {
      contadorAplicacoes[conta.numeroConta] = 0;
    }

    contadorAplicacoes[conta.numeroConta]++;
    const numeroAplicacao = contadorAplicacoes[conta.numeroConta];

    // Atribuir tipo baseado no número
    if (numeroAplicacao === 1) {
      tipoAplicacao = 'A';
    } else if (numeroAplicacao === 2) {
      tipoAplicacao = 'A2';
    } else if (numeroAplicacao === 3) {
      tipoAplicacao = 'A3';
    } else {
      tipoAplicacao = `A${numeroAplicacao}`;
    }
  }

  contasBancarias.push({
    id: conta.id,
    tipo: conta.tipo,
    numeroConta: conta.numeroConta,
    codigoContabil: conta.codigoContabil,
    descricao: conta.descricao,
    tipoAplicacao: tipoAplicacao
  });
}

// Criar estrutura do store
const store = {
  contasBancarias: contasBancarias
};

// Salvar como JSON
const outputPath = path.join(__dirname, 'contas-bancarias-importar.json');
fs.writeFileSync(outputPath, JSON.stringify(store, null, 2), 'utf-8');

console.log('✓ Contas bancárias processadas com sucesso!');
console.log(`  - ${contasBancarias.length} contas bancárias identificadas`);
console.log(`  - ${contasBancarias.filter(c => c.tipoAplicacao).length} aplicações identificadas`);

// Mostrar estatísticas de aplicações por conta
console.log('\n📊 Aplicações por número de conta:');
console.log('=====================================');
const contasComMultiplasAplicacoes = Object.entries(aplicacoesPorConta)
  .filter(([_, count]) => count > 1)
  .sort((a, b) => b[1] - a[1]);

if (contasComMultiplasAplicacoes.length > 0) {
  console.log(`\nContas com múltiplas aplicações: ${contasComMultiplasAplicacoes.length}`);
  contasComMultiplasAplicacoes.slice(0, 10).forEach(([numeroConta, count]) => {
    console.log(`\nConta ${numeroConta}: ${count} aplicações`);

    // Mostrar as aplicações desta conta
    const aplicacoesDaConta = contasBancarias.filter(
      c => c.numeroConta === numeroConta && c.tipoAplicacao
    );
    aplicacoesDaConta.forEach(app => {
      console.log(`  - ${app.tipoAplicacao}: ${app.descricao}`);
    });
  });
}

console.log(`\n✓ Arquivo salvo em: ${outputPath}`);
console.log('\nPara usar no aplicativo:');
console.log('1. Abra http://localhost:5174');
console.log('2. Vá em "Mapeamento" → Aba "Contas Bancárias"');
console.log('3. Clique em "Importar"');
console.log('4. Selecione o arquivo: contas-bancarias-importar.json');

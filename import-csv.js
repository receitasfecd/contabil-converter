const fs = require('fs');
const path = require('path');

// Ler o arquivo CSV
const csvPath = 'C:\\Users\\jhona\\Downloads\\DE _PARA.csv';
const csvContent = fs.readFileSync(csvPath, 'latin1');

// Processar linhas
const lines = csvContent.split('\n');
const classificacoes = [];

// Pular cabeçalho (linha 0)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Separar por ponto e vírgula
  const parts = line.split(';');

  if (parts.length >= 4) {
    const codigo = parts[1].trim();
    const descricao = parts[2].trim();
    const contaContabil = parts[3].trim();

    if (codigo && contaContabil) {
      classificacoes.push({
        id: `import-${i}`,
        tipo: 'CLASSIFICACAO',
        classificacaoFinanceira: codigo,
        classificacaoContabil: contaContabil,
        descricao: descricao
      });
    }
  }
}

// Criar estrutura do store
const store = {
  classificacoes: classificacoes,
  contasBancarias: [],
  lastExportPath: '',
  preferences: {
    autoSave: true,
    validateOnImport: true
  }
};

// Salvar como JSON
const outputPath = path.join(__dirname, 'mapeamentos-importados.json');
fs.writeFileSync(outputPath, JSON.stringify(store, null, 2), 'utf-8');

console.log(`✓ ${classificacoes.length} classificações importadas com sucesso!`);
console.log(`✓ Arquivo salvo em: ${outputPath}`);
console.log('\nPara usar no aplicativo:');
console.log('1. Abra http://localhost:5173');
console.log('2. Vá em "Mapeamento"');
console.log('3. Clique em "Importar"');
console.log('4. Selecione o arquivo: mapeamentos-importados.json');

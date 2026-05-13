import Papa from 'papaparse';
import fs from 'fs';

// Ler o arquivo CSV
const csvContent = fs.readFileSync('C:\\Users\\jhona\\Downloads\\DE _PARA.csv', 'utf-8');

// Parse do CSV
const result = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  encoding: 'latin1'
});

// Processar os dados
const classificacoes = result.data.map((row: any, index: number) => ({
  id: `import-${index}`,
  tipo: 'CLASSIFICACAO',
  classificacaoFinanceira: row['Código'] || row['C�digo'] || '',
  classificacaoContabil: row['Conta Contábil'] || row['Conta Cont�bil'] || '',
  descricao: row['Descrição'] || row['Descri��o'] || ''
})).filter((item: any) => item.classificacaoFinanceira && item.classificacaoContabil);

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
fs.writeFileSync(
  'C:\\Users\\jhona\\contabil-converter\\mapeamentos-importados.json',
  JSON.stringify(store, null, 2),
  'utf-8'
);

console.log(`${classificacoes.length} classificações importadas com sucesso!`);

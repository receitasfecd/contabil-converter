const fs = require('fs');
const path = require('path');

// Ler o arquivo CSV do plano de contas
const csvPath = 'C:\\Users\\jhona\\Downloads\\Plano de Contas 2024.csv';
const csvContent = fs.readFileSync(csvPath, 'latin1');

// Processar linhas
const lines = csvContent.split('\n');
const planoContas = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Separar por ponto e vírgula
  const parts = line.split(';');

  if (parts.length >= 3) {
    const codigo = parts[0].trim();
    const nome = parts[1].replace(/^"|"$/g, '').trim(); // Remover aspas
    const idInterno = parts[2].trim();

    if (codigo && nome) {
      // Determinar nível hierárquico pelo tamanho do código
      const nivel = Math.floor(codigo.length / 2);

      planoContas.push({
        id: `plano-${i}`,
        codigo: codigo,
        nome: nome,
        idInterno: idInterno,
        nivel: nivel,
        tipo: 'PLANO_CONTAS'
      });
    }
  }
}

// Criar estrutura do store
const store = {
  planoContas: planoContas
};

// Salvar como JSON
const outputPath = path.join(__dirname, 'plano-contas-2024.json');
fs.writeFileSync(outputPath, JSON.stringify(store, null, 2), 'utf-8');

console.log(`✓ ${planoContas.length} contas do plano de contas importadas com sucesso!`);
console.log(`✓ Arquivo salvo em: ${outputPath}`);
console.log('\nEstrutura hierárquica:');
console.log(`  - Nível 1 (Grupos): ${planoContas.filter(c => c.nivel === 1).length}`);
console.log(`  - Nível 2 (Subgrupos): ${planoContas.filter(c => c.nivel === 2).length}`);
console.log(`  - Nível 3+: ${planoContas.filter(c => c.nivel >= 3).length}`);

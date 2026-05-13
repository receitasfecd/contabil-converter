import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Connection string do Supabase (você precisa pegar isso no Dashboard)
// Settings > Database > Connection string > URI
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function executeSqlFile(filename) {
  const sqlPath = path.join(process.cwd(), filename);

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Arquivo não encontrado: ${filename}`);
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`📝 Executando: ${filename}\n`);
  console.log(sql);
  console.log('\n---\n');

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(sql);
    console.log('✅ SQL executado com sucesso!');
    if (result.rows && result.rows.length > 0) {
      console.log('Resultado:', result.rows);
    }
  } catch (err) {
    console.error('❌ Erro ao executar SQL:', err.message);
  } finally {
    await client.end();
  }
}

// Pegar nome do arquivo da linha de comando
const filename = process.argv[2];

if (!filename) {
  console.error('❌ Uso: node exec-sql.mjs <arquivo.sql>');
  process.exit(1);
}

executeSqlFile(filename);

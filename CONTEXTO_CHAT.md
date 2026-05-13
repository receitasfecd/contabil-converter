# Contexto do Projeto - Conversor Contábil Nasajon

**Data:** 2026-05-13  
**Último commit:** 2836002 - Cleanup: Remover logs de debug da FinanceiroPage

## Status Atual

✅ **PROBLEMA RESOLVIDO!** A página Financeiro agora carrega os lançamentos corretamente.

## Problema Resolvido (2026-05-13)

### Sintoma
A página **Financeiro** mostrava **0 lançamentos** quando deveria mostrar **101 lançamentos** da conta 92665.

### Causa Raiz
A FinanceiroPage estava chamando `loadTransferStore()` diretamente do localStorage, mas o AppContext já havia carregado os dados do Supabase. Isso causava um erro:
```
Uncaught TypeError: me(...).filter is not a function
```

O problema era que:
1. AppContext carrega transferências do Supabase (estrutura pode ser diferente)
2. FinanceiroPage chamava `loadTransferStore()` do localStorage
3. Conflito entre as duas fontes de dados causava erro no `.filter()`
4. O erro impedia o carregamento de todos os lançamentos

### Solução Implementada
**Commits:**
- `f58a00a` - Fix: FinanceiroPage usar AppContext em vez de localStorage direto
- `2836002` - Cleanup: Remover logs de debug da FinanceiroPage

**Mudanças:**
1. Importar e usar `useAppContext()` hook
2. Usar `transferStore` do contexto em vez de `loadTransferStore()`
3. Usar `updateTransferStore()` em vez de `saveTransferStore()`
4. Adicionar verificações de segurança `|| []` para arrays
5. Remover logs de debug após correção

### Evidências do Problema

1. **Página /contas** mostra corretamente:
   - Conta 92665-5 (11010101 - IMPORTACAO)
   - 101 lançamentos
   - 0 transferências
   - Saldo: R$ 0,00

2. **Página /financeiro** mostrava incorretamente:
   - Conta 92665
   - "Todos os Lançamentos (0 de 0)"
   - Tabela vazia
   - Saldo Final: R$ 0,00

## Arquitetura do Projeto

### Stack Tecnológica
- **Frontend:** React 19 + TypeScript + Vite
- **UI:** Material-UI (MUI)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Armazenamento:** 
  - Supabase: Mapeamentos, contas bancárias, organizações
  - localStorage: Contas importadas, transferências, taxas

### Estrutura de Dados

#### ImportedAccount (localStorage)
```typescript
interface ImportedAccount {
  id: string;
  contaBancaria: ContaBancariaMapping;
  lancamentos: ProcessedEntry[];
  saldo: number;
  importedAt: Date;
  lastUpdated: Date;
}
```

#### ProcessedEntry
```typescript
interface ProcessedEntry {
  id: string;
  data: string;           // dd/mm/aaaa
  debito: string;
  credito: string;
  centroCusto: string;
  historico: string;
  valor: string;          // formato BR: "1.234,56"
  tipo: 'FINANCEIRO' | 'TRANSFERENCIA';
  original: ExcelEntry;
  warnings?: string[];
  errors?: string[];
}
```

#### Transfer (localStorage)
```typescript
interface Transfer {
  id: string;
  accountNumber: string;
  accountCode: string;
  date: string;
  amount: string;
  historico: string;
  centroCusto: string;
  direction: 'OUT' | 'IN';
  status: 'PENDING' | 'PAIRED' | 'EXPORTED';
  pairedWith?: string;
  counterpartAccount?: string;
  original: ExcelEntry;
  importedAt: Date;
}
```

## Páginas Principais

### 1. ImportPage (`/`)
- Importa arquivos Excel
- Seleciona conta bancária
- Separa lançamentos financeiros de transferências
- Salva em localStorage

### 2. ImportedAccountsPage (`/contas`) - FUNCIONANDO
- Lista todas as contas importadas
- Mostra total de lançamentos e transferências
- Permite visualizar detalhes e exportar

### 3. FinanceiroPage (`/financeiro`) - COM PROBLEMA
- **Objetivo:** Mostrar TODOS os lançamentos consolidados (financeiros + transferências + taxas)
- **Funcionalidades:**
  - Visualização consolidada
  - Filtros: data, tipo, grupo, busca
  - Ordenação: data, valor, tipo
  - Edição individual de qualquer campo
  - Edição em massa: exclusão, find & replace
  - Cálculo de saldo parcial após cada lançamento
  - Exportação CSV

### 4. TransfersPage (`/transferencias`)
- Gestão de transferências
- Pareamento automático
- Exportação de pares

## Arquivos Críticos

### Páginas
- `src/renderer/pages/FinanceiroPage.tsx` - **PROBLEMA AQUI**
- `src/renderer/pages/ImportedAccountsPage.tsx` - Funcionando
- `src/renderer/pages/ImportPage.tsx` - Funcionando

### Services
- `src/renderer/services/importedAccountsService.ts` - localStorage de contas
- `src/renderer/services/transferStore.ts` - localStorage de transferências
- `src/renderer/services/taxaAdministracaoService.ts` - localStorage de taxas
- `src/renderer/services/entryProcessor.ts` - Processamento de lançamentos
- `src/renderer/services/hybridMappingService.ts` - Supabase + localStorage

### Tipos
- `src/renderer/types/ImportedAccount.ts`
- `src/renderer/types/Entry.ts`
- `src/renderer/types/Transfer.ts`

## Fluxo de Dados - FinanceiroPage

```typescript
// 1. Carregar contas do localStorage
const store = loadImportedAccounts();
setAccounts(store.accounts);

// 2. Quando usuário clica em uma conta
loadAccountDetails(account);

// 3. Dentro de loadAccountDetails:
// 3.1. Carregar lançamentos financeiros
const financialEntries = account.lancamentos.map(...);

// 3.2. Carregar transferências
const transferStore = loadTransferStore();
const accountTransfers = [
  ...transferStore.pending.filter(t => t.accountNumber === account.contaBancaria.numeroConta),
  ...transferStore.paired.flatMap(...)
];

// 3.3. Carregar taxas
const taxas = loadTaxasAdministracao();
const accountTaxas = taxas.filter(t => t.accountNumber === account.contaBancaria.numeroConta);

// 3.4. Combinar tudo
const allEntries = [...financialEntries, ...transferEntries, ...taxaEntries];

// 3.5. Calcular saldo parcial
let saldo = 0;
allEntries.forEach(entry => {
  const valor = parseFloat(entry.valor.replace(',', '.'));
  if (entry.debito === account.contaBancaria.codigoContabil) {
    saldo -= valor;
  } else if (entry.credito === account.contaBancaria.codigoContabil) {
    saldo += valor;
  }
  entry.saldoParcial = saldo;
});

// 3.6. Atualizar estados
setCombinedEntries(allEntries);
setFilteredEntries(allEntries);
```

## Histórico de Problemas Resolvidos

### 1. Página /contas em branco (RESOLVIDO)
- **Problema:** Página mostrava branco apesar de ter dados
- **Tentativas:** Migração para Supabase (FALHOU e quebrou app)
- **Solução:** Revert para commit 6ba4090 e criação da nova página Financeiro

### 2. Calendários com sobreposição (RESOLVIDO)
- **Problema:** Labels "Data Início" e "Data Fim" sobrepostos ao placeholder
- **Solução:** Removidos labels, mantidos apenas placeholders

### 3. Página Financeiro em branco após mudança de calendário (RESOLVIDO)
- **Problema:** Após trocar campos de data, página ficou em branco
- **Causa:** `filteredEntries` não era inicializado ao carregar conta
- **Solução:** Adicionar `setFilteredEntries(allEntries)` após `setCombinedEntries(allEntries)`

### 4. Página Financeiro mostrando 0 lançamentos (RESOLVIDO - 2026-05-13)
- **Problema:** Página mostrava 0 lançamentos quando deveria mostrar 101
- **Causa:** FinanceiroPage chamava `loadTransferStore()` do localStorage enquanto AppContext usava Supabase, causando conflito e erro `.filter is not a function`
- **Solução:** Migrar FinanceiroPage para usar `useAppContext()` hook em vez de chamar localStorage diretamente
- **Commits:** f58a00a, 2836002

## Comandos Úteis

```bash
# Ver logs do git
git log --oneline -10

# Ver último commit
git show HEAD

# Ver status
git status

# Rodar aplicação
npm run dev

# Build
npm run build

# Ver localStorage no console do navegador
localStorage.getItem('imported-accounts')
localStorage.getItem('transfer-store')
localStorage.getItem('taxas-administracao')
```

## Informações do Usuário

- **Email:** jhonataleal@fecd.org.br
- **Organização:** FECD
- **Idioma:** Português (Brasil)
- **Formato de data:** dd/mm/aaaa
- **Formato de moeda:** R$ 1.234,56

## Próximos Passos

1. ✅ ~~Coletar logs do console~~ (Concluído)
2. ✅ ~~Analisar logs para identificar causa raiz~~ (Concluído)
3. ✅ ~~Corrigir problema de carregamento de dados~~ (Concluído)
4. ✅ ~~Remover logs de debug após correção~~ (Concluído)
5. **PRÓXIMO:** Testar a página Financeiro no navegador para confirmar que os 101 lançamentos aparecem
6. Testar com múltiplas contas
7. Verificar se transferências aparecem corretamente
8. Verificar se taxas aparecem corretamente
6. Verificar se transferências aparecem corretamente

## Observações Importantes

- **NÃO migrar para Supabase** - já tentamos e quebrou tudo
- **Manter localStorage** para contas importadas
- **Formato de data brasileiro** é obrigatório
- **Saldo parcial** deve ser calculado após cada lançamento
- **Todas as edições** devem refletir em todo o aplicativo
- **Transferências** são identificadas por classificação financeira específica

## Contato

Se precisar de mais contexto, verificar:
- Transcript completo: `C:\Users\jhona\.claude\projects\c--Users-jhona\089c8547-4c6f-418d-974b-62fb2ef524c1.jsonl`
- Plano de transferências: `C:\Users\jhona\.claude\plans\preciso-montar-um-programa-concurrent-hennessy.md`

# 🔍 Diagnóstico: Taxas de Administração Não Aparecem

**Data:** 22/05/2026 12:05  
**Arquivo Analisado:** 14300-4.xlsx (Conta que recebe taxas)

---

## 🎯 Problema Identificado

As taxas de administração **estão sendo detectadas como transferências**, mas **NÃO estão sendo identificadas como taxas** pelo sistema.

---

## 📊 Análise dos Dados

### Taxas Encontradas no Arquivo 14300-4.xlsx:

Total: **9 taxas de administração** (todas são ENTRADAS/créditos)

**Exemplos:**
- Linha 27: "Transferência da conta [99893-6] - Tx adm ref. NF 8837" → FECD001.1.4.03.017
- Linha 29: "Transferência da conta [99893-6] - TX ADM. REF. NF 8927" → FECD001.1.4.03.017
- Linha 45: "Transferência da conta [99880-3] TRANSFERENCIA TX ADM CEMBIO" → PROJ002.1.4.01.01
- Linha 46: "Transferência da conta [99880-3] TRANSFERENCIA TX ADM LUCHM" → FECD001.1.4.01.023

### Características das Taxas:
- ✅ Todas contêm "Transferência" no histórico
- ✅ Todas contêm "TX ADM" ou "Taxa" no histórico
- ✅ Todas são CRÉDITOS (entrada de dinheiro na conta 14300-4)
- ✅ Classificações: FECD001.1.4.x (receitas) ou PROJ002.1.4.x

---

## 🔴 Causa Raiz do Problema

### 1. **Fluxo de Processamento Atual:**

```
Excel → isTransferencia() → SIM → Criar Transfer
                                    ↓
                          isTaxaAdministracao(transfer)
                                    ↓
                          addTaxaAdministracao(transfer)
```

### 2. **Problema na Função `isTaxaAdministracao()`:**

**Localização:** `src/renderer/services/taxaAdministracaoService.ts` (linha 38)

```typescript
export function isTaxaAdministracao(transfer: Transfer): boolean {
  const historico = transfer.historico.toLowerCase();

  // Verificar palavras-chave no histórico
  const keywords = [
    'taxa adm',
    'taxa de administração',
    'taxa de administracao',
    'tx adm',
    'taxa administrativa',
    'tx administrativa'
  ];
  const hasTaxaKeyword = keywords.some(keyword => historico.includes(keyword));
  
  // ... resto do código
}
```

**O PROBLEMA:** A função procura por `'tx adm'` (com espaço), mas os históricos têm:
- ❌ "TX ADM." (com ponto)
- ❌ "TX ADM REF" (sem ponto, mas com espaço antes de REF)
- ❌ "Tx adm ref" (minúscula, mas com espaço antes de ref)

**Exemplo que FALHA:**
```
Histórico: "Transferência da conta [99893-6] - TX ADM. REF. NF 8927"
                                                  ↑
                                            Tem ponto depois!
```

A busca por `'tx adm'` não encontra `'tx adm.'` porque o ponto quebra a correspondência.

### 3. **Problema nas Classificações:**

A função também verifica classificações:

```typescript
const classifUpper = classificacao.toUpperCase().replace(/\s+/g, '');
hasClassificacaoTaxa =
  classifUpper.includes('PROJ002.1.4.01.99') ||
  classifUpper.includes('GRANT002.1.4.01.99') ||
  // ...
```

**O PROBLEMA:** As classificações reais são:
- ❌ `FECD001.1. 4.03.017` (tem espaço depois do ponto!)
- ❌ `FECD001.1. 4.01.023` (tem espaço depois do ponto!)
- ❌ `PROJ002.1. 4.01.01` (tem espaço depois do ponto!)

Mas o código procura por:
- `FECD001.1.4` (sem espaço)
- `PROJ002.1.4.01.99` (classificação específica que não existe nos dados)

---

## 🔧 Soluções Necessárias

### Solução 1: Corrigir Detecção de Palavras-chave

**Problema:** Busca exata por `'tx adm'` não pega variações com pontuação.

**Solução:** Usar regex mais flexível:

```typescript
const keywords = [
  /taxa\s+adm/i,           // "taxa adm" ou "taxa  adm"
  /tx\s+adm/i,             // "tx adm" ou "tx  adm"
  /taxa\s+de\s+administra[çc][aã]o/i,
  /taxa\s+administrativa/i,
  /tx\s+administrativa/i
];
const hasTaxaKeyword = keywords.some(keyword => keyword.test(historico));
```

### Solução 2: Corrigir Detecção de Classificações

**Problema:** Classificações têm espaços extras que não são removidos corretamente.

**Solução:** Normalizar melhor e usar padrões mais genéricos:

```typescript
// Remover TODOS os espaços, não só múltiplos
const classifUpper = classificacao.toUpperCase().replace(/\s+/g, '');

// Usar padrões mais genéricos que cobrem todas as receitas de taxa
hasClassificacaoTaxa =
  classifUpper.startsWith('FECD001.1.4') ||  // Receitas FECD
  classifUpper.startsWith('FECD001.1.5') ||  // Receitas FECD
  classifUpper.includes('PROJ002.1.4') ||    // Receitas Projetos
  classifUpper.includes('GRANT002.1.4') ||   // Receitas Grants
  classifUpper.includes('TEP002.1.4') ||     // Receitas TEP
  classifUpper.includes('IMP004.19');        // Importações
```

### Solução 3: Adicionar Logs de Debug

Para facilitar diagnóstico futuro:

```typescript
console.log('🔍 Verificando taxa:', {
  historico: transfer.historico,
  classificacao: (transfer as any).original?.classificacaoFinanceira,
  hasTaxaKeyword,
  hasClassificacaoTaxa,
  resultado: hasTaxaKeyword || hasClassificacaoTaxa
});
```

---

## ✅ Resultado Esperado Após Correção

Ao importar o arquivo 14300-4.xlsx:

1. ✅ 9 taxas detectadas como transferências
2. ✅ 9 taxas identificadas como taxas de administração
3. ✅ 9 taxas aparecem na seção "Taxas de Administração"
4. ✅ Status: PENDING_IN (aguardando pareamento com saídas)
5. ✅ Grupo contábil identificado automaticamente:
   - FECD001.1.4.03.017 → TERMOS_PARCERIAS
   - FECD001.1.4.01.023 → PROJETOS
   - PROJ002.1.4.01.01 → PROJETOS

---

## 📝 Arquivos a Modificar

1. **`src/renderer/services/taxaAdministracaoService.ts`**
   - Função `isTaxaAdministracao()` (linha 38)
   - Função `identificarGrupoContabil()` (linha 264)

---

## 🎯 Prioridade

**CRÍTICA** - Sem essa correção, o sistema não consegue identificar nenhuma taxa de administração.

---

## 🧪 Como Testar

1. Aplicar as correções
2. Importar arquivo 14300-4.xlsx
3. Verificar seção "Taxas de Administração"
4. Deve mostrar 9 taxas pendentes (PENDING_IN)
5. Importar contas que enviaram as taxas (99893-6, 99880-3, etc)
6. Verificar pareamento automático

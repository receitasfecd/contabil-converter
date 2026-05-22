# 📋 SOLUÇÃO DEFINITIVA - Coluna TIPO no Excel

## 🎯 Problema
O sistema não está conseguindo detectar automaticamente as taxas de administração, mesmo com todas as melhorias no código de detecção.

## ✅ Solução Simples
Adicionar uma nova coluna no arquivo Excel exportado do Nasajon chamada **"TIPO"** que indica explicitamente o tipo de lançamento.

---

## 📊 Como Modificar o Arquivo Excel

### Passo 1: Adicionar Coluna TIPO
Adicione uma nova coluna após a coluna de "Centro de Custo" (coluna F) com o nome **"TIPO"**

### Passo 2: Preencher os Valores
Para cada linha, preencha a coluna TIPO com um dos seguintes valores:

| Valor | Quando Usar |
|-------|-------------|
| `TAXA` | Taxas de administração (recebimentos na conta 14300-4) |
| `TRANSFERENCIA` | Transferências entre contas, aplicações, resgates |
| `FINANCEIRO` | Despesas e receitas normais |

### Exemplo de Estrutura:

```
Data       | Doc  | Histórico              | Status | Classif | Centro | TIPO          | Débito | Crédito | Saldo
01/01/2024 | 1234 | TX ADM REF NF 8837    | Pago   | FECD... | 001    | TAXA          |        | 3150.00 | 3150.00
02/01/2024 | 1235 | Transferência conta X  | Pago   | FECD... | 001    | TRANSFERENCIA |        | 5000.00 | 8150.00
03/01/2024 | 1236 | Pagamento fornecedor   | Pago   | FECD... | 001    | FINANCEIRO    | 1200.00|         | 6950.00
```

---

## 🔧 Modificações no Código

### 1. Adicionar campo `tipo` no ExcelEntry
```typescript
export interface ExcelEntry {
  data: Date;
  documento: string;
  historico: string;
  status: string;
  classificacaoFinanceira: string;
  codigoCentroCusto: string;
  tipo?: 'TAXA' | 'TRANSFERENCIA' | 'FINANCEIRO'; // NOVO CAMPO
  valorDebito: number | null;
  valorCredito: number | null;
  saldo: number;
  simbolo: 'D' | 'C';
}
```

### 2. Modificar excelParser.ts para ler a coluna TIPO
```typescript
// Na linha ~270, adicionar:
tipo: String(row[6] || '').toUpperCase() as 'TAXA' | 'TRANSFERENCIA' | 'FINANCEIRO',
valorDebito: parseBrazilianNumber(row[7]),  // Agora é coluna 7
valorCredito: parseBrazilianNumber(row[8]), // Agora é coluna 8
saldo: parseBrazilianNumber(row[9]) || 0,   // Agora é coluna 9
simbolo: (row[10] === 'D' || row[10] === 'C') ? row[10] : 'D', // Agora é coluna 10
```

### 3. Modificar entryProcessor.ts para usar o campo tipo
```typescript
// No início da função processEntriesWithTransferSeparation:
for (const entry of entries) {
  try {
    // PRIORIDADE 1: Se tem campo TIPO explícito, usar ele
    if (entry.tipo === 'TAXA') {
      const taxa: Transfer = {
        id: crypto.randomUUID(),
        accountNumber: contaBancaria.numeroConta,
        accountCode: contaBancaria.codigoContabil,
        date: formatDate(entry.data),
        amount: formatCurrency(entry.valorDebito || entry.valorCredito!),
        historico: entry.historico,
        centroCusto: entry.codigoCentroCusto,
        direction: entry.valorDebito ? 'OUT' : 'IN',
        status: 'PENDING',
        original: entry,
        importedAt: new Date()
      };
      
      addTaxaAdministracao(taxa);
      transfers.push(taxa);
      continue; // Pular para próxima entrada
    }
    
    if (entry.tipo === 'TRANSFERENCIA') {
      // Processar como transferência
      const transfer = processTransferencia(entry, contaBancaria.codigoContabil);
      transfers.push(transfer);
      continue;
    }
    
    // Se tipo === 'FINANCEIRO' ou não tem tipo, usar lógica atual
    // ... resto do código
  }
}
```

---

## 🚀 Vantagens desta Solução

1. ✅ **100% de precisão** - Não depende de detecção automática
2. ✅ **Controle total** - Você decide o que é cada lançamento
3. ✅ **Fácil de implementar** - Apenas uma coluna extra no Excel
4. ✅ **Retrocompatível** - Se não tiver a coluna, usa a detecção automática
5. ✅ **Flexível** - Pode corrigir erros de classificação facilmente

---

## 📝 Alternativa: Usar Fórmula no Excel

Se quiser automatizar o preenchimento da coluna TIPO no Excel, pode usar uma fórmula:

```excel
=SE(
  OU(
    ÉNÚM(PROCURAR("TX ADM";C2));
    ÉNÚM(PROCURAR("TAXA ADM";C2));
    E(G2="14300-4";H2>0)
  );
  "TAXA";
  SE(
    OU(
      ÉNÚM(PROCURAR("TRANSFERENCIA";C2));
      ÉNÚM(PROCURAR("APLICACAO";C2));
      ÉNÚM(PROCURAR("RESGATE";C2))
    );
    "TRANSFERENCIA";
    "FINANCEIRO"
  )
)
```

Onde:
- C2 = Coluna do Histórico
- G2 = Coluna da Conta
- H2 = Coluna do Crédito

---

## 🎯 Próximos Passos

1. Adicionar a coluna TIPO no arquivo Excel
2. Preencher manualmente ou com fórmula
3. Modificar o código conforme acima
4. Testar importação
5. Verificar que as taxas aparecem corretamente

**Quer que eu implemente essas modificações no código agora?**

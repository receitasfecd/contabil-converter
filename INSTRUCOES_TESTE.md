# 🔧 INSTRUÇÕES PASSO A PASSO - Limpar Cache e Testar

## PASSO 1: LIMPAR CACHE DO NAVEGADOR

### Opção A - Hard Refresh (MAIS RÁPIDO)
1. Abra o aplicativo no navegador
2. Pressione **Ctrl + Shift + R** (Windows) ou **Cmd + Shift + R** (Mac)
3. Aguarde a página recarregar completamente

### Opção B - Limpar Cache Completo
1. Pressione **Ctrl + Shift + Delete**
2. Marque apenas "Imagens e arquivos em cache"
3. Período: "Última hora"
4. Clique em "Limpar dados"
5. Recarregue a página (F5)

---

## PASSO 2: VERIFICAR SE FUNCIONOU

### ✅ Você deve ver:
- **Canto inferior esquerdo da tela:** texto "Versão 0.1"

### ❌ Se NÃO aparecer:
- O cache ainda não foi limpo
- Tente fechar TODAS as abas do aplicativo
- Feche o navegador completamente
- Abra novamente e acesse o aplicativo

---

## PASSO 3: PREPARAR O ARQUIVO EXCEL

### Estrutura CORRETA das colunas:

```
A       B        C           D      E              F       G      H        I         J       K
Data    Doc      Histórico   Status Classif        Centro  TIPO   Débito   Crédito   Saldo   Símb
01/01   1234     TX ADM...   Pago   FECD001.1.4    001     TAXA            3150.00   3150    C
02/01   1235     Transfer... Pago   FECD...        001     TRANS           5000.00   8150    C
03/01   1236     Pagamento   Pago   FECD...        001     FINAN  1200.00           6950    D
```

### Valores aceitos na coluna G (TIPO):
- `TAXA` - para taxas de administração
- `TRANSFERENCIA` ou `TRANS` - para transferências
- `FINANCEIRO` ou `FINAN` - para despesas/receitas

**IMPORTANTE:** 
- A coluna TIPO deve estar na posição G (7ª coluna)
- Não adicione linha de cabeçalho
- Apenas preencha os valores nas linhas de dados

---

## PASSO 4: IMPORTAR E VERIFICAR

1. Faça login no aplicativo
2. Vá em "Importar Conta"
3. Selecione o arquivo Excel com a coluna TIPO
4. **ANTES de clicar em "Processar":**
   - Pressione F12 para abrir o Console
   - Clique na aba "Console"
5. Clique em "Processar"
6. **Procure no Console por:**
   - `🏷️ TIPO EXPLÍCITO: TAXA detectada`
   - `💾 Taxa adicionada à store com ID: xxx`

---

## PASSO 5: VERIFICAR RESULTADO

1. Vá para a página "Taxas de Administração"
2. As taxas devem aparecer na lista

---

## 🆘 SE AINDA NÃO FUNCIONAR:

Tire 3 prints e me envie:

1. **Print do canto inferior esquerdo** - para ver se mostra "Versão 0.1"
2. **Print do Console (F12)** - após importar o arquivo
3. **Print da planilha Excel** - mostrando as colunas A até K

Com esses prints eu consigo diagnosticar exatamente o que está acontecendo.

---

**Data/Hora desta instrução:** 22/05/2026 14:20
**Commit em produção:** adf4bd0
**Status do deploy:** READY ✅

# Guia Rápido - Conversor Contábil Nasajon

## Status do Projeto

✅ **Aplicação web totalmente funcional**
✅ **609 classificações importadas do DE_PARA.csv**
✅ **Servidor rodando em http://localhost:5173**

## Início Rápido

### 1. Importar Mapeamentos

1. Abra http://localhost:5173 no navegador
2. Clique em **"Mapeamento"** no menu lateral
3. Clique no botão **"Importar"**
4. Selecione o arquivo: `mapeamentos-importados.json`
5. Confirme a importação

✅ Agora você tem 609 classificações cadastradas!

### 2. Cadastrar Contas Bancárias

Ainda na página de Mapeamento:

1. Clique na aba **"Contas Bancárias"**
2. Clique em **"Adicionar Conta Bancária"**
3. Preencha:
   - **Número da Conta**: Ex: 12345
   - **Código Contábil**: Ex: 1.01.01.001
   - **Tipo Aplicação**: A, A2, A3 (opcional)
   - **Descrição**: Nome da conta (opcional)
4. Clique em **"Salvar"**

Repita para cada conta bancária que você processar.

### 3. Processar Lançamentos

1. Vá para **"Importar"** no menu
2. Clique em **"Escolher Arquivo Excel"**
3. Selecione seu arquivo Excel (sem cabeçalho)
4. Selecione a **conta bancária** correspondente
5. Clique em **"Processar"**

### 4. Revisar e Exportar

Na tela de Preview:

- ✅ **Verde**: Lançamento OK
- ⚠️ **Amarelo**: Aviso - revisar
- ❌ **Vermelho**: Erro - corrigir

**Ações**:
- Clique no ícone de **edição** para ajustar lançamentos
- Verifique as estatísticas no topo
- Clique em **"Exportar CSV"** quando estiver pronto

O arquivo será baixado como: `[numeroConta][sufixo].csv`

## Formato do Excel

Seu Excel deve ter as colunas **SEM cabeçalho** nesta ordem:

1. Data
2. Documento
3. Histórico
4. Status
5. Classificação Financeira
6. Código do Centro de Custo
7. Valor a Débito
8. Valor a Crédito
9. Saldo
10. Símbolo (D ou C)

## Regras de Processamento

### Registros Financeiros
- **Despesa** (Débito preenchido):
  - Débito = Classificação Contábil
  - Crédito = Conta Bancária

- **Receita** (Crédito preenchido):
  - Débito = Conta Bancária
  - Crédito = Classificação Contábil

### Transferências
Identificadas automaticamente por:
- Histórico: "Transferência da conta" ou "Transferência para conta"
- Documento: "RESG AUTOMATIC", "RESGATE", "RESGATE POUPANCA", etc.

**Processamento**: Contrapartida fica vazia (preencher no Nasajon)

## Comandos Úteis

```bash
# Iniciar servidor (se não estiver rodando)
cd C:\Users\jhona\contabil-converter
npm run dev

# Parar servidor
Ctrl + C no terminal

# Reimportar mapeamentos (se necessário)
node import-csv.js
```

## Arquivos Importantes

- `mapeamentos-importados.json` - 609 classificações do DE_PARA
- `README.md` - Documentação completa
- `import-csv.js` - Script de importação

## Dicas

1. **Backup**: Exporte seus mapeamentos regularmente (botão "Exportar" na página de Mapeamento)
2. **Validação**: Sempre revise a tela de Preview antes de exportar
3. **Erros**: Lançamentos com erro não permitem exportação - corrija antes
4. **Edição**: Você pode editar qualquer lançamento diretamente no Preview

## Próximos Passos

Para converter em aplicativo desktop (Electron):
- Resolver problema de inicialização do Electron
- Por enquanto, a versão web está 100% funcional

## Suporte

Problemas comuns:
- **Classificação não mapeada**: Adicione na página de Mapeamento
- **Conta não encontrada**: Cadastre a conta bancária primeiro
- **Erro no Excel**: Verifique se não tem cabeçalho e se as colunas estão na ordem correta

# Guia de Importação - Dados Completos

## 📥 Passo a Passo

### 1. Acesse o Aplicativo
Abra no navegador: **http://localhost:5174**

### 2. Importe os Dados

#### Opção A: Importar Tudo de Uma Vez (RECOMENDADO)

Primeiro, vou criar um arquivo completo com tudo:

**Arquivo**: `dados-completos-final.json`

Este arquivo contém:
- ✅ 609 classificações (De-Para)
- ✅ 272 contas bancárias
- ✅ 1.881 contas do plano

**Como importar**:
1. Vá em "Mapeamento"
2. Clique em "Importar" (canto superior direito)
3. Selecione: `C:\Users\jhona\contabil-converter\dados-completos-final.json`
4. Aguarde a confirmação

#### Opção B: Importar Separadamente

Se preferir importar em partes:

**1. Classificações + Plano de Contas**:
- Arquivo: `mapeamentos-completo.json`
- Contém: 609 classificações + 1.881 contas do plano

**2. Contas Bancárias**:
- Arquivo: `contas-bancarias-importar.json`
- Contém: 272 contas bancárias

### 3. Verificar Importação

Após importar, verifique cada aba:

**Aba "De-Para"**:
- Deve mostrar 609 classificações
- Com nomes das contas contábeis

**Aba "Contas Bancárias"**:
- Deve mostrar 272 contas
- Com descrições e tipos de aplicação

**Aba "Plano de Contas"**:
- Deve mostrar 1.881 contas
- Estrutura hierárquica

## 📊 Dados Processados

### Contas Bancárias
```
Total: 272 contas
Contas correntes: 169
Aplicações: 103
  - Tipo A: identificadas automaticamente
  - Tipo A2: segunda aplicação do grupo
  - Tipo A3: terceira aplicação do grupo
```

### Formato das Contas
```
Número: 310514
Código Contábil: 11010100
Descrição: PRINCIPAL
Tipo: Conta corrente

Número: 128609
Código Contábil: 11010102
Descrição: IMPORTACAO
Tipo: A (aplicação)
```

### Seletor de Contas (Atualizado)
Agora ao selecionar uma conta na importação, você verá:
```
310514 - 11010100 - PRINCIPAL
128609 - 11010102 (A) - IMPORTACAO
```

Isso facilita identificar o projeto/finalidade da conta!

## 🎯 Próximos Passos

Após importar os dados:

1. **Testar Importação**:
   - Vá em "Importar"
   - Escolha um Excel
   - Selecione uma conta (agora com descrição!)
   - Processe

2. **Revisar Preview**:
   - Verifique os lançamentos
   - Edite se necessário

3. **Exportar CSV**:
   - Baixe o arquivo
   - Importe no Nasajon

## 📁 Localização dos Arquivos

Todos os arquivos estão em:
```
C:\Users\jhona\contabil-converter\
```

**Arquivos disponíveis**:
- `dados-completos-final.json` (será criado)
- `mapeamentos-completo.json` (609 classificações + plano)
- `contas-bancarias-importar.json` (272 contas)
- `plano-contas-2024.json` (apenas plano)

## ✅ Checklist

- [ ] Servidor rodando em http://localhost:5174
- [ ] Importar dados completos
- [ ] Verificar aba "De-Para" (609 itens)
- [ ] Verificar aba "Contas Bancárias" (272 itens)
- [ ] Verificar aba "Plano de Contas" (1.881 itens)
- [ ] Testar seleção de conta com descrição
- [ ] Processar um Excel de teste

## 🎉 Pronto!

Após importar, você terá tudo configurado e pronto para processar seus lançamentos!

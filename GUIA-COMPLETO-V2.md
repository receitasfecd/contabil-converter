# Guia Completo - Conversor Contábil Nasajon v2.0

## ✨ Novidades da Versão 2.0

✅ **Plano de Contas Hierárquico** - 1.881 contas estruturadas
✅ **Visualização em Balancete** - Estrutura hierárquica completa
✅ **Nomes das Contas** - Classificações enriquecidas com nomes
✅ **3 Abas de Mapeamento** - De-Para, Contas Bancárias e Plano de Contas

## 🚀 Início Rápido

### 1. Importar Dados Completos

1. Abra http://localhost:5173
2. Vá em **"Mapeamento"**
3. Clique em **"Importar"**
4. Selecione: `mapeamentos-completo.json`

✅ Você terá:
- **609 classificações** (De-Para) com nomes das contas
- **1.881 contas** no Plano de Contas hierárquico
- Estrutura pronta para uso

### 2. Cadastrar Contas Bancárias

Na aba **"Contas Bancárias"**:
1. Clique em "Adicionar Conta Bancária"
2. Preencha:
   - Número da Conta
   - Código Contábil (use o Plano de Contas como referência)
   - Tipo Aplicação (opcional)
3. Salvar

### 3. Processar Lançamentos

1. **Importar** → Escolher Excel → Selecionar conta → Processar
2. **Preview** → Revisar lançamentos
3. **Exportar CSV** → Baixar arquivo para Nasajon

## 📊 Estrutura do Mapeamento

### Aba 1: De-Para (Classificações)

Mapeia classificações financeiras → contábeis

**Exemplo**:
```
Classificação Financeira: FECD001.1.1.03.01
Classificação Contábil: 45005013
Descrição: PASSAGENS NACIONAIS (DESPESAS ADMINISTRATIVAS)
```

**Funcionalidades**:
- ✅ Adicionar/Editar/Excluir classificações
- ✅ Buscar e filtrar
- ✅ Visualizar nome da conta contábil

### Aba 2: Contas Bancárias

Cadastro das contas que você processa

**Exemplo**:
```
Número da Conta: 12345
Código Contábil: 11010100
Tipo Aplicação: A
Descrição: Banco do Brasil - Principal
```

### Aba 3: Plano de Contas (NOVO!)

Visualização hierárquica do plano de contas

**Estrutura**:
```
1 - ATIVO
  11 - CIRCULANTE
    110 - CAIXA E EQUIVALENTES DE CAIXA
      11001 - CAIXINHA FECD- LIVRES
        11001001 - CAIXA PEQUENO - FECD
```

**Funcionalidades**:
- ✅ Visualização em árvore (expandir/recolher)
- ✅ 1.881 contas estruturadas
- ✅ Adicionar/Editar/Excluir contas
- ✅ Buscar por código ou nome
- ✅ Exportar/Importar plano de contas

**Níveis Hierárquicos**:
- Nível 1: Grupos principais (ATIVO, PASSIVO, etc)
- Nível 2: Subgrupos (CIRCULANTE, NÃO CIRCULANTE, etc)
- Nível 3+: Contas detalhadas

## 🔄 Fluxo Completo de Trabalho

### Passo 1: Configuração Inicial (uma vez)

```
1. Importar mapeamentos-completo.json
2. Cadastrar suas contas bancárias
3. Revisar classificações (se necessário)
```

### Passo 2: Processar Extratos (repetir para cada conta)

```
1. Importar Excel da conta
2. Sistema identifica:
   - Registros financeiros (despesas/receitas)
   - Transferências (automático)
3. Preview com validação
4. Editar se necessário
5. Exportar CSV
```

### Passo 3: Importar no Nasajon

```
1. Abrir Nasajon Contábil
2. Importar CSV gerado
3. Conferir lançamentos
```

## 📁 Arquivos Disponíveis

### Dados Completos
- `mapeamentos-completo.json` - **RECOMENDADO**
  - 609 classificações com nomes
  - 1.881 contas do plano
  - Pronto para uso

### Dados Separados (opcional)
- `mapeamentos-importados.json` - Apenas classificações
- `plano-contas-2024.json` - Apenas plano de contas

### Scripts Utilitários
- `import-csv.js` - Importar DE_PARA.csv
- `import-plano-contas.js` - Importar Plano de Contas 2024.csv
- `merge-dados.js` - Mesclar e enriquecer dados

## 🎯 Casos de Uso

### Caso 1: Adicionar Nova Classificação

1. Aba "De-Para" → "Adicionar Classificação"
2. Preencher:
   - Classificação Financeira (do seu sistema)
   - Classificação Contábil (consultar Plano de Contas)
   - Descrição (opcional)
3. Salvar

**Dica**: Use a aba "Plano de Contas" para encontrar o código correto

### Caso 2: Consultar Estrutura Contábil

1. Aba "Plano de Contas"
2. Navegar pela hierarquia
3. Expandir grupos para ver detalhes
4. Copiar código da conta desejada

### Caso 3: Exportar Configuração

1. Botão "Exportar" (topo da página)
2. Salva: `mapeamentos-completo.json`
3. Contém tudo: De-Para + Contas + Plano

**Útil para**:
- Backup
- Transferir para outro computador
- Compartilhar com equipe

## 🔍 Visualização em Balancete

A aba "Plano de Contas" mostra a estrutura contábil completa:

**Características**:
- ✅ Hierarquia visual com indentação
- ✅ Ícones de expandir/recolher
- ✅ Códigos e nomes completos
- ✅ Destaque para grupos principais (negrito)
- ✅ Rolagem para 1.881 contas

**Navegação**:
- Clique na seta para expandir/recolher
- Grupos principais em negrito
- Subcontas indentadas

## 📊 Estatísticas

**Dados Carregados**:
- 609 classificações financeiras → contábeis
- 1.881 contas no plano de contas
- 42 grupos principais (nível 1)
- 112 subgrupos (nível 2)
- 1.722 contas detalhadas (nível 3+)

## 🛠️ Manutenção

### Atualizar Plano de Contas

Se receber novo plano de contas:

```bash
# 1. Substituir arquivo
# Copiar novo "Plano de Contas 2024.csv" para Downloads

# 2. Reimportar
node import-plano-contas.js

# 3. Mesclar com dados existentes
node merge-dados.js

# 4. Importar no aplicativo
# Mapeamento → Importar → mapeamentos-completo.json
```

### Atualizar Classificações

Se receber novo DE_PARA:

```bash
# 1. Substituir arquivo
# Copiar novo "DE_PARA.csv" para Downloads

# 2. Reimportar
node import-csv.js

# 3. Mesclar
node merge-dados.js

# 4. Importar no aplicativo
```

## 💡 Dicas Avançadas

### Buscar Conta no Plano

1. Use Ctrl+F no navegador
2. Digite código ou nome da conta
3. Navegue pelos resultados

### Validar Classificações

1. Aba "De-Para"
2. Verificar se todas têm descrição
3. Descrição vazia = conta não encontrada no plano

### Organizar Contas Bancárias

Use descrições claras:
```
✅ Bom: "Banco do Brasil - Conta Principal"
❌ Ruim: "BB"
```

## 🚨 Solução de Problemas

**Problema**: Classificação sem nome
- **Causa**: Código contábil não existe no plano
- **Solução**: Verificar código ou adicionar no plano

**Problema**: Plano de contas não aparece
- **Causa**: Arquivo não importado
- **Solução**: Importar mapeamentos-completo.json

**Problema**: Hierarquia não expande
- **Causa**: Navegador não suporta
- **Solução**: Usar Chrome/Edge atualizado

## 📞 Comandos Úteis

```bash
# Iniciar aplicativo
npm run dev

# Recompilar
npm run build:renderer

# Reimportar dados
node merge-dados.js
```

## 🎉 Pronto para Usar!

Acesse: **http://localhost:5173**

Explore as 3 abas de Mapeamento e comece a processar seus lançamentos!

# Conversor Contábil para Nasajon

Sistema web para conversão de lançamentos contábeis do formato Excel para importação no sistema Nasajon.

## 🚀 Funcionalidades

- ✅ Importação de múltiplos arquivos Excel
- ✅ Mapeamento automático de classificações financeiras
- ✅ Gestão de transferências com pareamento automático
- ✅ Taxas de administração com lançamentos duplos
- ✅ Filtros por data para exportação seletiva
- ✅ Validação e bloqueio de lançamentos inválidos
- ✅ Edição completa de todos os lançamentos
- ✅ Geração de balancete contábil
- ✅ Interface moderna com Material-UI

## 🛠️ Tecnologias

- React 19 + TypeScript
- Material-UI (MUI)
- Vite
- React Router
- PapaParse (CSV)
- XLSX (Excel)

## 📦 Instalação e Uso Local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

Acesse: http://localhost:5173

### 2. Configurar Mapeamentos

Antes de importar lançamentos, configure:

**a) Contas Bancárias** (Menu: Mapeamento → Aba "Contas Bancárias")
- Clique em "Adicionar Conta Bancária"
- Preencha:
  - Número da Conta (ex: 12345)
  - Código Contábil (ex: 1.01.01.001)
  - Tipo Aplicação (opcional: A, A2, A3)
  - Descrição (opcional)

**b) Classificações Contábeis** (Menu: Mapeamento → Aba "Classificações Contábeis")
- Clique em "Adicionar Classificação"
- Preencha:
  - Classificação Financeira (deve corresponder ao Excel)
  - Classificação Contábil (código contábil de destino)
  - Descrição (opcional)

### 3. Importar Lançamentos

1. Vá para "Importar" no menu lateral
2. Clique em "Escolher Arquivo Excel"
3. Selecione a conta bancária correspondente
4. Clique em "Processar"

### 4. Revisar e Editar

Na tela de Preview:
- Verifique os lançamentos processados
- Indicadores de status:
  - 🟢 Verde (OK): Lançamento válido
  - 🟡 Amarelo (Aviso): Verificar
  - 🔴 Vermelho (Erro): Corrigir antes de exportar
- Clique no ícone de edição para ajustar qualquer lançamento
- Veja estatísticas: total de lançamentos, débitos, créditos

### 5. Exportar CSV

- Clique em "Exportar CSV"
- O arquivo será baixado como: `[numeroConta][sufixo].csv`
- Exemplo: `12345A.csv` para conta 12345 com aplicação tipo A

## Formato do Excel de Entrada

O arquivo Excel deve ter as colunas na seguinte ordem (SEM cabeçalho):

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
Identificadas por:
- Histórico contém: "Transferência da conta" ou "Transferência para conta"
- Documento contém: "RESG AUTOMATIC", "RESGATE", "RESGATE POUPANCA", "INT RESGATE TRUST DI", "INT APLICACAO"

Processamento:
- Contrapartida fica vazia (será preenchida no Nasajon)
- Apenas débito OU crédito é preenchido

## Formato do CSV de Saída

```csv
Data,Débito,Crédito,Centro de Custo,Histórico,Valor
01/01/2026,1.01.01.001,1.01.02.001,CC001,Pagamento fornecedor,"1.500,00"
```

- Data: dd/mm/aaaa
- Valor: formato brasileiro (vírgula decimal, sem R$)
- Encoding: UTF-8 com BOM

## Importar/Exportar Mapeamentos

Na página de Mapeamento:
- **Exportar**: Salva todos os mapeamentos em JSON
- **Importar**: Carrega mapeamentos de arquivo JSON

Útil para backup ou transferir configurações.

## Tecnologias

- **React 19** + **TypeScript**
- **Material-UI (MUI)** - Interface
- **Vite** - Build tool
- **xlsx** - Leitura de Excel
- **papaparse** - Geração de CSV
- **React Router** - Navegação

## Estrutura do Projeto

```
src/
├── renderer/
│   ├── pages/          # Telas principais
│   ├── services/       # Lógica de negócio
│   ├── types/          # Tipos TypeScript
│   ├── utils/          # Utilitários
│   ├── App.tsx         # Componente principal
│   └── theme.ts        # Tema Material-UI
└── main/               # Electron (em desenvolvimento)
```

## Observações

- Os dados são salvos no localStorage do navegador
- Para versão desktop com Electron, execute: `npm run build && npm start`
- A aplicação web funciona perfeitamente no navegador

## Próximos Passos

Para usar como aplicativo desktop:
1. Resolver problema de inicialização do Electron
2. Ou usar a versão web que está totalmente funcional

## Suporte

Para dúvidas ou problemas, verifique:
- Console do navegador (F12) para erros
- Validações na tela de Preview
- Mapeamentos cadastrados

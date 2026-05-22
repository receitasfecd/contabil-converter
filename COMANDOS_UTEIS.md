# 🚀 Comandos Úteis - Contabil Converter

**Última atualização:** 22/05/2026 11:53

---

## 📦 Instalação e Setup

```bash
# Instalar dependências
npm install

# Se houver problemas com bindings, reinstalar tudo
rm -rf node_modules package-lock.json
npm install
```

---

## 🛠️ Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:5173

# Build de produção
npm run build

# Preview do build de produção
npm run preview
```

---

## 🔍 Verificações e Testes

```bash
# Verificar erros de TypeScript
npx tsc --noEmit

# Verificar dependências instaladas
npm list --depth=0

# Verificar bindings do Rolldown
ls -la node_modules/@rolldown/

# Verificar tamanho do build
du -sh dist/

# Contar arquivos gerados
ls -1 dist/assets/*.js | wc -l
```

---

## 🗄️ Supabase

```bash
# Verificar conexão (no código)
# URL: https://eqwsxtaujtyxabvjugta.supabase.co

# Tabelas principais:
# - contas_bancarias
# - classificacoes_contabeis
# - lancamentos_processados
# - transferencias
# - transfer_pairs
# - taxa_config
# - contas_importadas
```

---

## 📝 Git

```bash
# Ver status
git status

# Ver últimos commits
git log --oneline -10

# Adicionar mudanças
git add .

# Commit
git commit -m "sua mensagem"

# Push para produção (Vercel faz deploy automático)
git push origin master
```

---

## 🐛 Debugging

```bash
# Ver logs do build
npm run build 2>&1 | tee build.log

# Verificar processos Node rodando
ps aux | grep node

# Limpar cache do Vite
rm -rf node_modules/.vite

# Limpar tudo e recomeçar
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

---

## 📊 Análise do Código

```bash
# Contar linhas de código TypeScript
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l

# Listar todos os arquivos TypeScript
find src -name "*.ts" -o -name "*.tsx"

# Buscar por texto no código
grep -r "texto_procurado" src/

# Listar componentes de página
ls -1 src/renderer/pages/

# Listar serviços
ls -1 src/renderer/services/
```

---

## 🔧 Manutenção

```bash
# Atualizar dependências (cuidado!)
npm update

# Verificar dependências desatualizadas
npm outdated

# Auditar segurança
npm audit

# Corrigir vulnerabilidades automáticas
npm audit fix
```

---

## 📦 Scripts Úteis do Projeto

```bash
# Importar mapeamentos de CSV
node importar-depara-csv.mjs

# Executar importação em lote
node executar-importacao.mjs

# Verificar classificações
node check-classificacoes.mjs

# Verificar transferências
node check-transfers.mjs

# Verificar membros da organização
node check-members.mjs
```

---

## 🌐 Deploy e Produção

```bash
# Build otimizado para produção
npm run build

# Verificar tamanho dos chunks
ls -lh dist/assets/*.js

# Testar build localmente
npm run preview
# Acesse: http://localhost:4173

# Deploy manual na Vercel (se necessário)
vercel --prod
```

---

## 🔐 Variáveis de Ambiente

```bash
# Supabase URL (já configurado no código)
SUPABASE_URL=https://eqwsxtaujtyxabvjugta.supabase.co

# Supabase Anon Key (já configurado no código)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📱 Testes Manuais

### Fluxo Completo:
1. Login com usuário
2. Ir para Mapeamento → Adicionar conta bancária
3. Ir para Mapeamento → Adicionar classificação
4. Ir para Importar → Selecionar arquivo Excel
5. Processar e revisar lançamentos
6. Exportar CSV

### Verificar:
- ✅ Login/Logout funciona
- ✅ Importação de Excel processa corretamente
- ✅ Mapeamentos são salvos no Supabase
- ✅ Transferências são detectadas
- ✅ Pareamento automático funciona
- ✅ Exportação CSV gera arquivo correto
- ✅ Multi-usuário funciona (dados isolados)

---

## 🆘 Problemas Comuns

### Build falha com "Cannot find native binding"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro de permissão ao fazer build
```bash
# Já corrigido no vite.config.ts (emptyOutDir: false)
# Se persistir, verificar permissões da pasta dist
```

### TypeScript reclama de tipos
```bash
# Verificar se @types estão instalados
npm list @types/react @types/react-dom
```

### Supabase não conecta
```bash
# Verificar se está logado
# Verificar URL e chave no src/renderer/services/supabaseClient.ts
```

---

## 📚 Documentação Gerada

- `DIAGNOSTICO.md` - Análise completa do sistema
- `RESULTADO_CORRECAO.md` - Detalhes da correção aplicada
- `RESUMO_DIAGNOSTICO.md` - Resumo executivo
- `COMANDOS_UTEIS.md` - Este arquivo
- `README.md` - Documentação original do projeto

---

## 🎯 Atalhos Rápidos

```bash
# Desenvolvimento rápido
alias dev="npm run dev"
alias build="npm run build"
alias preview="npm run preview"

# Git rápido
alias gs="git status"
alias ga="git add ."
alias gc="git commit -m"
alias gp="git push"

# Limpeza rápida
alias clean="rm -rf node_modules package-lock.json dist"
alias fresh="clean && npm install"
```

---

## 📞 Suporte

### Problemas Técnicos:
1. Verificar `DIAGNOSTICO.md` para entender o sistema
2. Verificar `RESULTADO_CORRECAO.md` para soluções aplicadas
3. Executar comandos de debugging acima

### Dúvidas sobre Funcionalidades:
1. Ler `README.md` para guia de uso
2. Verificar código em `src/renderer/pages/` para cada tela
3. Verificar `src/renderer/services/` para lógica de negócio

---

**Última verificação:** 22/05/2026 11:53  
**Status:** ✅ Tudo funcionando  
**Build:** ✅ OK  
**Deploy:** ✅ OK

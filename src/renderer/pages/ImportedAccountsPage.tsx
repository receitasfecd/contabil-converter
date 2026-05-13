import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  IconButton,
  Alert,
  Stack,
  Tabs,
  Tab,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  loadImportedAccounts,
  deleteImportedAccount,
  getImportProgress,
  markAccountAsExported,
  markMultipleAccountsAsExported,
  getPendingAccounts,
  getExportedAccounts,
  syncImportedAccountsWithMapping,
  saveImportedAccounts,
} from '../services/importedAccountsService';
import { loadTransferStore } from '../services/transferStore';
import { mappingService } from '../services/mappingService';
import { ImportedAccount } from '../types/ImportedAccount';
import { generateBatchCSV, downloadCSV, generateBatchFilename, generateCSV, generateFilename } from '../services/csvExporter';
import BankIcon from '../components/BankIcon';
import { formatAccountNumber } from '../utils/formatters';

export default function ImportedAccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalLancamentos, setTotalLancamentos] = useState(0);
  const [totalTransferencias, setTotalTransferencias] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const loadData = useCallback(() => {
    // Sincronizar dados das contas importadas com o mapeamento
    syncImportedAccountsWithMapping();

    const store = loadImportedAccounts();
    setAccounts(store.accounts);

    const totalContas = mappingService.getContasBancarias().length;
    setProgress(getImportProgress(totalContas));

    // Contar total de lançamentos
    const lancamentos = store.accounts.reduce((sum, acc) => sum + acc.lancamentos.length, 0);
    setTotalLancamentos(lancamentos);

    // Contar total de transferências
    const transferStore = loadTransferStore();
    const transferencias = transferStore.pending.length + transferStore.paired.length;
    setTotalTransferencias(transferencias);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = useCallback((accountId: string) => {
    if (confirm('Deseja realmente excluir esta conta e todos os seus lançamentos?')) {
      deleteImportedAccount(accountId);
      loadData();
    }
  }, [loadData]);

  const handleView = useCallback((accountId: string) => {
    navigate(`/contas/${accountId}`);
  }, [navigate]);

  const handleViewBalancete = useCallback((grupo?: string, accountId?: string) => {
    if (accountId) {
      // Balancete de uma conta específica
      navigate(`/balancete?accountId=${accountId}`);
    } else if (grupo) {
      // Balancete de um grupo
      navigate(`/balancete?grupo=${encodeURIComponent(grupo)}`);
    } else {
      // Balancete geral
      navigate('/balancete');
    }
  }, [navigate]);

  const handleExportSingle = useCallback((account: ImportedAccount) => {
    const csv = generateCSV(account.lancamentos);
    const filename = generateFilename(
      account.contaBancaria.numeroConta,
      account.contaBancaria.tipoAplicacao
    );
    downloadCSV(csv, filename);
    markAccountAsExported(account.id);
    loadData();
  }, [loadData]);

  const handleExportBatch = useCallback(() => {
    if (selectedAccounts.length === 0) {
      alert('Selecione pelo menos uma conta para exportar');
      return;
    }

    const accountsToExport = accounts.filter(acc => selectedAccounts.includes(acc.id));
    const csv = generateBatchCSV(accountsToExport);
    const filename = generateBatchFilename(accountsToExport.length);
    downloadCSV(csv, filename);
    markMultipleAccountsAsExported(selectedAccounts);
    setSelectedAccounts([]);
    loadData();
  }, [selectedAccounts, accounts, loadData]);

  const handleToggleSelect = useCallback((accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  }, []);

  const handleSelectAll = useCallback((accountIds: string[]) => {
    if (selectedAccounts.length === accountIds.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accountIds);
    }
  }, [selectedAccounts.length]);

  // Gerar relação nominal de todas as contas cadastradas
  const getNominalRelation = useMemo(() => {
    const allBankAccounts = mappingService.getContasBancarias();
    const importedAccountNumbers = new Set(
      accounts.map(acc => acc.contaBancaria.numeroConta)
    );

    return allBankAccounts.map(conta => ({
      numeroConta: conta.numeroConta,
      codigoContabil: conta.codigoContabil,
      descricao: conta.descricao,
      tipoAplicacao: conta.tipoAplicacao,
      banco: conta.banco,
      imported: importedAccountNumbers.has(conta.numeroConta),
      importedAccount: accounts.find(acc => acc.contaBancaria.numeroConta === conta.numeroConta)
    }));
  }, [accounts]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }, []);

  const getAccountType = useCallback((tipoAplicacao?: 'A' | 'A2' | 'A3' | null) => {
    if (!tipoAplicacao) return 'Conta Corrente';
    return `Aplicação ${tipoAplicacao}`;
  }, []);

  const getAccountTypeColor = useCallback((tipoAplicacao?: 'A' | 'A2' | 'A3' | null) => {
    if (!tipoAplicacao) return 'primary';
    return 'secondary';
  }, []);

  // Agrupar contas por tipo e grupo
  const groupedAccounts = useMemo(() => {
    const contasBancarias = mappingService.getContasBancarias();
    const planoContas = mappingService.getPlanoContas();

    // Identificar grupos principais do plano de contas (nível 1 ou 2)
    const grupos = planoContas
      .filter(item => item.nivel <= 2)
      .map(item => ({
        codigo: item.codigo,
        nome: item.nome,
        nivel: item.nivel
      }));

    // Função para encontrar o grupo de uma conta
    const findGrupo = (codigoContabil: string) => {
      // Encontrar o grupo mais específico que corresponde ao início do código
      const grupo = grupos
        .filter(g => codigoContabil.startsWith(g.codigo))
        .sort((a, b) => b.codigo.length - a.codigo.length)[0];

      return grupo || { codigo: 'OUTROS', nome: 'Outros', nivel: 1 };
    };

    // Agrupar contas
    const grouped: {
      [key: string]: {
        nome: string;
        contasCorrentes: ImportedAccount[];
        aplicacoes: ImportedAccount[];
        saldoTotal: number;
      };
    } = {};

    accounts.forEach(account => {
      const grupo = findGrupo(account.contaBancaria.codigoContabil);
      const grupoKey = `${grupo.codigo}-${grupo.nome}`;

      if (!grouped[grupoKey]) {
        grouped[grupoKey] = {
          nome: grupo.nome,
          contasCorrentes: [],
          aplicacoes: [],
          saldoTotal: 0
        };
      }

      if (account.contaBancaria.tipoAplicacao) {
        grouped[grupoKey].aplicacoes.push(account);
      } else {
        grouped[grupoKey].contasCorrentes.push(account);
      }

      grouped[grupoKey].saldoTotal += account.saldo;
    });

    return grouped;
  }, [accounts]);

  // Agrupar contas por banco
  const groupedByBank = useMemo(() => {
    const grouped: {
      [key: string]: {
        banco: 'BB' | 'ITAU' | 'SEM_BANCO';
        nome: string;
        contas: ImportedAccount[];
        saldoTotal: number;
      };
    } = {
      BB: { banco: 'BB', nome: 'Banco do Brasil', contas: [], saldoTotal: 0 },
      ITAU: { banco: 'ITAU', nome: 'Itaú', contas: [], saldoTotal: 0 },
      SEM_BANCO: { banco: 'SEM_BANCO', nome: 'Sem Banco Definido', contas: [], saldoTotal: 0 },
    };

    accounts.forEach(account => {
      const banco = account.contaBancaria.banco || 'SEM_BANCO';
      grouped[banco].contas.push(account);
      grouped[banco].saldoTotal += account.saldo;
    });

    return grouped;
  }, [accounts]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Contas Importadas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AssessmentIcon />}
          onClick={() => handleViewBalancete()}
          disabled={accounts.length === 0}
        >
          Balancete Geral
        </Button>
      </Box>

      {/* Barra de Progresso */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progresso de Importação
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {progress.toFixed(0)}%
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {accounts.length} contas com extratos importados de {mappingService.getContasBancarias().length} contas cadastradas
          </Typography>

          {/* Estatísticas de Lançamentos e Transferências */}
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total de Lançamentos
              </Typography>
              <Typography variant="h6" color="primary.main">
                {totalLancamentos}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total de Transferências
              </Typography>
              <Typography variant="h6" color="secondary.main">
                {totalTransferencias}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)}>
          <Tab label="Todas as Contas" />
          <Tab label="Por Grupo" />
          <Tab label="Por Banco" />
          <Tab label="Exportação" />
          <Tab label="Relação Nominal" />
        </Tabs>
      </Box>

      {/* Tab 1: Lista de Contas (existente) */}
      {tabIndex === 0 && (
        <>
          {accounts.length === 0 ? (
            <Alert severity="info">
              Nenhuma conta importada ainda. Vá para a página de Importar para começar.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Checkbox
                  checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                  indeterminate={selectedAccounts.length > 0 && selectedAccounts.length < accounts.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAccounts(accounts.map(a => a.id));
                    } else {
                      setSelectedAccounts([]);
                    }
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  Selecionar todas
                </Typography>
                {selectedAccounts.length > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir ${selectedAccounts.length} conta(s) e todos os seus lançamentos?`)) {
                        selectedAccounts.forEach(id => {
                          deleteImportedAccount(id);
                        });
                        setSelectedAccounts([]);
                        loadData();
                      }
                    }}
                  >
                    Excluir {selectedAccounts.length} selecionada(s)
                  </Button>
                )}
              </Box>
              <Stack spacing={1}>
                {accounts.map((account) => (
                  <Card
                    key={account.id}
                    sx={{
                      '&:hover': {
                        boxShadow: 3,
                        cursor: 'pointer',
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Checkbox de Seleção */}
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(account.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* Ícone do Banco */}
                        <Box onClick={() => handleView(account.id)} sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <BankIcon banco={account.contaBancaria.banco} size={32} />

                          {/* Informações da Conta */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                {formatAccountNumber(account.contaBancaria.numeroConta)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {account.contaBancaria.codigoContabil}
                              </Typography>
                              <Chip
                                label={getAccountType(account.contaBancaria.tipoAplicacao)}
                                color={getAccountTypeColor(account.contaBancaria.tipoAplicacao)}
                                size="small"
                              />
                            </Box>
                            {account.contaBancaria.descricao && (
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {account.contaBancaria.descricao}
                              </Typography>
                            )}
                          </Box>

                          {/* Estatísticas */}
                          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                            <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                              <Typography variant="caption" color="text.secondary">
                                Lançamentos
                              </Typography>
                              <Typography variant="h6">
                                {account.lancamentos.length}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                              <Typography variant="caption" color="text.secondary">
                                Saldo
                              </Typography>
                              <Typography
                                variant="h6"
                                color={account.saldo >= 0 ? 'success.main' : 'error.main'}
                              >
                                {formatCurrency(account.saldo)}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Data de Importação */}
                          <Box sx={{ minWidth: 150 }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(account.importedAt).toLocaleDateString('pt-BR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(account.importedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Ações */}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(account.id);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
              ))}
            </Stack>
            </>
          )}
        </>
      )}

      {/* Tab 2: Por Grupo */}
      {tabIndex === 1 && (
        <>
          {accounts.length === 0 ? (
            <Alert severity="info">
              Nenhuma conta importada ainda. Vá para a página de Importar para começar.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {Object.entries(groupedAccounts).map(([grupoKey, grupo]) => (
                <Accordion key={grupoKey} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        {grupo.nome}
                      </Typography>
                      <Typography
                        variant="h6"
                        color={grupo.saldoTotal >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(grupo.saldoTotal)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={3}>
                      {/* Contas Correntes */}
                      {grupo.contasCorrentes.length > 0 && (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" color="primary">
                              Contas Correntes
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<AssessmentIcon />}
                              onClick={() => handleViewBalancete(grupo.nome)}
                            >
                              Ver Balancete
                            </Button>
                          </Box>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Número</TableCell>
                                  <TableCell>Código Contábil</TableCell>
                                  <TableCell>Descrição</TableCell>
                                  <TableCell align="right">Lançamentos</TableCell>
                                  <TableCell align="right">Saldo</TableCell>
                                  <TableCell align="center">Ações</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {grupo.contasCorrentes.map((account) => (
                                  <TableRow key={account.id} hover>
                                    <TableCell>{account.contaBancaria.numeroConta}</TableCell>
                                    <TableCell>{account.contaBancaria.codigoContabil}</TableCell>
                                    <TableCell>{account.contaBancaria.descricao || '-'}</TableCell>
                                    <TableCell align="right">{account.lancamentos.length}</TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color: account.saldo >= 0 ? 'success.main' : 'error.main',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {formatCurrency(account.saldo)}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Stack direction="row" spacing={1} justifyContent="center">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleView(account.id)}
                                          color="primary"
                                          title="Ver detalhes"
                                        >
                                          <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleViewBalancete(undefined, account.id)}
                                          color="secondary"
                                          title="Ver balancete"
                                        >
                                          <AssessmentIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}

                      {/* Aplicações */}
                      {grupo.aplicacoes.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" color="secondary" sx={{ mb: 2 }}>
                            Aplicações
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Número</TableCell>
                                  <TableCell>Código Contábil</TableCell>
                                  <TableCell>Tipo</TableCell>
                                  <TableCell>Descrição</TableCell>
                                  <TableCell align="right">Lançamentos</TableCell>
                                  <TableCell align="right">Saldo</TableCell>
                                  <TableCell align="center">Ações</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {grupo.aplicacoes.map((account) => (
                                  <TableRow key={account.id} hover>
                                    <TableCell>{account.contaBancaria.numeroConta}</TableCell>
                                    <TableCell>{account.contaBancaria.codigoContabil}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={getAccountType(account.contaBancaria.tipoAplicacao)}
                                        color="secondary"
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>{account.contaBancaria.descricao || '-'}</TableCell>
                                    <TableCell align="right">{account.lancamentos.length}</TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        color: account.saldo >= 0 ? 'success.main' : 'error.main',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {formatCurrency(account.saldo)}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Stack direction="row" spacing={1} justifyContent="center">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleView(account.id)}
                                          color="primary"
                                          title="Ver detalhes"
                                        >
                                          <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleViewBalancete(undefined, account.id)}
                                          color="secondary"
                                          title="Ver balancete"
                                        >
                                          <AssessmentIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Tab 3: Por Banco */}
      {tabIndex === 2 && (
        <>
          {accounts.length === 0 ? (
            <Alert severity="info">
              Nenhuma conta importada ainda. Vá para a página de Importar para começar.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {Object.entries(groupedByBank)
                .filter(([_, grupo]) => grupo.contas.length > 0)
                .map(([bancoKey, grupo]) => (
                  <Accordion key={bancoKey} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <BankIcon banco={grupo.banco === 'SEM_BANCO' ? null : grupo.banco} size={32} />
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {grupo.nome}
                        </Typography>
                        <Typography
                          variant="h6"
                          color={grupo.saldoTotal >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(grupo.saldoTotal)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Número</TableCell>
                              <TableCell>Código Contábil</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Descrição</TableCell>
                              <TableCell align="right">Lançamentos</TableCell>
                              <TableCell align="right">Saldo</TableCell>
                              <TableCell align="center">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {grupo.contas.map((account) => (
                              <TableRow key={account.id} hover>
                                <TableCell>{formatAccountNumber(account.contaBancaria.numeroConta)}</TableCell>
                                <TableCell>{account.contaBancaria.codigoContabil}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={getAccountType(account.contaBancaria.tipoAplicacao)}
                                    color={getAccountTypeColor(account.contaBancaria.tipoAplicacao)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{account.contaBancaria.descricao || '-'}</TableCell>
                                <TableCell align="right">{account.lancamentos.length}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color: account.saldo >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {formatCurrency(account.saldo)}
                                </TableCell>
                                <TableCell align="center">
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleView(account.id)}
                                      color="primary"
                                      title="Ver detalhes"
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleViewBalancete(undefined, account.id)}
                                      color="secondary"
                                      title="Ver balancete"
                                    >
                                      <AssessmentIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
            </Stack>
          )}
        </>
      )}

      {/* Tab 4: Exportação */}
      {tabIndex === 3 && (
        <>
          {accounts.length === 0 ? (
            <Alert severity="info">
              Nenhuma conta importada ainda. Vá para a página de Importar para começar.
            </Alert>
          ) : (
            <Stack spacing={3}>
              {/* Estatísticas de Exportação */}
              <Stack direction="row" spacing={2}>
                <Card sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="h5" color="warning.main">
                      {getPendingAccounts().length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendentes de Exportação
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="h5" color="success.main">
                      {getExportedAccounts().length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Já Exportadas
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>

              {/* Contas Pendentes */}
              {getPendingAccounts().length > 0 && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Contas Pendentes de Exportação
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportBatch}
                        disabled={selectedAccounts.length === 0}
                      >
                        Exportar Selecionadas ({selectedAccounts.length})
                      </Button>
                    </Box>

                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedAccounts.length === getPendingAccounts().length}
                                indeterminate={selectedAccounts.length > 0 && selectedAccounts.length < getPendingAccounts().length}
                                onChange={() => handleSelectAll(getPendingAccounts().map(acc => acc.id))}
                              />
                            </TableCell>
                            <TableCell>Número</TableCell>
                            <TableCell>Código Contábil</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="right">Lançamentos</TableCell>
                            <TableCell align="right">Saldo</TableCell>
                            <TableCell align="center">Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getPendingAccounts().map((account) => (
                            <TableRow key={account.id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedAccounts.includes(account.id)}
                                  onChange={() => handleToggleSelect(account.id)}
                                />
                              </TableCell>
                              <TableCell>{account.contaBancaria.numeroConta}</TableCell>
                              <TableCell>{account.contaBancaria.codigoContabil}</TableCell>
                              <TableCell>
                                <Chip
                                  label={getAccountType(account.contaBancaria.tipoAplicacao)}
                                  color={getAccountTypeColor(account.contaBancaria.tipoAplicacao)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{account.contaBancaria.descricao || '-'}</TableCell>
                              <TableCell align="right">{account.lancamentos.length}</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  color: account.saldo >= 0 ? 'success.main' : 'error.main',
                                  fontWeight: 'bold'
                                }}
                              >
                                {formatCurrency(account.saldo)}
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => handleExportSingle(account)}
                                >
                                  Exportar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}

              {/* Contas Exportadas */}
              {getExportedAccounts().length > 0 && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Contas Já Exportadas
                      </Typography>
                      {selectedAccounts.length > 0 && (
                        <Stack direction="row" spacing={2}>
                          <Button
                            variant="outlined"
                            color="warning"
                            onClick={() => {
                              if (confirm(`Deseja reverter a exportação de ${selectedAccounts.length} conta(s)?`)) {
                                selectedAccounts.forEach(id => {
                                  const store = loadImportedAccounts();
                                  const accountIndex = store.accounts.findIndex(acc => acc.id === id);
                                  if (accountIndex >= 0) {
                                    store.accounts[accountIndex].exported = false;
                                    store.accounts[accountIndex].exportedAt = undefined;
                                  }
                                  saveImportedAccounts(store);
                                });
                                setSelectedAccounts([]);
                                loadData();
                              }
                            }}
                          >
                            Reverter {selectedAccounts.length} Exportação(ões)
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir ${selectedAccounts.length} conta(s) exportada(s) e todos os seus lançamentos?`)) {
                                selectedAccounts.forEach(id => {
                                  deleteImportedAccount(id);
                                });
                                setSelectedAccounts([]);
                                loadData();
                              }
                            }}
                          >
                            Excluir {selectedAccounts.length}
                          </Button>
                        </Stack>
                      )}
                    </Box>

                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedAccounts.length === getExportedAccounts().length}
                                indeterminate={selectedAccounts.length > 0 && selectedAccounts.length < getExportedAccounts().length}
                                onChange={() => handleSelectAll(getExportedAccounts().map(acc => acc.id))}
                              />
                            </TableCell>
                            <TableCell>Número</TableCell>
                            <TableCell>Código Contábil</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="right">Lançamentos</TableCell>
                            <TableCell align="right">Saldo</TableCell>
                            <TableCell>Exportado em</TableCell>
                            <TableCell align="center">Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getExportedAccounts().map((account) => (
                            <TableRow key={account.id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedAccounts.includes(account.id)}
                                  onChange={() => handleToggleSelect(account.id)}
                                />
                              </TableCell>
                              <TableCell>{account.contaBancaria.numeroConta}</TableCell>
                              <TableCell>{account.contaBancaria.codigoContabil}</TableCell>
                              <TableCell>
                                <Chip
                                  label={getAccountType(account.contaBancaria.tipoAplicacao)}
                                  color={getAccountTypeColor(account.contaBancaria.tipoAplicacao)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{account.contaBancaria.descricao || '-'}</TableCell>
                              <TableCell align="right">{account.lancamentos.length}</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  color: account.saldo >= 0 ? 'success.main' : 'error.main',
                                  fontWeight: 'bold'
                                }}
                              >
                                {formatCurrency(account.saldo)}
                              </TableCell>
                              <TableCell>
                                {account.exportedAt
                                  ? new Date(account.exportedAt).toLocaleString('pt-BR')
                                  : '-'}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label="Exportado"
                                  color="success"
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </>
      )}

      {/* Tab 5: Relação Nominal */}
      {tabIndex === 4 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Relação Nominal de Contas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lista completa de todas as contas cadastradas no sistema e seu status de importação
              </Typography>
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Banco</TableCell>
                  <TableCell>Número da Conta</TableCell>
                  <TableCell>Código Contábil</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Lançamentos</TableCell>
                  <TableCell align="right">Saldo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getNominalRelation.map((item) => (
                  <TableRow
                    key={item.numeroConta}
                    sx={{
                      backgroundColor: item.imported ? 'success.light' : 'inherit',
                      opacity: item.imported ? 1 : 0.6
                    }}
                  >
                    <TableCell>
                      <BankIcon banco={item.banco} size={24} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={item.imported ? 'bold' : 'normal'}>
                        {formatAccountNumber(item.numeroConta)}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.codigoContabil}</TableCell>
                    <TableCell>
                      <Chip
                        label={getAccountType(item.tipoAplicacao)}
                        color={getAccountTypeColor(item.tipoAplicacao)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.descricao || '-'}</TableCell>
                    <TableCell align="center">
                      {item.imported ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Importada"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Pendente"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {item.importedAccount ? item.importedAccount.lancamentos.length : '-'}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: item.importedAccount && item.importedAccount.saldo >= 0 ? 'success.main' : 'error.main',
                        fontWeight: item.imported ? 'bold' : 'normal'
                      }}
                    >
                      {item.importedAccount ? formatCurrency(item.importedAccount.saldo) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Resumo */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total de Contas Cadastradas
                  </Typography>
                  <Typography variant="h6">
                    {mappingService.getContasBancarias().length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contas Importadas
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {accounts.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contas Pendentes
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {mappingService.getContasBancarias().length - accounts.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

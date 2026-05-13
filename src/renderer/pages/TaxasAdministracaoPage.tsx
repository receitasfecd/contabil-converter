import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import { Download, Edit, Delete, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  loadTaxasAdministracao,
  getTaxasPendentes,
  getTaxasPareadas,
  getTaxasProcessadas,
  definirContasTaxa,
  processarTaxa,
  deleteTaxa,
  clearAllTaxas,
  clearTaxasByAccount,
  exportTaxasProcessadas,
  getTaxasProcessadasNaoExportadas,
  saveTaxasAdministracao,
} from '../services/taxaAdministracaoService';
import { GRUPOS_CONTABEIS } from '../types/TaxaAdministracao';
import { TaxaAdministracao } from '../types/TaxaAdministracao';
import { formatAccountNumber } from '../utils/formatters';
import { mappingService } from '../services/mappingService';

export default function TaxasAdministracaoPage() {
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [taxasPendentes, setTaxasPendentes] = useState<TaxaAdministracao[]>([]);
  const [taxasPareadas, setTaxasPareadas] = useState<TaxaAdministracao[]>([]);
  const [taxasProcessadas, setTaxasProcessadas] = useState<TaxaAdministracao[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editTransferDialog, setEditTransferDialog] = useState(false);
  const [clearByAccountDialog, setClearByAccountDialog] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<TaxaAdministracao | null>(null);
  const [formData, setFormData] = useState({
    grupoContabil: '',
    contaDespesa: '',
    contaReceita: '',
  });
  const [transferFormData, setTransferFormData] = useState({
    outDate: '',
    outAmount: '',
    outHistorico: '',
    outAccountCode: '',
    inDate: '',
    inAmount: '',
    inHistorico: '',
    inAccountCode: '',
  });
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const loadData = useCallback(() => {
    setTaxasPendentes(getTaxasPendentes());
    setTaxasPareadas(getTaxasPareadas());
    setTaxasProcessadas(getTaxasProcessadas());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (taxa: TaxaAdministracao) => {
    setEditingTaxa(taxa);
    setFormData({
      grupoContabil: taxa.grupoContabil || '',
      contaDespesa: taxa.contaDespesa || '',
      contaReceita: taxa.contaReceita || '',
    });
    setEditDialog(true);
  };

  const handleSave = () => {
    if (!editingTaxa || !formData.grupoContabil || !formData.contaDespesa || !formData.contaReceita) {
      alert('Preencha todos os campos');
      return;
    }

    definirContasTaxa(
      editingTaxa.id,
      formData.grupoContabil as any,
      formData.contaDespesa,
      formData.contaReceita
    );

    setEditDialog(false);
    loadData();
  };

  const handleProcessar = (taxaId: string) => {
    const result = processarTaxa(taxaId);
    if (result) {
      alert('Taxa processada com sucesso! Lançamentos de despesa e receita criados.');
      loadData();
    } else {
      alert('Erro ao processar taxa. Verifique se todas as informações estão preenchidas.');
    }
  };

  const handleProcessarTodas = () => {
    if (confirm(`Deseja processar todas as ${taxasPareadas.length} taxas pareadas?`)) {
      let processadas = 0;
      let erros = 0;

      taxasPareadas.forEach(taxa => {
        const result = processarTaxa(taxa.id);
        if (result) {
          processadas++;
        } else {
          erros++;
        }
      });

      alert(`Processamento concluído!\n${processadas} taxas processadas\n${erros} erros`);
      loadData();
    }
  };

  const handleExportarProcessadas = () => {
    const taxasNaoExportadas = getTaxasProcessadasNaoExportadas();

    if (taxasNaoExportadas.length === 0) {
      alert('Nenhuma taxa processada disponível para exportação');
      return;
    }

    // Filtrar por data se necessário
    let taxasParaExportar = taxasNaoExportadas;
    if (dataInicio || dataFim) {
      taxasParaExportar = taxasNaoExportadas.filter(taxa => {
        if (!taxa.transferOut) return false;

        const taxaDate = taxa.transferOut.date; // formato dd/mm/yyyy
        const [day, month, year] = taxaDate.split('/');
        const taxaDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (dataInicio) {
          const inicioObj = new Date(dataInicio);
          if (taxaDateObj < inicioObj) return false;
        }

        if (dataFim) {
          const fimObj = new Date(dataFim);
          if (taxaDateObj > fimObj) return false;
        }

        return true;
      });
    }

    if (taxasParaExportar.length === 0) {
      alert('Nenhuma taxa no período selecionado');
      return;
    }

    try {
      const { csv, taxasExportadas } = exportTaxasProcessadas();

      if (!csv) {
        alert('Erro ao gerar CSV');
        return;
      }

      // Download do CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = `taxas-administracao-${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`${taxasExportadas.length} taxas exportadas com sucesso!`);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao exportar taxas');
    }
  };

  const handleDelete = (taxaId: string) => {
    if (confirm('Deseja realmente excluir esta taxa de administração?')) {
      deleteTaxa(taxaId);
      loadData();
    }
  };

  const handleClearAll = () => {
    if (confirm('Deseja realmente excluir TODAS as taxas de administração? Esta ação não pode ser desfeita.')) {
      clearAllTaxas();
      loadData();
    }
  };

  const handleClearByAccount = (accountNumber: string) => {
    if (confirm(`Deseja realmente excluir todas as taxas da conta ${accountNumber}?`)) {
      clearTaxasByAccount(accountNumber);
      loadData();
      setClearByAccountDialog(false);
    }
  };

  const handleEditTransfer = (taxa: TaxaAdministracao, type: 'OUT' | 'IN') => {
    setEditingTaxa(taxa);

    setTransferFormData({
      outDate: taxa.transferOut?.date || '',
      outAmount: taxa.transferOut?.amount || '',
      outHistorico: taxa.transferOut?.historico || '',
      outAccountCode: taxa.transferOut?.accountCode || '',
      inDate: taxa.transferIn?.date || '',
      inAmount: taxa.transferIn?.amount || '',
      inHistorico: taxa.transferIn?.historico || '',
      inAccountCode: taxa.transferIn?.accountCode || '',
    });
    setEditTransferDialog(true);
  };

  const handleSaveTransferEdit = () => {
    if (!editingTaxa) return;

    const store = loadTaxasAdministracao();
    const taxaIndex = store.taxas.findIndex(t => t.id === editingTaxa.id);

    if (taxaIndex === -1) return;

    const taxa = store.taxas[taxaIndex];

    if (taxa.transferOut) {
      taxa.transferOut = {
        ...taxa.transferOut,
        date: transferFormData.outDate,
        amount: transferFormData.outAmount,
        historico: transferFormData.outHistorico,
        accountCode: transferFormData.outAccountCode,
      };
    }

    if (taxa.transferIn) {
      taxa.transferIn = {
        ...taxa.transferIn,
        date: transferFormData.inDate,
        amount: transferFormData.inAmount,
        historico: transferFormData.inHistorico,
        accountCode: transferFormData.inAccountCode,
      };
    }

    saveTaxasAdministracao(store);
    setEditTransferDialog(false);
    loadData();
  };

  const getRubricaName = (codigo: string): string => {
    if (!codigo) return '';
    const classificacoes = mappingService.getClassificacoes();
    const rubrica = classificacoes.find(c => c.codigoContabil === codigo);
    return rubrica?.descricao || '';
  };

  const formatCurrency = (value: string) => {
    return `R$ ${value}`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Taxas de Administração</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Delete />}
            onClick={() => setClearByAccountDialog(true)}
          >
            Limpar por Conta
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleClearAll}
          >
            Limpar Todas
          </Button>
          <Button variant="outlined" onClick={() => navigate('/transferencias')}>
            Voltar para Transferências
          </Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Taxas de Administração</strong> são transferências especiais que geram:
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Despesa</strong> na conta de origem (Débito Despesa, Crédito Banco)
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Receita</strong> na conta 14300-4 (Débito Banco Adm, Crédito Receita)
        </Typography>
      </Alert>

      {/* Estatísticas */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5" color="warning.main">
              {taxasPendentes.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pendentes
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5" color="info.main">
              {taxasPareadas.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pareadas
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5" color="success.main">
              {taxasProcessadas.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Processadas
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)}>
          <Tab label="Pendentes" />
          <Tab label="Pareadas" />
          <Tab label="Processadas" />
        </Tabs>
      </Box>

      {/* Tab 1: Pendentes */}
      {tabIndex === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Taxas Pendentes de Pareamento
            </Typography>
            {taxasPendentes.length === 0 ? (
              <Alert severity="info">Nenhuma taxa pendente</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Conta</TableCell>
                      <TableCell>Direção</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Histórico</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {taxasPendentes.map((taxa) => {
                      const transfer = taxa.transferOut || taxa.transferIn;
                      if (!transfer) return null;

                      return (
                        <TableRow key={taxa.id}>
                          <TableCell>{transfer.date}</TableCell>
                          <TableCell>{formatAccountNumber(transfer.accountNumber)}</TableCell>
                          <TableCell>
                            <Chip
                              label={taxa.status === 'PENDING_OUT' ? 'Saída' : 'Entrada'}
                              color={taxa.status === 'PENDING_OUT' ? 'error' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                          <TableCell>{transfer.historico.substring(0, 50)}...</TableCell>
                          <TableCell>
                            <Chip label="Aguardando Par" color="warning" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditTransfer(taxa, taxa.status === 'PENDING_OUT' ? 'OUT' : 'IN')}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(taxa.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Pareadas */}
      {tabIndex === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Taxas Pareadas - Aguardando Classificação
              </Typography>
              {taxasPareadas.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircle />}
                  onClick={handleProcessarTodas}
                >
                  Processar Todas ({taxasPareadas.length})
                </Button>
              )}
            </Box>
            {taxasPareadas.length === 0 ? (
              <Alert severity="info">Nenhuma taxa pareada</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Conta Origem</TableCell>
                      <TableCell>Conta Destino</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Grupo</TableCell>
                      <TableCell>Despesa</TableCell>
                      <TableCell>Receita</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {taxasPareadas.map((taxa) => (
                      <TableRow key={taxa.id}>
                        <TableCell>{taxa.transferOut?.date}</TableCell>
                        <TableCell>{formatAccountNumber(taxa.transferOut?.accountNumber || '')}</TableCell>
                        <TableCell>{formatAccountNumber(taxa.transferIn?.accountNumber || '')}</TableCell>
                        <TableCell>{formatCurrency(taxa.transferOut?.amount || '')}</TableCell>
                        <TableCell>
                          {taxa.grupoContabil ? (
                            <Chip
                              label={GRUPOS_CONTABEIS[taxa.grupoContabil].nome}
                              size="small"
                              color="primary"
                            />
                          ) : (
                            <Chip label="Não definido" size="small" color="default" />
                          )}
                        </TableCell>
                        <TableCell>{taxa.contaDespesa || '-'}</TableCell>
                        <TableCell>{taxa.contaReceita || '-'}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Edit />}
                              onClick={() => handleEdit(taxa)}
                            >
                              Classificar
                            </Button>
                            {taxa.contaDespesa && taxa.contaReceita && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleProcessar(taxa.id)}
                              >
                                Processar
                              </Button>
                            )}
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditTransfer(taxa, 'OUT')}
                              title="Editar Transferências"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(taxa.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Processadas */}
      {tabIndex === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Taxas Processadas
              </Typography>
              {getTaxasProcessadasNaoExportadas().length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Download />}
                  onClick={handleExportarProcessadas}
                >
                  Exportar CSV ({getTaxasProcessadasNaoExportadas().length})
                </Button>
              )}
            </Box>

            {/* Filtros de Data */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Data Início"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ placeholder: '' }}
                size="small"
                sx={{ width: 200 }}
              />
              <TextField
                label="Data Fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ placeholder: '' }}
                size="small"
                sx={{ width: 200 }}
              />
              {(dataInicio || dataFim) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                  }}
                >
                  Limpar Datas
                </Button>
              )}
            </Stack>

            {taxasProcessadas.length === 0 ? (
              <Alert severity="info">Nenhuma taxa processada</Alert>
            ) : (
              <>
                {/* Agrupar por grupo contábil */}
                {['PROJETOS', 'GRANTS', 'TERMOS_PARCERIAS', 'IMPORTACOES'].map((grupo) => {
                  const taxasDoGrupo = taxasProcessadas.filter(t => {
                    if (t.grupoContabil !== grupo) return false;

                    // Filtro de data
                    if (dataInicio || dataFim) {
                      if (!t.transferOut) return false;

                      const taxaDate = t.transferOut.date;
                      const [day, month, year] = taxaDate.split('/');
                      const taxaDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                      if (dataInicio) {
                        const inicioObj = new Date(dataInicio);
                        if (taxaDateObj < inicioObj) return false;
                      }

                      if (dataFim) {
                        const fimObj = new Date(dataFim);
                        if (taxaDateObj > fimObj) return false;
                      }
                    }

                    return true;
                  });

                  if (taxasDoGrupo.length === 0) return null;

                  return (
                    <Box key={grupo} sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {GRUPOS_CONTABEIS[grupo as keyof typeof GRUPOS_CONTABEIS].nome} ({taxasDoGrupo.length})
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Data</TableCell>
                              <TableCell>Conta Origem</TableCell>
                              <TableCell>Conta Destino</TableCell>
                              <TableCell>Valor</TableCell>
                              <TableCell>Despesa</TableCell>
                              <TableCell>Receita</TableCell>
                              <TableCell>Processado em</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {taxasDoGrupo.map((taxa) => (
                              <TableRow key={taxa.id}>
                                <TableCell>{taxa.transferOut?.date}</TableCell>
                                <TableCell>{formatAccountNumber(taxa.transferOut?.accountNumber || '')}</TableCell>
                                <TableCell>{formatAccountNumber(taxa.transferIn?.accountNumber || '')}</TableCell>
                                <TableCell>{formatCurrency(taxa.transferOut?.amount || '')}</TableCell>
                                <TableCell>{taxa.contaDespesa}</TableCell>
                                <TableCell>{taxa.contaReceita}</TableCell>
                                <TableCell>
                                  {taxa.processedAt
                                    ? new Date(taxa.processedAt).toLocaleString('pt-BR')
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {taxa.exported ? (
                                    <Chip label="Exportado" size="small" color="success" />
                                  ) : (
                                    <Chip label="Aguardando" size="small" color="warning" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Classificação */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Classificar Taxa de Administração</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Grupo Contábil</InputLabel>
              <Select
                value={formData.grupoContabil}
                label="Grupo Contábil"
                onChange={(e) => setFormData({ ...formData, grupoContabil: e.target.value })}
              >
                <MenuItem value="PROJETOS">{GRUPOS_CONTABEIS.PROJETOS.nome}</MenuItem>
                <MenuItem value="GRANTS">{GRUPOS_CONTABEIS.GRANTS.nome}</MenuItem>
                <MenuItem value="TERMOS_PARCERIAS">{GRUPOS_CONTABEIS.TERMOS_PARCERIAS.nome}</MenuItem>
                <MenuItem value="IMPORTACOES">{GRUPOS_CONTABEIS.IMPORTACOES.nome}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Conta de Despesa"
              fullWidth
              value={formData.contaDespesa}
              onChange={(e) => setFormData({ ...formData, contaDespesa: e.target.value })}
              helperText="Código contábil da despesa (ex: 31010101)"
            />

            <TextField
              label="Conta de Receita"
              fullWidth
              value={formData.contaReceita}
              onChange={(e) => setFormData({ ...formData, contaReceita: e.target.value })}
              helperText="Código contábil da receita (ex: 41010101)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Limpar por Conta */}
      <Dialog open={clearByAccountDialog} onClose={() => setClearByAccountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Limpar Taxas por Conta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecione uma conta para excluir todas as suas taxas de administração:
          </Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {Array.from(new Set([
              ...taxasPendentes.map(t => t.transferOut?.accountNumber || t.transferIn?.accountNumber).filter(Boolean),
              ...taxasPareadas.map(t => t.transferOut?.accountNumber).filter(Boolean),
              ...taxasPareadas.map(t => t.transferIn?.accountNumber).filter(Boolean),
            ])).sort().map((accountNumber) => {
              const count = [...taxasPendentes, ...taxasPareadas, ...taxasProcessadas].filter(t =>
                t.transferOut?.accountNumber === accountNumber || t.transferIn?.accountNumber === accountNumber
              ).length;

              return (
                <Button
                  key={accountNumber}
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => handleClearByAccount(accountNumber as string)}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <span>{formatAccountNumber(accountNumber as string)}</span>
                  <Chip label={`${count} taxa(s)`} size="small" />
                </Button>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearByAccountDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Edição de Transferência */}
      <Dialog open={editTransferDialog} onClose={() => setEditTransferDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Transferências da Taxa</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Transferência de Saída */}
            {editingTaxa?.transferOut && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Transferência de Saída (Débito)
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Data"
                    fullWidth
                    value={transferFormData.outDate}
                    onChange={(e) => setTransferFormData({ ...transferFormData, outDate: e.target.value })}
                  />
                  <Box>
                    <TextField
                      label="Código Contábil"
                      fullWidth
                      value={transferFormData.outAccountCode}
                      onChange={(e) => setTransferFormData({ ...transferFormData, outAccountCode: e.target.value })}
                    />
                    {transferFormData.outAccountCode && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {getRubricaName(transferFormData.outAccountCode)}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="Valor"
                    fullWidth
                    value={transferFormData.outAmount}
                    onChange={(e) => setTransferFormData({ ...transferFormData, outAmount: e.target.value })}
                  />
                  <TextField
                    label="Histórico"
                    fullWidth
                    multiline
                    rows={2}
                    value={transferFormData.outHistorico}
                    onChange={(e) => setTransferFormData({ ...transferFormData, outHistorico: e.target.value })}
                  />
                </Stack>
              </Box>
            )}

            {/* Transferência de Entrada */}
            {editingTaxa?.transferIn && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'success.main' }}>
                  Transferência de Entrada (Crédito)
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Data"
                    fullWidth
                    value={transferFormData.inDate}
                    onChange={(e) => setTransferFormData({ ...transferFormData, inDate: e.target.value })}
                  />
                  <Box>
                    <TextField
                      label="Código Contábil"
                      fullWidth
                      value={transferFormData.inAccountCode}
                      onChange={(e) => setTransferFormData({ ...transferFormData, inAccountCode: e.target.value })}
                    />
                    {transferFormData.inAccountCode && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {getRubricaName(transferFormData.inAccountCode)}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="Valor"
                    fullWidth
                    value={transferFormData.inAmount}
                    onChange={(e) => setTransferFormData({ ...transferFormData, inAmount: e.target.value })}
                  />
                  <TextField
                    label="Histórico"
                    fullWidth
                    multiline
                    rows={2}
                    value={transferFormData.inHistorico}
                    onChange={(e) => setTransferFormData({ ...transferFormData, inHistorico: e.target.value })}
                  />
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTransferDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveTransferEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

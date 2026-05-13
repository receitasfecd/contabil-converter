import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack,
} from '@mui/icons-material';
import { parseExcelFile } from '../services/excelParser';
import { processEntriesWithTransferSeparation } from '../services/entryProcessor';
import { mappingService } from '../services/mappingService';
import { hybridMappingService } from '../services/hybridMappingService';
import { addOrUpdateImportedAccount } from '../services/importedAccountsService';
import { useAppContext } from '../AppContext';
import { ContaBancariaMapping } from '../types/Mapping';

interface FileToImport {
  file: File;
  suggestedAccount: ContaBancariaMapping | null;
  selectedAccountId: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  lancamentosCount?: number;
  transferenciasCount?: number;
}

const formatAccountNumber = (numeroConta: string) => {
  if (!numeroConta || numeroConta.length < 2) return numeroConta;
  const digits = numeroConta.replace(/\D/g, '');
  if (digits.length < 2) return numeroConta;
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
};

export default function BatchImportPage() {
  const navigate = useNavigate();
  const { addTransfersAndPair } = useAppContext();
  const [files, setFiles] = useState<FileToImport[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [planoContas, setPlanoContas] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancariaMapping[]>([]);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plano, contas] = await Promise.all([
        hybridMappingService.getPlanoContas(),
        hybridMappingService.getContasBancarias()
      ]);
      setPlanoContas(plano);
      setContasBancarias(contas);
      console.log('Dados carregados:', { planoContas: plano.length, contasBancarias: contas.length });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const getContaName = (codigoContabil: string) => {
    const conta = planoContas.find(p => p.codigo === codigoContabil);
    return conta?.nome || '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    const newFiles: FileToImport[] = selectedFiles.map(file => {
      const suggestedAccount = mappingService.suggestContaFromFilename(file.name);

      return {
        file,
        suggestedAccount,
        selectedAccountId: suggestedAccount?.id || '',
        status: 'pending' as const,
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleAccountChange = (index: number, accountId: string) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index].selectedAccountId = accountId;
      return updated;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessAll = async () => {
    setProcessing(true);
    setProgress(0);

    const filesToProcess = files.filter(f => f.selectedAccountId && f.status !== 'success');

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileItem = filesToProcess[i];
      const fileIndex = files.indexOf(fileItem);

      // Atualizar status para processando
      setFiles(prev => {
        const updated = [...prev];
        updated[fileIndex].status = 'processing';
        return updated;
      });

      try {
        const account = contasBancarias.find(c => c.id === fileItem.selectedAccountId);
        if (!account) {
          throw new Error('Conta não encontrada');
        }

        // Parse Excel
        const excelEntries = await parseExcelFile(fileItem.file);

        if (excelEntries.length === 0) {
          throw new Error('Nenhum lançamento encontrado no arquivo');
        }

        // Process entries separando financeiros de transferências
        const classificacoes = await hybridMappingService.getClassificacoes();
        const { financialEntries, transfers } = processEntriesWithTransferSeparation(
          excelEntries,
          classificacoes,
          account
        );

        // Calcular saldo usando o último lançamento do Excel
        const ultimoLancamentoExcel = excelEntries[excelEntries.length - 1];
        const saldoFinal = Math.abs(ultimoLancamentoExcel.saldo);

        // Salvar lançamentos financeiros
        if (financialEntries.length > 0) {
          const { loadImportedAccounts, saveImportedAccounts } = await import('../services/importedAccountsService');
          const store = loadImportedAccounts();

          const existingIndex = store.accounts.findIndex(
            (acc) => acc.contaBancaria.id === account.id
          );

          const importedAccount = {
            id: `imported-${Date.now()}-${Math.random()}`,
            contaBancaria: account,
            lancamentos: financialEntries,
            saldo: saldoFinal,
            importedAt: new Date(),
            lastUpdated: new Date(),
            exported: false,
          };

          if (existingIndex >= 0) {
            store.accounts[existingIndex] = {
              ...store.accounts[existingIndex],
              lancamentos: [...store.accounts[existingIndex].lancamentos, ...financialEntries],
              saldo: saldoFinal,
              lastUpdated: new Date(),
            };
          } else {
            store.accounts.push(importedAccount);
          }

          saveImportedAccounts(store);
        }

        // Adicionar transferências
        if (transfers.length > 0) {
          addTransfersAndPair(transfers);
        }

        // Atualizar status para sucesso
        setFiles(prev => {
          const updated = [...prev];
          updated[fileIndex].status = 'success';
          updated[fileIndex].lancamentosCount = financialEntries.length;
          updated[fileIndex].transferenciasCount = transfers.length;
          return updated;
        });

      } catch (err) {
        // Atualizar status para erro
        setFiles(prev => {
          const updated = [...prev];
          updated[fileIndex].status = 'error';
          updated[fileIndex].error = err instanceof Error ? err.message : 'Erro desconhecido';
          return updated;
        });
      }

      // Atualizar progresso
      setProgress(((i + 1) / filesToProcess.length) * 100);
    }

    setProcessing(false);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Importação em Lote</Typography>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/')}>
          Voltar
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecione múltiplos arquivos Excel para importar de uma vez. O sistema tentará sugerir automaticamente a conta baseada no nome do arquivo.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Formato do nome do arquivo:</strong> Use o número da conta com dígito (ex: 10789-1.xlsx para conta corrente, 10789-1A.xlsx para aplicação)
          </Typography>

          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            sx={{ mt: 2 }}
            disabled={processing}
          >
            Selecionar Arquivos Excel
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileChange}
            />
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <>
          {/* Estatísticas */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6">{files.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total de Arquivos</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" color="warning.main">{pendingCount}</Typography>
                <Typography variant="body2" color="text.secondary">Pendentes</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" color="success.main">{successCount}</Typography>
                <Typography variant="body2" color="text.secondary">Importados</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" color="error.main">{errorCount}</Typography>
                <Typography variant="body2" color="text.secondary">Erros</Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Barra de Progresso */}
          {processing && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Processando... {Math.round(progress)}%
              </Typography>
            </Box>
          )}

          {/* Botão de Processar */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleProcessAll}
              disabled={processing || pendingCount === 0}
            >
              {processing ? 'Processando...' : `Processar ${pendingCount} Arquivo(s)`}
            </Button>
          </Box>

          {/* Tabela de Arquivos */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Arquivo</TableCell>
                  <TableCell>Conta Sugerida</TableCell>
                  <TableCell>Conta Selecionada</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((fileItem, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {fileItem.file.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {fileItem.suggestedAccount ? (
                        <Chip
                          label={`${formatAccountNumber(fileItem.suggestedAccount.numeroConta)} ${fileItem.suggestedAccount.tipoAplicacao || ''}`}
                          color="info"
                          size="small"
                        />
                      ) : (
                        <Chip label="Não detectada" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 200 }} disabled={fileItem.status === 'success' || processing}>
                        <Select
                          value={fileItem.selectedAccountId}
                          onChange={(e) => handleAccountChange(index, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Selecione uma conta</em>
                          </MenuItem>
                          {contasBancarias.map((conta) => {
                            const nomeRubrica = getContaName(conta.codigoContabil);
                            return (
                              <MenuItem key={conta.id} value={conta.id}>
                                {formatAccountNumber(conta.numeroConta)} - {conta.codigoContabil}
                                {nomeRubrica && ` - ${nomeRubrica}`}
                                {conta.tipoAplicacao && ` (${conta.tipoAplicacao})`}
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {fileItem.status === 'pending' && (
                        <Chip label="Pendente" color="default" size="small" />
                      )}
                      {fileItem.status === 'processing' && (
                        <Chip label="Processando..." color="info" size="small" />
                      )}
                      {fileItem.status === 'success' && (
                        <Chip icon={<CheckCircleIcon />} label="Sucesso" color="success" size="small" />
                      )}
                      {fileItem.status === 'error' && (
                        <Chip icon={<WarningIcon />} label="Erro" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {fileItem.status === 'success' && (
                        <Typography variant="body2" color="text.secondary">
                          {fileItem.lancamentosCount} lançamentos, {fileItem.transferenciasCount} transferências
                        </Typography>
                      )}
                      {fileItem.status === 'error' && (
                        <Typography variant="body2" color="error">
                          {fileItem.error}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFile(index)}
                        disabled={processing}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {successCount > 0 && !processing && (
            <Alert severity="success" sx={{ mt: 3 }}>
              {successCount} arquivo(s) importado(s) com sucesso!
              <Button size="small" onClick={() => navigate('/contas')} sx={{ ml: 2 }}>
                Ver Contas Importadas
              </Button>
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material';
import { Upload as UploadIcon, Search as SearchIcon } from '@mui/icons-material';
import { parseExcelFile } from '../services/excelParser';
import { processEntriesWithTransferSeparation } from '../services/entryProcessor';
import { hybridMappingService } from '../services/hybridMappingService';
import { addOrUpdateImportedAccount } from '../services/importedAccountsService';
import { useAppContext } from '../AppContext';

const formatAccountNumber = (numeroConta: string) => {
  if (!numeroConta || numeroConta.length < 2) return numeroConta;
  const digits = numeroConta.replace(/\D/g, '');
  if (digits.length < 2) return numeroConta;
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
};

export default function ImportPage() {
  const navigate = useNavigate();
  const { addTransfersAndPair } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  React.useEffect(() => {
    loadContasBancarias();
  }, []);

  const loadContasBancarias = async () => {
    try {
      const contas = await hybridMappingService.getContasBancarias();
      setContasBancarias(contas);
      console.log('Contas bancárias carregadas:', contas.length);
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
    }
  };

  const contasFiltradas = useMemo(() => {
    let contas = contasBancarias;

    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      contas = contasBancarias.filter((conta) => {
        const numeroConta = conta.numeroConta.toLowerCase();
        const codigoContabil = conta.codigoContabil.toLowerCase();
        const descricao = (conta.descricao || '').toLowerCase();
        const tipoAplicacao = (conta.tipoAplicacao || '').toLowerCase();

        return (
          numeroConta.includes(termo) ||
          codigoContabil.includes(termo) ||
          descricao.includes(termo) ||
          tipoAplicacao.includes(termo)
        );
      });
    }

    // Ordenar por número de conta (numérico)
    return contas.sort((a, b) => {
      const numA = parseInt(a.numeroConta.replace(/\D/g, ''), 10);
      const numB = parseInt(b.numeroConta.replace(/\D/g, ''), 10);
      return numA - numB;
    });
  }, [contasBancarias, searchTerm]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Selecione um arquivo Excel');
      return;
    }

    if (!selectedAccountId) {
      setError('Selecione uma conta bancária');
      return;
    }

    const account = contasBancarias.find((c) => c.id === selectedAccountId);
    if (!account) {
      setError('Conta bancária não encontrada');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Parse Excel
      const excelEntries = await parseExcelFile(file);

      if (excelEntries.length === 0) {
        setError('Nenhum lançamento encontrado no arquivo');
        setLoading(false);
        return;
      }

      // Process entries separando financeiros de transferências
      const classificacoes = await hybridMappingService.getClassificacoes();
      const { financialEntries, transfers } = processEntriesWithTransferSeparation(
        excelEntries,
        classificacoes,
        account
      );

      console.log('📊 Resultado do processamento:');
      console.log(`  - Total de entradas no Excel: ${excelEntries.length}`);
      console.log(`  - Lançamentos financeiros: ${financialEntries.length}`);
      console.log(`  - Transferências detectadas: ${transfers.length}`);

      if (transfers.length > 0) {
        console.log('📋 Transferências detectadas:');
        transfers.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.date} - ${t.direction} - ${t.amount} - ${t.historico.substring(0, 50)}...`);
        });
      }

      // Calcular saldo usando o último lançamento do Excel (antes da separação)
      const ultimoLancamentoExcel = excelEntries[excelEntries.length - 1];

      // Para contas bancárias (ATIVO), o saldo é sempre positivo
      // O símbolo indica apenas a natureza do saldo, não o sinal
      const saldoFinal = Math.abs(ultimoLancamentoExcel.saldo);

      console.log(`💰 Saldo final da conta: ${saldoFinal} (símbolo: ${ultimoLancamentoExcel.simbolo})`);

      // Salvar lançamentos financeiros na conta importada (com saldo correto)
      if (financialEntries.length > 0) {
        // Criar conta importada manualmente com saldo correto
        const importedAccount = {
          id: `imported-${Date.now()}-${Math.random()}`,
          contaBancaria: account,
          lancamentos: financialEntries,
          saldo: saldoFinal,
          importedAt: new Date(),
          lastUpdated: new Date(),
        };

        // Salvar diretamente
        const { loadImportedAccounts, saveImportedAccounts } = await import('../services/importedAccountsService');
        const store = await loadImportedAccounts();

        // Verificar se conta já existe
        const existingIndex = store.accounts.findIndex(
          (acc) => acc.contaBancaria.id === account.id
        );

        if (existingIndex >= 0) {
          // Atualizar conta existente
          store.accounts[existingIndex] = {
            ...store.accounts[existingIndex],
            lancamentos: [...store.accounts[existingIndex].lancamentos, ...financialEntries],
            saldo: saldoFinal,
            lastUpdated: new Date(),
          };
        } else {
          // Adicionar nova conta
          store.accounts.push(importedAccount);
        }

        await saveImportedAccounts(store);
        console.log('✅ Lançamentos financeiros salvos com saldo correto');
      }

      // Adicionar transferências ao store e parear automaticamente
      if (transfers.length > 0) {
        addTransfersAndPair(transfers);
        console.log('✅ Transferências adicionadas e pareamento executado');
      }

      // Mostrar mensagem de sucesso
      setSuccess(
        `Importação concluída! ${financialEntries.length} lançamentos financeiros e ${transfers.length} transferências processados.`
      );

      // Limpar formulário
      setFile(null);
      setSelectedAccountId('');

      // Aguardar 2 segundos e navegar para página de contas
      setTimeout(() => {
        navigate('/contas');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Importar Lançamentos
      </Typography>

      <Card sx={{ maxWidth: 600, mt: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selecione o arquivo Excel com os lançamentos
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ mt: 1 }}
              >
                {file ? file.name : 'Escolher Arquivo Excel'}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </Button>
            </Box>

            <Box>
              <TextField
                label="Buscar Conta"
                placeholder="Digite número, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                fullWidth
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Conta Bancária</InputLabel>
              <Select
                value={selectedAccountId}
                label="Conta Bancária"
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {contasFiltradas.length === 0 && searchTerm && (
                  <MenuItem disabled>
                    Nenhuma conta encontrada
                  </MenuItem>
                )}
                {contasFiltradas.length === 0 && !searchTerm && (
                  <MenuItem disabled>
                    Nenhuma conta cadastrada
                  </MenuItem>
                )}
                {contasFiltradas.map((conta) => (
                  <MenuItem key={conta.id} value={conta.id}>
                    {formatAccountNumber(conta.numeroConta)} - {conta.codigoContabil}
                    {conta.tipoAplicacao && ` (${conta.tipoAplicacao})`}
                    {conta.descricao && ` - ${conta.descricao}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {contasBancarias.length === 0 && (
              <Alert severity="warning">
                Nenhuma conta bancária cadastrada. Acesse a página de Mapeamento
                para cadastrar contas.
              </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Button
              variant="contained"
              size="large"
              onClick={handleProcess}
              disabled={loading || !file || !selectedAccountId}
              fullWidth
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Processando...
                </>
              ) : (
                'Processar'
              )}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

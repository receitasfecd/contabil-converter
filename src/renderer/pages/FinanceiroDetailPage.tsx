import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { loadImportedAccounts, deleteImportedAccount } from '../services/importedAccountsService';
import { ImportedAccount } from '../types/ImportedAccount';
import { generateCSV, downloadCSV, generateFilename } from '../services/csvExporter';
import BankIcon from '../components/BankIcon';

export default function FinanceiroDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<ImportedAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [accountId]);

  const loadData = () => {
    try {
      const store = loadImportedAccounts();
      const found = store.accounts.find(acc => acc.id === accountId);
      setAccount(found || null);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Deseja realmente excluir esta conta e todos os seus lançamentos?')) {
      if (account) {
        deleteImportedAccount(account.id);
        navigate('/financeiro');
      }
    }
  };

  const handleExport = () => {
    if (account) {
      const csv = generateCSV(account.lancamentos);
      const filename = generateFilename(
        account.contaBancaria.numeroConta,
        account.contaBancaria.tipoAplicacao
      );
      downloadCSV(csv, filename);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!account) {
    return (
      <Box>
        <Alert severity="error">Conta não encontrada</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/financeiro')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/financeiro')} sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BankIcon banco={account.contaBancaria.banco} />
              <Box>
                <Typography variant="h5">
                  Conta {account.contaBancaria.numeroConta}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {account.contaBancaria.codigoContabil} - {account.contaBancaria.descricao}
                </Typography>
                <Chip
                  label={account.contaBancaria.tipoAplicacao ? `Aplicação ${account.contaBancaria.tipoAplicacao}` : 'Conta Corrente'}
                  size="small"
                  color={account.contaBancaria.tipoAplicacao ? 'secondary' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4" color="primary">
                {formatCurrency(account.saldo.toString())}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Exportar CSV
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Excluir Conta
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lançamentos ({account.lancamentos.length})
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Histórico</TableCell>
                  <TableCell>Débito</TableCell>
                  <TableCell>Crédito</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Tipo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {account.lancamentos.map((lanc, index) => (
                  <TableRow key={index}>
                    <TableCell>{lanc.data}</TableCell>
                    <TableCell>{lanc.historico}</TableCell>
                    <TableCell>{lanc.debito || '-'}</TableCell>
                    <TableCell>{lanc.credito || '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(lanc.valor)}</TableCell>
                    <TableCell>
                      <Chip
                        label={lanc.tipo}
                        size="small"
                        color={lanc.tipo === 'FINANCEIRO' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

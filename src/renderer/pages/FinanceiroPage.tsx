import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { loadImportedAccounts, deleteImportedAccount } from '../services/importedAccountsService';
import { ImportedAccount } from '../types/ImportedAccount';
import { generateCSV, downloadCSV, generateFilename } from '../services/csvExporter';
import BankIcon from '../components/BankIcon';

export default function FinanceiroPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const store = loadImportedAccounts();
      setAccounts(store.accounts);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setLoading(false);
    }
  };

  const handleDelete = (accountId: string) => {
    if (confirm('Deseja realmente excluir esta conta e todos os seus lançamentos?')) {
      deleteImportedAccount(accountId);
      loadData();
    }
  };

  const handleView = (accountId: string) => {
    navigate(`/financeiro/${accountId}`);
  };

  const handleExport = (account: ImportedAccount) => {
    const csv = generateCSV(account.lancamentos);
    const filename = generateFilename(
      account.contaBancaria.numeroConta,
      account.contaBancaria.tipoAplicacao
    );
    downloadCSV(csv, filename);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getAccountType = (tipoAplicacao?: 'A' | 'A2' | 'A3' | null) => {
    if (!tipoAplicacao) return 'Conta Corrente';
    return `Aplicação ${tipoAplicacao}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financeiro
      </Typography>

      {accounts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          Nenhuma conta importada ainda. Vá para a página de Importar para começar.
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ mt: 3 }}>
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BankIcon banco={account.contaBancaria.banco} />
                    <Box>
                      <Typography variant="h6">
                        Conta {account.contaBancaria.numeroConta}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.contaBancaria.codigoContabil} - {account.contaBancaria.descricao}
                      </Typography>
                      <Chip
                        label={getAccountType(account.contaBancaria.tipoAplicacao)}
                        size="small"
                        color={account.contaBancaria.tipoAplicacao ? 'secondary' : 'primary'}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" color="primary">
                      {formatCurrency(account.saldo)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {account.lancamentos.length} lançamentos
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(account.id)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport(account)}
                  >
                    Exportar
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(account.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

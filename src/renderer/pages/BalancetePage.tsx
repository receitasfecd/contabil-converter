import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Stack,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { loadImportedAccounts } from '../services/importedAccountsService';
import { loadTransferStore } from '../services/transferStore';
import { mappingService } from '../services/mappingService';
import { ImportedAccount } from '../types/ImportedAccount';

interface BalanceteItem {
  codigo: string;
  nome: string;
  nivel: number;
  saldoLancamentos: number;
  saldoTransferencias: number;
  saldoTotal: number;
  children?: BalanceteItem[];
}

export default function BalancetePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [balancete, setBalancete] = useState<BalanceteItem[]>([]);
  const [title, setTitle] = useState('Balancete Geral');

  const accountId = searchParams.get('accountId');
  const grupo = searchParams.get('grupo');

  useEffect(() => {
    setBalancete(balanceteData);

    // Atualizar título
    if (accountId) {
      const store = loadImportedAccounts();
      const account = store.accounts.find(acc => acc.id === accountId);
      if (account) {
        setTitle(`Balancete - ${account.contaBancaria.numeroConta}`);
      }
    } else if (grupo) {
      setTitle(`Balancete - ${grupo}`);
    } else {
      setTitle('Balancete Geral');
    }
  }, [accountId, grupo, balanceteData]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }, []);

  const getIndentation = useCallback((nivel: number) => {
    return nivel * 20;
  }, []);

  const balanceteData = useMemo(() => {
    const store = loadImportedAccounts();
    const transferStore = loadTransferStore();
    const planoContas = mappingService.getPlanoContas();

    let filteredAccounts: ImportedAccount[] = store.accounts;

    // Filtrar por conta específica
    if (accountId) {
      const account = store.accounts.find(acc => acc.id === accountId);
      if (account) {
        filteredAccounts = [account];
      }
    }
    // Filtrar por grupo
    else if (grupo) {
      filteredAccounts = store.accounts.filter(acc => {
        const codigoContabil = acc.contaBancaria.codigoContabil;
        const grupoItem = planoContas
          .filter(item => item.nivel <= 2)
          .find(item => codigoContabil.startsWith(item.codigo));
        return grupoItem?.nome === grupo;
      });
    }

    // Calcular saldos por código contábil
    const saldosPorCodigo: { [key: string]: { lancamentos: number; transferencias: number } } = {};

    // Somar lançamentos financeiros
    filteredAccounts.forEach(account => {
      const codigo = account.contaBancaria.codigoContabil;
      if (!saldosPorCodigo[codigo]) {
        saldosPorCodigo[codigo] = { lancamentos: 0, transferencias: 0 };
      }
      saldosPorCodigo[codigo].lancamentos += account.saldo;
    });

    // Somar transferências (apenas as pareadas e não exportadas)
    transferStore.paired
      .filter(pair => !pair.exported)
      .forEach(pair => {
        const outCode = pair.outTransfer.accountCode;
        const inCode = pair.inTransfer.accountCode;
        const amount = parseFloat(pair.outTransfer.amount.replace(/\./g, '').replace(',', '.'));

        // Filtrar se necessário
        const outAccount = filteredAccounts.find(acc => acc.contaBancaria.codigoContabil === outCode);
        const inAccount = filteredAccounts.find(acc => acc.contaBancaria.codigoContabil === inCode);

        if (accountId) {
          // Se filtrado por conta, só incluir transferências dessa conta
          if (outAccount) {
            if (!saldosPorCodigo[outCode]) {
              saldosPorCodigo[outCode] = { lancamentos: 0, transferencias: 0 };
            }
            saldosPorCodigo[outCode].transferencias -= amount;
          }
          if (inAccount) {
            if (!saldosPorCodigo[inCode]) {
              saldosPorCodigo[inCode] = { lancamentos: 0, transferencias: 0 };
            }
            saldosPorCodigo[inCode].transferencias += amount;
          }
        } else {
          // Balancete geral ou por grupo
          if (!saldosPorCodigo[outCode]) {
            saldosPorCodigo[outCode] = { lancamentos: 0, transferencias: 0 };
          }
          if (!saldosPorCodigo[inCode]) {
            saldosPorCodigo[inCode] = { lancamentos: 0, transferencias: 0 };
          }
          saldosPorCodigo[outCode].transferencias -= amount;
          saldosPorCodigo[inCode].transferencias += amount;
        }
      });

    // Construir estrutura hierárquica do balancete
    const balanceteItems: BalanceteItem[] = [];

    // Adicionar contas do plano de contas
    planoContas.forEach(item => {
      const saldos = saldosPorCodigo[item.codigo] || { lancamentos: 0, transferencias: 0 };

      // Calcular saldo total dos filhos
      let saldoFilhosLancamentos = 0;
      let saldoFilhosTransferencias = 0;

      Object.keys(saldosPorCodigo).forEach(codigo => {
        if (codigo.startsWith(item.codigo) && codigo !== item.codigo) {
          saldoFilhosLancamentos += saldosPorCodigo[codigo].lancamentos;
          saldoFilhosTransferencias += saldosPorCodigo[codigo].transferencias;
        }
      });

      const saldoLancamentos = saldos.lancamentos + saldoFilhosLancamentos;
      const saldoTransferencias = saldos.transferencias + saldoFilhosTransferencias;
      const saldoTotal = saldoLancamentos + saldoTransferencias;

      // Só incluir se tiver saldo
      if (saldoTotal !== 0 || saldos.lancamentos !== 0 || saldos.transferencias !== 0) {
        balanceteItems.push({
          codigo: item.codigo,
          nome: item.nome,
          nivel: item.nivel,
          saldoLancamentos,
          saldoTransferencias,
          saldoTotal,
        });
      }
    });

    return balanceteItems;
  }, [accountId, grupo]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{title}</Typography>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/contas')}>
          Voltar
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nome da Conta</TableCell>
                  <TableCell align="right">Saldo Lançamentos</TableCell>
                  <TableCell align="right">Saldo Transferências</TableCell>
                  <TableCell align="right">Saldo Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balancete.map((item) => (
                  <TableRow
                    key={item.codigo}
                    sx={{
                      backgroundColor: item.nivel === 1 ? 'action.hover' : 'inherit',
                      fontWeight: item.nivel <= 2 ? 'bold' : 'normal',
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={item.nivel <= 2 ? 'bold' : 'normal'}
                        sx={{ pl: getIndentation(item.nivel) }}
                      >
                        {item.codigo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={item.nivel <= 2 ? 'bold' : 'normal'}
                      >
                        {item.nome}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: item.saldoLancamentos >= 0 ? 'success.main' : 'error.main',
                        fontWeight: item.nivel <= 2 ? 'bold' : 'normal',
                      }}
                    >
                      {formatCurrency(item.saldoLancamentos)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: item.saldoTransferencias >= 0 ? 'success.main' : 'error.main',
                        fontWeight: item.nivel <= 2 ? 'bold' : 'normal',
                      }}
                    >
                      {formatCurrency(item.saldoTransferencias)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: item.saldoTotal >= 0 ? 'success.main' : 'error.main',
                        fontWeight: 'bold',
                      }}
                    >
                      {formatCurrency(item.saldoTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {balancete.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum dado disponível para o balancete
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo
          </Typography>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Lançamentos
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCurrency(balancete.reduce((sum, item) => sum + item.saldoLancamentos, 0))}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Transferências
              </Typography>
              <Typography variant="h6" color="secondary.main">
                {formatCurrency(balancete.reduce((sum, item) => sum + item.saldoTransferencias, 0))}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Saldo Total
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(balancete.reduce((sum, item) => sum + item.saldoTotal, 0))}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

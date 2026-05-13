import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { logService } from '../services/logService';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  const loadLogs = () => {
    const filter: any = {};
    if (levelFilter !== 'all') filter.level = levelFilter;
    if (categoryFilter !== 'all') filter.category = categoryFilter;

    const allLogs = logService.getLogs(filter);
    setLogs(allLogs);

    const errors = logService.getRecentErrors(5);
    setRecentErrors(errors);
  };

  useEffect(() => {
    loadLogs();
  }, [levelFilter, categoryFilter]);

  const handleDownload = () => {
    logService.downloadLogs();
  };

  const handleClear = () => {
    if (confirm('Deseja realmente limpar todos os logs?')) {
      logService.clearLogs();
      loadLogs();
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Data/Hora',
      width: 180,
      valueFormatter: (params) => {
        const date = new Date(params.value);
        return date.toLocaleString('pt-BR');
      },
    },
    {
      field: 'level',
      headerName: 'Nível',
      width: 100,
      renderCell: (params) => {
        const colors: any = {
          info: 'info',
          warn: 'warning',
          error: 'error',
          debug: 'default',
        };
        return (
          <Chip
            label={params.value.toUpperCase()}
            color={colors[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'category',
      headerName: 'Categoria',
      width: 150,
    },
    {
      field: 'message',
      headerName: 'Mensagem',
      flex: 1,
      minWidth: 300,
    },
    {
      field: 'data',
      headerName: 'Dados',
      width: 100,
      renderCell: (params) => {
        if (params.value) {
          return (
            <Button
              size="small"
              onClick={() => {
                alert(JSON.stringify(params.value, null, 2));
              }}
            >
              Ver
            </Button>
          );
        }
        return '-';
      },
    },
  ];

  // Obter categorias únicas
  const categories = Array.from(
    new Set(logService.getLogs().map((log) => log.category))
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Logs do Sistema
      </Typography>

      {/* Erros Recentes */}
      {recentErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            {recentErrors.length} erro(s) nos últimos 5 minutos
          </Typography>
          {recentErrors.slice(0, 3).map((error, i) => (
            <Typography key={i} variant="body2">
              • {error.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Controles */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              select
              label="Nível"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warn">Aviso</MenuItem>
              <MenuItem value="error">Erro</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </TextField>

            <TextField
              select
              label="Categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">Todas</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadLogs}
            >
              Atualizar
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Baixar Logs
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClear}
            >
              Limpar
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Total de logs: {logs.length}
          </Typography>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={logs.map((log, i) => ({ ...log, id: i }))}
              columns={columns}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
                sorting: {
                  sortModel: [{ field: 'timestamp', sort: 'desc' }],
                },
              }}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

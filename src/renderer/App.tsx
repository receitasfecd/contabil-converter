import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, CircularProgress, Button } from '@mui/material';
import { Upload, Settings, Preview, SwapHoriz, AccountBalance, UploadFile, AttachMoney, Logout, Business, AccountBalanceWallet } from '@mui/icons-material';
import { theme } from './theme';
import { AppProvider } from './AppContext';
import { supabase } from './services/supabaseClient';
import LoginPage from './pages/LoginPage';

// Lazy load das páginas para reduzir bundle inicial
const ImportPage = lazy(() => import('./pages/ImportPage'));
const BatchImportPage = lazy(() => import('./pages/BatchImportPage'));
const ImportContasNasajonPage = lazy(() => import('./pages/ImportContasNasajonPage'));
const MappingPage = lazy(() => import('./pages/MappingPage'));
const PreviewPage = lazy(() => import('./pages/PreviewPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const TaxasAdministracaoPage = lazy(() => import('./pages/TaxasAdministracaoPage'));
const TaxaConfigPage = lazy(() => import('./pages/TaxaConfigPage'));
const ImportedAccountsPage = lazy(() => import('./pages/ImportedAccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const BalancetePage = lazy(() => import('./pages/BalancetePage'));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const JoinOrgPage = lazy(() => import('./pages/JoinOrgPage'));
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'));
const FinanceiroDetailPage = lazy(() => import('./pages/FinanceiroDetailPage'));

const drawerWidth = 240;

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!session) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={() => {}} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Router>
          <Box sx={{ display: 'flex' }}>
            <AppBar
              position="fixed"
              sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
              <Toolbar>
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                  Conversor Contábil Nasajon
                </Typography>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  {session?.user?.email}
                </Typography>
                <Button
                  color="inherit"
                  startIcon={<Logout />}
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </Toolbar>
            </AppBar>

            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                },
              }}
            >
              <Toolbar />
              <Box sx={{ overflow: 'auto' }}>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/">
                      <ListItemIcon>
                        <Upload />
                      </ListItemIcon>
                      <ListItemText primary="Importar" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/importacao-lote">
                      <ListItemIcon>
                        <UploadFile />
                      </ListItemIcon>
                      <ListItemText primary="Importação em Lote" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/contas">
                      <ListItemIcon>
                        <AccountBalance />
                      </ListItemIcon>
                      <ListItemText primary="Contas" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/financeiro">
                      <ListItemIcon>
                        <AccountBalanceWallet />
                      </ListItemIcon>
                      <ListItemText primary="Financeiro" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/mapeamento">
                      <ListItemIcon>
                        <Settings />
                      </ListItemIcon>
                      <ListItemText primary="Mapeamento" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/transferencias">
                      <ListItemIcon>
                        <SwapHoriz />
                      </ListItemIcon>
                      <ListItemText primary="Transferências" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/taxas-administracao">
                      <ListItemIcon>
                        <AttachMoney />
                      </ListItemIcon>
                      <ListItemText primary="Taxas de Administração" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/taxas-config">
                      <ListItemIcon>
                        <Settings />
                      </ListItemIcon>
                      <ListItemText primary="Config. Taxas" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/preview">
                      <ListItemIcon>
                        <Preview />
                      </ListItemIcon>
                      <ListItemText primary="Preview" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/organizacao">
                      <ListItemIcon>
                        <Business />
                      </ListItemIcon>
                      <ListItemText primary="Organização" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Box>
            </Drawer>

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                backgroundColor: 'background.default',
                minHeight: '100vh',
              }}
            >
              <Toolbar />
              <Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                  <CircularProgress />
                </Box>
              }>
                <Routes>
                  <Route path="/" element={<ImportPage />} />
                  <Route path="/importacao-lote" element={<BatchImportPage />} />
                  <Route path="/importar-nasajon" element={<ImportContasNasajonPage />} />
                  <Route path="/contas" element={<ImportedAccountsPage />} />
                  <Route path="/contas/:accountId" element={<AccountDetailPage />} />
                  <Route path="/financeiro" element={<FinanceiroPage />} />
                  <Route path="/financeiro/:accountId" element={<FinanceiroDetailPage />} />
                  <Route path="/mapeamento" element={<MappingPage />} />
                  <Route path="/transferencias" element={<TransfersPage />} />
                  <Route path="/taxas-administracao" element={<TaxasAdministracaoPage />} />
                  <Route path="/taxas-config" element={<TaxaConfigPage />} />
                  <Route path="/preview" element={<PreviewPage />} />
                  <Route path="/balancete" element={<BalancetePage />} />
                  <Route path="/organizacao" element={<OrganizationPage />} />
                  <Route path="/aceitar-convite" element={<AcceptInvitePage />} />
                  <Route path="/entrar/:code" element={<JoinOrgPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <Box sx={{ position: 'fixed', bottom: 16, left: 16, color: 'text.secondary', fontSize: '0.75rem', zIndex: 1000 }}>
                Versão 0.1
              </Box>
            </Box>
          </Box>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;

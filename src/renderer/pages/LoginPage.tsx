import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
    } else if (data.user) {
      onLoginSuccess();
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
    } else if (data.user) {
      setSuccess('Conta criada com sucesso! Você já pode fazer login.');
      setTabIndex(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tabIndex === 0) {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Conversor Contábil
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Sistema de conversão para Nasajon
          </Typography>

          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
            <Tab label="Login" />
            <Tab label="Criar Conta" />
          </Tabs>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
              />

              <TextField
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete={tabIndex === 0 ? 'current-password' : 'new-password'}
                helperText={tabIndex === 1 ? 'Mínimo 6 caracteres' : ''}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="large"
              >
                {loading ? 'Aguarde...' : tabIndex === 0 ? 'Entrar' : 'Criar Conta'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';

import Container from '../../components/Container';
import FavIcon from '../../../public/assets/favIcon.svg';
import { authService } from '../../services/auth-services';
import { useNotificacao } from '../../components/Notificacao/NotificationProvider';

export default function EsqueceuSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [solicitacaoEnviada, setSolicitacaoEnviada] =
    useState(false);

  const { notificar } = useNotificacao();
  const theme = useTheme();

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setEnviando(true);
      setSolicitacaoEnviada(false);

      await authService.solicitarRecuperacaoSenha(
        email.trim()
      );

      setSolicitacaoEnviada(true);
    } catch (error: any) {
      notificar(
        error.response?.data?.error ||
          'Não foi possível solicitar a recuperação de senha.',
        'error'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F4F4F4',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 4, sm: 0 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 400,
          borderRadius: '12px',
          border: (tema) =>
            `1px solid ${tema.palette.grey[200]}`,
          textAlign: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={1}
          mb={1}
        >
          <img
            src={FavIcon}
            alt="Logo UniEduca"
            width={35}
            height={35}
          />

          <Typography variant="h5" fontWeight="bold">
            UniEduca
          </Typography>
        </Box>

        <Typography
          variant="h6"
          fontWeight="bold"
          mt={3}
        >
          Recuperar senha
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          mt={1}
          mb={3}
        >
          Informe seu e-mail para receber o link de
          redefinição da senha.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {solicitacaoEnviada && (
              <Alert severity="success">
                Se o e-mail estiver cadastrado, você
                receberá as instruções para redefinir sua
                senha.
              </Alert>
            )}

            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              fullWidth
              disabled={enviando}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={enviando}
              sx={{
                width: '100%',
                py: 1.5,
                fontWeight: 'bold',
              }}
            >
              {enviando
                ? 'Enviando...'
                : 'Enviar link de recuperação'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" mt={3}>
          <Link
            to="/login"
            style={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            Voltar para o login
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
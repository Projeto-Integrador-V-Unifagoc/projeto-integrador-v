import { useState } from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import CampoSenha from '../../components/CampoSenha';
import Container from '../../components/Container';
import FavIcon from '../../../public/assets/favIcon.svg';
import { authService } from '../../services/auth-services';
import { formatarEspera } from '../../services/limite-requisicoes';
import { useEsperaLimite } from '../../hooks/use-espera-limite';
import { obterErroSenha } from '../../utils/senha';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] =
    useState('');
  const [enviando, setEnviando] = useState(false);
  const espera = useEsperaLimite('POST /redefinir-senha');
  const [erro, setErro] = useState('');
  const [senhaAlterada, setSenhaAlterada] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErro('');

    if (!token) {
      setErro(
        'O link de recuperação é inválido ou está incompleto.'
      );
      return;
    }

    const erroSenha = obterErroSenha(novaSenha);
    if (erroSenha) {
      setErro(erroSenha);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas informadas não são iguais.');
      return;
    }

    try {
      setEnviando(true);

      await authService.redefinirSenha({
        token,
        novaSenha,
        confirmarSenha,
      });

      setNovaSenha('');
      setConfirmarSenha('');
      setSenhaAlterada(true);
    } catch (error: any) {
      setErro(
        error.response?.data?.error ||
          'Não foi possível redefinir a senha.'
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
          border: (theme) =>
            `1px solid ${theme.palette.grey[200]}`,
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
          Definir nova senha
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          mt={1}
          mb={3}
        >
          Informe e confirme sua nova senha de acesso.
        </Typography>

        {!token && (
          <Alert severity="error" sx={{ mb: 2 }}>
            O link de recuperação é inválido ou está
            incompleto.
          </Alert>
        )}

        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        {senhaAlterada ? (
          <Stack spacing={2}>
            <Alert severity="success">
              Sua senha foi redefinida com sucesso.
            </Alert>

            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              fullWidth
              sx={{
                width: '100%',
                py: 1.5,
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              Acessar o sistema
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <CampoSenha
                label="Nova senha"
                value={novaSenha}
                onChange={setNovaSenha}
                required
                fullWidth
                disabled={enviando || !token}
                error={novaSenha.length > 0 && obterErroSenha(novaSenha) !== null}
                mostrarForca
                mostrarRequisitos
              />

              <CampoSenha
                label="Confirmar nova senha"
                value={confirmarSenha}
                onChange={setConfirmarSenha}
                required
                fullWidth
                disabled={enviando || !token}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={enviando || espera > 0 || !token}
                sx={{
                  width: '100%',
                  py: 1.5,
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                {enviando
                  ? 'Alterando...'
                  : espera > 0
                    ? `Tente novamente em ${formatarEspera(espera)}`
                    : 'Redefinir senha'}
              </Button>
            </Stack>
          </Box>
        )}

        {!senhaAlterada && (
          <Typography variant="body2" mt={3}>
            <Link
              to="/login"
              style={{
                color: '#05b5e6',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Voltar para o login
            </Link>
          </Typography>
        )}
      </Paper>
    </Container>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Stack, Paper, useTheme } from "@mui/material";
import Container from "../../components/Container";
import FavIcon from '../../../public/assets/favIcon.svg';
import { authService } from '../../services/auth-services';
import { useNotificacao } from '../../components/Notificacao/NotificationProvider';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const navigate = useNavigate();
    const { notificar } = useNotificacao();
    const theme = useTheme();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();

        try {
            const data = await authService.login({
                email: email,
                senha: senha,
            });

            localStorage.setItem('@UniEduca:token', data.token);
            localStorage.setItem('@UniEduca:user', JSON.stringify(data.user));

            notificar('Login realizado com sucesso!', 'success');

            // Todos os perfis (aluno, professor, secretaria) caem na página principal.
            navigate('/');
        } catch (error: any) {
            console.error('Erro no login:', error);
            notificar(error.response?.data?.message || 'E-mail ou senha incorretos.', 'error');
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
                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    textAlign: 'center',
                    backgroundColor: '#ffffff'
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                    <img src={FavIcon} alt="Logo UniEduca" width={35} height={35} />
                    <Typography variant="h5" fontWeight="bold" sx={{ paddingTop: 0.5 }}>
                        UniEduca
                    </Typography>
                </Box>

                <Typography variant="body2" color="textDisabled" mb={3}>
                    Bem-vindo! Insira seus dados para acessar o portal.
                </Typography>

                <Box component="form" onSubmit={handleLogin}>
                    <Stack spacing={2}>
                        <TextField
                            label="E-mail"
                            variant="outlined"
                            fullWidth
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <TextField
                            label="Senha"
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            fullWidth
                            sx={{ py: 1.5, fontWeight: 'bold' }}
                        >
                            Acessar
                        </Button>
                    </Stack>
                </Box>

                <Typography variant="body2" mt={3}>
                    <Link to="/esqueceu-senha" style={{ color: theme.palette.primary.main, fontWeight: 'bold', textDecoration: 'none', fontSize: '15px' }}>
                        Esqueceu a senha?
                    </Link>
                </Typography>
            </Paper>
        </Container>
    );
};
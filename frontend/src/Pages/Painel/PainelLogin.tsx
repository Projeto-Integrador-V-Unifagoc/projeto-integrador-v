import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Settings } from "lucide-react";

import { authService } from "../../services/auth-services";
import { ehAdministrativo } from "./PainelLayout";

const PERFIS_PERMITIDOS = ["administrador", "secretaria"];

export default function PainelLogin() {
    const navigate = useNavigate();
    const { state } = useLocation() as { state?: { semPermissao?: boolean } };

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState(state?.semPermissao ? "Seu perfil não tem acesso ao painel do site." : "");
    const [enviando, setEnviando] = useState(false);

    if (localStorage.getItem("@UniEduca:token") && ehAdministrativo() && !state?.semPermissao) {
        return <Navigate to="/painel" replace />;
    }

    async function entrar(evento: React.FormEvent) {
        evento.preventDefault();
        setErro("");
        setEnviando(true);

        try {
            const data = await authService.login({ email: email.trim().toLowerCase(), senha });
            const tipo = String(data?.user?.tipo_usuario ?? "").trim().toLowerCase();

            if (!PERFIS_PERMITIDOS.includes(tipo)) {
                setErro("Este acesso é restrito à secretaria e à administração.");
                return;
            }

            localStorage.setItem("@UniEduca:token", data.token);
            localStorage.setItem("@UniEduca:user", JSON.stringify(data.user));

            navigate("/painel", { replace: true });
        } catch (err: any) {
            setErro(err?.response?.data?.message ?? "E-mail ou senha incorretos.");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                bgcolor: "#f5f7f9",
                backgroundImage:
                    "radial-gradient(circle at 18% 22%, rgba(5,181,230,.16) 0, transparent 42%)," +
                    "radial-gradient(circle at 82% 78%, rgba(5,181,230,.12) 0, transparent 46%)," +
                    "linear-gradient(rgba(5,181,230,.06) 1px, transparent 1px)," +
                    "linear-gradient(90deg, rgba(5,181,230,.06) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 100% 100%, 26px 26px, 26px 26px",
            }}
        >
            <Paper
                elevation={0}
                sx={{ width: "100%", maxWidth: 420, borderRadius: 3, p: { xs: 3, sm: 4.5 }, bgcolor: "#fff" }}
            >
                <Stack alignItems="center" spacing={1.5} mb={3}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            bgcolor: "#05b5e6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Settings size={26} color="#fff" />
                    </Box>

                    <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f1720" }}>
                        Painel do site
                    </Typography>
                    <Typography sx={{ fontSize: ".93rem", color: "#8792a2", textAlign: "center" }}>
                        Acesso restrito à secretaria e à administração.
                    </Typography>
                </Stack>

                {erro && (
                    <Alert severity="error" sx={{ mb: 2.5 }}>
                        {erro}
                    </Alert>
                )}

                <Box component="form" onSubmit={entrar}>
                    <Stack spacing={2.2}>
                        <TextField
                            label="E-mail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                        />
                        <TextField
                            label="Senha"
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            fullWidth
                            required
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={enviando}
                            fullWidth
                            sx={{ width: "100%", height: 50, borderRadius: 2, fontSize: 15 }}
                        >
                            {enviando ? "Entrando..." : "Entrar no painel"}
                        </Button>

                        <Button
                            onClick={() => navigate("/")}
                            fullWidth
                            sx={{ width: "100%", height: 40, fontSize: 14, color: "#5b6472" }}
                        >
                            Voltar para o site
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}

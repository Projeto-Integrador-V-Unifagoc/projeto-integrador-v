import { Box, Paper, Stack, Typography } from "@mui/material";
import { ArrowLeft, ArrowRight, GraduationCap, Home, LogIn, Mail, Newspaper } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import { COR_BORDA, COR_DESTAQUE, COR_INSTITUCIONAL, GRADIENTE_CLARO, irParaPortal } from "../LandingPage/conteudo";

const ATALHOS = [
    { rotulo: "Página inicial", descricao: "Voltar para o começo do site", url: "/", Icone: Home },
    { rotulo: "Cursos", descricao: "Ver os cursos com inscrições abertas", url: "/cursos", Icone: GraduationCap },
    { rotulo: "Notícias", descricao: "Comunicados e novidades", url: "/noticias", Icone: Newspaper },
    { rotulo: "Contato", descricao: "Falar com a secretaria", url: "/contato", Icone: Mail },
];

export default function NotFound() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <Box component="section" sx={{ background: GRADIENTE_CLARO, py: { xs: 6, md: 9 } }}>
            <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 3, md: 2 } }}>
                <Stack alignItems="center" textAlign="center" spacing={1.5}>
                    <Box
                        sx={{
                            position: "relative",
                            width: { xs: 220, md: 280 },
                            height: { xs: 220, md: 280 },
                            borderRadius: "50%",
                            bgcolor: "#fff",
                            border: `1px solid ${COR_BORDA}`,
                            boxShadow: "0 18px 44px rgba(20,104,143,.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mb: 1,
                        }}
                    >
                        <Box
                            component="img"
                            src="/assets/notfound.svg"
                            alt="Página não encontrada"
                            sx={{ width: { xs: 170, md: 220 } }}
                        />

                        <Typography
                            sx={{
                                position: "absolute",
                                bottom: -14,
                                px: 2.5,
                                py: .5,
                                borderRadius: 999,
                                bgcolor: COR_DESTAQUE,
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: "1.1rem",
                                letterSpacing: 1,
                                boxShadow: "0 8px 20px rgba(5,181,230,.4)",
                            }}
                        >
                            404
                        </Typography>
                    </Box>

                    <Typography
                        component="h1"
                        sx={{
                            fontSize: { xs: "1.5rem", md: "2rem" },
                            fontWeight: 800,
                            color: COR_INSTITUCIONAL,
                            lineHeight: 1.25,
                        }}
                    >
                        Não encontramos esta página
                    </Typography>

                    <Typography sx={{ color: "#5b6472", fontSize: { xs: ".96rem", md: "1.05rem" }, maxWidth: 560, lineHeight: 1.7 }}>
                        O endereço pode ter mudado de lugar ou ter sido digitado com algum erro. Seus dados continuam
                        salvos — use um dos atalhos abaixo para continuar de onde parou.
                    </Typography>

                    {pathname && pathname !== "/" && (
                        <Typography
                            sx={{
                                mt: .5,
                                fontSize: ".82rem",
                                color: "#8b97a4",
                                bgcolor: "#fff",
                                border: `1px solid ${COR_BORDA}`,
                                borderRadius: 999,
                                px: 2,
                                py: .6,
                                wordBreak: "break-all",
                            }}
                        >
                            {pathname}
                        </Typography>
                    )}
                </Stack>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    justifyContent="center"
                    sx={{ mt: 4 }}
                >
                    <Button
                        variant="outlined"
                        sx={{ width: "auto", minWidth: 170, height: 48, borderRadius: 2, fontSize: 15 }}
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={17} style={{ marginRight: 8 }} />
                        Voltar
                    </Button>

                    <Button
                        variant="contained"
                        sx={{ width: "auto", minWidth: 190, height: 48, borderRadius: 2, fontSize: 15 }}
                        onClick={() => navigate("/")}
                    >
                        Ir para a página inicial
                        <ArrowRight size={17} style={{ marginLeft: 8 }} />
                    </Button>

                    <Button
                        variant="text"
                        sx={{ width: "auto", minWidth: 160, height: 48, fontSize: 15, color: COR_INSTITUCIONAL }}
                        onClick={() => irParaPortal(navigate)}
                    >
                        <LogIn size={17} style={{ marginRight: 8 }} />
                        Portal do aluno
                    </Button>
                </Stack>

                <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    spacing={2}
                    justifyContent="center"
                    sx={{ mt: 5 }}
                >
                    {ATALHOS.map(({ rotulo, descricao, url, Icone }) => (
                        <Paper
                            key={url}
                            elevation={0}
                            onClick={() => navigate(url)}
                            sx={{
                                cursor: "pointer",
                                width: { xs: "100%", sm: 200 },
                                p: 2.5,
                                borderRadius: 3,
                                bgcolor: "#fff",
                                border: `1px solid ${COR_BORDA}`,
                                transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    borderColor: "#c9e9f6",
                                    boxShadow: "0 12px 28px rgba(20,104,143,.12)",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2,
                                    bgcolor: "#e6f7fd",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5,
                                }}
                            >
                                <Icone size={20} color={COR_DESTAQUE} />
                            </Box>

                            <Typography sx={{ fontWeight: 700, color: COR_INSTITUCIONAL, fontSize: "1rem" }}>
                                {rotulo}
                            </Typography>
                            <Typography sx={{ color: "#6b7684", fontSize: ".86rem", lineHeight: 1.55, mt: .4 }}>
                                {descricao}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}

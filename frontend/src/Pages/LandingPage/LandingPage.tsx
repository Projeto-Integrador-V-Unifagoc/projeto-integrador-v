import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";

import HeroCarrossel from "./HeroCarrossel";
import { CartaoCurso, CartaoNoticia, Container, EstadoVazio, Grade, TituloSecao } from "./componentes";
import { DIFERENCIAIS } from "./conteudo";
import { usarSeo } from "./LayoutPublico";
import { propsDeLink } from "./navegacao";
import { useSiteContexto } from "./useSite";

export default function LandingPage() {
    const { conteudo, carregando, navegar, urlInscricao } = useSiteContexto();

    usarSeo(
        `${conteudo.configuracoes.site_nome || "UniEduca"} — Graduação com ingresso pelo ENEM`,
        conteudo.configuracoes.site_descricao ||
            "Graduação presencial com ingresso pela nota do ENEM, inscrição online e portal do aluno completo.",
    );

    const cursos = conteudo.cursos.slice(0, 3);
    const noticias = conteudo.noticias.slice(0, 3);

    return (
        <Box>
            <HeroCarrossel banners={conteudo.banners} carregando={carregando} onNavegar={navegar} />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 8 }} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={{ color: "#14688f", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}
                        >
                            Sobre a instituição
                        </Typography>

                        <Typography
                            component="h2"
                            sx={{ fontSize: { xs: "1.8rem", md: "2.3rem" }, fontWeight: 800, color: "#1f2a37", mt: 1.5, lineHeight: 1.22 }}
                        >
                            Ensino que acompanha quem estuda e trabalha
                        </Typography>

                        <Typography sx={{ color: "#4b5563", fontSize: "1.03rem", lineHeight: 1.75, mt: 2.5 }}>
                            Aulas presenciais no período noturno, professores atuantes na área e um portal do aluno que
                            centraliza notas, frequência e documentos. O processo seletivo é simples: você usa a nota do
                            ENEM e conclui a inscrição sem sair de casa.
                        </Typography>

                        <Stack spacing={2} mt={4}>
                            {DIFERENCIAIS.map((item) => (
                                <Stack key={item.titulo} direction="row" spacing={1.8} alignItems="flex-start">
                                    <CheckCircle2 size={21} color="#05b5e6" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, color: "#1f2733", fontSize: "1rem" }}>
                                            {item.titulo}
                                        </Typography>
                                        <Typography sx={{ color: "#5b6472", fontSize: ".95rem", lineHeight: 1.6 }}>
                                            {item.texto}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>

                        <Button
                            variant="outlined"
                            {...propsDeLink("/sobre", navegar)}
                            sx={{ width: "auto", mt: 4, px: 3.5, height: 48, borderRadius: 2, fontSize: 15 }}
                        >
                            Conheça a instituição
                            <ArrowRight size={17} style={{ marginLeft: 8 }} />
                        </Button>
                    </Box>

                    <Box sx={{ flex: 1, width: "100%" }}>
                        <Box
                            sx={{
                                position: "relative",
                                borderRadius: 4,
                                overflow: "hidden",
                                minHeight: { xs: 300, md: 420 },
                                background: "linear-gradient(145deg,#0b7ea8 0%,#05b5e6 55%,#38d0f5 100%)",
                                display: "flex",
                                alignItems: "flex-end",
                                p: { xs: 3, md: 4 },
                            }}
                        >
                            <Box
                                aria-hidden
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "radial-gradient(circle at 22% 20%, rgba(255,255,255,.3) 0, transparent 45%)," +
                                        "radial-gradient(circle at 85% 70%, rgba(255,255,255,.18) 0, transparent 40%)",
                                }}
                            />
                            <Box
                                aria-hidden
                                sx={{ position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)", opacity: .22 }}
                            >
                                <GraduationCap size={180} color="#fff" />
                            </Box>

                            <Paper
                                elevation={0}
                                sx={{ position: "relative", bgcolor: "rgba(255,255,255,.96)", borderRadius: 3, p: 3, width: "100%" }}
                            >
                                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#1f2a37" }}>
                                    Processo seletivo
                                </Typography>
                                <Typography sx={{ color: "#5b6472", fontSize: ".93rem", mt: .8, lineHeight: 1.6 }}>
                                    Inscrição online, sem taxa e sem prova. Resultado após a validação dos documentos
                                    pela secretaria.
                                </Typography>
                            </Paper>
                        </Box>
                    </Box>
                </Stack>
            </Container>

            <Box
                component="section"
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    background: "linear-gradient(120deg,#1379a1 0%,#0fa4d4 55%,#3ecdf2 100%)",
                    py: { xs: 7, md: 9 },
                }}
            >
                <Box
                    aria-hidden
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(circle at 80% 30%, rgba(255,255,255,.22) 0, transparent 45%)",
                    }}
                />
                <Container sx={{ position: "relative" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography
                                sx={{ color: "#9fe6ff", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}
                            >
                                Inscrições abertas
                            </Typography>
                            <Typography
                                component="h2"
                                sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.4rem" }, mt: 1, lineHeight: 1.2 }}
                            >
                                Garanta sua vaga na {conteudo.configuracoes.site_nome || "UniEduca"}
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(255,255,255,.88)", fontSize: "1.02rem", mt: 1.5, maxWidth: 560, lineHeight: 1.7 }}
                            >
                                A inscrição leva poucos minutos. Preencha seus dados, envie os documentos e acompanhe a
                                validação pelo portal do aluno.
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            {...propsDeLink(urlInscricao, navegar)}
                            sx={{
                                width: "auto",
                                flexShrink: 0,
                                px: 5,
                                height: 60,
                                fontSize: 17,
                                borderRadius: 2.5,
                                bgcolor: "#fff",
                                color: "#12688f",
                                boxShadow: "0 10px 30px rgba(0,0,0,.22)",
                                "&:hover": { bgcolor: "#eaf6fb" },
                            }}
                        >
                            FAÇA SUA INSCRIÇÃO
                            <ArrowRight size={19} style={{ marginLeft: 10 }} />
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Container sx={{ py: { xs: 8, md: 11 } }}>
                <TituloSecao chapeu="Graduação" titulo="Cursos com inscrições abertas" />

                {cursos.length === 0 ? (
                    <EstadoVazio mensagem="Nenhum curso publicado no site ainda. Cadastre os cursos no painel para exibi-los aqui." />
                ) : (
                    <Grade>
                        {cursos.map((curso) => (
                            <CartaoCurso key={curso.id} curso={curso} urlInscricao={urlInscricao} onNavegar={navegar} />
                        ))}
                    </Grade>
                )}

                {conteudo.cursos.length > 3 && (
                    <Stack alignItems="center" mt={5}>
                        <Button
                            variant="outlined"
                            {...propsDeLink("/cursos", navegar)}
                            sx={{ width: "auto", px: 4, height: 48, borderRadius: 2, fontSize: 15 }}
                        >
                            Ver todos os cursos
                            <ArrowRight size={17} style={{ marginLeft: 8 }} />
                        </Button>
                    </Stack>
                )}
            </Container>

            {noticias.length > 0 && (
                <Box component="section" sx={{ bgcolor: "#f5f8fb", py: { xs: 8, md: 11 } }}>
                    <Container>
                        <TituloSecao chapeu="Fique por dentro" titulo="Últimas notícias" />

                        <Grade>
                            {noticias.map((noticia) => (
                                <CartaoNoticia
                                    key={noticia.id}
                                    noticia={noticia}
                                    onNavegar={navegar}
                                />
                            ))}
                        </Grade>

                        <Stack alignItems="center" mt={5}>
                            <Button
                                variant="outlined"
                                {...propsDeLink("/noticias", navegar)}
                                sx={{ width: "auto", px: 4, height: 48, borderRadius: 2, fontSize: 15 }}
                            >
                                Ver todas as notícias
                                <ArrowRight size={17} style={{ marginLeft: 8 }} />
                            </Button>
                        </Stack>
                    </Container>
                </Box>
            )}
        </Box>
    );
}

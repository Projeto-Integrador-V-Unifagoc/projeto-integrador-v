import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowRight, CalendarDays, Clock, GraduationCap, ImageOff } from "lucide-react";

import type { SiteCurso, SiteNoticia } from "../../services/site-api";
import { urlImagem } from "../../services/site-api";
import {
    COR_BORDA,
    COR_DESTAQUE,
    COR_INSTITUCIONAL,
    COR_TEXTO,
    COR_TEXTO_SUAVE,
    GRADIENTE_CLARO,
    LARGURA_SITE,
} from "./conteudo";
import { propsDeLink } from "./navegacao";

export function Container({ children, sx }: { children: React.ReactNode; sx?: object }) {
    return (
        <Box sx={{ maxWidth: LARGURA_SITE, mx: "auto", px: { xs: 3, md: 6 }, ...sx }}>
            {children}
        </Box>
    );
}

export function CapaPagina({ titulo, descricao }: { titulo: string; descricao: string }) {
    return (
        <Box
            component="section"
            sx={{
                position: "relative",
                overflow: "hidden",
                background: GRADIENTE_CLARO,
                borderBottom: `1px solid ${COR_BORDA}`,
                py: { xs: 5, md: 7 },
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    right: -60,
                    top: -40,
                    width: 260,
                    height: 260,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(5,181,230,.16) 0, transparent 70%)",
                }}
            />
            <Container sx={{ position: "relative" }}>
                <Typography
                    component="h1"
                    sx={{ color: COR_INSTITUCIONAL, fontWeight: 800, fontSize: { xs: "1.9rem", md: "2.5rem" }, lineHeight: 1.15 }}
                >
                    {titulo}
                </Typography>
                <Typography
                    sx={{ color: COR_TEXTO_SUAVE, fontSize: { xs: ".98rem", md: "1.06rem" }, mt: 1.5, maxWidth: 680, lineHeight: 1.7 }}
                >
                    {descricao}
                </Typography>
            </Container>
        </Box>
    );
}

export function TituloSecao({ chapeu, titulo, centralizado = true }: { chapeu: string; titulo: string; centralizado?: boolean }) {
    return (
        <Stack
            alignItems={centralizado ? "center" : "flex-start"}
            textAlign={centralizado ? "center" : "left"}
            mb={{ xs: 4, md: 6 }}
        >
            <Typography
                sx={{ color: COR_INSTITUCIONAL, fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}
            >
                {chapeu}
            </Typography>
            <Typography
                component="h2"
                sx={{ fontSize: { xs: "1.7rem", md: "2.1rem" }, fontWeight: 800, color: COR_TEXTO, mt: 1 }}
            >
                {titulo}
            </Typography>
        </Stack>
    );
}

export function EstadoVazio({ mensagem }: { mensagem: string }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 3,
                border: "1px dashed #d6dee6",
                bgcolor: "#f9fbfd",
                textAlign: "center",
            }}
        >
            <ImageOff size={30} color="#9aa7b4" />
            <Typography sx={{ color: "#5b6472", fontSize: ".98rem", mt: 1.5 }}>{mensagem}</Typography>
        </Paper>
    );
}

export function CartaoCurso({
    curso,
    urlInscricao,
    onNavegar,
}: {
    curso: SiteCurso;
    urlInscricao: string;
    onNavegar: (url: string) => void;
}) {
    const imagem = urlImagem(curso.imagem);

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #e6ebf0",
                bgcolor: "#fff",
                transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: "0 14px 34px rgba(16,24,40,.1)",
                    borderColor: "#c9e9f6",
                },
            }}
        >
            {imagem ? (
                <Box
                    sx={{
                        height: 160,
                        backgroundImage: `url(${imagem})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            ) : (
                <Box
                    sx={{
                        height: 84,
                        display: "flex",
                        alignItems: "center",
                        px: 3.5,
                        background: GRADIENTE_CLARO,
                        borderBottom: `1px solid ${COR_BORDA}`,
                    }}
                >
                    <GraduationCap size={28} color={COR_DESTAQUE} />
                </Box>
            )}

            <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", flex: 1 }}>
                {curso.grau && (
                    <Typography
                        sx={{ fontSize: 12, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: COR_DESTAQUE }}
                    >
                        {curso.grau}
                    </Typography>
                )}

                <Typography sx={{ fontWeight: 800, fontSize: "1.12rem", color: "#1f2a37", lineHeight: 1.35, mt: .6 }}>
                    {curso.nome}
                </Typography>

                {(curso.duracao || curso.turno) && (
                    <Stack direction="row" spacing={2} mt={1.5}>
                        {curso.duracao && (
                            <Stack direction="row" spacing={.7} alignItems="center">
                                <Clock size={15} color="#7a8797" />
                                <Typography sx={{ fontSize: ".85rem", color: "#5b6472" }}>{curso.duracao}</Typography>
                            </Stack>
                        )}
                        {curso.turno && (
                            <Stack direction="row" spacing={.7} alignItems="center">
                                <CalendarDays size={15} color="#7a8797" />
                                <Typography sx={{ fontSize: ".85rem", color: "#5b6472" }}>{curso.turno}</Typography>
                            </Stack>
                        )}
                    </Stack>
                )}

                {curso.resumo && (
                    <Typography sx={{ color: "#5b6472", fontSize: ".95rem", lineHeight: 1.65, mt: 2 }}>
                        {curso.resumo}
                    </Typography>
                )}

                <Box sx={{ flex: 1 }} />

                {curso.inscricoes_abertas ? (
                    <Button
                        {...propsDeLink(urlInscricao, onNavegar)}
                        sx={{
                            width: "auto",
                            px: 0,
                            mt: 2.5,
                            fontSize: 15,
                            color: COR_DESTAQUE,
                            justifyContent: "flex-start",
                            textDecoration: "none",
                            "&:hover": { bgcolor: "transparent" },
                        }}
                    >
                        Inscrever-se
                        <ArrowRight size={16} style={{ marginLeft: 6 }} />
                    </Button>
                ) : (
                    <Typography sx={{ mt: 2.5, fontSize: ".9rem", color: "#8792a2" }}>
                        Inscrições encerradas
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}

export function formatarData(valor?: string | null): string {
    if (!valor) return "";

    const data = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(data.getTime())) return "";

    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function CartaoNoticia({
    noticia,
    onNavegar,
}: {
    noticia: SiteNoticia;
    onNavegar: (url: string) => void;
}) {
    const imagem = urlImagem(noticia.imagem);

    return (
        <Paper
            elevation={0}
            {...propsDeLink(`/noticias/${noticia.slug}`, onNavegar)}
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #e6ebf0",
                bgcolor: "#fff",
                cursor: "pointer",
                textDecoration: "none",
                color: "inherit",
                transition: "transform 220ms ease, box-shadow 220ms ease",
                "&:hover": { transform: "translateY(-5px)", boxShadow: "0 14px 34px rgba(16,24,40,.1)" },
            }}
        >
            <Box
                sx={{
                    height: 170,
                    position: "relative",
                    backgroundImage: imagem ? `url(${imagem})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    background: imagem ? undefined : "linear-gradient(135deg, #05b5e6 0%, #06304a 140%)",
                }}
            >
                {noticia.categoria_nome && (
                    <Typography
                        sx={{
                            position: "absolute",
                            left: 16,
                            bottom: 14,
                            px: 1.6,
                            py: .5,
                            borderRadius: 999,
                            bgcolor: "rgba(255,255,255,.94)",
                            color: COR_INSTITUCIONAL,
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: .4,
                        }}
                    >
                        {noticia.categoria_nome}
                    </Typography>
                )}
            </Box>

            <Box sx={{ p: 3, display: "flex", flexDirection: "column", flex: 1 }}>
                <Typography sx={{ fontSize: ".8rem", color: "#8792a2" }}>{formatarData(noticia.publicado_em)}</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#1f2a37", mt: .8, lineHeight: 1.4 }}>
                    {noticia.titulo}
                </Typography>
                <Typography sx={{ color: "#5b6472", fontSize: ".93rem", lineHeight: 1.65, mt: 1.2 }}>
                    {noticia.resumo}
                </Typography>

                <Box sx={{ flex: 1 }} />

                <Stack direction="row" spacing={.6} alignItems="center" mt={2}>
                    <Typography sx={{ color: COR_DESTAQUE, fontWeight: 700, fontSize: ".92rem" }}>Ler mais</Typography>
                    <ArrowRight size={15} color={COR_DESTAQUE} />
                </Stack>
            </Box>
        </Paper>
    );
}

export function Grade({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            }}
        >
            {children}
        </Box>
    );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { ArrowLeft, CalendarDays, User } from "lucide-react";

import { sitePublicoApi, urlImagem } from "../../services/site-api";
import type { SiteNoticia } from "../../services/site-api";
import { Container, EstadoVazio, formatarData } from "./componentes";
import { COR_INSTITUCIONAL } from "./conteudo";
import { usarSeo } from "./LayoutPublico";
import { propsDeLink } from "./navegacao";
import { useSiteContexto } from "./useSite";

export default function NoticiaDetalhe() {
    const { slug = "" } = useParams();
    const { navegar } = useSiteContexto();

    const [noticia, setNoticia] = useState<SiteNoticia | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        setCarregando(true);

        sitePublicoApi
            .noticia(slug)
            .then(setNoticia)
            .catch(() => setNoticia(null))
            .finally(() => setCarregando(false));
    }, [slug]);

    usarSeo(noticia?.titulo ?? "Notícia", noticia?.resumo ?? "Notícias da instituição.");

    if (carregando) {
        return (
            <Container sx={{ py: 10 }}>
                <Stack alignItems="center">
                    <CircularProgress />
                </Stack>
            </Container>
        );
    }

    if (!noticia) {
        return (
            <Container sx={{ py: 10 }}>
                <EstadoVazio mensagem="Notícia não encontrada ou ainda não publicada." />
                <Stack alignItems="center" mt={3}>
                    <Button {...propsDeLink("/noticias", navegar)} sx={{ width: "auto" }}>
                        <ArrowLeft size={16} style={{ marginRight: 8 }} />
                        Voltar para notícias
                    </Button>
                </Stack>
            </Container>
        );
    }

    const imagem = urlImagem(noticia.imagem);
    const paragrafos = String(noticia.conteudo ?? "")
        .split(/\n{2,}/)
        .map((bloco) => bloco.trim())
        .filter(Boolean);

    return (
        <Box>
            {imagem && (
                <Box
                    sx={{
                        height: { xs: 240, md: 420 },
                        backgroundImage: `url(${imagem})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            )}

            <Container sx={{ py: { xs: 5, md: 8 }, maxWidth: 840 }}>
                <Button
                    {...propsDeLink("/noticias", navegar)}
                    sx={{ width: "auto", px: 0, mb: 3, color: "#5b6472", "&:hover": { bgcolor: "transparent" } }}
                >
                    <ArrowLeft size={16} style={{ marginRight: 8 }} />
                    Todas as notícias
                </Button>

                {noticia.categoria_nome && (
                    <Chip label={noticia.categoria_nome} size="small" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
                )}

                <Typography
                    component="h1"
                    sx={{ fontSize: { xs: "1.8rem", md: "2.5rem" }, fontWeight: 800, color: "#1f2a37", lineHeight: 1.2 }}
                >
                    {noticia.titulo}
                </Typography>

                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap mt={2.5}>
                    {noticia.publicado_em && (
                        <Stack direction="row" spacing={.8} alignItems="center">
                            <CalendarDays size={15} color="#8792a2" />
                            <Typography sx={{ fontSize: ".88rem", color: "#8792a2" }}>
                                {formatarData(noticia.publicado_em)}
                            </Typography>
                        </Stack>
                    )}
                    {noticia.autor && (
                        <Stack direction="row" spacing={.8} alignItems="center">
                            <User size={15} color="#8792a2" />
                            <Typography sx={{ fontSize: ".88rem", color: "#8792a2" }}>{noticia.autor}</Typography>
                        </Stack>
                    )}
                </Stack>

                <Divider sx={{ my: 4 }} />

                {noticia.resumo && (
                    <Typography
                        sx={{
                            fontSize: "1.12rem",
                            lineHeight: 1.75,
                            color: COR_INSTITUCIONAL,
                            fontWeight: 600,
                            mb: 3,
                        }}
                    >
                        {noticia.resumo}
                    </Typography>
                )}

                <Stack spacing={2.5}>
                    {paragrafos.map((paragrafo, indice) => (
                        <Typography
                            key={indice}
                            sx={{ fontSize: "1.05rem", lineHeight: 1.85, color: "#3c4a55", whiteSpace: "pre-line" }}
                        >
                            {paragrafo}
                        </Typography>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

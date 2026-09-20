import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

import type { SiteBanner } from "../../services/site-api";
import { urlImagem } from "../../services/site-api";
import { propsDeLink } from "./navegacao";
import {
    BANNERS,
    COR_BORDA,
    COR_DESTAQUE,
    COR_FUNDO_SUAVE,
    COR_INSTITUCIONAL,
    COR_TEXTO,
    LARGURA_SITE,
} from "./conteudo";

const INTERVALO_MS = 10000;
const ALTURA_MAXIMA = 480;

interface SlideHero {
    id: string;
    titulo: string;
    linhasTitulo: string[];
    chamada: string;
    apoio: string;
    claim: string[];
    textoBotao: string;
    urlBotao: string;
    novaAba: boolean;
    imagem: string;
    imagemMobile: string;
}

function quebrarTitulo(titulo: string): string[] {
    const palavras = titulo.trim().split(/\s+/);
    if (palavras.length <= 3) return [titulo.trim()];

    const porLinha = Math.ceil(palavras.length / 3);
    const linhas: string[] = [];

    for (let i = 0; i < palavras.length; i += porLinha) {
        linhas.push(palavras.slice(i, i + porLinha).join(" "));
    }

    return linhas;
}

function converter(banner: SiteBanner): SlideHero {
    return {
        id: banner.id,
        titulo: banner.titulo,
        linhasTitulo: quebrarTitulo(banner.titulo),
        chamada: banner.subtitulo,
        apoio: "",
        claim: [],
        textoBotao: banner.texto_botao,
        urlBotao: banner.url_botao,
        novaAba: banner.nova_aba,
        imagem: urlImagem(banner.imagem_desktop),
        imagemMobile: urlImagem(banner.imagem_mobile || banner.imagem_desktop),
    };
}

interface HeroCarrosselProps {
    banners: SiteBanner[];
    carregando?: boolean;
    onNavegar: (url: string) => void;
}

export default function HeroCarrossel({ banners, carregando = false, onNavegar }: HeroCarrosselProps) {
    const slides = useMemo<SlideHero[]>(() => {
        if (banners.length > 0) return banners.map(converter);

        if (carregando) return [];

        return BANNERS.map((banner) => ({
            id: banner.id,
            titulo: banner.linhasTitulo.join(" "),
            linhasTitulo: banner.linhasTitulo,
            chamada: banner.chamada,
            apoio: banner.apoio,
            claim: banner.claim,
            textoBotao: banner.textoBotao,
            urlBotao: banner.urlBotao,
            novaAba: false,
            imagem: "",
            imagemMobile: "",
        }));
    }, [banners, carregando]);

    const [indice, setIndice] = useState(0);
    const [pausado, setPausado] = useState(false);
    const toqueInicial = useRef<number | null>(null);

    const avancar = useCallback(() => setIndice((i) => (i + 1) % slides.length), [slides.length]);
    const voltar = useCallback(() => setIndice((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

    useEffect(() => setIndice(0), [slides.length]);

    useEffect(() => {
        if (pausado || slides.length < 2) return;

        const timer = window.setInterval(avancar, INTERVALO_MS);
        return () => window.clearInterval(timer);
    }, [avancar, pausado, slides.length]);

    if (slides.length === 0) {
        if (!carregando) return null;

        return (
            <Box id="inicio" component="section" sx={{ position: "relative", bgcolor: "#06283c" }}>
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{ width: "100%", height: { xs: 230, sm: 330, md: ALTURA_MAXIMA }, bgcolor: "#0d3a52" }}
                />
            </Box>
        );
    }

    const atual = slides[Math.min(indice, slides.length - 1)];
    const comImagem = Boolean(atual.imagem);

    function propsBotao(url: string, novaAba: boolean) {
        if (novaAba) {
            return { component: "a" as const, href: url, target: "_blank", rel: "noopener noreferrer" };
        }

        return propsDeLink(url, onNavegar);
    }

    function iniciarToque(evento: React.TouchEvent) {
        toqueInicial.current = evento.touches[0]?.clientX ?? null;
    }

    function finalizarToque(evento: React.TouchEvent) {
        if (toqueInicial.current === null) return;

        const distancia = (evento.changedTouches[0]?.clientX ?? 0) - toqueInicial.current;
        toqueInicial.current = null;

        if (Math.abs(distancia) < 50) return;
        if (distancia < 0) avancar();
        else voltar();
    }

    const estiloSeta = {
        position: "absolute" as const,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 4,
        width: { xs: 36, md: 46 },
        height: { xs: 36, md: 46 },
        color: "#fff",
        bgcolor: "rgba(10,40,58,.34)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,.28)",
        transition: "background-color 200ms ease",
        "&:hover": { bgcolor: "rgba(10,40,58,.62)" },
    };

    const controles = slides.length > 1 && (
        <>
            <IconButton onClick={voltar} aria-label="Banner anterior" sx={{ ...estiloSeta, left: { xs: 10, md: 26 } }}>
                <ChevronLeft size={22} />
            </IconButton>

            <IconButton onClick={avancar} aria-label="Próximo banner" sx={{ ...estiloSeta, right: { xs: 10, md: 26 } }}>
                <ChevronRight size={22} />
            </IconButton>
        </>
    );

    const indicadores = slides.length > 1 && (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ pt: 1.6 }}>
            {slides.map((slide, i) => (
                <Box
                    key={slide.id}
                    component="button"
                    aria-label={`Ir para o banner ${i + 1}`}
                    onClick={() => setIndice(i)}
                    sx={{
                        cursor: "pointer",
                        border: 0,
                        p: 0,
                        height: 4,
                        width: i === indice ? 34 : 15,
                        borderRadius: 999,
                        bgcolor: i === indice ? COR_DESTAQUE : "#c7d6e0",
                        transition: "width 300ms ease, background-color 300ms ease",
                    }}
                />
            ))}
        </Stack>
    );

    if (comImagem) {
        return (
            <Box
                id="inicio"
                component="section"
                onMouseEnter={() => setPausado(true)}
                onMouseLeave={() => setPausado(false)}
                onTouchStart={iniciarToque}
                onTouchEnd={finalizarToque}
                sx={{ position: "relative", bgcolor: "#06283c" }}
            >
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        height: { xs: 230, sm: 330, md: ALTURA_MAXIMA },
                        overflow: "hidden",
                    }}
                >
                    {slides.map((slide) => (
                        <Box
                            key={slide.id}
                            aria-hidden
                            sx={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage: `url(${slide.imagem})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                filter: "blur(26px) saturate(1.1) brightness(.62)",
                                transform: "scale(1.14)",
                                opacity: slide.id === atual.id ? 1 : 0,
                                transition: "opacity 700ms ease",
                            }}
                        />
                    ))}

                    {slides.map((slide) => (
                        <Box
                            key={slide.id}
                            component="img"
                            src={slide.imagem}
                            alt={slide.titulo}
                            loading={slide.id === slides[0].id ? "eager" : "lazy"}
                            sx={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                objectPosition: "center",
                                opacity: slide.id === atual.id ? 1 : 0,
                                transition: "opacity 700ms ease",
                            }}
                        />
                    ))}

                    {controles}
                </Box>

                <Box
                    sx={{
                        bgcolor: COR_FUNDO_SUAVE,
                        borderBottom: `1px solid ${COR_BORDA}`,
                    }}
                >
                    {indicadores}

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={{ xs: 1.5, sm: 3 }}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ maxWidth: LARGURA_SITE, mx: "auto", px: { xs: 3, md: 6 }, pt: { xs: 1.6, md: 1.4 }, pb: { xs: 2.2, md: 2 } }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <GraduationCap size={24} color={COR_DESTAQUE} />
                            <Typography
                                sx={{
                                    color: COR_TEXTO,
                                    fontWeight: 700,
                                    fontSize: { xs: ".98rem", md: "1.08rem" },
                                    textAlign: { xs: "center", sm: "left" },
                                }}
                            >
                                {atual.chamada || atual.titulo}
                            </Typography>
                        </Stack>

                        <Button
                            variant="contained"
                            {...propsBotao(atual.urlBotao, atual.novaAba)}
                            sx={{
                                width: { xs: "100%", sm: "auto" },
                                flexShrink: 0,
                                height: 46,
                                px: 3.5,
                                fontSize: 15,
                                borderRadius: 2,
                                bgcolor: COR_DESTAQUE,
                                color: "#fff",
                                boxShadow: "0 6px 18px rgba(5,181,230,.28)",
                                "&:hover": { bgcolor: "#049ec9" },
                            }}
                        >
                            {atual.textoBotao}
                        </Button>
                    </Stack>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            id="inicio"
            component="section"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onTouchStart={iniciarToque}
            onTouchEnd={finalizarToque}
            sx={{
                position: "relative",
                bgcolor: "#eef2f5",
                minHeight: { xs: 560, md: 640 },
                display: "flex",
                overflow: "hidden",
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: { xs: "100%", md: 460 },
                    backgroundImage: "url(/assets/ondas.svg)",
                    backgroundRepeat: "repeat-y",
                    backgroundSize: "420px auto",
                    opacity: 0.85,
                }}
            />

            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: { xs: 0, lg: 300 },
                    bgcolor: COR_INSTITUCIONAL,
                    display: { xs: "none", lg: "block" },
                }}
            />

            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    maxWidth: 1400,
                    mx: "auto",
                    px: { xs: 3, md: 6 },
                    py: { xs: 9, md: 8 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                }}
            >
                <Stack spacing={2.2} sx={{ maxWidth: 620, flexShrink: 0 }}>
                    <Stack spacing={0.6} alignItems="flex-start">
                        {atual.linhasTitulo.map((linha) => (
                            <Box
                                key={linha}
                                component="span"
                                sx={{
                                    bgcolor: COR_INSTITUCIONAL,
                                    px: { xs: 1.6, md: 2.2 },
                                    py: { xs: 0.4, md: 0.6 },
                                    borderRadius: .8,
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        color: "#fff",
                                        fontWeight: 800,
                                        lineHeight: 1.18,
                                        display: "block",
                                        fontSize: { xs: "1.85rem", sm: "2.4rem", md: "3rem" },
                                        letterSpacing: "-.5px",
                                    }}
                                >
                                    {linha}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    {atual.chamada && (
                        <Typography
                            sx={{
                                color: COR_INSTITUCIONAL,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: .8,
                                fontSize: { xs: "1.05rem", md: "1.35rem" },
                                pt: .8,
                            }}
                        >
                            {atual.chamada}
                        </Typography>
                    )}

                    {atual.apoio && (
                        <Typography
                            sx={{ color: "#3c4a55", fontSize: { xs: ".98rem", md: "1.08rem" }, lineHeight: 1.6, maxWidth: 520 }}
                        >
                            {atual.apoio}
                        </Typography>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.8} pt={1.5}>
                        <Button
                            variant="contained"
                            {...propsBotao(atual.urlBotao, atual.novaAba)}
                            sx={{
                                width: "auto",
                                height: 54,
                                px: 4,
                                fontSize: 16,
                                borderRadius: 1.2,
                                bgcolor: COR_DESTAQUE,
                                color: "#fff",
                                boxShadow: "0 8px 22px rgba(5,181,230,.32)",
                                "&:hover": { bgcolor: "#049ec9" },
                            }}
                        >
                            {atual.textoBotao}
                        </Button>

                        <Button
                            variant="outlined"
                            {...propsDeLink("/cursos", onNavegar)}
                            sx={{
                                width: "auto",
                                height: 54,
                                px: 4,
                                fontSize: 16,
                                borderRadius: 1.2,
                                color: COR_INSTITUCIONAL,
                                borderColor: "rgba(10,61,82,.4)",
                                "&:hover": { borderColor: COR_INSTITUCIONAL, bgcolor: "rgba(10,61,82,.06)" },
                            }}
                        >
                            Ver cursos
                        </Button>
                    </Stack>
                </Stack>

                <Stack
                    spacing={2.5}
                    alignItems="flex-start"
                    sx={{ display: { xs: "none", lg: "flex" }, width: 236, flexShrink: 0, pr: 1 }}
                >
                    {atual.claim.length > 0 && (
                        <Stack spacing={0.2}>
                            {atual.claim.map((linha) => (
                                <Typography
                                    key={linha}
                                    sx={{
                                        color: "#fff",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        lineHeight: 1.22,
                                        fontSize: "1.32rem",
                                        letterSpacing: .2,
                                    }}
                                >
                                    {linha}
                                </Typography>
                            ))}
                        </Stack>
                    )}

                    <Box sx={{ width: 62, height: 3, bgcolor: COR_DESTAQUE, borderRadius: 2 }} />

                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 1.6,
                                border: "2px solid rgba(255,255,255,.85)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <GraduationCap size={24} color="#fff" />
                        </Box>
                        <Box>
                            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.28rem", lineHeight: 1 }}>
                                UniEduca
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,.72)",
                                    fontSize: ".68rem",
                                    letterSpacing: 1.4,
                                    textTransform: "uppercase",
                                    mt: .5,
                                }}
                            >
                                Ensino Superior
                            </Typography>
                        </Box>
                    </Stack>
                </Stack>
            </Box>

            {controles}
            {indicadores}
        </Box>
    );
}

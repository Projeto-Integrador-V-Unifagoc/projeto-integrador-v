import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, CircularProgress, IconButton, Modal, Stack, Typography } from "@mui/material";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";

import { sitePublicoApi, urlImagem } from "../../services/site-api";
import type { SiteAlbum } from "../../services/site-api";
import { CapaPagina, Container, EstadoVazio, formatarData } from "./componentes";
import { usarSeo } from "./LayoutPublico";
import { propsDeLink } from "./navegacao";
import { useSiteContexto } from "./useSite";

export default function AlbumDetalhe() {
    const { slug = "" } = useParams();
    const { navegar } = useSiteContexto();

    const [album, setAlbum] = useState<SiteAlbum | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [aberta, setAberta] = useState<number | null>(null);

    useEffect(() => {
        setCarregando(true);

        sitePublicoApi
            .album(slug)
            .then(setAlbum)
            .catch(() => setAlbum(null))
            .finally(() => setCarregando(false));
    }, [slug]);

    usarSeo(album?.titulo ?? "Galeria", album?.descricao ?? "Galeria de fotos da instituição.");

    const fotos = album?.fotos ?? [];

    const anterior = useCallback(() => {
        setAberta((i) => (i === null ? null : (i - 1 + fotos.length) % fotos.length));
    }, [fotos.length]);

    const proxima = useCallback(() => {
        setAberta((i) => (i === null ? null : (i + 1) % fotos.length));
    }, [fotos.length]);

    useEffect(() => {
        if (aberta === null) return;

        function aoTeclar(evento: KeyboardEvent) {
            if (evento.key === "Escape") setAberta(null);
            if (evento.key === "ArrowLeft") anterior();
            if (evento.key === "ArrowRight") proxima();
        }

        window.addEventListener("keydown", aoTeclar);
        return () => window.removeEventListener("keydown", aoTeclar);
    }, [aberta, anterior, proxima]);

    if (carregando) {
        return (
            <Container sx={{ py: 10 }}>
                <Stack alignItems="center">
                    <CircularProgress />
                </Stack>
            </Container>
        );
    }

    if (!album) {
        return (
            <Container sx={{ py: 10 }}>
                <EstadoVazio mensagem="Álbum não encontrado ou ainda não publicado." />
                <Stack alignItems="center" mt={3}>
                    <Button {...propsDeLink("/galeria", navegar)} sx={{ width: "auto" }}>
                        <ArrowLeft size={16} style={{ marginRight: 8 }} />
                        Voltar para a galeria
                    </Button>
                </Stack>
            </Container>
        );
    }

    return (
        <Box>
            <CapaPagina
                titulo={album.titulo}
                descricao={album.descricao || (album.data ? formatarData(album.data) : "Fotos do evento.")}
            />

            <Container sx={{ py: { xs: 6, md: 9 } }}>
                <Button
                    {...propsDeLink("/galeria", navegar)}
                    sx={{ width: "auto", px: 0, mb: 3, color: "#5b6472", "&:hover": { bgcolor: "transparent" } }}
                >
                    <ArrowLeft size={16} style={{ marginRight: 8 }} />
                    Todos os álbuns
                </Button>

                {fotos.length === 0 ? (
                    <EstadoVazio mensagem="Este álbum ainda não tem fotos." />
                ) : (
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: {
                                xs: "repeat(2, 1fr)",
                                sm: "repeat(3, 1fr)",
                                md: "repeat(4, 1fr)",
                            },
                        }}
                    >
                        {fotos.map((foto, indice) => (
                            <Box
                                key={foto.id}
                                component="button"
                                onClick={() => setAberta(indice)}
                                aria-label={foto.titulo || `Foto ${indice + 1}`}
                                sx={{
                                    border: 0,
                                    p: 0,
                                    cursor: "pointer",
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    aspectRatio: "4 / 3",
                                    backgroundImage: `url(${urlImagem(foto.arquivo)})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    transition: "transform 220ms ease, box-shadow 220ms ease",
                                    "&:hover": { transform: "scale(1.03)", boxShadow: "0 10px 26px rgba(16,24,40,.16)" },
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Container>

            <Modal open={aberta !== null} onClose={() => setAberta(null)}>
                <Box
                    sx={{
                        position: "fixed",
                        inset: 0,
                        bgcolor: "rgba(6,18,28,.94)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: { xs: 2, md: 6 },
                    }}
                >
                    <IconButton
                        onClick={() => setAberta(null)}
                        aria-label="Fechar"
                        sx={{ position: "absolute", top: 16, right: 16, color: "#fff" }}
                    >
                        <X size={24} />
                    </IconButton>

                    {fotos.length > 1 && (
                        <IconButton
                            onClick={anterior}
                            aria-label="Foto anterior"
                            sx={{ position: "absolute", left: { xs: 8, md: 32 }, color: "#fff" }}
                        >
                            <ChevronLeft size={30} />
                        </IconButton>
                    )}

                    {aberta !== null && fotos[aberta] && (
                        <Stack alignItems="center" spacing={2} sx={{ maxWidth: "100%", maxHeight: "100%" }}>
                            <Box
                                component="img"
                                src={urlImagem(fotos[aberta].arquivo)}
                                alt={fotos[aberta].titulo || `Foto ${aberta + 1}`}
                                sx={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: 2, objectFit: "contain" }}
                            />
                            {fotos[aberta].titulo && (
                                <Typography sx={{ color: "rgba(255,255,255,.85)", fontSize: ".95rem" }}>
                                    {fotos[aberta].titulo}
                                </Typography>
                            )}
                            <Typography sx={{ color: "rgba(255,255,255,.5)", fontSize: ".82rem" }}>
                                {aberta + 1} de {fotos.length}
                            </Typography>
                        </Stack>
                    )}

                    {fotos.length > 1 && (
                        <IconButton
                            onClick={proxima}
                            aria-label="Próxima foto"
                            sx={{ position: "absolute", right: { xs: 8, md: 32 }, color: "#fff" }}
                        >
                            <ChevronRight size={30} />
                        </IconButton>
                    )}
                </Box>
            </Modal>
        </Box>
    );
}

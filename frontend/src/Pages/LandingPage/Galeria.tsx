import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Images } from "lucide-react";

import { urlImagem } from "../../services/site-api";
import { CapaPagina, Container, EstadoVazio, formatarData, Grade } from "./componentes";
import { COR_INSTITUCIONAL } from "./conteudo";
import { propsDeLink } from "./navegacao";
import { usarSeo } from "./LayoutPublico";
import { useSiteContexto } from "./useSite";

export default function Galeria() {
    const { conteudo, carregando, navegar } = useSiteContexto();
    const nome = conteudo.configuracoes.site_nome || "UniEduca";

    usarSeo(`Galeria de fotos — ${nome}`, `Fotos de eventos, aulas e atividades da ${nome}.`);

    return (
        <Box>
            <CapaPagina
                titulo="Galeria"
                descricao="Registros de eventos, aulas práticas, formaturas e da vida no campus."
            />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                {carregando ? (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress />
                    </Stack>
                ) : conteudo.albuns.length === 0 ? (
                    <EstadoVazio mensagem="Nenhum álbum publicado ainda. Crie o primeiro álbum em /painel." />
                ) : (
                    <Grade>
                        {conteudo.albuns.map((album) => {
                            const capa = urlImagem(album.capa);

                            return (
                                <Paper
                                    key={album.id}
                                    elevation={0}
                                    {...propsDeLink(`/galeria/${album.slug}`, navegar)}
                                    sx={{
                                        display: "block",
                                        cursor: "pointer",
                                        textDecoration: "none",
                                        color: "inherit",
                                        borderRadius: 3,
                                        overflow: "hidden",
                                        border: "1px solid #e6ebf0",
                                        bgcolor: "#fff",
                                        transition: "transform 220ms ease, box-shadow 220ms ease",
                                        "&:hover": { transform: "translateY(-5px)", boxShadow: "0 14px 34px rgba(16,24,40,.1)" },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: 190,
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundImage: capa ? `url(${capa})` : undefined,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            background: capa ? undefined : "linear-gradient(135deg,#1f86ad 0%,#22b6e0 100%)",
                                        }}
                                    >
                                        {!capa && <Images size={34} color="rgba(255,255,255,.85)" />}

                                        {Number(album.total_fotos ?? 0) > 0 && (
                                            <Typography
                                                sx={{
                                                    position: "absolute",
                                                    right: 12,
                                                    bottom: 12,
                                                    px: 1.4,
                                                    py: .4,
                                                    borderRadius: 999,
                                                    bgcolor: "rgba(0,0,0,.6)",
                                                    color: "#fff",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {album.total_fotos} fotos
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box sx={{ p: 3 }}>
                                        {album.data && (
                                            <Typography sx={{ fontSize: ".8rem", color: "#8792a2" }}>
                                                {formatarData(album.data)}
                                            </Typography>
                                        )}
                                        <Typography
                                            sx={{ fontWeight: 800, fontSize: "1.05rem", color: COR_INSTITUCIONAL, mt: .6, lineHeight: 1.4 }}
                                        >
                                            {album.titulo}
                                        </Typography>
                                        {album.descricao && (
                                            <Typography sx={{ color: "#5b6472", fontSize: ".92rem", lineHeight: 1.6, mt: 1 }}>
                                                {album.descricao}
                                            </Typography>
                                        )}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Grade>
                )}
            </Container>
        </Box>
    );
}

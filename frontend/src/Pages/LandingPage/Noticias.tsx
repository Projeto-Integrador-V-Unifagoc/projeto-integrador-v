import { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Stack } from "@mui/material";

import { sitePublicoApi } from "../../services/site-api";
import type { SiteNoticia } from "../../services/site-api";
import { CapaPagina, CartaoNoticia, Container, EstadoVazio, Grade } from "./componentes";
import { usarSeo } from "./LayoutPublico";
import { useSiteContexto } from "./useSite";

export default function Noticias() {
    const { conteudo, navegar } = useSiteContexto();
    const nome = conteudo.configuracoes.site_nome || "UniEduca";

    const [noticias, setNoticias] = useState<SiteNoticia[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [categoria, setCategoria] = useState<string | null>(null);

    usarSeo(`Notícias — ${nome}`, `Acompanhe as notícias, eventos e comunicados da ${nome}.`);

    useEffect(() => {
        setCarregando(true);

        sitePublicoApi
            .noticias(categoria ?? undefined)
            .then((dados) => setNoticias(Array.isArray(dados) ? dados : []))
            .catch(() => setNoticias([]))
            .finally(() => setCarregando(false));
    }, [categoria]);

    const categorias = Array.from(
        new Map(
            noticias
                .filter((noticia) => noticia.categoria_slug)
                .map((noticia) => [noticia.categoria_slug as string, noticia.categoria_nome as string]),
        ).entries(),
    );

    return (
        <Box>
            <CapaPagina
                titulo="Notícias"
                descricao="Comunicados oficiais, eventos, processos seletivos e o que acontece na instituição."
            />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                {(categorias.length > 0 || categoria) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={4}>
                        <Chip
                            label="Todas"
                            onClick={() => setCategoria(null)}
                            color={categoria === null ? "primary" : "default"}
                            variant={categoria === null ? "filled" : "outlined"}
                        />
                        {categorias.map(([slug, rotulo]) => (
                            <Chip
                                key={slug}
                                label={rotulo}
                                onClick={() => setCategoria(slug)}
                                color={categoria === slug ? "primary" : "default"}
                                variant={categoria === slug ? "filled" : "outlined"}
                            />
                        ))}
                    </Stack>
                )}

                {carregando ? (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress />
                    </Stack>
                ) : noticias.length === 0 ? (
                    <EstadoVazio mensagem="Nenhuma notícia publicada ainda. Publique a primeira em /painel." />
                ) : (
                    <Grade>
                        {noticias.map((noticia) => (
                            <CartaoNoticia
                                key={noticia.id}
                                noticia={noticia}
                                onNavegar={navegar}
                            />
                        ))}
                    </Grade>
                )}
            </Container>
        </Box>
    );
}

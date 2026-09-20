import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowRight, Images, Monitor, Newspaper, Users } from "lucide-react";

import { siteAdminApi } from "../../services/site-api";
import type { SiteResumo } from "../../services/site-api";
import { CabecalhoPainel, Carregando, Cartao, useFeedback } from "./componentes";

const ATALHOS = [
    { titulo: "Adicionar banner", texto: "Trocar as imagens do carrossel da página inicial.", url: "/painel/banners" },
    { titulo: "Publicar notícia", texto: "Comunicados, eventos e novidades.", url: "/painel/noticias" },
    { titulo: "Criar álbum de fotos", texto: "Fotos de eventos na galeria do site.", url: "/painel/galeria" },
    { titulo: "Cursos no site", texto: "Escolher quais cursos aparecem e aceitam inscrição.", url: "/painel/cursos" },
];

export default function PainelDashboard() {
    const navigate = useNavigate();
    const { erroDe, componente } = useFeedback();

    const [resumo, setResumo] = useState<SiteResumo | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        siteAdminApi
            .resumo()
            .then(setResumo)
            .catch((err) => erroDe(err, "Não foi possível carregar o resumo."))
            .finally(() => setCarregando(false));
    }, []);

    const cartoes = [
        { rotulo: "Banners no ar", valor: resumo?.banners_ativos ?? 0, Icone: Monitor, cor: "#05b5e6" },
        { rotulo: "Notícias publicadas", valor: resumo?.noticias_publicadas ?? 0, Icone: Newspaper, cor: "#0f6fb5" },
        { rotulo: "Álbuns / fotos", valor: `${resumo?.albuns ?? 0} / ${resumo?.fotos ?? 0}`, Icone: Images, cor: "#00a98f" },
        { rotulo: "Acessos ao painel", valor: resumo?.usuarios_administrativos ?? 0, Icone: Users, cor: "#7a5cf0" },
    ];

    return (
        <Box>
            <CabecalhoPainel
                titulo="Visão geral"
                descricao="Tudo que está publicado no site institucional neste momento."
            />

            {carregando ? (
                <Carregando />
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                    }}
                >
                    {cartoes.map(({ rotulo, valor, Icone, cor }) => (
                        <Cartao key={rotulo}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        bgcolor: `${cor}1a`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icone size={22} color={cor} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#0f1720", lineHeight: 1.1 }}>
                                        {valor}
                                    </Typography>
                                    <Typography sx={{ fontSize: ".85rem", color: "#8792a2" }}>{rotulo}</Typography>
                                </Box>
                            </Stack>
                        </Cartao>
                    ))}
                </Box>
            )}

            <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f1720", mt: 5, mb: 2.5 }}>
                O que você quer fazer?
            </Typography>

            <Box
                sx={{
                    display: "grid",
                    gap: 2.5,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                }}
            >
                {ATALHOS.map((atalho) => (
                    <Cartao key={atalho.url}>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f1720" }}>
                            {atalho.titulo}
                        </Typography>
                        <Typography sx={{ color: "#5b6472", fontSize: ".93rem", mt: .6, lineHeight: 1.6 }}>
                            {atalho.texto}
                        </Typography>

                        <Button
                            onClick={() => navigate(atalho.url)}
                            sx={{ width: "auto", px: 0, mt: 1.8, fontSize: 14.5, color: "#05b5e6", "&:hover": { bgcolor: "transparent" } }}
                        >
                            Abrir
                            <ArrowRight size={16} style={{ marginLeft: 6 }} />
                        </Button>
                    </Cartao>
                ))}
            </Box>

            {componente}
        </Box>
    );
}

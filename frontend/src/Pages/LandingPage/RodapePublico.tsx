import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Clock, Facebook, GraduationCap, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";

import type { SiteConfiguracoes, SiteMenuItem } from "../../services/site-api";
import {
    COR_BORDA,
    COR_DESTAQUE,
    COR_FUNDO_SUAVE,
    COR_INSTITUCIONAL,
    COR_TEXTO_SUAVE,
    LARGURA_SITE,
    URL_PORTAL,
} from "./conteudo";
import { propsDeLink } from "./navegacao";

interface RodapePublicoProps {
    configuracoes: SiteConfiguracoes;
    menu: SiteMenuItem[];
    onNavegar: (url: string) => void;
}

const REDES = [
    { chave: "rede_instagram", rotulo: "Instagram", Icone: Instagram },
    { chave: "rede_facebook", rotulo: "Facebook", Icone: Facebook },
    { chave: "rede_youtube", rotulo: "YouTube", Icone: Youtube },
];

export default function RodapePublico({ configuracoes, menu, onNavegar }: RodapePublicoProps) {
    const marca = configuracoes.site_nome || "UniEduca";
    const redes = REDES.filter((rede) => Boolean(configuracoes[rede.chave]));

    const contatos = [
        { Icone: MapPin, valor: configuracoes.contato_endereco },
        { Icone: Phone, valor: configuracoes.contato_telefone },
        { Icone: Mail, valor: configuracoes.contato_email },
        { Icone: Clock, valor: configuracoes.contato_horario },
    ].filter((item) => Boolean(item.valor));

    return (
        <Box component="footer" sx={{ bgcolor: COR_FUNDO_SUAVE, color: COR_TEXTO_SUAVE, borderTop: `1px solid `, pt: { xs: 6, md: 8 }, pb: 3 }}>
            <Box sx={{ maxWidth: LARGURA_SITE, mx: "auto", px: { xs: 3, md: 6 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 8 }}>
                    <Box sx={{ flex: 1.3 }}>
                        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1.6,
                                    bgcolor: COR_INSTITUCIONAL,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <GraduationCap size={20} color="#fff" />
                            </Box>
                            <Typography sx={{ fontSize: 20, fontWeight: 800, color: COR_INSTITUCIONAL }}>
                                {marca.slice(0, 3)}
                                <Box component="span" sx={{ color: COR_DESTAQUE }}>{marca.slice(3)}</Box>
                            </Typography>
                        </Stack>

                        <Typography sx={{ fontSize: ".93rem", lineHeight: 1.75, maxWidth: 360 }}>
                            {configuracoes.rodape_texto}
                        </Typography>

                        {redes.length > 0 && (
                            <Stack direction="row" spacing={1.2} mt={3}>
                                {redes.map(({ chave, rotulo, Icone }) => (
                                    <Box
                                        key={chave}
                                        component="a"
                                        href={configuracoes[chave]}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={rotulo}
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            border: `1px solid `,                                            color: COR_INSTITUCIONAL,                                            transition: "all 200ms ease",
                                            "&:hover": { bgcolor: COR_DESTAQUE, borderColor: COR_DESTAQUE, color: "#fff" },
                                        }}
                                    >
                                        <Icone size={18} />
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: COR_INSTITUCIONAL, fontWeight: 700, fontSize: "1rem", mb: 2 }}>Contato</Typography>
                        <Stack spacing={1.4}>
                            {contatos.map(({ Icone, valor }) => (
                                <Stack key={valor} direction="row" spacing={1.2} alignItems="center">
                                    <Icone size={16} color={COR_DESTAQUE} />
                                    <Typography sx={{ fontSize: ".92rem" }}>{valor}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: COR_INSTITUCIONAL, fontWeight: 700, fontSize: "1rem", mb: 2 }}>
                            Acesso rápido
                        </Typography>
                        <Stack spacing={1.2} alignItems="flex-start">
                            {menu.map((item) => (
                                <Button
                                    key={item.id}
                                    {...propsDeLink(item.url, onNavegar)}
                                    sx={{
                                        width: "auto",
                                        px: 0,
                                        justifyContent: "flex-start",
                                        color: COR_TEXTO_SUAVE,
                                        fontSize: ".92rem",
                                        textDecoration: "none",
                                        "&:hover": { color: COR_DESTAQUE, bgcolor: "transparent" },
                                    }}
                                >
                                    {item.rotulo}
                                </Button>
                            ))}
                            <Button
                                {...propsDeLink(URL_PORTAL, onNavegar)}
                                sx={{
                                    width: "auto",
                                    px: 0,
                                    justifyContent: "flex-start",
                                    color: COR_TEXTO_SUAVE,
                                    fontSize: ".92rem",
                                    textDecoration: "none",
                                    "&:hover": { color: COR_DESTAQUE, bgcolor: "transparent" },
                                }}
                            >
                                Portal do aluno
                            </Button>
                        </Stack>
                    </Box>
                </Stack>

                <Divider sx={{ borderColor: COR_BORDA, my: 4 }} />

                <Typography
                    sx={{ fontSize: ".85rem", color: "#8b95a1", textAlign: { xs: "center", md: "left" } }}
                >
                    © {new Date().getFullYear()} {configuracoes.rodape_copyright || `${marca}. Todos os direitos reservados.`}
                </Typography>
            </Box>
        </Box>
    );
}

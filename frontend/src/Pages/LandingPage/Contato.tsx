import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowRight, Clock, Facebook, Instagram, LogIn, Mail, MapPin, Phone, Youtube } from "lucide-react";

import { CapaPagina, Container } from "./componentes";
import { COR_DESTAQUE, COR_INSTITUCIONAL, URL_PORTAL } from "./conteudo";
import { usarSeo } from "./LayoutPublico";
import { propsDeLink } from "./navegacao";
import { useSiteContexto } from "./useSite";

const REDES = [
    { chave: "rede_instagram", rotulo: "Instagram", Icone: Instagram },
    { chave: "rede_facebook", rotulo: "Facebook", Icone: Facebook },
    { chave: "rede_youtube", rotulo: "YouTube", Icone: Youtube },
];

export default function Contato() {
    const { conteudo, navegar, urlInscricao } = useSiteContexto();
    const config = conteudo.configuracoes;
    const nome = config.site_nome || "UniEduca";

    usarSeo(`Contato — ${nome}`, `Telefone, e-mail, endereço e horário de atendimento da ${nome}.`);

    const canais = [
        { Icone: MapPin, titulo: "Endereço", valor: config.contato_endereco, link: "" },
        { Icone: Phone, titulo: "Telefone", valor: config.contato_telefone, link: `tel:${(config.contato_telefone || "").replace(/\D/g, "")}` },
        { Icone: Mail, titulo: "E-mail", valor: config.contato_email, link: `mailto:${config.contato_email}` },
        { Icone: Clock, titulo: "Atendimento", valor: config.contato_horario, link: "" },
    ].filter((canal) => Boolean(canal.valor));

    const redes = REDES.filter((rede) => Boolean(config[rede.chave]));
    const whatsapp = config.contato_whatsapp;

    return (
        <Box>
            <CapaPagina
                titulo="Fale com a gente"
                descricao="Tire dúvidas sobre cursos, inscrição, documentos ou matrícula. A secretaria responde em horário comercial."
            />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 4, md: 6 }}>
                    <Box sx={{ flex: 1.2 }}>
                        <Stack spacing={2.5}>
                            {canais.map(({ Icone, titulo, valor, link }) => (
                                <Paper
                                    key={titulo}
                                    elevation={0}
                                    component={link ? "a" : "div"}
                                    href={link || undefined}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2.5,
                                        p: 3,
                                        borderRadius: 3,
                                        border: "1px solid #e6ebf0",
                                        bgcolor: "#fff",
                                        textDecoration: "none",
                                        transition: "border-color 200ms ease, box-shadow 200ms ease",
                                        "&:hover": link ? { borderColor: "#c9e9f6", boxShadow: "0 10px 26px rgba(16,24,40,.08)" } : undefined,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: 2,
                                            bgcolor: "#e6f7fd",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icone size={22} color={COR_DESTAQUE} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            sx={{ fontSize: 12, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: "#8792a2" }}
                                        >
                                            {titulo}
                                        </Typography>
                                        <Typography sx={{ fontSize: "1.05rem", color: COR_INSTITUCIONAL, fontWeight: 600, mt: .3 }}>
                                            {valor}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>

                        {redes.length > 0 && (
                            <Box mt={4}>
                                <Typography sx={{ fontWeight: 700, color: COR_INSTITUCIONAL, mb: 1.8 }}>
                                    Redes sociais
                                </Typography>
                                <Stack direction="row" spacing={1.5}>
                                    {redes.map(({ chave, rotulo, Icone }) => (
                                        <Box
                                            key={chave}
                                            component="a"
                                            href={config[chave]}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={rotulo}
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 2,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                border: "1px solid #e6ebf0",
                                                color: COR_INSTITUCIONAL,
                                                transition: "all 200ms ease",
                                                "&:hover": { bgcolor: COR_DESTAQUE, borderColor: COR_DESTAQUE, color: "#fff" },
                                            }}
                                        >
                                            <Icone size={20} />
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Paper
                            elevation={0}
                            sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, background: "linear-gradient(145deg,#17799f 0%,#0fa4d4 100%)" }}
                        >
                            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.2rem" }}>
                                Quer estudar na {nome}?
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,.85)", fontSize: ".97rem", mt: 1.2, lineHeight: 1.7 }}>
                                A inscrição é online, gratuita e usa a sua nota do ENEM. Você envia os documentos pelo
                                site e acompanha a validação pelo portal.
                            </Typography>

                            <Button
                                variant="contained"
                                {...propsDeLink(urlInscricao, navegar)}
                                sx={{
                                    width: "100%",
                                    mt: 3,
                                    height: 50,
                                    borderRadius: 2,
                                    fontSize: 15,
                                    bgcolor: "#fff",
                                    color: "#14688f",
                                    "&:hover": { bgcolor: "#eaf6fb" },
                                }}
                            >
                                Fazer inscrição
                                <ArrowRight size={17} style={{ marginLeft: 8 }} />
                            </Button>

                            <Button
                                variant="outlined"
                                {...propsDeLink(URL_PORTAL, navegar)}
                                sx={{
                                    width: "100%",
                                    mt: 1.5,
                                    height: 50,
                                    borderRadius: 2,
                                    fontSize: 15,
                                    color: "#fff",
                                    borderColor: "rgba(255,255,255,.5)",
                                    "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,.08)" },
                                }}
                            >
                                <LogIn size={17} style={{ marginRight: 8 }} />
                                Portal do aluno
                            </Button>
                        </Paper>

                        {whatsapp && (
                            <Button
                                variant="contained"
                                href={whatsapp}
                                target="_blank"
                                rel="noreferrer"
                                sx={{ width: "100%", mt: 3, height: 52, borderRadius: 2, fontSize: 15, bgcolor: "#1faa59", "&:hover": { bgcolor: "#178f49" } }}
                            >
                                Falar pelo WhatsApp
                            </Button>
                        )}
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}

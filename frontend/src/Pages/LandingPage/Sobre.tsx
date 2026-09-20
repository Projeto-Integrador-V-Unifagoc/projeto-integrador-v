import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowRight, Award, BookOpen, CheckCircle2, Target, Users } from "lucide-react";

import { CapaPagina, Container, TituloSecao } from "./componentes";
import { DIFERENCIAIS, NUMEROS } from "./conteudo";
import { usarSeo } from "./LayoutPublico";
import { propsDeLink } from "./navegacao";
import { useSiteContexto } from "./useSite";

const PILARES = [
    {
        Icone: Target,
        titulo: "Missão",
        texto: "Formar profissionais preparados para o mercado, unindo teoria e prática em um ensino acessível e de qualidade.",
    },
    {
        Icone: Award,
        titulo: "Visão",
        texto: "Ser referência regional em ensino superior presencial, reconhecida pela empregabilidade dos seus egressos.",
    },
    {
        Icone: Users,
        titulo: "Valores",
        texto: "Ética, respeito às pessoas, compromisso com o aprendizado e proximidade entre aluno, professor e instituição.",
    },
];

export default function Sobre() {
    const { conteudo, navegar, urlInscricao } = useSiteContexto();
    const nome = conteudo.configuracoes.site_nome || "UniEduca";

    usarSeo(
        `Sobre a ${nome}`,
        `Conheça a ${nome}: missão, visão, valores, estrutura e diferenciais da nossa graduação presencial.`,
    );

    return (
        <Box>
            <CapaPagina
                titulo={`Sobre a ${nome}`}
                descricao="Uma instituição de ensino superior construída para quem precisa conciliar estudo, trabalho e vida pessoal, sem abrir mão da qualidade."
            />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 5, md: 8 }}>
                    <Box sx={{ flex: 1.2 }}>
                        <Typography
                            sx={{ color: "#14688f", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}
                        >
                            Nossa história
                        </Typography>

                        <Typography
                            component="h2"
                            sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" }, fontWeight: 800, color: "#1f2a37", mt: 1.5, lineHeight: 1.25 }}
                        >
                            Ensino superior perto de quem constrói a região
                        </Typography>

                        <Stack spacing={2.5} mt={3}>
                            <Typography sx={{ color: "#4b5563", fontSize: "1.02rem", lineHeight: 1.8 }}>
                                A {nome} nasceu com um propósito simples: aproximar o ensino superior de qualidade de
                                quem já faz a economia da região girar. Por isso as aulas são presenciais, no período
                                noturno, e o calendário respeita a rotina de quem trabalha durante o dia.
                            </Typography>

                            <Typography sx={{ color: "#4b5563", fontSize: "1.02rem", lineHeight: 1.8 }}>
                                O corpo docente é formado por mestres e doutores que atuam no mercado, o que traz para a
                                sala de aula casos reais e não apenas teoria. Cada curso é acompanhado por coordenação
                                própria, com matriz curricular revisada periodicamente.
                            </Typography>

                            <Typography sx={{ color: "#4b5563", fontSize: "1.02rem", lineHeight: 1.8 }}>
                                Toda a vida acadêmica acontece também no portal do aluno: notas, frequência, documentos e
                                histórico ficam disponíveis a qualquer hora, e a secretaria acompanha cada inscrição
                                desde o envio dos documentos até a matrícula efetivada.
                            </Typography>
                        </Stack>

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
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Paper
                            elevation={0}
                            sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, bgcolor: "#f5f8fb", border: "1px solid #e6ebf0" }}
                        >
                            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#1f2a37" }}>
                                A {nome} em números
                            </Typography>

                            <Stack spacing={2.5} mt={3}>
                                {NUMEROS.map((numero) => (
                                    <Stack key={numero.rotulo} direction="row" spacing={2} alignItems="center">
                                        <Typography
                                            sx={{ fontSize: 30, fontWeight: 800, color: "primary.main", minWidth: 78 }}
                                        >
                                            {numero.valor}
                                        </Typography>
                                        <Typography sx={{ fontSize: ".95rem", color: "#5b6472", lineHeight: 1.5 }}>
                                            {numero.rotulo}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                mt: 3,
                                p: { xs: 3, md: 4 },
                                borderRadius: 3,
                                background: "linear-gradient(145deg,#17799f 0%,#0fa4d4 100%)",
                            }}
                        >
                            <BookOpen size={28} color="rgba(255,255,255,.9)" />
                            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", mt: 1.5 }}>
                                Quer estudar com a gente?
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,.85)", fontSize: ".95rem", mt: 1, lineHeight: 1.65 }}>
                                A inscrição é online, gratuita e usa a sua nota do ENEM.
                            </Typography>

                            <Button
                                variant="contained"
                                {...propsDeLink(urlInscricao, navegar)}
                                sx={{
                                    width: "100%",
                                    mt: 3,
                                    height: 48,
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
                        </Paper>
                    </Box>
                </Stack>
            </Container>

            <Box component="section" sx={{ bgcolor: "#f5f8fb", py: { xs: 7, md: 10 } }}>
                <Container>
                    <TituloSecao chapeu="No que acreditamos" titulo="Missão, visão e valores" />

                    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                        {PILARES.map(({ Icone, titulo, texto }) => (
                            <Paper
                                key={titulo}
                                elevation={0}
                                sx={{ flex: 1, p: 3.5, borderRadius: 3, border: "1px solid #e6ebf0", bgcolor: "#fff" }}
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
                                        mb: 2.2,
                                    }}
                                >
                                    <Icone size={23} color="#05b5e6" />
                                </Box>

                                <Typography sx={{ fontWeight: 800, fontSize: "1.12rem", color: "#1f2a37" }}>
                                    {titulo}
                                </Typography>
                                <Typography sx={{ color: "#5b6472", fontSize: ".95rem", lineHeight: 1.7, mt: 1.2 }}>
                                    {texto}
                                </Typography>
                            </Paper>
                        ))}
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

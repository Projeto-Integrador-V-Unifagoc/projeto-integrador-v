import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    CircularProgress,
    List,
    ListItemButton,
    ListItemText,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Button from "./components/BotaoConteudo";
import { conteudoApi, mensagemDeErro } from "../../services/conteudo-api";
import type { ConteudoPublicado, PaginaPublicada } from "../../models/conteudo-model";
import { formatarMinutos } from "./conteudo-metricas";

const VisualizadorPagina = lazy(() => import("./components/VisualizadorPagina"));

/**
 * Leitura do conteúdo publicado. Usado pelo aluno (a partir da disciplina em que
 * está matriculado) e pelo professor/secretaria como "Pré-visualizar como aluno".
 */
export function LeitorConteudo({ modo }: { modo: "aluno" | "previa" }) {
    const { turmaDisciplinaId = "", cursoDisciplinaId = "" } = useParams();
    const navigate = useNavigate();
    const [conteudo, setConteudo] = useState<ConteudoPublicado | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [paginaId, setPaginaId] = useState<string | null>(null);
    const [pagina, setPagina] = useState<PaginaPublicada | null>(null);

    useEffect(() => {
        const carga = modo === "aluno" ? conteudoApi.conteudoDoAluno(turmaDisciplinaId) : conteudoApi.visualizarComoAluno(cursoDisciplinaId);
        carga
            .then((dados) => {
                setConteudo(dados);
                setPaginaId(dados.topicos[0]?.paginas[0]?.id ?? null);
            })
            .catch((e) => setErro(mensagemDeErro(e, "Não foi possível carregar o conteúdo.")));
    }, [modo, turmaDisciplinaId, cursoDisciplinaId]);

    useEffect(() => {
        if (!paginaId) return;
        conteudoApi
            .paginaPublicada(paginaId)
            .then(setPagina)
            .catch((e) => setErro(mensagemDeErro(e, "Não foi possível abrir a página.")));
    }, [paginaId]);
    // Enquanto a página pedida não chega, a anterior não é exibida.
    const carregandoPagina = Boolean(paginaId) && pagina?.id !== paginaId;

    // Sequência linear para "Anterior / Próxima" dentro do tópico.
    const posicao = useMemo(() => {
        const topico = conteudo?.topicos.find((t) => t.paginas.some((p) => p.id === paginaId));
        if (!topico) return null;
        const indice = topico.paginas.findIndex((p) => p.id === paginaId);
        return { topico, indice, total: topico.paginas.length };
    }, [conteudo, paginaId]);

    if (erro) {
        return (
            <Stack gap={2} sx={{ p: 3 }}>
                <Alert severity="error">{erro}</Alert>
                <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => (modo === "aluno" ? navigate("/home") : navigate(-1))}>
                    Voltar
                </Button>
            </Stack>
        );
    }

    if (!conteudo) {
        return (
            <Stack direction="row" gap={2} sx={{ p: 3 }}>
                <Skeleton variant="rounded" width={300} height={400} />
                <Skeleton variant="rounded" sx={{ flex: 1 }} height={400} />
            </Stack>
        );
    }

    return (
        <Stack sx={{ minHeight: "calc(100vh - 49px)" }}>
            {modo === "previa" && (
                <Alert severity="info" icon={<Eye size={18} />} sx={{ borderRadius: 0 }}>
                    Pré-visualização: é assim que os alunos veem os tópicos publicados e as páginas visíveis desta disciplina.
                </Alert>
            )}
            <Stack gap={0.5} sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}>
                {modo === "aluno" && (
                    <Button variant="text" size="small" startIcon={<ArrowLeft size={16} />} sx={{ alignSelf: "flex-start", ml: -1 }} onClick={() => navigate("/home")}>
                        Voltar
                    </Button>
                )}
                <Typography variant="h6" fontWeight={700}>{conteudo.disciplina.nome}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {[conteudo.disciplina.codigo, conteudo.turmaSigla, conteudo.professorNome && `Professor(a): ${conteudo.professorNome}`]
                        .filter(Boolean)
                        .join(" · ")}
                </Typography>
            </Stack>

            {conteudo.topicos.length === 0 ? (
                <Stack alignItems="center" gap={1} sx={{ py: 8, px: 2, textAlign: "center" }}>
                    <Box component="img" src="/assets/nodata.svg" alt="" sx={{ width: 160, opacity: 0.8 }} />
                    <Typography color="text.secondary">Ainda não há conteúdo publicado para esta disciplina.</Typography>
                </Stack>
            ) : (
                <Stack direction={{ xs: "column", md: "row" }} sx={{ flex: 1 }}>
                    <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, bgcolor: "background.paper", borderRight: { md: 1 }, borderColor: "divider" }}>
                        {conteudo.topicos.map((topico) => (
                            <Accordion key={topico.id} disableGutters defaultExpanded elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                                    <Box>
                                        <Typography fontWeight={700} variant="body2">{topico.titulo}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {topico.paginas.length} {topico.paginas.length === 1 ? "página" : "páginas"}
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    {topico.descricao && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pb: 1 }}>
                                            {topico.descricao}
                                        </Typography>
                                    )}
                                    <List dense disablePadding>
                                        {topico.paginas.map((p, i) => (
                                            <ListItemButton key={p.id} selected={p.id === paginaId} onClick={() => setPaginaId(p.id)} sx={{ pl: 3 }}>
                                                <ListItemText
                                                    primary={`${i + 1}. ${p.titulo || `Página ${i + 1}`}`}
                                                    secondary={formatarMinutos(p.minutosEstimados)}
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>

                    <Stack sx={{ flex: 1, minWidth: 0, px: { xs: 1, md: 4 }, py: 3 }} gap={2}>
                        {posicao && (
                            <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 2, md: 6 } }}>
                                {posicao.topico.titulo} · Página {posicao.indice + 1} de {posicao.total}
                            </Typography>
                        )}
                        {pagina?.titulo && (
                            <Typography variant="h4" fontWeight={700} sx={{ px: { xs: 2, md: 6 } }}>{pagina.titulo}</Typography>
                        )}
                        <Box sx={{ maxWidth: 820, width: "100%", mx: "auto", flex: 1 }}>
                            {carregandoPagina || !pagina ? (
                                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
                            ) : (
                                <Suspense fallback={<Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>}>
                                    <VisualizadorPagina key={pagina.id} blocos={pagina.blocos} />
                                </Suspense>
                            )}
                        </Box>
                        {posicao && (
                            <Stack direction="row" justifyContent="space-between" sx={{ maxWidth: 820, width: "100%", mx: "auto", pt: 2, borderTop: 1, borderColor: "divider" }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<ChevronLeft size={16} />}
                                    disabled={posicao.indice === 0}
                                    onClick={() => setPaginaId(posicao.topico.paginas[posicao.indice - 1].id)}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="contained"
                                    endIcon={<ChevronRight size={16} />}
                                    disabled={posicao.indice >= posicao.total - 1}
                                    onClick={() => setPaginaId(posicao.topico.paginas[posicao.indice + 1].id)}
                                >
                                    Próxima
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}

export function ConteudoDisciplinaAluno() {
    return <LeitorConteudo modo="aluno" />;
}

export function PreviaConteudo() {
    return <LeitorConteudo modo="previa" />;
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Breadcrumbs,
    Chip,
    CircularProgress,
    InputBase,
    Link,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { AlertTriangle, CheckCircle2, Eye, FolderPlus, Info, Loader2, UserCog } from "lucide-react";
import Button from "./components/BotaoConteudo";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { useNotificacao } from "../../components/Notificacao/NotificationProvider";
import { codigoDoErro, conteudoApi, mensagemDeErro, statusDoErro } from "../../services/conteudo-api";
import type { DetalheConteudo, MetricasPagina, PaginaCompleta, PaginaResumo, TopicoConteudo } from "../../models/conteudo-model";
import ArvoreConteudo, { type EstruturaArvore } from "./components/ArvoreConteudo";
import BarraTamanhoPagina from "./components/BarraTamanhoPagina";
import { DialogoConflito, DialogoMoverPagina, DialogoNome, DialogoPublicar, DialogoTransferir } from "./components/DialogosConteudo";
import { avaliarTamanho, calcularMetricas } from "./conteudo-metricas";
import { rotuloPerfilGestor } from "./conteudo-perfil";
import type { RestricoesDeInsercao } from "./components/EditorPagina";

// O editor de blocos é pesado: só carrega quando esta tela abre.
const EditorPagina = lazy(() => import("./components/EditorPagina"));

type StatusSalvamento = "salvo" | "pendente" | "salvando" | "conflito" | "limite" | "erro";

const ESPERA_AUTOSAVE_MS = 2000;

function tempoRelativo(data: Date | null, agora: number) {
    if (!data) return "";
    const segundos = Math.max(0, Math.round((agora - data.getTime()) / 1000));
    if (segundos < 60) return `há ${segundos} s`;
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `há ${minutos} min`;
    return `às ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function quandoEditado(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EditorConteudo() {
    const { cursoDisciplinaId = "" } = useParams();
    const navigate = useNavigate();
    const { notificar } = useNotificacao();

    const [detalhe, setDetalhe] = useState<DetalheConteudo | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [paginaId, setPaginaId] = useState<string | null>(null);
    const [pagina, setPagina] = useState<PaginaCompleta | null>(null);
    const [carregandoPagina, setCarregandoPagina] = useState(false);
    const [chaveEditor, setChaveEditor] = useState(0);
    const [metricas, setMetricas] = useState<MetricasPagina | null>(null);
    const [status, setStatus] = useState<StatusSalvamento>("salvo");
    const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
    const [salvoEm, setSalvoEm] = useState<Date | null>(null);
    const [agora, setAgora] = useState(() => Date.now());
    const [titulo, setTitulo] = useState("");
    const [dividindo, setDividindo] = useState(false);

    // Diálogos
    const [novoTopico, setNovoTopico] = useState(false);
    const [renomearTopico, setRenomearTopico] = useState<TopicoConteudo | null>(null);
    const [renomearPagina, setRenomearPagina] = useState<PaginaResumo | null>(null);
    const [publicar, setPublicar] = useState<TopicoConteudo | null>(null);
    const [excluirTopico, setExcluirTopico] = useState<TopicoConteudo | null>(null);
    const [excluirPagina, setExcluirPagina] = useState<PaginaResumo | null>(null);
    const [moverPagina, setMoverPagina] = useState<PaginaResumo | null>(null);
    const [conflito, setConflito] = useState<PaginaCompleta | null>(null);
    const [transferir, setTransferir] = useState(false);

    const versaoRef = useRef(0);
    const pendenteRef = useRef<unknown[] | null>(null);
    const temporizadorRef = useRef<number | null>(null);
    const salvandoRef = useRef<Promise<void> | null>(null);
    const temporizadorTituloRef = useRef<number | null>(null);

    const gestor = detalhe?.perfil === "gestor";

    useEffect(() => {
        const id = window.setInterval(() => setAgora(Date.now()), 15000);
        return () => window.clearInterval(id);
    }, []);

    const carregarDetalhe = useCallback(async () => {
        try {
            setDetalhe(await conteudoApi.detalhar(cursoDisciplinaId));
            setErroCarga(null);
        } catch (e) {
            setErroCarga(mensagemDeErro(e, "Não foi possível carregar o conteúdo."));
        }
    }, [cursoDisciplinaId]);

    useEffect(() => {
        void carregarDetalhe();
    }, [carregarDetalhe]);

    // ---------- salvamento automático ----------

    const salvarAgora = useCallback(async (): Promise<void> => {
        if (temporizadorRef.current) {
            window.clearTimeout(temporizadorRef.current);
            temporizadorRef.current = null;
        }
        if (salvandoRef.current) await salvandoRef.current;
        const blocos = pendenteRef.current;
        const id = pagina?.id;
        if (!blocos || !id) return;
        pendenteRef.current = null;
        setStatus("salvando");
        const tarefa = (async () => {
            try {
                const resposta = await conteudoApi.salvarBlocos(id, blocos, versaoRef.current);
                versaoRef.current = resposta.pagina.versao;
                setPagina((atual) => (atual && atual.id === id ? { ...atual, ...resposta.pagina, blocos: atual.blocos } : atual));
                setDetalhe((atual) =>
                    atual && {
                        ...atual,
                        topicos: atual.topicos.map((t) => ({
                            ...t,
                            paginas: t.paginas.map((p) => (p.id === id ? { ...p, ...resposta.pagina } : p)),
                        })),
                    },
                );
                setSalvoEm(new Date());
                setMensagemStatus(null);
                setStatus(pendenteRef.current ? "pendente" : "salvo");
            } catch (e) {
                pendenteRef.current = pendenteRef.current ?? blocos;
                if (statusDoErro(e) === 409 && codigoDoErro(e) === "VERSAO_DESATUALIZADA") {
                    const atual = (e as { response?: { data?: { detalhes?: { pagina?: PaginaCompleta } } } }).response?.data?.detalhes?.pagina;
                    setStatus("conflito");
                    if (atual) setConflito(atual);
                } else if (statusDoErro(e) === 422) {
                    setStatus("limite");
                    setMensagemStatus(mensagemDeErro(e, "Limite da página atingido."));
                } else {
                    setStatus("erro");
                    setMensagemStatus(mensagemDeErro(e, "Não foi possível salvar."));
                }
            }
        })();
        salvandoRef.current = tarefa;
        await tarefa;
        salvandoRef.current = null;
    }, [pagina?.id]);

    const aoAlterarBlocos = useCallback(
        (blocos: unknown[]) => {
            if (!detalhe) return;
            setMetricas(calcularMetricas(blocos, detalhe.limites.tempo));
            pendenteRef.current = blocos;
            setStatus((s) => (s === "conflito" ? s : "pendente"));
            if (temporizadorRef.current) window.clearTimeout(temporizadorRef.current);
            temporizadorRef.current = window.setTimeout(() => void salvarAgora(), ESPERA_AUTOSAVE_MS);
        },
        [detalhe, salvarAgora],
    );

    // Salva o que estiver pendente ao sair da tela ou fechar a aba.
    useEffect(() => {
        const antesDeSair = (e: BeforeUnloadEvent) => {
            if (pendenteRef.current) {
                void salvarAgora();
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", antesDeSair);
        return () => window.removeEventListener("beforeunload", antesDeSair);
    }, [salvarAgora]);

    // Na desmontagem usa a versão mais recente de `salvarAgora` (a do 1º render não conhece a página).
    const salvarAgoraRef = useRef(salvarAgora);
    useEffect(() => {
        salvarAgoraRef.current = salvarAgora;
    }, [salvarAgora]);
    useEffect(() => () => {
        if (pendenteRef.current) void salvarAgoraRef.current();
    }, []);

    // ---------- seleção de página ----------

    const abrirPagina = useCallback(
        async (id: string) => {
            await salvarAgora();
            setPaginaId(id);
            setCarregandoPagina(true);
            try {
                const completa = await conteudoApi.obterPagina(id);
                versaoRef.current = completa.versao;
                pendenteRef.current = null;
                setPagina(completa);
                setTitulo(completa.titulo ?? "");
                setMetricas(completa.metricas);
                setStatus("salvo");
                setMensagemStatus(null);
                setSalvoEm(null);
                setChaveEditor((k) => k + 1);
            } catch (e) {
                notificar(mensagemDeErro(e, "Não foi possível abrir a página."), "error");
            } finally {
                setCarregandoPagina(false);
            }
        },
        [salvarAgora, notificar],
    );

    // Abre a primeira página na primeira carga.
    useEffect(() => {
        if (!detalhe || paginaId) return;
        const primeira = detalhe.topicos.flatMap((t) => t.paginas)[0];
        if (primeira) void abrirPagina(primeira.id);
    }, [detalhe, paginaId, abrirPagina]);

    // Se a página aberta deixou de existir (excluída), limpa o editor.
    useEffect(() => {
        if (!detalhe || !paginaId) return;
        if (!detalhe.topicos.some((t) => t.paginas.some((p) => p.id === paginaId))) {
            pendenteRef.current = null;
            setPaginaId(null);
            setPagina(null);
        }
    }, [detalhe, paginaId]);

    const topicoDaPagina = useMemo(
        () => detalhe?.topicos.find((t) => t.paginas.some((p) => p.id === paginaId)) ?? null,
        [detalhe, paginaId],
    );
    const numeroDaPagina = topicoDaPagina ? topicoDaPagina.paginas.findIndex((p) => p.id === paginaId) + 1 : 0;
    const resumoAtual = topicoDaPagina?.paginas.find((p) => p.id === paginaId) ?? null;

    // ---------- título da página ----------

    const aoAlterarTitulo = (valor: string) => {
        setTitulo(valor);
        if (temporizadorTituloRef.current) window.clearTimeout(temporizadorTituloRef.current);
        const id = paginaId;
        temporizadorTituloRef.current = window.setTimeout(async () => {
            if (!id) return;
            try {
                const atualizada = await conteudoApi.atualizarPagina(id, { titulo: valor.trim() || null });
                setDetalhe((atual) =>
                    atual && {
                        ...atual,
                        topicos: atual.topicos.map((t) => ({
                            ...t,
                            paginas: t.paginas.map((p) => (p.id === id ? { ...p, titulo: atualizada.titulo } : p)),
                        })),
                    },
                );
            } catch (e) {
                notificar(mensagemDeErro(e, "Não foi possível salvar o título."), "error");
            }
        }, 800);
    };

    // ---------- ações da árvore ----------

    const executar = async (acao: () => Promise<unknown>, sucesso?: string, recarregar = true) => {
        try {
            await acao();
            if (recarregar) await carregarDetalhe();
            if (sucesso) notificar(sucesso, "success");
            return true;
        } catch (e) {
            notificar(mensagemDeErro(e, "Não foi possível concluir a ação."), "error");
            if (recarregar) await carregarDetalhe();
            return false;
        }
    };

    const criarPaginaEm = async (topico: TopicoConteudo) => {
        try {
            const { pagina: nova, avisos } = await conteudoApi.criarPagina(topico.id);
            await carregarDetalhe();
            await abrirPagina(nova.id);
            if (avisos[0]) notificar(avisos[0], "warning");
        } catch (e) {
            notificar(mensagemDeErro(e, "Não foi possível criar a página."), "error");
        }
    };

    const reordenar = async (estrutura: EstruturaArvore) => {
        try {
            setDetalhe(await conteudoApi.reordenar(cursoDisciplinaId, { topicos: estrutura }));
        } catch (e) {
            notificar(mensagemDeErro(e, "Não foi possível reorganizar."), "error");
            await carregarDetalhe();
        }
    };

    const moverPaginaPara = async (topicoDestinoId: string) => {
        if (!detalhe || !moverPagina) return;
        const estrutura = detalhe.topicos.map((t) => ({
            id: t.id,
            paginas: t.paginas.filter((p) => p.id !== moverPagina.id).map((p) => p.id),
        }));
        estrutura.find((t) => t.id === topicoDestinoId)?.paginas.push(moverPagina.id);
        setMoverPagina(null);
        await reordenar(estrutura);
        notificar("Página movida.", "success");
    };

    // ---------- conflito ----------

    const verVersaoAtual = () => {
        if (!conflito) return;
        pendenteRef.current = null;
        versaoRef.current = conflito.versao;
        setPagina(conflito);
        setMetricas(conflito.metricas);
        setTitulo(conflito.titulo ?? "");
        setStatus("salvo");
        setConflito(null);
        setChaveEditor((k) => k + 1);
    };

    const manterMinha = () => {
        if (!conflito) return;
        versaoRef.current = conflito.versao;
        setConflito(null);
        void salvarAgora();
    };

    // ---------- dividir ----------

    const dividir = async () => {
        if (!pagina) return;
        await salvarAgora();
        // Se o salvamento falhou, não divide uma versão que não é a da tela.
        if (pendenteRef.current) {
            notificar("Salve a página antes de dividir.", "warning");
            return;
        }
        const atual = await conteudoApi.obterPagina(pagina.id);
        const total = atual.blocos.length;
        if (total < 2) {
            notificar("A página precisa de ao menos dois blocos para ser dividida.", "warning");
            return;
        }
        // Divide pelo tempo: os blocos até ~metade do limite recomendado ficam nesta página.
        const alvo = (detalhe?.limites.pagina.minutosRecomendado ?? 10) * 0.8;
        let indice = 1;
        for (let i = 1; i < total; i++) {
            const parcial = calcularMetricas(atual.blocos.slice(0, i), detalhe!.limites.tempo);
            if (parcial.minutosEstimados > alvo) break;
            indice = i;
        }
        setDividindo(true);
        try {
            const { novaPagina } = await conteudoApi.dividirPagina(pagina.id, indice, atual.versao);
            await carregarDetalhe();
            await abrirPagina(pagina.id);
            notificar(`Conteúdo dividido: a parte final foi para uma nova página (${novaPagina.ordem}).`, "success");
        } catch (e) {
            notificar(mensagemDeErro(e, "Não foi possível dividir a página."), "error");
        } finally {
            setDividindo(false);
        }
    };

    // ---------- render ----------

    const estadoTamanho = metricas && detalhe ? avaliarTamanho(metricas, detalhe.limites.pagina).estado : "ok";
    const restricoes: RestricoesDeInsercao = useMemo(
        () => ({
            semMidia: estadoTamanho === "bloqueio" && (metricas?.minutosEstimados ?? 0) >= (detalhe?.limites.pagina.minutosMaximo ?? 20),
            semVideo: (metricas?.videos ?? 0) >= (detalhe?.limites.pagina.maxVideos ?? 3),
            semImagem: (metricas?.imagens ?? 0) >= (detalhe?.limites.pagina.maxImagens ?? 15),
        }),
        [estadoTamanho, metricas, detalhe],
    );

    if (erroCarga) {
        return (
            <Stack gap={2} sx={{ p: 3 }}>
                <Alert severity="error">{erroCarga}</Alert>
                <Button variant="outlined" onClick={() => navigate("/conteudos")} sx={{ alignSelf: "flex-start" }}>
                    Voltar
                </Button>
            </Stack>
        );
    }

    if (!detalhe) {
        return (
            <Stack direction="row" gap={2} sx={{ p: 3 }}>
                <Skeleton variant="rounded" width={320} height={480} />
                <Skeleton variant="rounded" sx={{ flex: 1 }} height={480} />
            </Stack>
        );
    }

    const totalTopicos = detalhe.topicos.length;
    const corTopicos = totalTopicos >= detalhe.limites.topicos.maximo ? "error" : totalTopicos > detalhe.limites.topicos.recomendado ? "warning" : "default";
    const professorSemResponsavel = !gestor && !detalhe.responsavel;

    const indicador = (() => {
        switch (status) {
            case "salvando":
                return { icone: <Loader2 size={14} className="girar" />, texto: "Salvando…", cor: "text.secondary" };
            case "pendente":
                return { icone: <Loader2 size={14} />, texto: "Alterações não salvas", cor: "text.secondary" };
            case "conflito":
                return { icone: <AlertTriangle size={14} />, texto: "Conflito ao salvar", cor: "warning.main" };
            case "limite":
                return { icone: <AlertTriangle size={14} />, texto: mensagemStatus ?? "Limite atingido", cor: "error.main" };
            case "erro":
                return { icone: <AlertTriangle size={14} />, texto: mensagemStatus ?? "Erro ao salvar", cor: "error.main" };
            default:
                return { icone: <CheckCircle2 size={14} />, texto: salvoEm ? `Salvo ${tempoRelativo(salvoEm, agora)}` : "Tudo salvo", cor: "success.main" };
        }
    })();

    return (
        <Stack
            sx={{
                // Anula o padding do <main> do layout para o editor ocupar a área inteira;
                // no desktop a rolagem fica dentro da árvore e do editor, e a barra de tamanho cola no rodapé.
                // Em telas estreitas (árvore acima do editor) a página rola inteira e a barra fica "sticky".
                m: { xs: -2, sm: -3 },
                minHeight: { xs: "calc(100% + 32px)", sm: "calc(100% + 48px)" },
                height: { md: "calc(100% + 48px)" },
                overflow: { md: "hidden" },
                "& .girar": { animation: "girar 1s linear infinite" }, "@keyframes girar": { to: { transform: "rotate(360deg)" } },
            }}
        >
            {/* Cabeçalho */}
            <Stack gap={1} sx={{ px: 3, pt: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Breadcrumbs>
                    <Link underline="hover" color="inherit" sx={{ cursor: "pointer" }} onClick={() => navigate("/conteudos")}>
                        {gestor ? "Conteúdos Acadêmicos" : "Meus Conteúdos"}
                    </Link>
                    <Link underline="hover" color="inherit" sx={{ cursor: "pointer" }} onClick={() => navigate(`/conteudos/cursos/${detalhe.curso.id}`)}>
                        {detalhe.curso.nome}
                    </Link>
                    <Typography color="text.primary">{detalhe.disciplina.nome}</Typography>
                </Breadcrumbs>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            {detalhe.disciplina.nome}{" "}
                            <Typography component="span" variant="body2" color="text.secondary">
                                {detalhe.disciplina.codigo} · {detalhe.cargaHoraria}h
                            </Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Responsável: <strong>{detalhe.responsavel?.nome ?? "sem responsável"}</strong>
                        </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                        {paginaId && (
                            <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: indicador.cor }}>
                                {indicador.icone}
                                <Typography variant="body2" sx={{ color: indicador.cor }}>{indicador.texto}</Typography>
                            </Stack>
                        )}
                        {gestor && detalhe.podeTransferir && (
                            <Button variant="outlined" size="small" startIcon={<UserCog size={16} />} onClick={() => setTransferir(true)}>
                                Transferir responsável
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Eye size={16} />}
                            onClick={() => window.open(`/conteudos/disciplinas/${cursoDisciplinaId}/visualizar`, "_blank")}
                        >
                            Pré-visualizar como aluno
                        </Button>
                    </Stack>
                </Stack>
                {gestor && (
                    <Alert severity="info" icon={<Info size={18} />} sx={{ py: 0 }}>
                        Você está editando como {rotuloPerfilGestor()}. Suas alterações ficarão registradas em seu nome.
                    </Alert>
                )}
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} sx={{ flex: 1, minHeight: 0 }}>
                {/* Árvore */}
                <Stack
                    sx={{
                        width: { xs: "100%", md: 340 },
                        minHeight: 0,
                        flexShrink: 0,
                        bgcolor: "background.paper",
                        borderRight: { md: 1 },
                        borderBottom: { xs: 1, md: 0 },
                        borderColor: "divider",
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2, pb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>Estrutura</Typography>
                        <Tooltip title={`Recomendado: ${detalhe.limites.topicos.recomendado} · Máximo: ${detalhe.limites.topicos.maximo}`}>
                            <Chip size="small" variant="outlined" color={corTopicos} label={`Tópicos ${totalTopicos}/${detalhe.limites.topicos.recomendado}`} />
                        </Tooltip>
                    </Stack>
                    <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
                        {totalTopicos === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                                Nenhum tópico ainda. Crie o primeiro para começar a montar o conteúdo.
                            </Typography>
                        ) : (
                            <ArvoreConteudo
                                topicos={detalhe.topicos}
                                limites={detalhe.limites}
                                paginaSelecionadaId={paginaId}
                                onSelecionarPagina={(p) => void abrirPagina(p.id)}
                                onNovaPagina={(t) => void criarPaginaEm(t)}
                                onRenomearTopico={setRenomearTopico}
                                onPublicarTopico={(t) =>
                                    t.publicado
                                        ? void executar(() => conteudoApi.publicarTopico(t.id, false), "Tópico despublicado.")
                                        : setPublicar(t)
                                }
                                onDuplicarTopico={(t) => void executar(() => conteudoApi.duplicarTopico(t.id), "Tópico duplicado.")}
                                onExcluirTopico={setExcluirTopico}
                                onRenomearPagina={setRenomearPagina}
                                onAlternarOculta={(p) =>
                                    void executar(
                                        () => conteudoApi.atualizarPagina(p.id, { oculta: !p.oculta }),
                                        p.oculta ? "Página visível para os alunos." : "Página ocultada dos alunos.",
                                    )
                                }
                                onDuplicarPagina={(p) => void executar(() => conteudoApi.duplicarPagina(p.id), "Página duplicada.")}
                                onMoverPagina={setMoverPagina}
                                onExcluirPagina={setExcluirPagina}
                                onReordenar={(estrutura) => void reordenar(estrutura)}
                            />
                        )}
                    </Box>
                    <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<FolderPlus size={16} />}
                            disabled={totalTopicos >= detalhe.limites.topicos.maximo}
                            onClick={() => setNovoTopico(true)}
                        >
                            {totalTopicos >= detalhe.limites.topicos.maximo ? "Máximo de tópicos atingido" : "Novo tópico"}
                        </Button>
                    </Box>
                </Stack>

                {/* Editor */}
                <Stack sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                    {!paginaId ? (
                        <Stack alignItems="center" justifyContent="center" gap={2} sx={{ flex: 1, p: 4, textAlign: "center" }}>
                            <Box component="img" src="/assets/nodata.svg" alt="" sx={{ width: 160, opacity: 0.8 }} />
                            <Typography color="text.secondary">
                                {totalTopicos === 0
                                    ? "Crie um tópico (por exemplo, \"Estudo Dirigido 1\") e depois adicione páginas a ele."
                                    : "Selecione uma página na estrutura ou crie uma nova."}
                            </Typography>
                            {professorSemResponsavel && (
                                <Alert severity="info" sx={{ maxWidth: 520, textAlign: "left" }}>
                                    Ao criar o primeiro tópico você será o responsável por este conteúdo. Os demais professores da
                                    disciplina não terão acesso a ele.
                                </Alert>
                            )}
                            {totalTopicos === 0 && (
                                <Button variant="contained" startIcon={<FolderPlus size={16} />} onClick={() => setNovoTopico(true)}>
                                    Novo tópico
                                </Button>
                            )}
                        </Stack>
                    ) : (
                        <>
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: "auto" } }}>
                                <Stack gap={1} sx={{ px: { xs: 2, md: 4 }, pt: 3 }}>
                                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            {topicoDaPagina?.titulo} › Página {numeroDaPagina}
                                        </Typography>
                                        <Stack direction="row" gap={1} alignItems="center">
                                            <Chip
                                                size="small"
                                                color={topicoDaPagina?.publicado ? "success" : "default"}
                                                label={topicoDaPagina?.publicado ? "Tópico publicado" : "Tópico em rascunho"}
                                            />
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={resumoAtual?.oculta ? "Oculta do aluno" : "Visível ao aluno"}
                                            />
                                            {topicoDaPagina && (
                                                <Button
                                                    size="small"
                                                    variant={topicoDaPagina.publicado ? "outlined" : "contained"}
                                                    onClick={() =>
                                                        topicoDaPagina.publicado
                                                            ? void executar(() => conteudoApi.publicarTopico(topicoDaPagina.id, false), "Tópico despublicado.")
                                                            : setPublicar(topicoDaPagina)
                                                    }
                                                >
                                                    {topicoDaPagina.publicado ? "Despublicar" : "Publicar tópico"}
                                                </Button>
                                            )}
                                        </Stack>
                                    </Stack>
                                    <InputBase
                                        value={titulo}
                                        onChange={(e) => aoAlterarTitulo(e.target.value)}
                                        placeholder="Título da página (opcional)"
                                        inputProps={{ maxLength: 150, "aria-label": "Título da página" }}
                                        sx={{ fontSize: 28, fontWeight: 700 }}
                                    />
                                    {pagina?.atualizadoPorNome && (
                                        <Typography variant="caption" color="text.secondary">
                                            Última edição por {pagina.atualizadoPorNome} em {quandoEditado(pagina.atualizadoEm)}
                                        </Typography>
                                    )}
                                </Stack>
                                <Box sx={{ px: { xs: 0, md: 2 }, py: 2 }}>
                                    <Box sx={{ maxWidth: 820, mx: "auto" }}>
                                        {carregandoPagina || !pagina ? (
                                            <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
                                        ) : (
                                            <Suspense fallback={<Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>}>
                                                <EditorPagina
                                                    key={`${pagina.id}-${chaveEditor}`}
                                                    cursoDisciplinaId={cursoDisciplinaId}
                                                    blocosIniciais={pagina.blocos}
                                                    restricoes={restricoes}
                                                    onAlterar={aoAlterarBlocos}
                                                    onErro={(m) => notificar(m, "error")}
                                                />
                                            </Suspense>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                            {metricas && (
                                <BarraTamanhoPagina
                                    metricas={metricas}
                                    limites={detalhe.limites.pagina}
                                    dividindo={dividindo}
                                    onDividir={() => void dividir()}
                                    onNovaPagina={topicoDaPagina ? () => void criarPaginaEm(topicoDaPagina) : undefined}
                                />
                            )}
                        </>
                    )}
                </Stack>
            </Stack>

            {/* Diálogos */}
            <DialogoNome
                open={novoTopico}
                titulo="Novo tópico"
                rotulo="Nome do tópico"
                comDescricao
                textoConfirmar="Criar tópico"
                aviso={
                    professorSemResponsavel
                        ? "Ao criar este tópico você será o responsável pelo conteúdo da disciplina. O tópico nasce como rascunho e só fica visível aos alunos depois de publicado."
                        : "O tópico será criado como rascunho e não ficará visível aos alunos até ser publicado."
                }
                onFechar={() => setNovoTopico(false)}
                onConfirmar={async (nome, descricao) => {
                    try {
                        const r = await conteudoApi.criarTopico(cursoDisciplinaId, { titulo: nome, descricao: descricao || null });
                        setNovoTopico(false);
                        await carregarDetalhe();
                        notificar(r.assumiuResponsabilidade ? "Tópico criado. Você agora é o responsável por este conteúdo." : r.avisos[0] ?? "Tópico criado.", r.avisos[0] ? "warning" : "success");
                    } catch (e) {
                        notificar(mensagemDeErro(e, "Não foi possível criar o tópico."), "error");
                    }
                }}
            />
            <DialogoNome
                open={Boolean(renomearTopico)}
                titulo="Renomear tópico"
                rotulo="Nome do tópico"
                comDescricao
                valorInicial={renomearTopico?.titulo}
                descricaoInicial={renomearTopico?.descricao}
                onFechar={() => setRenomearTopico(null)}
                onConfirmar={async (nome, descricao) => {
                    if (!renomearTopico) return;
                    if (await executar(() => conteudoApi.atualizarTopico(renomearTopico.id, { titulo: nome, descricao: descricao || null }), "Tópico atualizado.")) {
                        setRenomearTopico(null);
                    }
                }}
            />
            <DialogoNome
                open={Boolean(renomearPagina)}
                titulo="Renomear página"
                rotulo="Título da página"
                obrigatorio={false}
                valorInicial={renomearPagina?.titulo ?? ""}
                onFechar={() => setRenomearPagina(null)}
                onConfirmar={async (nome) => {
                    if (!renomearPagina) return;
                    if (await executar(() => conteudoApi.atualizarPagina(renomearPagina.id, { titulo: nome || null }), "Página renomeada.")) {
                        if (renomearPagina.id === paginaId) setTitulo(nome);
                        setRenomearPagina(null);
                    }
                }}
            />
            <DialogoPublicar
                topico={publicar}
                onFechar={() => setPublicar(null)}
                onConfirmar={async () => {
                    if (!publicar) return;
                    if (await executar(() => conteudoApi.publicarTopico(publicar.id, true), "Tópico publicado com sucesso.")) setPublicar(null);
                }}
            />
            <ConfirmDialog
                open={Boolean(excluirTopico)}
                titulo="Excluir tópico"
                textoConfirmar="Excluir tópico"
                mensagem={`Esta ação removerá o tópico "${excluirTopico?.titulo ?? ""}" e suas ${excluirTopico?.paginas.length ?? 0} páginas. Não é possível desfazer.`}
                onCancelar={() => setExcluirTopico(null)}
                onConfirmar={() => {
                    const t = excluirTopico;
                    setExcluirTopico(null);
                    if (t) void executar(() => conteudoApi.excluirTopico(t.id), "Tópico excluído.");
                }}
            />
            <ConfirmDialog
                open={Boolean(excluirPagina)}
                titulo="Excluir página"
                textoConfirmar="Excluir página"
                mensagem={`A página "${excluirPagina?.titulo || "sem título"}" e todo o seu conteúdo serão removidos. Não é possível desfazer.`}
                onCancelar={() => setExcluirPagina(null)}
                onConfirmar={() => {
                    const p = excluirPagina;
                    setExcluirPagina(null);
                    if (p) {
                        if (p.id === paginaId) pendenteRef.current = null;
                        void executar(() => conteudoApi.excluirPagina(p.id), "Página excluída.");
                    }
                }}
            />
            <DialogoMoverPagina
                topicos={moverPagina ? detalhe.topicos : null}
                topicoAtualId={moverPagina?.topicoId ?? ""}
                maximoPaginas={detalhe.limites.paginasPorTopico.maximo}
                onFechar={() => setMoverPagina(null)}
                onConfirmar={(destino) => void moverPaginaPara(destino)}
            />
            <DialogoConflito atual={conflito} onVerAtual={verVersaoAtual} onManterMinha={manterMinha} onCancelar={() => setConflito(null)} />
            {gestor && (
                <DialogoTransferir
                    detalhe={detalhe}
                    open={transferir}
                    onFechar={() => setTransferir(false)}
                    onConfirmar={async (professorId) => {
                        try {
                            setDetalhe(await conteudoApi.transferirResponsavel(cursoDisciplinaId, professorId));
                            setTransferir(false);
                            notificar("Responsável transferido.", "success");
                        } catch (e) {
                            notificar(mensagemDeErro(e, "Não foi possível transferir."), "error");
                        }
                    }}
                />
            )}
        </Stack>
    );
}

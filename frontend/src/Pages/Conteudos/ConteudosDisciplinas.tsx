import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Breadcrumbs,
    Card,
    CardActions,
    CardContent,
    Chip,
    Grid,
    InputAdornment,
    Link,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { BookOpen, Lock, Search, Users } from "lucide-react";
import Container from "../../components/Container";
import Button from "./components/BotaoConteudo";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { conteudoApi, mensagemDeErro } from "../../services/conteudo-api";
import type { DisciplinaConteudo, DisciplinasDoCurso } from "../../models/conteudo-model";
import { ehGestorDeConteudo } from "./conteudo-perfil";

function StatusConteudo({ disciplina }: { disciplina: DisciplinaConteudo }) {
    if (disciplina.situacao === "de_outro_professor") return null;
    if (!disciplina.totalTopicos) return <Chip size="small" label="Sem conteúdo" />;
    return (
        <Typography variant="body2" color="text.secondary">
            {disciplina.totalTopicos} {disciplina.totalTopicos === 1 ? "tópico" : "tópicos"} · {disciplina.totalPublicados}{" "}
            {disciplina.totalPublicados === 1 ? "publicado" : "publicados"}
        </Typography>
    );
}

export default function ConteudosDisciplinas() {
    const { cursoId = "" } = useParams();
    const navigate = useNavigate();
    const gestor = ehGestorDeConteudo();
    const [dados, setDados] = useState<DisciplinasDoCurso | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [busca, setBusca] = useState("");
    const [assumir, setAssumir] = useState<DisciplinaConteudo | null>(null);

    useEffect(() => {
        conteudoApi
            .listarDisciplinas(cursoId)
            .then(setDados)
            .catch((e) => setErro(mensagemDeErro(e, "Não foi possível carregar as disciplinas.")))
            .finally(() => setCarregando(false));
    }, [cursoId]);

    const disciplinas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const lista = dados?.disciplinas ?? [];
        return termo
            ? lista.filter((d) => `${d.disciplina.nome} ${d.disciplina.codigo}`.toLowerCase().includes(termo))
            : lista;
    }, [dados, busca]);

    const abrir = (d: DisciplinaConteudo) => navigate(`/conteudos/disciplinas/${d.cursoDisciplinaId}`);

    return (
        <Container>
            <Stack gap={3} sx={{ py: 3 }}>
                <Breadcrumbs>
                    <Link underline="hover" color="inherit" sx={{ cursor: "pointer" }} onClick={() => navigate("/conteudos")}>
                        {gestor ? "Conteúdos Acadêmicos" : "Meus Conteúdos"}
                    </Link>
                    <Typography color="text.primary">{dados?.curso.nome ?? "Curso"}</Typography>
                </Breadcrumbs>

                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>{dados?.curso.nome ?? " "}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {gestor ? "Todas as disciplinas da matriz curricular deste curso." : "Disciplinas que você leciona neste curso."}
                        </Typography>
                    </Box>
                    <TextField
                        placeholder="Buscar disciplina..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        sx={{ maxWidth: { sm: 320 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
                    />
                </Stack>

                {erro && <Alert severity="error">{erro}</Alert>}

                {carregando ? (
                    <Grid container spacing={2}>
                        {[1, 2, 3].map((i) => (
                            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}><Skeleton variant="rounded" height={190} /></Grid>
                        ))}
                    </Grid>
                ) : disciplinas.length === 0 && !erro ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                        Nenhuma disciplina encontrada.
                    </Typography>
                ) : (
                    <Grid container spacing={2}>
                        {disciplinas.map((d) => {
                            const bloqueada = d.situacao === "de_outro_professor";
                            return (
                                <Grid key={d.cursoDisciplinaId} size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            opacity: bloqueada ? 0.75 : 1,
                                            bgcolor: bloqueada ? "grey.50" : "background.default",
                                        }}
                                    >
                                        <CardContent sx={{ flex: 1 }}>
                                            <Stack gap={1.5}>
                                                <Stack direction="row" gap={1.5} alignItems="flex-start">
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: "50%",
                                                            bgcolor: bloqueada ? "grey.100" : "rgba(5,181,230,.12)",
                                                            color: bloqueada ? "grey.400" : "primary.main",
                                                            display: "grid",
                                                            placeItems: "center",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {bloqueada ? <Lock size={18} /> : <BookOpen size={18} />}
                                                    </Box>
                                                    <Box>
                                                        <Typography fontWeight={700}>{d.disciplina.nome}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {d.disciplina.codigo} · {d.cargaHoraria}h
                                                            {d.periodoIdeal ? ` · ${d.periodoIdeal}º período` : ""}
                                                        </Typography>
                                                    </Box>
                                                </Stack>

                                                {bloqueada ? (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Conteúdo sob responsabilidade de outro professor.
                                                    </Typography>
                                                ) : (
                                                    <StatusConteudo disciplina={d} />
                                                )}

                                                {gestor && (
                                                    <Stack gap={0.75}>
                                                        <Typography variant="body2">
                                                            <strong>Responsável:</strong> {d.responsavel?.nome ?? "—"}
                                                        </Typography>
                                                        {d.totalProfessores ? (
                                                            <Stack direction="row" gap={0.75} alignItems="center" sx={{ color: "text.secondary" }}>
                                                                <Users size={14} />
                                                                <Typography variant="body2">
                                                                    {d.totalProfessores} {d.totalProfessores === 1 ? "professor vinculado" : "professores vinculados"}
                                                                </Typography>
                                                            </Stack>
                                                        ) : (
                                                            <Chip size="small" color="warning" variant="outlined" label="Sem professor vinculado" sx={{ alignSelf: "flex-start" }} />
                                                        )}
                                                    </Stack>
                                                )}
                                            </Stack>
                                        </CardContent>
                                        {!bloqueada && (
                                            <CardActions sx={{ px: 2, pb: 2 }}>
                                                {d.situacao === "disponivel" ? (
                                                    <Button variant="contained" fullWidth onClick={() => setAssumir(d)}>
                                                        Montar conteúdo
                                                    </Button>
                                                ) : (
                                                    <Button variant={d.totalTopicos ? "outlined" : "contained"} fullWidth onClick={() => abrir(d)}>
                                                        {gestor ? "Abrir conteúdo" : d.totalTopicos ? "Editar conteúdo" : "Montar conteúdo"}
                                                    </Button>
                                                )}
                                            </CardActions>
                                        )}
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Stack>

            <ConfirmDialog
                open={Boolean(assumir)}
                titulo="Montar conteúdo"
                cor="primary"
                textoConfirmar="Continuar"
                mensagem={`Ao criar o primeiro tópico de ${assumir?.disciplina.nome ?? ""}, você será o responsável por este conteúdo. Os demais professores da disciplina não terão acesso a ele.`}
                onCancelar={() => setAssumir(null)}
                onConfirmar={() => {
                    const d = assumir;
                    setAssumir(null);
                    if (d) abrir(d);
                }}
            />
        </Container>
    );
}

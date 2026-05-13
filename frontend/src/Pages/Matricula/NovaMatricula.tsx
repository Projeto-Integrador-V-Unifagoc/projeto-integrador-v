import { useState } from "react";
import {
    Alert,
    Box,
    Chip,
    Divider,
    FormControl,
    FormLabel,
    LinearProgress,
    Paper,
    Radio,
    RadioGroup,
    Snackbar,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { CheckCircle, GraduationCap, Search, User } from "lucide-react";
import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { useMatricula } from "../../hooks/use-matricula";
import type { AlunoParaMatricula, TurmaDisponivel, MatriculaCriada } from "../../models/matricula-model";

const STEPS = ["Identificar aluno", "Selecionar turma", "Confirmar matrícula", "Concluído"];

const STATUS_COR: Record<string, string> = {
    MATRICULADO: "#1976d2",
    CURSANDO: "#2e7d32",
    TRANCADO: "#ed6c02",
    CANCELADO: "#d32f2f",
    CONCLUIDO: "#00695c",
};

function getMensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function NovaMatricula() {
    const { buscarAluno, listarTurmasDisponiveis, criarMatricula, carregando } = useMatricula();

    const [activeStep, setActiveStep] = useState(0);
    const [query, setQuery] = useState("");
    const [aluno, setAluno] = useState<AlunoParaMatricula | null>(null);
    const [erroAluno, setErroAluno] = useState("");
    const [turmas, setTurmas] = useState<TurmaDisponivel[]>([]);
    const [turmaId, setTurmaId] = useState("");
    const [matricula, setMatricula] = useState<MatriculaCriada | null>(null);
    const [snackbar, setSnackbar] = useState<{ aberto: boolean; mensagem: string; severidade: "success" | "error" }>({
        aberto: false, mensagem: "", severidade: "success",
    });

    const turmaSelecionada = turmas.find((t) => t.id === turmaId);

    function resetar() {
        setActiveStep(0);
        setQuery("");
        setAluno(null);
        setErroAluno("");
        setTurmas([]);
        setTurmaId("");
        setMatricula(null);
    }

    async function handleBuscarAluno() {
        if (query.trim().length < 3) return;
        setErroAluno("");
        setAluno(null);
        try {
            const resultado = await buscarAluno(query.trim());
            if (!resultado || resultado.length === 0) {
                setErroAluno("Nenhum aluno encontrado com este CPF ou número de matrícula.");
                return;
            }
            setAluno(resultado[0]);
        } catch (err) {
            setErroAluno(getMensagemErro(err, "Erro ao buscar aluno."));
        }
    }

    async function handleAvancarParaTurmas() {
        if (!aluno?.curso_id) return;
        try {
            const resultado = await listarTurmasDisponiveis(aluno.curso_id);
            setTurmas(resultado);
            setActiveStep(1);
        } catch {
            setTurmas([]);
            setActiveStep(1);
        }
    }

    async function handleConfirmar() {
        if (!aluno || !turmaId) return;
        try {
            const resultado = await criarMatricula(aluno.id, turmaId);
            setMatricula(resultado);
            setActiveStep(3);
        } catch (err) {
            setSnackbar({ aberto: true, mensagem: getMensagemErro(err, "Erro ao criar matrícula."), severidade: "error" });
        }
    }

    // ── Steps ────────────────────────────────────────────────────────────────────

    const step0 = (
        <Stack spacing={2.5} alignItems="center" width="100%">
            <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 680, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2, p: 3 })}>
                <Stack spacing={2}>
                    <Stack alignItems="center" spacing={1} textAlign="center">
                        <Box sx={(t) => ({ width: 48, height: 48, borderRadius: "50%", backgroundColor: t.palette.primary.main, display: "flex", alignItems: "center", justifyContent: "center" })}>
                            <GraduationCap color="#fff" size={22} />
                        </Box>
                        <Typography variant="h5" fontWeight={700}>Nova matrícula</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Busque o aluno pelo CPF ou número de matrícula para iniciar.
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="CPF ou Nº de Matrícula *"
                            placeholder="Ex.: 123.456.789-00 ou 2024001"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") void handleBuscarAluno(); }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                        <Button
                            variant="contained"
                            sx={{ width: "auto", minWidth: 110, height: 56 }}
                            onClick={() => void handleBuscarAluno()}
                            disabled={query.trim().length < 3}
                            isLoading={carregando}
                        >
                            <Search size={16} style={{ marginRight: 6 }} />
                            Buscar
                        </Button>
                    </Stack>

                    {erroAluno && <Alert severity="error">{erroAluno}</Alert>}
                </Stack>
            </Paper>

            {aluno && (
                <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 680, border: `1px solid ${t.palette.primary.light}`, borderRadius: 2, p: 3 })}>
                    <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <User size={18} />
                                <Typography variant="subtitle1" fontWeight={700}>Aluno identificado</Typography>
                            </Stack>
                            <Button variant="text" sx={{ width: "auto" }} onClick={resetar}>Limpar</Button>
                        </Stack>
                        <Divider />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                            <Box flex={1}><Typography variant="caption" color="text.secondary">Nome</Typography><Typography variant="body2" fontWeight={600}>{aluno.nome}</Typography></Box>
                            <Box flex={1}><Typography variant="caption" color="text.secondary">CPF</Typography><Typography variant="body2">{aluno.cpf}</Typography></Box>
                            <Box flex={1}><Typography variant="caption" color="text.secondary">Matrícula</Typography><Typography variant="body2" fontWeight={600}>{aluno.matricula}</Typography></Box>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                            <Box flex={1}><Typography variant="caption" color="text.secondary">Curso</Typography><Typography variant="body2">{aluno.curso_nome ?? "—"}</Typography></Box>
                            <Box flex={1}><Typography variant="caption" color="text.secondary">Período</Typography><Typography variant="body2">{aluno.periodo}</Typography></Box>
                        </Stack>
                    </Stack>
                </Paper>
            )}

            <Stack direction="row" justifyContent="flex-end" sx={{ width: "100%", maxWidth: 680 }}>
                <Button variant="contained" sx={{ width: "auto", minWidth: 140 }} disabled={!aluno || !aluno.curso_id} onClick={() => void handleAvancarParaTurmas()}>
                    Próximo →
                </Button>
            </Stack>
        </Stack>
    );

    const step1 = (
        <Stack spacing={2.5} alignItems="center" width="100%">
            <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 900, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2, p: 3 })}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Turmas disponíveis — {aluno?.curso_nome}
                </Typography>

                {carregando && <LinearProgress sx={{ mb: 1 }} />}

                {!carregando && turmas.length === 0 && (
                    <Alert severity="warning">Não há turmas com vagas disponíveis para o curso deste aluno.</Alert>
                )}

                {turmas.length > 0 && (
                    <FormControl fullWidth>
                        <FormLabel sx={{ mb: 1, fontSize: 14 }}>Selecione a disciplina / turma:</FormLabel>
                        <RadioGroup value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                            <Box sx={{ overflowX: "auto" }}>
                                <Table size="small" sx={{ minWidth: 580 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox" />
                                            <TableCell>Disciplina</TableCell>
                                            <TableCell>Código</TableCell>
                                            <TableCell>Semestre</TableCell>
                                            <TableCell>Professor</TableCell>
                                            <TableCell>Vagas</TableCell>
                                            <TableCell>C.H.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {turmas.map((turma) => (
                                            <TableRow key={turma.id} hover selected={turmaId === turma.id} onClick={() => setTurmaId(turma.id)} sx={{ cursor: "pointer" }}>
                                                <TableCell padding="checkbox"><Radio value={turma.id} size="small" /></TableCell>
                                                <TableCell>{turma.disciplina_nome}</TableCell>
                                                <TableCell>{turma.disciplina_codigo}</TableCell>
                                                <TableCell>{turma.semestre}</TableCell>
                                                <TableCell>{turma.professor_nome}</TableCell>
                                                <TableCell>
                                                    <Chip label={`${turma.vagas_disponiveis}/${turma.capacidade_alunos}`} size="small" color={Number(turma.vagas_disponiveis) > 5 ? "success" : "warning"} />
                                                </TableCell>
                                                <TableCell>{turma.carga_horaria}h</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </RadioGroup>
                    </FormControl>
                )}
            </Paper>

            <Stack direction="row" justifyContent="space-between" sx={{ width: "100%", maxWidth: 900 }}>
                <Button variant="outlined" sx={{ width: "auto", minWidth: 120 }} onClick={() => setActiveStep(0)}>← Anterior</Button>
                <Button variant="contained" sx={{ width: "auto", minWidth: 140 }} disabled={!turmaId} onClick={() => setActiveStep(2)}>Próximo →</Button>
            </Stack>
        </Stack>
    );

    const step2 = (
        <Stack spacing={2.5} alignItems="center" width="100%">
            <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 680, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2, p: 3 })}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Resumo da matrícula</Typography>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Aluno</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <Box flex={1}><Typography variant="body2" fontWeight={600}>{aluno?.nome}</Typography><Typography variant="caption" color="text.secondary">Matrícula: {aluno?.matricula}</Typography></Box>
                            <Box flex={1}><Typography variant="body2">{aluno?.curso_nome}</Typography><Typography variant="caption" color="text.secondary">Período: {aluno?.periodo}</Typography></Box>
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Turma selecionada</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                            <Box flex={1}><Typography variant="body2" fontWeight={600}>{turmaSelecionada?.disciplina_nome}</Typography><Typography variant="caption" color="text.secondary">Código: {turmaSelecionada?.disciplina_codigo} · {turmaSelecionada?.carga_horaria}h</Typography></Box>
                            <Box flex={1}><Typography variant="body2">{turmaSelecionada?.semestre}</Typography><Typography variant="caption" color="text.secondary">Prof. {turmaSelecionada?.professor_nome}</Typography></Box>
                            <Chip label={`${turmaSelecionada?.vagas_disponiveis}/${turmaSelecionada?.capacidade_alunos} vagas`} size="small" color={Number(turmaSelecionada?.vagas_disponiveis) > 5 ? "success" : "warning"} />
                        </Stack>
                    </Box>
                </Stack>
            </Paper>

            <Stack direction="row" justifyContent="space-between" sx={{ width: "100%", maxWidth: 680 }}>
                <Button variant="outlined" sx={{ width: "auto", minWidth: 120 }} onClick={() => setActiveStep(1)}>← Anterior</Button>
                <Button variant="contained" sx={{ width: "auto", minWidth: 200 }} isLoading={carregando} onClick={() => void handleConfirmar()}>Confirmar matrícula</Button>
            </Stack>
        </Stack>
    );

    const step3 = (
        <Stack alignItems="center" width="100%">
            <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 680, border: `1px solid ${t.palette.success.light}`, borderRadius: 2, p: 4, textAlign: "center" })}>
                <Stack spacing={2} alignItems="center">
                    <CheckCircle size={56} color="#2e7d32" />
                    <Typography variant="h5" fontWeight={700} color="success.dark">Matrícula realizada!</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {aluno?.nome} foi matriculado(a) com sucesso em{" "}
                        <strong>{turmaSelecionada?.disciplina_nome}</strong> — {turmaSelecionada?.semestre}.
                    </Typography>
                    {matricula?.status && (
                        <Chip label={matricula.status} sx={{ backgroundColor: STATUS_COR[matricula.status] ?? "#757575", color: "#fff", fontWeight: 600 }} />
                    )}
                    <Button variant="outlined" sx={{ width: "auto", minWidth: 200, mt: 1 }} onClick={resetar}>
                        Nova matrícula
                    </Button>
                </Stack>
            </Paper>
        </Stack>
    );

    const stepContent = [step0, step1, step2, step3];

    return (
        <Container maxWidth={false} sx={{ minHeight: "100%", backgroundColor: "#fff", py: 3, px: 2 }}>
            <Snackbar open={snackbar.aberto} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severidade} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))} sx={{ width: "100%" }}>
                    {snackbar.mensagem}
                </Alert>
            </Snackbar>

            <Stack spacing={4} alignItems="center">
                <Box sx={{ width: "100%", maxWidth: 900 }}>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {STEPS.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>
                </Box>
                <Box sx={{ width: "100%" }}>
                    {stepContent[activeStep]}
                </Box>
            </Stack>
        </Container>
    );
}

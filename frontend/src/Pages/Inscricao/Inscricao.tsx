import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AppBar,
    Box,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
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
    Toolbar,
    Typography,
} from "@mui/material";
import { CheckCircle, GraduationCap, Upload } from "lucide-react";
import { useViaCep } from "../../hooks/use-cep";
import { useCurso } from "../../hooks/use-curso";
import { cursoApi } from "../../services/curso-api";
import { api } from "../../lib/axios";
import TextField from "../../components/TextField";
import Button from "../../components/Button";

const TIPOS_DOCUMENTO = [
    { tipo: "RG", label: "RG (Registro Geral)", obrigatorio: true },
    { tipo: "CPF", label: "CPF (Cadastro de Pessoa Física)", obrigatorio: true },
    { tipo: "HISTORICO", label: "Histórico Escolar do Ensino Médio", obrigatorio: true },
    { tipo: "COMPROVANTE_RESIDENCIA", label: "Comprovante de Residência", obrigatorio: true },
    { tipo: "NOTAS_ENEM", label: "Boletim de Desempenho do ENEM", obrigatorio: true },
    { tipo: "COMPROVANTE_INSCRICAO_ENEM", label: "Comprovante de Inscrição no ENEM", obrigatorio: false },
];

const STEPS = ["Dados pessoais", "Endereço", "Curso e ingresso", "Documentos", "Confirmar", "Concluído"];

interface Curso {
    id: string;
    nome: string;
    codigo: string;
}

interface DisciplinaMatriz {
    id: string;
    periodo_ideal?: number;
    obrigatoria: boolean;
    carga_horaria: number;
    disciplina: {
        id: string;
        codigo: string;
        nome: string;
    };
}

interface FormDados {
    nome: string;
    cpf: string;
    dataNascimento: string;
}

interface FormEndereco {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidadeIbge: string;
    cidadeNome: string;
    estado: string;
}

interface DocumentoUpload {
    tipo: string;
    arquivo: File;
}

function getMensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

function formatCpf(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCep(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export default function Inscricao() {
    const { buscarCep, carregando: buscandoCep } = useViaCep();
    const { listarCursos, carregando: carregandoCursos } = useCurso();

    const [activeStep, setActiveStep] = useState(0);
    const [dados, setDados] = useState<FormDados>({ nome: "", cpf: "", dataNascimento: "" });
    const [endereco, setEndereco] = useState<FormEndereco>({
        cep: "", logradouro: "", numero: "", bairro: "", cidadeIbge: "", cidadeNome: "", estado: "",
    });
    const [cursoId, setCursoId] = useState("");
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [matrizPeriodo1, setMatrizPeriodo1] = useState<DisciplinaMatriz[]>([]);
    const [carregandoMatriz, setCarregandoMatriz] = useState(false);
    const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState<{ aberto: boolean; mensagem: string; severidade: "success" | "error" }>({
        aberto: false, mensagem: "", severidade: "success",
    });
    const [matriculaGerada, setMatriculaGerada] = useState<string | null>(null);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        listarCursos()
            .then((data: Curso[]) => setCursos(Array.isArray(data) ? data : []))
            .catch(() => setCursos([]));
    }, []);

    useEffect(() => {
        if (!cursoId) {
            setMatrizPeriodo1([]);
            return;
        }
        setCarregandoMatriz(true);
        cursoApi.listarMatrizCurricular(cursoId, 1)
            .then((data) => setMatrizPeriodo1(Array.isArray(data) ? data : []))
            .catch(() => setMatrizPeriodo1([]))
            .finally(() => setCarregandoMatriz(false));
    }, [cursoId]);

    function docDeTipo(tipo: string): File | undefined {
        return documentos.find((d) => d.tipo === tipo)?.arquivo;
    }

    function handleAdicionarDoc(tipo: string, arquivo: File) {
        setDocumentos((prev) => [...prev.filter((d) => d.tipo !== tipo), { tipo, arquivo }]);
    }

    function validarStep(step: number): Record<string, string> {
        const e: Record<string, string> = {};
        if (step === 0) {
            if (!dados.nome.trim()) e.nome = "Nome obrigatório.";
            if (dados.cpf.replace(/\D/g, "").length !== 11) e.cpf = "CPF inválido.";
            if (!dados.dataNascimento) e.dataNascimento = "Data de nascimento obrigatória.";
        }
        if (step === 1) {
            if (endereco.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido.";
            if (!endereco.logradouro.trim()) e.logradouro = "Logradouro obrigatório.";
            if (!endereco.numero.trim()) e.numero = "Número obrigatório.";
            if (!endereco.bairro.trim()) e.bairro = "Bairro obrigatório.";
            if (!endereco.cidadeIbge) e.cidadeIbge = "Busque um CEP válido para preencher a cidade.";
        }
        if (step === 2) {
            if (!cursoId) e.cursoId = "Selecione um curso.";
        }
        return e;
    }

    function avancar() {
        const e = validarStep(activeStep);
        if (Object.keys(e).length > 0) { setErros(e); return; }
        setErros({});
        setActiveStep((s) => s + 1);
    }

    function voltar() {
        setErros({});
        setActiveStep((s) => s - 1);
    }

    async function handleBuscarCep() {
        const resultado = await buscarCep(endereco.cep);
        if (!resultado) {
            setErros((e) => ({ ...e, cep: "CEP não encontrado." }));
            return;
        }
        setEndereco((prev) => ({
            ...prev,
            logradouro: resultado.logradouro || prev.logradouro,
            bairro: resultado.bairro || prev.bairro,
            cidadeIbge: String(resultado.ibge),
            cidadeNome: resultado.localidade,
            estado: resultado.uf,
        }));
        setErros((e) => { const next = { ...e }; delete next.cep; delete next.cidadeIbge; return next; });
    }

    async function handleEnviar() {
        setEnviando(true);
        try {
            const payload = {
                periodo: 1,
                curso: cursoId,
                pessoa: {
                    cpf: dados.cpf.replace(/\D/g, ""),
                    nome: dados.nome.trim(),
                    dataNascimento: dados.dataNascimento,
                    logradouro: endereco.logradouro.trim(),
                    numero: Number(endereco.numero),
                    bairro: endereco.bairro.trim(),
                    cidadeIbge: endereco.cidadeIbge,
                    estado: endereco.estado,
                    cep: endereco.cep.replace(/\D/g, ""),
                },
            };

            const { data: alunoCreated } = await api.post("/alunos", payload);

            for (const doc of documentos) {
                const form = new FormData();
                form.append("aluno_id", alunoCreated.id);
                form.append("tipo_documento", doc.tipo);
                form.append("arquivo", doc.arquivo);
                await api.post("/documentos", form);
            }

            setMatriculaGerada(alunoCreated.matricula ? String(alunoCreated.matricula) : null);
            setActiveStep(5);
        } catch (err) {
            setSnackbar({ aberto: true, mensagem: getMensagemErro(err, "Erro ao realizar inscrição."), severidade: "error" });
        } finally {
            setEnviando(false);
        }
    }

    function resetar() {
        setActiveStep(0);
        setDados({ nome: "", cpf: "", dataNascimento: "" });
        setEndereco({ cep: "", logradouro: "", numero: "", bairro: "", cidadeIbge: "", cidadeNome: "", estado: "" });
        setCursoId("");
        setMatrizPeriodo1([]);
        setDocumentos([]);
        setMatriculaGerada(null);
        setErros({});
    }

    const cursoSelecionado = cursos.find((c) => c.id === cursoId);
    const totalCH = matrizPeriodo1.reduce((acc, d) => acc + d.carga_horaria, 0);

    // ── Step content ─────────────────────────────────────────────────────────────

    const step0 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Dados pessoais</Typography>
            <TextField
                label="Nome completo *"
                value={dados.nome}
                onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
                error={!!erros.nome}
                helperText={erros.nome}
                InputLabelProps={{ shrink: true }}
            />
            <TextField
                label="CPF *"
                value={dados.cpf}
                placeholder="000.000.000-00"
                onChange={(e) => setDados((d) => ({ ...d, cpf: formatCpf(e.target.value) }))}
                error={!!erros.cpf}
                helperText={erros.cpf}
                InputLabelProps={{ shrink: true }}
            />
            <TextField
                label="Data de nascimento *"
                type="date"
                value={dados.dataNascimento}
                onChange={(e) => setDados((d) => ({ ...d, dataNascimento: e.target.value }))}
                error={!!erros.dataNascimento}
                helperText={erros.dataNascimento}
                InputLabelProps={{ shrink: true }}
            />
        </Stack>
    );

    const step1 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Endereço</Typography>
            <Stack direction="row" spacing={1}>
                <TextField
                    label="CEP *"
                    value={endereco.cep}
                    placeholder="00000-000"
                    onChange={(e) => setEndereco((d) => ({ ...d, cep: formatCep(e.target.value) }))}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleBuscarCep(); }}
                    error={!!erros.cep}
                    helperText={erros.cep}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
                <Button
                    variant="outlined"
                    sx={{ width: "auto", minWidth: 110, height: 56 }}
                    onClick={() => void handleBuscarCep()}
                    isLoading={buscandoCep}
                    disabled={endereco.cep.replace(/\D/g, "").length !== 8}
                >
                    Buscar CEP
                </Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Logradouro *"
                    value={endereco.logradouro}
                    onChange={(e) => setEndereco((d) => ({ ...d, logradouro: e.target.value }))}
                    error={!!erros.logradouro}
                    helperText={erros.logradouro}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 2 }}
                />
                <TextField
                    label="Número *"
                    value={endereco.numero}
                    onChange={(e) => setEndereco((d) => ({ ...d, numero: e.target.value }))}
                    error={!!erros.numero}
                    helperText={erros.numero}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                    label="Bairro *"
                    value={endereco.bairro}
                    onChange={(e) => setEndereco((d) => ({ ...d, bairro: e.target.value }))}
                    error={!!erros.bairro}
                    helperText={erros.bairro}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                />
                <TextField
                    label="Cidade"
                    value={endereco.cidadeNome}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled
                />
                <TextField
                    label="Estado"
                    value={endereco.estado}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                    disabled
                />
            </Stack>
            {erros.cidadeIbge && <Alert severity="error">{erros.cidadeIbge}</Alert>}
        </Stack>
    );

    const step2 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Curso e forma de ingresso</Typography>

            <FormControl fullWidth error={!!erros.cursoId}>
                <InputLabel shrink>Curso *</InputLabel>
                {carregandoCursos ? (
                    <Stack direction="row" alignItems="center" spacing={1} py={2}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" color="text.secondary">Carregando cursos...</Typography>
                    </Stack>
                ) : (
                    <Select
                        value={cursoId}
                        label="Curso *"
                        notched
                        displayEmpty
                        onChange={(e) => setCursoId(e.target.value)}
                    >
                        <MenuItem value="" disabled>
                            <Typography color="text.secondary">Selecione um curso</Typography>
                        </MenuItem>
                        {cursos.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                        ))}
                    </Select>
                )}
                {erros.cursoId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{erros.cursoId}</Typography>
                )}
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Box
                    flex={1}
                    sx={(t) => ({
                        border: `1px solid ${t.palette.grey[300]}`,
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        backgroundColor: t.palette.grey[50],
                    })}
                >
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Período de ingresso
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label="1º Período" color="primary" size="small" />
                        <Typography variant="body2" color="text.secondary">
                            Definido automaticamente para candidatos novos.
                        </Typography>
                    </Stack>
                </Box>

                <Box
                    flex={1}
                    sx={(t) => ({
                        border: `1px solid ${t.palette.grey[300]}`,
                        borderRadius: 1,
                        px: 2,
                        py: 1.5,
                        backgroundColor: t.palette.grey[50],
                    })}
                >
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Forma de ingresso
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label="ENEM" color="success" size="small" />
                        <Typography variant="body2" color="text.secondary">
                            Única modalidade aceita neste processo seletivo.
                        </Typography>
                    </Stack>
                </Box>
            </Stack>

            {cursoId && (
                <Box>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Disciplinas do 1º Período
                    </Typography>

                    {carregandoMatriz ? (
                        <Stack direction="row" alignItems="center" spacing={1} py={1}>
                            <CircularProgress size={18} />
                            <Typography variant="body2" color="text.secondary">Carregando matriz curricular...</Typography>
                        </Stack>
                    ) : matrizPeriodo1.length === 0 ? (
                        <Alert severity="warning">
                            Nenhuma disciplina cadastrada para o 1º período deste curso. Entre em contato com a secretaria.
                        </Alert>
                    ) : (
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Disciplina</TableCell>
                                        <TableCell>Código</TableCell>
                                        <TableCell align="right">C.H.</TableCell>
                                        <TableCell align="center">Obrigatória</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {matrizPeriodo1.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>{d.disciplina.nome}</TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {d.disciplina.codigo}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{d.carga_horaria}h</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={d.obrigatoria ? "Sim" : "Não"}
                                                    size="small"
                                                    color={d.obrigatoria ? "primary" : "default"}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                Total de carga horária no período: <strong>{totalCH}h</strong>
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Stack>
    );

    const step3 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Documentos</Typography>
            <Alert severity="info">
                Para ingresso via ENEM, envie os documentos abaixo. Os marcados com <strong>*</strong> são obrigatórios.
                Formatos aceitos: PDF, JPG ou PNG (máx. 10 MB cada).
            </Alert>
            <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Documento</TableCell>
                            <TableCell>Arquivo selecionado</TableCell>
                            <TableCell align="right">Ação</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {TIPOS_DOCUMENTO.map(({ tipo, label, obrigatorio }) => {
                            const arquivo = docDeTipo(tipo);
                            return (
                                <TableRow key={tipo}>
                                    <TableCell>
                                        {label}
                                        {obrigatorio && (
                                            <Typography component="span" color="error" ml={0.5}>*</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {arquivo ? (
                                            <Chip
                                                label={arquivo.name}
                                                size="small"
                                                color="success"
                                                onDelete={() => setDocumentos((d) => d.filter((x) => x.tipo !== tipo))}
                                                sx={{ maxWidth: 220 }}
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Não enviado</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            style={{ display: "none" }}
                                            ref={(el) => { fileRefs.current[tipo] = el; }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAdicionarDoc(tipo, file);
                                                e.target.value = "";
                                            }}
                                        />
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{ width: "auto", minWidth: 100 }}
                                            onClick={() => fileRefs.current[tipo]?.click()}
                                        >
                                            <Upload size={14} style={{ marginRight: 4 }} />
                                            {arquivo ? "Substituir" : "Enviar"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        </Stack>
    );

    const step4 = (
        <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={700}>Confirmar inscrição</Typography>
            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Nome</Typography>
                    <Typography variant="body2" fontWeight={600}>{dados.nome}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">CPF</Typography>
                    <Typography variant="body2">{dados.cpf}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Data de nascimento</Typography>
                    <Typography variant="body2">{dados.dataNascimento}</Typography>
                </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={2}>
                    <Typography variant="caption" color="text.secondary" display="block">Endereço</Typography>
                    <Typography variant="body2">
                        {endereco.logradouro}, {endereco.numero} — {endereco.bairro},{" "}
                        {endereco.cidadeNome}/{endereco.estado}
                    </Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">CEP</Typography>
                    <Typography variant="body2">{endereco.cep}</Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Curso</Typography>
                    <Typography variant="body2" fontWeight={600}>{cursoSelecionado?.nome ?? "—"}</Typography>
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Período de ingresso</Typography>
                    <Chip label="1º Período" color="primary" size="small" sx={{ mt: 0.5 }} />
                </Box>
                <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" display="block">Forma de ingresso</Typography>
                    <Chip label="ENEM" color="success" size="small" sx={{ mt: 0.5 }} />
                </Box>
            </Stack>

            {matrizPeriodo1.length > 0 && (
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Disciplinas do 1º Período ({matrizPeriodo1.length} disciplinas · {totalCH}h)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {matrizPeriodo1.map((d) => (
                            <Chip
                                key={d.id}
                                label={d.disciplina.nome}
                                size="small"
                                variant="outlined"
                                color={d.obrigatoria ? "primary" : "default"}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            <Divider />

            <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Documentos selecionados ({documentos.length})
                </Typography>
                {documentos.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Nenhum documento selecionado.</Typography>
                ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {documentos.map((d) => (
                            <Chip
                                key={d.tipo}
                                label={TIPOS_DOCUMENTO.find((t) => t.tipo === d.tipo)?.label ?? d.tipo}
                                size="small"
                                color="success"
                            />
                        ))}
                    </Stack>
                )}
            </Box>
        </Stack>
    );

    const step5 = (
        <Stack alignItems="center" spacing={3} py={4} textAlign="center">
            <CheckCircle size={64} color="#2e7d32" />
            <Typography variant="h5" fontWeight={700} color="success.dark">Inscrição realizada!</Typography>
            <Typography variant="body2" color="text.secondary">
                Sua inscrição foi enviada com sucesso.
                {matriculaGerada && (
                    <> Número de matrícula: <strong>{matriculaGerada}</strong>.</>
                )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Aguarde a confirmação da secretaria. Os documentos enviados serão analisados em breve.
            </Typography>
            <Button variant="outlined" sx={{ width: "auto", minWidth: 200, mt: 1 }} onClick={resetar}>
                Nova inscrição
            </Button>
        </Stack>
    );

    const stepContent = [step0, step1, step2, step3, step4, step5];

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
            <AppBar position="static" color="primary" elevation={1}>
                <Toolbar>
                    <GraduationCap size={22} style={{ marginRight: 10 }} />
                    <Typography variant="h6" fontWeight={700}>unieduca — Inscrição</Typography>
                </Toolbar>
            </AppBar>

            <Snackbar
                open={snackbar.aberto}
                autoHideDuration={6000}
                onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severidade}
                    variant="filled"
                    onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
                    sx={{ width: "100%" }}
                >
                    {snackbar.mensagem}
                </Alert>
            </Snackbar>

            <Stack alignItems="center" py={4} px={2} spacing={4}>
                <Box sx={{ width: "100%", maxWidth: 860 }}>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {STEPS.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>
                </Box>

                <Paper
                    elevation={0}
                    sx={(t) => ({
                        width: "100%",
                        maxWidth: 860,
                        border: `1px solid ${t.palette.grey[200]}`,
                        borderRadius: 2,
                        p: { xs: 2, sm: 4 },
                    })}
                >
                    {stepContent[activeStep]}

                    {activeStep < 5 && (
                        <Stack direction="row" justifyContent="space-between" mt={4}>
                            {activeStep > 0 ? (
                                <Button variant="outlined" sx={{ width: "auto", minWidth: 120 }} onClick={voltar}>
                                    ← Anterior
                                </Button>
                            ) : (
                                <Box />
                            )}
                            {activeStep < 4 && (
                                <Button variant="contained" sx={{ width: "auto", minWidth: 140 }} onClick={avancar}>
                                    Próximo →
                                </Button>
                            )}
                            {activeStep === 4 && (
                                <Button
                                    variant="contained"
                                    sx={{ width: "auto", minWidth: 200 }}
                                    isLoading={enviando}
                                    onClick={() => void handleEnviar()}
                                >
                                    Confirmar inscrição
                                </Button>
                            )}
                        </Stack>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
}

import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material";
import { CheckCircle, FileText, RefreshCw, Search, Upload, User, XCircle } from "lucide-react";
import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { api } from "../../lib/axios";
import { useAluno } from "../../hooks/use-aluno";
import type { AlunoParaMatricula } from "../../models/matricula-model";

interface Documento {
    id: string;
    aluno_id: string;
    tipo_documento: string;
    nome_arquivo: string;
    status: string;
    observacao: string | null;
    created_at: string;
}

interface DocumentoComAluno extends Documento {
    aluno_nome: string;
    aluno_matricula: number;
    aluno_cpf: string;
}

const TIPOS = [
    { tipo: "RG", label: "RG (Registro Geral)" },
    { tipo: "CPF", label: "CPF (Cadastro de Pessoa Física)" },
    { tipo: "HISTORICO", label: "Histórico Escolar" },
    { tipo: "COMPROVANTE_RESIDENCIA", label: "Comprovante de Residência" },
    { tipo: "NOTAS_ENEM", label: "Notas do ENEM" },
    { tipo: "COMPROVANTE_INSCRICAO_ENEM", label: "Comprovante de Inscrição ENEM" },
    { tipo: "OUTROS", label: "Outros Documentos" },
];

const STATUS_CONFIG: Record<string, { label: string; color: "default" | "warning" | "success" | "error" }> = {
    PENDENTE: { label: "Pendente", color: "warning" },
    APROVADO: { label: "Aprovado", color: "success" },
    REPROVADO: { label: "Reprovado", color: "error" },
};

function getMensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function Documentos() {
    const { carregando: buscando } = useAluno();
    const [aba, setAba] = useState(0);

    // ── Aba 0 — Envio ────────────────────────────────────────────────────────
    const [query, setQuery] = useState("");
    const [aluno, setAluno] = useState<AlunoParaMatricula | null>(null);
    const [erroAluno, setErroAluno] = useState("");
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [carregandoDocs, setCarregandoDocs] = useState(false);
    const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // ── Aba 1 — Validação ────────────────────────────────────────────────────
    const [todosDocumentos, setTodosDocumentos] = useState<DocumentoComAluno[]>([]);
    const [carregandoTodos, setCarregandoTodos] = useState(false);
    const [validando, setValidando] = useState<string | null>(null);
    const [dialogReprovar, setDialogReprovar] = useState<{ aberto: boolean; docId: string; observacao: string }>({
        aberto: false, docId: "", observacao: "",
    });

    const [snackbar, setSnackbar] = useState<{ aberto: boolean; mensagem: string; severidade: "success" | "error" }>({
        aberto: false, mensagem: "", severidade: "success",
    });

    useEffect(() => {
        if (aba === 1) void carregarTodosDocumentos();
    }, [aba]);

    // ── Funções — Aba 0 ──────────────────────────────────────────────────────

    async function carregarDocumentos(alunoId: string) {
        setCarregandoDocs(true);
        try {
            const { data } = await api.get<Documento[]>(`/documentos/aluno/${alunoId}`);
            setDocumentos(Array.isArray(data) ? data : []);
        } catch {
            setDocumentos([]);
        } finally {
            setCarregandoDocs(false);
        }
    }

    async function handleBuscarAluno() {
        if (query.trim().length < 3) return;
        setErroAluno("");
        setAluno(null);
        setDocumentos([]);
        try {
            const { data } = await api.get<AlunoParaMatricula[]>("/alunos/buscar", { params: { q: query.trim() } });
            if (!data || data.length === 0) {
                setErroAluno("Nenhum aluno encontrado.");
                return;
            }
            setAluno(data[0]);
            await carregarDocumentos(data[0].id);
        } catch (err) {
            setErroAluno(getMensagemErro(err, "Erro ao buscar aluno."));
        }
    }

    async function handleUpload(tipo: string, arquivo: File) {
        if (!aluno) return;
        setUploadingTipo(tipo);
        try {
            const form = new FormData();
            form.append("aluno_id", aluno.id);
            form.append("tipo_documento", tipo);
            form.append("arquivo", arquivo);
            await api.post("/documentos", form);
            setSnackbar({ aberto: true, mensagem: "Documento enviado com sucesso!", severidade: "success" });
            await carregarDocumentos(aluno.id);
        } catch (err) {
            setSnackbar({ aberto: true, mensagem: getMensagemErro(err, "Erro ao enviar documento."), severidade: "error" });
        } finally {
            setUploadingTipo(null);
        }
    }

    function docDeTipo(tipo: string): Documento | undefined {
        return [...documentos]
            .filter((d) => d.tipo_documento === tipo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    // ── Funções — Aba 1 ──────────────────────────────────────────────────────

    async function carregarTodosDocumentos() {
        setCarregandoTodos(true);
        try {
            const { data } = await api.get<DocumentoComAluno[]>("/documentos");
            setTodosDocumentos(Array.isArray(data) ? data : []);
        } catch {
            setTodosDocumentos([]);
        } finally {
            setCarregandoTodos(false);
        }
    }

    async function handleValidar(docId: string, status: "APROVADO" | "REPROVADO", observacao?: string) {
        setValidando(docId);
        try {
            await api.patch(`/documentos/${docId}/validar`, { status, observacao });
            setSnackbar({
                aberto: true,
                mensagem: `Documento ${status === "APROVADO" ? "aprovado" : "reprovado"} com sucesso.`,
                severidade: "success",
            });
            await carregarTodosDocumentos();
        } catch (err) {
            setSnackbar({ aberto: true, mensagem: getMensagemErro(err, "Erro ao validar documento."), severidade: "error" });
        } finally {
            setValidando(null);
        }
    }

    // Agrupa documentos por aluno
    const alunosMap = new Map<string, { nome: string; matricula: number; cpf: string; docs: DocumentoComAluno[] }>();
    for (const doc of todosDocumentos) {
        if (!alunosMap.has(doc.aluno_id)) {
            alunosMap.set(doc.aluno_id, { nome: doc.aluno_nome, matricula: doc.aluno_matricula, cpf: doc.aluno_cpf, docs: [] });
        }
        alunosMap.get(doc.aluno_id)!.docs.push(doc);
    }
    const alunosAgrupados = Array.from(alunosMap.entries());

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Container maxWidth={false} sx={{ minHeight: "100%", backgroundColor: "#fff", py: 2, px: 2 }}>
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

            <Dialog
                open={dialogReprovar.aberto}
                onClose={() => setDialogReprovar((d) => ({ ...d, aberto: false }))}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Reprovar documento</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Motivo da reprovação (opcional)"
                        value={dialogReprovar.observacao}
                        onChange={(e) => setDialogReprovar((d) => ({ ...d, observacao: e.target.value }))}
                        multiline
                        rows={3}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="outlined"
                        sx={{ width: "auto" }}
                        onClick={() => setDialogReprovar((d) => ({ ...d, aberto: false }))}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        sx={{ width: "auto", backgroundColor: "error.main", "&:hover": { backgroundColor: "error.dark" } }}
                        isLoading={validando === dialogReprovar.docId}
                        onClick={async () => {
                            await handleValidar(dialogReprovar.docId, "REPROVADO", dialogReprovar.observacao || undefined);
                            setDialogReprovar({ aberto: false, docId: "", observacao: "" });
                        }}
                    >
                        Confirmar reprovação
                    </Button>
                </DialogActions>
            </Dialog>

            <Stack spacing={2} alignItems="center">
                <Paper
                    elevation={0}
                    sx={(t) => ({ width: "100%", maxWidth: 900, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2 })}
                >
                    <Tabs
                        value={aba}
                        onChange={(_, v: number) => setAba(v)}
                        sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
                    >
                        <Tab label="Envio de Documentos" />
                        <Tab label="Validação de Documentos" />
                    </Tabs>

                    {/* ── Aba 0 — Envio ─────────────────────────────────────────────── */}
                    {aba === 0 && (
                        <Stack spacing={2} p={3}>
                            <Stack alignItems="center" spacing={1} textAlign="center">
                                <Box sx={(t) => ({ width: 48, height: 48, borderRadius: "50%", backgroundColor: t.palette.primary.main, display: "flex", alignItems: "center", justifyContent: "center" })}>
                                    <FileText color="#fff" size={22} />
                                </Box>
                                <Typography variant="h5" fontWeight={700}>Envio de Documentos</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Busque o aluno pelo CPF ou número de matrícula para enviar os documentos.
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
                                    isLoading={buscando}
                                >
                                    <Search size={16} style={{ marginRight: 6 }} />
                                    Buscar
                                </Button>
                            </Stack>

                            {erroAluno && <Alert severity="error">{erroAluno}</Alert>}

                            {aluno && (
                                <Paper elevation={0} sx={(t) => ({ border: `1px solid ${t.palette.primary.light}`, borderRadius: 2, p: 2.5 })}>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <User size={18} />
                                            <Typography variant="subtitle1" fontWeight={700}>Aluno identificado</Typography>
                                        </Stack>
                                        <Divider />
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                                            <Box flex={1}><Typography variant="caption" color="text.secondary">Nome</Typography><Typography variant="body2" fontWeight={600}>{aluno.nome}</Typography></Box>
                                            <Box flex={1}><Typography variant="caption" color="text.secondary">CPF</Typography><Typography variant="body2">{aluno.cpf}</Typography></Box>
                                            <Box flex={1}><Typography variant="caption" color="text.secondary">Matrícula</Typography><Typography variant="body2" fontWeight={600}>{aluno.matricula}</Typography></Box>
                                            <Box flex={1}><Typography variant="caption" color="text.secondary">Curso</Typography><Typography variant="body2">{aluno.curso_nome ?? "—"}</Typography></Box>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            )}

                            {aluno && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Documentos exigidos</Typography>
                                    {carregandoDocs ? (
                                        <Stack alignItems="center" py={3}><CircularProgress size={28} /></Stack>
                                    ) : (
                                        <Box sx={{ overflowX: "auto" }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Documento</TableCell>
                                                        <TableCell>Status</TableCell>
                                                        <TableCell>Arquivo</TableCell>
                                                        <TableCell align="right">Ação</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {TIPOS.map(({ tipo, label }) => {
                                                        const doc = docDeTipo(tipo);
                                                        const cfg = doc ? STATUS_CONFIG[doc.status] : null;
                                                        const isUploading = uploadingTipo === tipo;
                                                        return (
                                                            <TableRow key={tipo}>
                                                                <TableCell>{label}</TableCell>
                                                                <TableCell>
                                                                    {cfg ? (
                                                                        <Tooltip title={doc?.observacao ?? ""} disableHoverListener={!doc?.observacao}>
                                                                            <Chip label={cfg.label} color={cfg.color} size="small" />
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Chip label="Não enviado" size="small" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="caption" color="text.secondary">{doc?.nome_arquivo ?? "—"}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <input
                                                                        type="file"
                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                        style={{ display: "none" }}
                                                                        ref={(el) => { inputRefs.current[tipo] = el; }}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) void handleUpload(tipo, file);
                                                                            e.target.value = "";
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{ width: "auto", minWidth: 110 }}
                                                                        onClick={() => inputRefs.current[tipo]?.click()}
                                                                        disabled={isUploading}
                                                                        isLoading={isUploading}
                                                                    >
                                                                        <Upload size={14} style={{ marginRight: 4 }} />
                                                                        {doc ? "Substituir" : "Enviar"}
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Stack>
                    )}

                    {/* ── Aba 1 — Validação ─────────────────────────────────────────── */}
                    {aba === 1 && (
                        <Stack spacing={3} p={3}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>Validação de Documentos</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Aprove ou reprove os documentos enviados pelos candidatos.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    sx={{ width: "auto", minWidth: 120 }}
                                    onClick={() => void carregarTodosDocumentos()}
                                    isLoading={carregandoTodos}
                                >
                                    <RefreshCw size={14} style={{ marginRight: 6 }} />
                                    Atualizar
                                </Button>
                            </Stack>

                            {carregandoTodos ? (
                                <Stack alignItems="center" py={4}><CircularProgress size={32} /></Stack>
                            ) : alunosAgrupados.length === 0 ? (
                                <Alert severity="info">Nenhum documento cadastrado no sistema.</Alert>
                            ) : (
                                <Stack spacing={2}>
                                    {alunosAgrupados.map(([alunoId, { nome, matricula, cpf, docs }]) => {
                                        const pendentes = docs.filter((d) => d.status === "PENDENTE").length;
                                        return (
                                            <Paper
                                                key={alunoId}
                                                elevation={0}
                                                sx={(t) => ({
                                                    border: `1px solid ${pendentes > 0 ? t.palette.warning.light : t.palette.grey[200]}`,
                                                    borderRadius: 2,
                                                    overflow: "hidden",
                                                })}
                                            >
                                                <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                    sx={(t) => ({
                                                        px: 2.5,
                                                        py: 1.5,
                                                        backgroundColor: pendentes > 0 ? t.palette.warning.light + "30" : t.palette.grey[50],
                                                    })}
                                                >
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <User size={16} />
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight={700}>{nome}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Matrícula {matricula} · CPF {cpf}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                    {pendentes > 0 && (
                                                        <Chip
                                                            label={`${pendentes} pendente${pendentes > 1 ? "s" : ""}`}
                                                            color="warning"
                                                            size="small"
                                                        />
                                                    )}
                                                </Stack>

                                                <Divider />

                                                <Box sx={{ overflowX: "auto" }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Documento</TableCell>
                                                                <TableCell>Arquivo</TableCell>
                                                                <TableCell>Status</TableCell>
                                                                <TableCell align="right">Ações</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {docs.map((doc) => {
                                                                const tipoLabel = TIPOS.find((t) => t.tipo === doc.tipo_documento)?.label ?? doc.tipo_documento;
                                                                const cfg = STATUS_CONFIG[doc.status] ?? { label: doc.status, color: "default" as const };
                                                                return (
                                                                    <TableRow key={doc.id}>
                                                                        <TableCell>
                                                                            <Typography variant="body2">{tipoLabel}</Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="caption" color="text.secondary">{doc.nome_arquivo}</Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Tooltip title={doc.observacao ?? ""} disableHoverListener={!doc.observacao}>
                                                                                <Chip label={cfg.label} color={cfg.color} size="small" />
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                                <Button
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                    sx={{
                                                                                        width: "auto",
                                                                                        minWidth: 90,
                                                                                        borderColor: "success.main",
                                                                                        color: "success.main",
                                                                                        "&:hover": { borderColor: "success.dark", backgroundColor: "success.main", color: "#fff" },
                                                                                    }}
                                                                                    isLoading={validando === doc.id}
                                                                                    disabled={validando !== null || doc.status === "APROVADO"}
                                                                                    onClick={() => void handleValidar(doc.id, "APROVADO")}
                                                                                >
                                                                                    <CheckCircle size={13} style={{ marginRight: 4 }} />
                                                                                    Aprovar
                                                                                </Button>
                                                                                <Button
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                    sx={{
                                                                                        width: "auto",
                                                                                        minWidth: 90,
                                                                                        borderColor: "error.main",
                                                                                        color: "error.main",
                                                                                        "&:hover": { borderColor: "error.dark", backgroundColor: "error.main", color: "#fff" },
                                                                                    }}
                                                                                    disabled={validando !== null || doc.status === "REPROVADO"}
                                                                                    onClick={() => setDialogReprovar({ aberto: true, docId: doc.id, observacao: "" })}
                                                                                >
                                                                                    <XCircle size={13} style={{ marginRight: 4 }} />
                                                                                    Reprovar
                                                                                </Button>
                                                                            </Stack>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Paper>
            </Stack>
        </Container>
    );
}

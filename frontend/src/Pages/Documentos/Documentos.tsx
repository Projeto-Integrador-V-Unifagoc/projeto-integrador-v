import { useRef, useState } from "react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { CheckCircle, FileText, Search, Upload, User, XCircle } from "lucide-react";
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

const TIPOS = [
    { tipo: "RG", label: "RG (Registro Geral)" },
    { tipo: "CPF", label: "CPF (Cadastro de Pessoa Física)" },
    { tipo: "HISTORICO", label: "Histórico Escolar" },
    { tipo: "COMPROVANTE_RESIDENCIA", label: "Comprovante de Residência" },
    { tipo: "NOTAS_ENEM", label: "Notas do ENEM" },
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
    const [query, setQuery] = useState("");
    const [aluno, setAluno] = useState<AlunoParaMatricula | null>(null);
    const [erroAluno, setErroAluno] = useState("");
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [carregandoDocs, setCarregandoDocs] = useState(false);
    const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
    const [validandoId, setValidandoId] = useState<string | null>(null);
    const [reprovarDialog, setReprovarDialog] = useState<{ aberto: boolean; docId: string; observacao: string }>({
        aberto: false, docId: "", observacao: "",
    });
    const [snackbar, setSnackbar] = useState<{ aberto: boolean; mensagem: string; severidade: "success" | "error" }>({
        aberto: false, mensagem: "", severidade: "success",
    });
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

    async function handleValidar(docId: string, status: "APROVADO" | "REPROVADO", observacao?: string) {
        setValidandoId(docId);
        try {
            await api.patch(`/documentos/${docId}/validar`, { status, observacao });
            const msg = status === "APROVADO"
                ? "Documento aprovado! Matrícula atualizada."
                : "Documento reprovado. Matrícula cancelada.";
            setSnackbar({ aberto: true, mensagem: msg, severidade: status === "APROVADO" ? "success" : "error" });
            if (aluno) await carregarDocumentos(aluno.id);
        } catch (err) {
            setSnackbar({ aberto: true, mensagem: getMensagemErro(err, "Erro ao validar documento."), severidade: "error" });
        } finally {
            setValidandoId(null);
        }
    }

    function docDeTipo(tipo: string): Documento | undefined {
        return [...documentos]
            .filter((d) => d.tipo_documento === tipo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    return (
        <Container maxWidth={false} sx={{ minHeight: "100%", backgroundColor: "#fff", py: 2, px: 2 }}>
            <Snackbar open={snackbar.aberto} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={snackbar.severidade} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))} sx={{ width: "100%" }}>
                    {snackbar.mensagem}
                </Alert>
            </Snackbar>

            {/* Dialog de reprovação */}
            <Dialog open={reprovarDialog.aberto} onClose={() => setReprovarDialog((d) => ({ ...d, aberto: false }))} maxWidth="xs" fullWidth>
                <DialogTitle>Reprovar documento</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Informe o motivo da reprovação (opcional).
                    </Typography>
                    <TextField
                        label="Observação"
                        multiline
                        rows={3}
                        fullWidth
                        value={reprovarDialog.observacao}
                        onChange={(e) => setReprovarDialog((d) => ({ ...d, observacao: e.target.value }))}
                        placeholder="Ex.: documento ilegível, vencido..."
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button variant="outlined" sx={{ width: "auto" }} onClick={() => setReprovarDialog((d) => ({ ...d, aberto: false }))}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        sx={{ width: "auto" }}
                        isLoading={validandoId === reprovarDialog.docId}
                        onClick={async () => {
                            await handleValidar(reprovarDialog.docId, "REPROVADO", reprovarDialog.observacao || undefined);
                            setReprovarDialog({ aberto: false, docId: "", observacao: "" });
                        }}
                    >
                        Confirmar reprovação
                    </Button>
                </DialogActions>
            </Dialog>

            <Stack spacing={2} alignItems="center">
                {/* Busca */}
                <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 760, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2, p: 3 })}>
                    <Stack spacing={2}>
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
                            <Button variant="contained" sx={{ width: "auto", minWidth: 110, height: 56 }} onClick={() => void handleBuscarAluno()} disabled={query.trim().length < 3} isLoading={buscando}>
                                <Search size={16} style={{ marginRight: 6 }} />
                                Buscar
                            </Button>
                        </Stack>

                        {erroAluno && <Alert severity="error">{erroAluno}</Alert>}
                    </Stack>
                </Paper>

                {/* Card do aluno */}
                {aluno && (
                    <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 760, border: `1px solid ${t.palette.primary.light}`, borderRadius: 2, p: 3 })}>
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

                {/* Tabela de documentos */}
                {aluno && (
                    <Paper elevation={0} sx={(t) => ({ width: "100%", maxWidth: 760, border: `1px solid ${t.palette.grey[100]}`, borderRadius: 2, p: 3 })}>
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
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            {doc?.status === "PENDENTE" && (
                                                                <>
                                                                    <Button
                                                                        variant="contained"
                                                                        size="small"
                                                                        color="success"
                                                                        sx={{ width: "auto", minWidth: 90 }}
                                                                        isLoading={validandoId === doc.id}
                                                                        disabled={!!validandoId}
                                                                        onClick={() => void handleValidar(doc.id, "APROVADO")}
                                                                    >
                                                                        <CheckCircle size={14} style={{ marginRight: 4 }} />
                                                                        Aprovar
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        size="small"
                                                                        color="error"
                                                                        sx={{ width: "auto", minWidth: 90 }}
                                                                        disabled={!!validandoId}
                                                                        onClick={() => setReprovarDialog({ aberto: true, docId: doc.id, observacao: "" })}
                                                                    >
                                                                        <XCircle size={14} style={{ marginRight: 4 }} />
                                                                        Reprovar
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button variant="outlined" size="small" sx={{ width: "auto", minWidth: 100 }} onClick={() => inputRefs.current[tipo]?.click()} disabled={isUploading || !!validandoId} isLoading={isUploading}>
                                                                <Upload size={14} style={{ marginRight: 4 }} />
                                                                {doc ? "Substituir" : "Enviar"}
                                                            </Button>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Paper>
                )}
            </Stack>
        </Container>
    );
}

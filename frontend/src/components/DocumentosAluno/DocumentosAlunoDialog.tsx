import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    LinearProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { CheckCircle, Eye, Upload, XCircle } from "lucide-react";

import Button from "../Button";
import { Dialog } from "../Dialog";
import TextField from "../TextField";
import { documentoApi, type DocumentoAluno, type StatusValidacao } from "../../services/documento-api";
import {
    formatarCpf,
    STATUS_DOCUMENTO,
    TIPOS_DOCUMENTO,
} from "../../Pages/Documentos/documentos.constants";

interface DocumentosAlunoDialogProps {
    aberto: boolean;
    alunoId: string | null;
    alunoNome?: string;
    alunoCpf?: string;
    alunoMatricula?: number;
    cursoNome?: string | null;
    onFechar: () => void;
    onAlterado?: () => void;
}

function mensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    if (axiosErr?.response?.data?.error) return axiosErr.response.data.error;
    if (err instanceof Error) return err.message;
    return fallback;
}

export default function DocumentosAlunoDialog(props: DocumentosAlunoDialogProps) {
    const {
        aberto,
        alunoId,
        alunoNome,
        alunoCpf,
        alunoMatricula,
        cursoNome,
        onFechar,
        onAlterado,
    } = props;

    const [documentos, setDocumentos] = useState<DocumentoAluno[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [reprovando, setReprovando] = useState<{ id: string; observacao: string } | null>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const carregar = useCallback(async () => {
        if (!alunoId) return;
        setCarregando(true);
        setErro("");
        try {
            setDocumentos(await documentoApi.listarPorAluno(alunoId));
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível carregar os documentos."));
            setDocumentos([]);
        } finally {
            setCarregando(false);
        }
    }, [alunoId]);

    useEffect(() => {
        if (aberto) void carregar();
        else setErro("");
    }, [aberto, carregar]);

    function docDeTipo(tipo: string): DocumentoAluno | undefined {
        return [...documentos]
            .filter((d) => d.tipo_documento === tipo)
            .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
    }

    async function executar(chave: string, acao: () => Promise<unknown>) {
        setOcupado(chave);
        setErro("");
        try {
            await acao();
            await carregar();
            onAlterado?.();
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível concluir a operação."));
        } finally {
            setOcupado(null);
        }
    }

    const validar = (id: string, status: StatusValidacao, observacao?: string) =>
        executar(id, () => documentoApi.validar(id, status, observacao));

    const enviar = (tipo: string, arquivo: File) =>
        executar(tipo, () => documentoApi.enviar(alunoId as string, tipo, arquivo));

    const enviados = documentos.length;
    const pendentes = documentos.filter((d) => String(d.status).toUpperCase() === "PENDENTE").length;
    const reprovados = documentos.filter((d) => String(d.status).toUpperCase() === "REPROVADO").length;
    const aprovados = documentos.filter((d) => String(d.status).toUpperCase() === "APROVADO").length;

    return (
        <>
            <Dialog.Root open={aberto} onClose={onFechar} maxWidth="md">
                <Dialog.Header>
                    <Dialog.Title>Documentos do aluno</Dialog.Title>
                    <Dialog.ActionClose onClose={onFechar} />
                </Dialog.Header>

                <Dialog.Content>
                    <Stack spacing={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                            <Box flex={1.4} minWidth={160}>
                                <Typography variant="caption" color="text.secondary">Nome</Typography>
                                <Typography variant="body2" fontWeight={600}>{alunoNome ?? "—"}</Typography>
                            </Box>
                            <Box flex={1} minWidth={140}>
                                <Typography variant="caption" color="text.secondary">CPF</Typography>
                                <Typography variant="body2">{formatarCpf(alunoCpf)}</Typography>
                            </Box>
                            <Box flex={0.6} minWidth={80}>
                                <Typography variant="caption" color="text.secondary">RA</Typography>
                                <Typography variant="body2" fontWeight={600}>{alunoMatricula ?? "—"}</Typography>
                            </Box>
                            <Box flex={1.2} minWidth={160}>
                                <Typography variant="caption" color="text.secondary">Curso</Typography>
                                <Typography variant="body2">{cursoNome ?? "—"}</Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" variant="outlined" label={`${enviados} enviado(s)`} />
                            <Chip size="small" color="success" label={`${aprovados} aprovado(s)`} />
                            {pendentes > 0 && <Chip size="small" color="warning" label={`${pendentes} pendente(s)`} />}
                            {reprovados > 0 && <Chip size="small" color="error" label={`${reprovados} reprovado(s)`} />}
                        </Stack>

                        {erro && <Alert severity="error" onClose={() => setErro("")}>{erro}</Alert>}

                        {!carregando && enviados > 0 && pendentes === 0 && reprovados === 0 && (
                            <Alert severity="success">
                                Documentação conferida e aprovada. A matrícula deste aluno já pode ser aprovada na tela de Matrículas.
                            </Alert>
                        )}

                        {ocupado && <LinearProgress />}

                        {carregando ? (
                            <Stack alignItems="center" py={4}><CircularProgress size={30} /></Stack>
                        ) : (
                            <Box sx={{ overflowX: "auto" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Documento</TableCell>
                                            <TableCell>Arquivo</TableCell>
                                            <TableCell>Situação</TableCell>
                                            <TableCell align="right">Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {TIPOS_DOCUMENTO.map(({ tipo, label }) => {
                                            const doc = docDeTipo(tipo);
                                            const statusAtual = String(doc?.status ?? "").toUpperCase();
                                            const cfg = doc
                                                ? STATUS_DOCUMENTO[statusAtual] ?? { label: statusAtual, color: "default" as const }
                                                : null;

                                            return (
                                                <TableRow key={tipo}>
                                                    <TableCell>{label}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {doc?.nome_arquivo ?? "—"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {cfg ? (
                                                            <Tooltip title={doc?.observacao ?? ""} disableHoverListener={!doc?.observacao}>
                                                                <Chip label={cfg.label} color={cfg.color} size="small" />
                                                            </Tooltip>
                                                        ) : (
                                                            <Chip label="Não enviado" size="small" variant="outlined" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            style={{ display: "none" }}
                                                            ref={(el) => { inputRefs.current[tipo] = el; }}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) void enviar(tipo, file);
                                                                e.target.value = "";
                                                            }}
                                                        />
                                                        <Stack direction="row" justifyContent="flex-end">
                                                            <Tooltip title={doc ? "Visualizar arquivo" : "Nenhum arquivo enviado"}>
                                                                <span>
                                                                    <IconButton
                                                                        color="primary"
                                                                        disabled={!doc}
                                                                        onClick={() =>
                                                                            doc && window.open(
                                                                                documentoApi.urlArquivo(doc.id),
                                                                                "_blank",
                                                                                "noopener,noreferrer",
                                                                            )
                                                                        }
                                                                    >
                                                                        <Eye size={17} />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>

                                                            <Tooltip title={doc ? "Substituir arquivo" : "Enviar arquivo"}>
                                                                <span>
                                                                    <IconButton
                                                                        disabled={ocupado !== null}
                                                                        onClick={() => inputRefs.current[tipo]?.click()}
                                                                    >
                                                                        <Upload size={17} />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>

                                                            <Tooltip title={doc ? "Aprovar documento" : "Nenhum arquivo enviado"}>
                                                                <span>
                                                                    <IconButton
                                                                        color="success"
                                                                        disabled={!doc || ocupado !== null || statusAtual === "APROVADO"}
                                                                        onClick={() => doc && void validar(doc.id, "APROVADO")}
                                                                    >
                                                                        <CheckCircle size={17} />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>

                                                            <Tooltip title={doc ? "Reprovar documento" : "Nenhum arquivo enviado"}>
                                                                <span>
                                                                    <IconButton
                                                                        color="error"
                                                                        disabled={!doc || ocupado !== null || statusAtual === "REPROVADO"}
                                                                        onClick={() => doc && setReprovando({ id: doc.id, observacao: "" })}
                                                                    >
                                                                        <XCircle size={17} />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Stack>
                </Dialog.Content>

                <Dialog.Footer>
                    <Button variant="outlined" onClick={onFechar}>Fechar</Button>
                </Dialog.Footer>
            </Dialog.Root>

            <Dialog.Root open={!!reprovando} onClose={() => setReprovando(null)} maxWidth="xs">
                <Dialog.Header>
                    <Dialog.Title>Reprovar documento</Dialog.Title>
                    <Dialog.ActionClose onClose={() => setReprovando(null)} />
                </Dialog.Header>
                <Dialog.Content>
                    <TextField
                        label="Motivo da reprovação (opcional)"
                        placeholder="Ex.: arquivo ilegível, documento vencido"
                        value={reprovando?.observacao ?? ""}
                        onChange={(e) =>
                            setReprovando((r) => (r ? { ...r, observacao: e.target.value } : r))
                        }
                        multiline
                        rows={3}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 1 }}
                    />
                </Dialog.Content>
                <Dialog.Footer>
                    <Button variant="outlined" onClick={() => setReprovando(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="error"
                        isLoading={ocupado === reprovando?.id}
                        onClick={async () => {
                            if (!reprovando) return;
                            await validar(reprovando.id, "REPROVADO", reprovando.observacao || undefined);
                            setReprovando(null);
                        }}
                    >
                        Confirmar reprovação
                    </Button>
                </Dialog.Footer>
            </Dialog.Root>
        </>
    );
}

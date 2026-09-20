import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AppBar,
    Box,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Toolbar,
    Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, GraduationCap, Upload } from "lucide-react";

import { COR_BORDA, COR_DESTAQUE, COR_INSTITUCIONAL, GRADIENTE_CLARO, irParaPortal } from "../LandingPage/conteudo";
import { inscricaoPublicaApi } from "../../services/site-api";
import Button from "../../components/Button";

const ROTULO_DOCUMENTO: Record<string, string> = {
    RG: "RG (Registro Geral)",
    CPF: "CPF (Cadastro de Pessoa Física)",
    HISTORICO: "Histórico Escolar do Ensino Médio",
    COMPROVANTE_RESIDENCIA: "Comprovante de Residência",
    NOTAS_ENEM: "Boletim de Desempenho do ENEM",
    COMPROVANTE_INSCRICAO_ENEM: "Comprovante de Inscrição no ENEM",
    OUTROS: "Outros documentos",
};

interface Recusado {
    tipo_documento: string;
    observacao: string | null;
}

function mensagemErro(err: unknown, fallback: string): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    return axiosErr?.response?.data?.error ?? fallback;
}

export default function ReenviarDocumentos() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const alunoId = params.get("aluno") ?? "";

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [recusados, setRecusados] = useState<Recusado[]>([]);
    const [reenviados, setReenviados] = useState<string[]>([]);
    const [enviando, setEnviando] = useState("");
    const [aviso, setAviso] = useState("");
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        if (!alunoId) {
            setErro("Link inválido. Use o botão que veio no e-mail da secretaria.");
            setCarregando(false);
            return;
        }

        inscricaoPublicaApi
            .documentosRecusados(alunoId)
            .then(setRecusados)
            .catch((err) => setErro(mensagemErro(err, "Não foi possível carregar os documentos.")))
            .finally(() => setCarregando(false));
    }, [alunoId]);

    async function enviar(tipo: string, arquivo: File) {
        setEnviando(tipo);
        setErro("");
        try {
            await inscricaoPublicaApi.enviarDocumento(alunoId, tipo, arquivo);
            setReenviados((atual) => [...atual.filter((t) => t !== tipo), tipo]);
            setAviso(`${ROTULO_DOCUMENTO[tipo] ?? tipo} reenviado.`);
        } catch (err) {
            setErro(mensagemErro(err, "Não foi possível enviar o arquivo."));
        } finally {
            setEnviando("");
        }
    }

    const pendentes = recusados.filter((doc) => !reenviados.includes(doc.tipo_documento));
    const concluido = recusados.length > 0 && pendentes.length === 0;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#fff", borderBottom: `1px solid ${COR_BORDA}` }}>
                <Toolbar sx={{ maxWidth: 1180, width: "100%", mx: "auto", px: { xs: 2, md: 4 }, minHeight: 68 }}>
                    <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                        sx={{ flexGrow: 1, cursor: "pointer" }}
                        onClick={() => navigate("/")}
                    >
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.6,
                                bgcolor: COR_INSTITUCIONAL,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <GraduationCap size={20} color="#fff" />
                        </Box>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: COR_INSTITUCIONAL }}>
                            Uni<Box component="span" sx={{ color: COR_DESTAQUE }}>Educa</Box>
                        </Typography>
                    </Stack>

                    <Button
                        variant="outlined"
                        sx={{ width: "auto", height: 40, px: 2.5, fontSize: 14.5, borderRadius: 2 }}
                        onClick={() => irParaPortal(navigate)}
                    >
                        Já tenho acesso
                    </Button>
                </Toolbar>
            </AppBar>

            <Snackbar
                open={!!aviso}
                autoHideDuration={4000}
                onClose={() => setAviso("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="success" variant="filled" onClose={() => setAviso("")} sx={{ width: "100%" }}>
                    {aviso}
                </Alert>
            </Snackbar>

            <Box component="section" sx={{ background: GRADIENTE_CLARO, borderBottom: `1px solid ${COR_BORDA}`, py: { xs: 4, md: 5.5 } }}>
                <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 3, md: 2 } }}>
                    <Typography
                        component="h1"
                        sx={{ color: COR_INSTITUCIONAL, fontWeight: 800, fontSize: { xs: "1.6rem", md: "2.1rem" }, lineHeight: 1.2 }}
                    >
                        Reenviar documentos
                    </Typography>
                    <Typography sx={{ color: "#5b6472", fontSize: { xs: ".95rem", md: "1.03rem" }, mt: 1.2, lineHeight: 1.7 }}>
                        Envie de novo apenas os arquivos que não foram aceitos. Formatos: PDF, imagem (JPG, PNG,
                        WEBP, GIF) ou ZIP, até 10 MB cada.
                    </Typography>
                </Box>
            </Box>

            <Stack alignItems="center" py={{ xs: 3, md: 5 }} px={2} sx={{ flex: 1 }}>
                <Paper
                    elevation={0}
                    sx={{
                        width: "100%",
                        maxWidth: 760,
                        bgcolor: "#fff",
                        border: `1px solid ${COR_BORDA}`,
                        borderRadius: 3,
                        boxShadow: "0 10px 30px rgba(20,104,143,.07)",
                        p: { xs: 2.5, sm: 4 },
                    }}
                >
                    {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro("")}>{erro}</Alert>}

                    {carregando ? (
                        <Stack alignItems="center" py={5}><CircularProgress /></Stack>
                    ) : concluido ? (
                        <Stack alignItems="center" spacing={2} py={4} textAlign="center">
                            <CheckCircle size={58} color="#2e7d32" />
                            <Typography variant="h6" fontWeight={700} color="success.dark">
                                Documentos reenviados!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                A secretaria vai conferir os arquivos novamente. Você recebe um e-mail com o
                                resultado.
                            </Typography>
                        </Stack>
                    ) : recusados.length === 0 ? (
                        <Alert severity="info">
                            Nenhum documento pendente de reenvio. Se você recebeu um e-mail pedindo isso, fale com a
                            secretaria.
                        </Alert>
                    ) : (
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Documento</TableCell>
                                        <TableCell>Motivo da recusa</TableCell>
                                        <TableCell align="right">Ação</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recusados.map((doc) => {
                                        const tipo = doc.tipo_documento;
                                        const jaEnviado = reenviados.includes(tipo);

                                        return (
                                            <TableRow key={tipo}>
                                                <TableCell>{ROTULO_DOCUMENTO[tipo] ?? tipo}</TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {doc.observacao || "Não informado"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.zip"
                                                        style={{ display: "none" }}
                                                        ref={(el) => { inputRefs.current[tipo] = el; }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) void enviar(tipo, file);
                                                            e.target.value = "";
                                                        }}
                                                    />

                                                    {jaEnviado ? (
                                                        <Chip label="Reenviado" color="success" size="small" />
                                                    ) : (
                                                        <Button
                                                            variant="outlined"
                                                            sx={{ width: "auto", minWidth: 130 }}
                                                            isLoading={enviando === tipo}
                                                            onClick={() => inputRefs.current[tipo]?.click()}
                                                        >
                                                            <Upload size={14} style={{ marginRight: 6 }} />
                                                            Enviar
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
}

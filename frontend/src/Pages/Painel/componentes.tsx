import { useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { ImagePlus, Trash2, Upload } from "lucide-react";

import { siteAdminApi, urlImagem } from "../../services/site-api";

export function CabecalhoPainel({
    titulo,
    descricao,
    acao,
}: {
    titulo: string;
    descricao: string;
    acao?: React.ReactNode;
}) {
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            mb={3.5}
        >
            <Box>
                <Typography sx={{ fontSize: { xs: "1.4rem", md: "1.7rem" }, fontWeight: 800, color: "#0f1720" }}>
                    {titulo}
                </Typography>
                <Typography sx={{ color: "#8792a2", fontSize: ".95rem", mt: .5 }}>{descricao}</Typography>
            </Box>
            {acao}
        </Stack>
    );
}

export function Cartao({ children, sx }: { children: React.ReactNode; sx?: object }) {
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e4eaf0", bgcolor: "#fff", p: { xs: 2.5, md: 3 }, ...sx }}>
            {children}
        </Paper>
    );
}

export function ChipStatus({ status }: { status: string }) {
    const publicado = status === "publicado";

    return (
        <Chip
            size="small"
            label={publicado ? "Publicado" : "Rascunho"}
            sx={{
                fontWeight: 700,
                fontSize: 12,
                bgcolor: publicado ? "#e3f7ec" : "#fdf3e2",
                color: publicado ? "#116b41" : "#9a6510",
            }}
        />
    );
}

export function useFeedback() {
    const [mensagem, setMensagem] = useState("");
    const [tipo, setTipo] = useState<"success" | "error">("success");
    const [aberto, setAberto] = useState(false);

    function avisar(texto: string, severidade: "success" | "error" = "success") {
        setMensagem(texto);
        setTipo(severidade);
        setAberto(true);
    }

    function erroDe(err: any, padrao: string) {
        avisar(err?.response?.data?.error ?? padrao, "error");
    }

    const componente = (
        <Snackbar
            open={aberto}
            autoHideDuration={4500}
            onClose={() => setAberto(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
            <Alert severity={tipo} onClose={() => setAberto(false)} variant="filled" sx={{ width: "100%" }}>
                {mensagem}
            </Alert>
        </Snackbar>
    );

    return { avisar, erroDe, componente };
}

interface CampoImagemProps {
    valor: string;
    rotulo: string;
    altura?: number;
    onChange: (url: string) => void;
    onErro?: (mensagem: string) => void;
}

export function CampoImagem({ valor, rotulo, altura = 170, onChange, onErro }: CampoImagemProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [enviando, setEnviando] = useState(false);

    async function selecionar(arquivo?: File | null) {
        if (!arquivo) return;

        setEnviando(true);
        try {
            onChange(await siteAdminApi.enviarImagem(arquivo));
        } catch (err: any) {
            onErro?.(err?.response?.data?.error ?? "Não foi possível enviar a imagem.");
        } finally {
            setEnviando(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    const previa = urlImagem(valor);

    return (
        <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#5b6472", mb: 1 }}>{rotulo}</Typography>

            <Box
                sx={{
                    position: "relative",
                    height: altura,
                    borderRadius: 2,
                    border: "1px dashed #cdd8e2",
                    bgcolor: "#f8fbfd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    backgroundImage: previa ? `url(${previa})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {enviando ? (
                    <CircularProgress size={26} />
                ) : (
                    !previa && (
                        <Stack alignItems="center" spacing={1}>
                            <ImagePlus size={26} color="#9aa7b4" />
                            <Typography sx={{ fontSize: ".85rem", color: "#9aa7b4" }}>Nenhuma imagem</Typography>
                        </Stack>
                    )
                )}
            </Box>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => selecionar(e.target.files?.[0])}
            />

            <Stack direction="row" spacing={1} mt={1.2}>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => inputRef.current?.click()}
                    disabled={enviando}
                    sx={{ width: "auto", fontSize: 13 }}
                >
                    <Upload size={15} style={{ marginRight: 6 }} />
                    Enviar imagem
                </Button>

                {valor && (
                    <Button
                        size="small"
                        color="error"
                        onClick={() => onChange("")}
                        sx={{ width: "auto", fontSize: 13 }}
                    >
                        <Trash2 size={15} style={{ marginRight: 6 }} />
                        Remover
                    </Button>
                )}
            </Stack>
        </Box>
    );
}

export function Carregando() {
    return (
        <Stack alignItems="center" py={6}>
            <CircularProgress />
        </Stack>
    );
}

export function SemRegistros({ mensagem }: { mensagem: string }) {
    return (
        <Paper
            elevation={0}
            sx={{ p: { xs: 4, md: 6 }, borderRadius: 3, border: "1px dashed #d6dee6", bgcolor: "#f9fbfd", textAlign: "center" }}
        >
            <Typography sx={{ color: "#5b6472", fontSize: ".98rem" }}>{mensagem}</Typography>
        </Paper>
    );
}

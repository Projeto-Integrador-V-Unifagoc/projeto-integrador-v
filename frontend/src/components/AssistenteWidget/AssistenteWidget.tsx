import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
    Box,
    CircularProgress,
    Fab,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Bot, Eraser, Send, X } from "lucide-react";

import { assistenteApi, type AcaoAssistente, type MensagemAssistente } from "../../services/assistente-api";
import TextoAssistente from "./TextoAssistente";
import { consultarDisponibilidade, escutarPerguntas, type PedidoAssistente } from "./ponte";

const LIMITE_CARACTERES = 1000;
const HISTORICO_ENVIADO = 10;
const CHAVE_CONVERSA = "@UniEduca:assistente";

const BOAS_VINDAS: MensagemAssistente = {
    papel: "assistente",
    texto: "Olá! Sou o assistente do UniEduca. Posso consultar suas informações acadêmicas, como notas, faltas e próximas avaliações, e explicar como usar as telas do sistema. Como posso ajudar?",
};

function mensagemErro(err: unknown): string {
    const axiosErr = err as { response?: { data?: { error?: string } } };
    return axiosErr?.response?.data?.error ?? "Não consegui responder agora. Tente novamente em instantes.";
}

/** A conversa fica só na aba atual (sessionStorage), separada por usuário: quem entrar depois na mesma aba não a vê. */
function chaveDaConversa(): string {
    try {
        const usuario = JSON.parse(localStorage.getItem("@UniEduca:user") ?? "null");
        return `${CHAVE_CONVERSA}:${usuario?.id ?? "anonimo"}`;
    } catch {
        return `${CHAVE_CONVERSA}:anonimo`;
    }
}

function lerConversa(): MensagemAssistente[] {
    try {
        const salva = JSON.parse(sessionStorage.getItem(chaveDaConversa()) ?? "null");
        return Array.isArray(salva) && salva.length > 0 ? salva : [BOAS_VINDAS];
    } catch {
        return [BOAS_VINDAS];
    }
}

function salvarConversa(mensagens: MensagemAssistente[]) {
    try {
        sessionStorage.setItem(chaveDaConversa(), JSON.stringify(mensagens.slice(-30)));
    } catch {
        return;
    }
}

export default function AssistenteWidget() {
    const theme = useTheme();
    const telaPequena = useMediaQuery(theme.breakpoints.down("sm"));

    const [disponivel, setDisponivel] = useState(false);
    const [aberto, setAberto] = useState(false);
    const [mensagens, setMensagens] = useState<MensagemAssistente[]>(lerConversa);
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const fimRef = useRef<HTMLDivElement>(null);
    const campoRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let ativo = true;
        void consultarDisponibilidade().then((disponivelAgora) => ativo && setDisponivel(disponivelAgora));
        return () => {
            ativo = false;
        };
    }, []);

    // Perguntas vindas das telas (ex.: "Entender meu desempenho" no dashboard): abre o chat e envia.
    // A referência guarda o envio mais recente para a escuta não usar um estado antigo da conversa.
    // Ação de um botão de IA que ainda não teve resposta (falhou ou chegou durante outra resposta): se a pessoa
    // reenviar o mesmo texto do campo, a ação vai junto para o backend montar a instrução interna de novo.
    const [acaoPendente, setAcaoPendente] = useState<PedidoAssistente | null>(null);
    const enviarPerguntaRef = useRef<(pedido: PedidoAssistente) => void>(() => undefined);
    useEffect(() => escutarPerguntas((pedido) => enviarPerguntaRef.current(pedido)), []);
    useEffect(() => {
        enviarPerguntaRef.current = (pedido: PedidoAssistente) => {
            // Com a IA desativada o widget nem aparece: o pedido é ignorado e nada vai para o backend.
            if (!disponivel) return;
            setAberto(true);
            // Com uma resposta em andamento, a pergunta espera no campo para a pessoa enviar.
            if (enviando) {
                setTexto(pedido.pergunta.slice(0, LIMITE_CARACTERES));
                setAcaoPendente(pedido.acao ? pedido : null);
            } else void enviarPergunta(pedido.pergunta, pedido.acao);
        };
    });

    useEffect(() => salvarConversa(mensagens), [mensagens]);

    useEffect(() => {
        if (aberto) {
            fimRef.current?.scrollIntoView({ block: "end" });
            campoRef.current?.focus();
        }
    }, [aberto, mensagens, enviando]);

    if (!disponivel) return null;

    async function enviar(evento?: FormEvent) {
        evento?.preventDefault();
        const acao = acaoPendente && acaoPendente.pergunta === texto.trim() ? acaoPendente.acao : undefined;
        await enviarPergunta(texto, acao);
    }

    async function enviarPergunta(textoPergunta: string, acao?: AcaoAssistente) {
        const pergunta = textoPergunta.trim().slice(0, LIMITE_CARACTERES);
        if (!pergunta || enviando) return;
        setAcaoPendente(null);

        const historico = mensagens.filter((m) => m !== BOAS_VINDAS && m.texto !== BOAS_VINDAS.texto).slice(-HISTORICO_ENVIADO);
        const enviada: MensagemAssistente = { papel: "usuario", texto: pergunta };
        setMensagens((lista) => [...lista, enviada]);
        setTexto("");
        setErro("");
        setEnviando(true);

        try {
            const { resposta } = await assistenteApi.enviar(pergunta, historico, acao);
            setMensagens((lista) => [...lista, { papel: "assistente", texto: resposta }]);
        } catch (err) {
            // A pergunta que falhou sai da conversa e volta para o campo: assim ela não fica no histórico sem
            // resposta (o que deixaria duas perguntas seguidas na próxima tentativa) e a pessoa só reenvia.
            setMensagens((lista) => lista.filter((m) => m !== enviada));
            setTexto((atual) => atual || pergunta);
            if (acao) setAcaoPendente({ pergunta, acao });
            setErro(mensagemErro(err));
        } finally {
            setEnviando(false);
        }
    }

    function aoTeclar(evento: KeyboardEvent) {
        if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            void enviar();
        }
    }

    function limpar() {
        setMensagens([BOAS_VINDAS]);
        setErro("");
    }

    const fecharAoNavegar = () => {
        if (telaPequena) setAberto(false);
    };

    return (
        <>
            {!aberto && (
                <Tooltip title="Assistente de suporte" placement="left">
                    <Fab
                        color="primary"
                        aria-label="Abrir assistente de suporte"
                        onClick={() => setAberto(true)}
                        sx={{ position: "fixed", right: 24, bottom: 24, zIndex: (t) => t.zIndex.speedDial }}
                    >
                        <Bot size={24} />
                    </Fab>
                </Tooltip>
            )}

            {aberto && (
                <Paper
                    role="dialog"
                    aria-label="Assistente de suporte"
                    elevation={8}
                    sx={{
                        position: "fixed",
                        zIndex: (t) => t.zIndex.modal - 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        ...(telaPequena
                            ? { inset: 0, borderRadius: 0 }
                            : { right: 24, bottom: 24, width: 380, height: "min(600px, calc(100vh - 96px))", borderRadius: 3 }),
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ px: 2, py: 1.25, bgcolor: "primary.main", color: "primary.contrastText" }}
                    >
                        <Bot size={20} />
                        <Box flex={1}>
                            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                                Assistente de suporte
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                Seus dados acadêmicos e dúvidas do sistema
                            </Typography>
                        </Box>
                        <Tooltip title="Limpar conversa">
                            <IconButton size="small" color="inherit" onClick={limpar} aria-label="Limpar conversa">
                                <Eraser size={18} />
                            </IconButton>
                        </Tooltip>
                        <IconButton size="small" color="inherit" onClick={() => setAberto(false)} aria-label="Fechar assistente">
                            <X size={20} />
                        </IconButton>
                    </Stack>

                    <Stack spacing={1.25} sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "background.default" }} aria-live="polite">
                        {mensagens.map((m, i) => (
                            <Box
                                key={i}
                                sx={{
                                    alignSelf: m.papel === "usuario" ? "flex-end" : "flex-start",
                                    maxWidth: "88%",
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 2,
                                    ...(m.papel === "usuario"
                                        ? { bgcolor: "primary.main", color: "primary.contrastText", borderBottomRightRadius: 4 }
                                        : { bgcolor: "background.paper", border: 1, borderColor: "divider", borderBottomLeftRadius: 4 }),
                                }}
                            >
                                {m.papel === "usuario" ? (
                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                        {m.texto}
                                    </Typography>
                                ) : (
                                    <TextoAssistente texto={m.texto} aoNavegar={fecharAoNavegar} />
                                )}
                            </Box>
                        ))}

                        {enviando && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                                <CircularProgress size={14} />
                                <Typography variant="caption">Consultando a ajuda…</Typography>
                            </Stack>
                        )}
                        {erro && (
                            <Typography variant="caption" color="error" role="alert">
                                {erro}
                            </Typography>
                        )}
                        <div ref={fimRef} />
                    </Stack>

                    <Box
                        component="form"
                        onSubmit={enviar}
                        sx={{ display: "flex", gap: 1, p: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}
                    >
                        <TextField
                            inputRef={campoRef}
                            value={texto}
                            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CARACTERES))}
                            onKeyDown={aoTeclar}
                            placeholder="Escreva sua dúvida…"
                            size="small"
                            multiline
                            maxRows={4}
                            fullWidth
                            disabled={enviando}
                            slotProps={{ htmlInput: { "aria-label": "Sua dúvida", maxLength: LIMITE_CARACTERES } }}
                        />
                        <IconButton type="submit" color="primary" disabled={enviando || !texto.trim()} aria-label="Enviar">
                            <Send size={20} />
                        </IconButton>
                    </Box>
                </Paper>
            )}
        </>
    );
}

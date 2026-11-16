import { useRef, useState, type ReactNode } from "react";
import { Box, Divider, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import { FileText, Heading2, Image as IconeImagem, Link2, List, Minus, PlaySquare, Quote } from "lucide-react";
import { conteudoApi } from "../../../services/conteudo-api";
import type { esquemaConteudo } from "./esquema-conteudo";
import type { RestricoesDeInsercao } from "./EditorPagina";
import BotaoConteudo from "./BotaoConteudo";
import { EXTENSOES_ARQUIVO, FORMATOS_IMAGEM, validarArquivoParaEnvio } from "./arquivo-envio";

type Editor = typeof esquemaConteudo.BlockNoteEditor;
type BlocoParcial = typeof esquemaConteudo.PartialBlock;

/**
 * Insere o bloco onde está o cursor (ou no fim da página, se o editor ainda não
 * foi usado). Um parágrafo vazio é substituído, como faz o menu "/".
 */
function inserirBloco(editor: Editor, bloco: BlocoParcial, usarCursor: boolean) {
    const documento = editor.document;
    let referencia = documento[documento.length - 1];
    if (usarCursor) {
        try {
            referencia = editor.getTextCursorPosition().block;
        } catch {
            // sem seleção: mantém o fim da página
        }
    }
    const vazio = referencia.type === "paragraph" && Array.isArray(referencia.content) && referencia.content.length === 0;
    const inserido = vazio ? editor.updateBlock(referencia, bloco) : editor.insertBlocks([bloco], referencia, "after")[0];

    // Garante uma linha de texto depois da mídia para o autor continuar escrevendo.
    const proximo = editor.getNextBlock(inserido);
    const temTexto = bloco.type === "heading" || bloco.type === "bulletListItem" || bloco.type === "quote";
    if (temTexto) {
        editor.setTextCursorPosition(inserido, "end");
    } else if (!proximo) {
        const [paragrafo] = editor.insertBlocks([{ type: "paragraph" }], inserido, "after");
        editor.setTextCursorPosition(paragrafo, "start");
    } else {
        editor.setTextCursorPosition(proximo, "start");
    }
    editor.focus();
    // Leva o novo bloco para a área visível (útil em páginas longas).
    requestAnimationFrame(() => {
        document.querySelector(`[data-id="${inserido.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
}

interface Props {
    editor: Editor;
    cursoDisciplinaId: string;
    restricoes: RestricoesDeInsercao;
    usouCursor: () => boolean;
    onErro: (mensagem: string) => void;
}

export default function BarraInserir({ editor, cursoDisciplinaId, restricoes, usouCursor, onErro }: Props) {
    const entradaImagem = useRef<HTMLInputElement>(null);
    const entradaArquivo = useRef<HTMLInputElement>(null);
    const [envio, setEnvio] = useState<{ nome: string; percentual: number } | null>(null);

    const inserir = (bloco: BlocoParcial) => inserirBloco(editor, bloco, usouCursor());

    const enviar = async (arquivo: File | undefined, tipo: "imagem" | "arquivo") => {
        if (!arquivo) return;
        const erro = validarArquivoParaEnvio(arquivo, tipo);
        if (erro) {
            onErro(erro);
            return;
        }
        setEnvio({ nome: arquivo.name, percentual: 0 });
        try {
            const enviado = await conteudoApi.enviarArquivo(cursoDisciplinaId, arquivo, (percentual) =>
                setEnvio({ nome: arquivo.name, percentual }),
            );
            inserir(
                tipo === "imagem"
                    ? { type: "image", props: { url: enviado.url, name: enviado.nome, caption: "" } }
                    : { type: "file", props: { url: enviado.url, name: enviado.nome, caption: "" } },
            );
        } catch (e) {
            const mensagem = (e as { response?: { data?: { mensagem?: string; error?: string } } })?.response?.data;
            onErro(mensagem?.mensagem || mensagem?.error || "Não foi possível enviar o arquivo.");
        } finally {
            setEnvio(null);
        }
    };

    const semImagem = restricoes.semMidia || restricoes.semImagem;
    const semVideo = restricoes.semMidia || restricoes.semVideo;
    const ocupado = envio !== null;

    const botao = (rotulo: string, icone: ReactNode, onClick: () => void, desabilitado = false, dica?: string) => (
        <Tooltip title={dica ?? ""} disableHoverListener={!dica}>
            <span>
                <BotaoConteudo
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={icone}
                    disabled={desabilitado || ocupado}
                    // Mantém a seleção do editor ao clicar no botão.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onClick}
                    sx={{ color: "text.primary", fontWeight: 500, textTransform: "none" }}
                >
                    {rotulo}
                </BotaoConteudo>
            </span>
        </Tooltip>
    );

    const limiteMidia = restricoes.semMidia ? "Limite da página atingido. Crie uma nova página." : undefined;

    return (
        <Box
            sx={{
                position: "sticky",
                // No desktop o editor rola por dentro; em telas estreitas rola o <main> do layout (padding 16/24px).
                top: { xs: -16, sm: -24, md: 0 },
                zIndex: 3,
                bgcolor: "background.paper",
                borderBottom: 1,
                borderColor: "divider",
            }}
        >
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ px: { xs: 1, md: 3 }, py: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
                    Inserir
                </Typography>
                {botao("Imagem", <IconeImagem size={16} />, () => entradaImagem.current?.click(), semImagem,
                    limiteMidia ?? (restricoes.semImagem ? "Máximo de imagens por página atingido." : "JPG, PNG, WEBP ou GIF até 8 MB"))}
                {botao("Vídeo", <PlaySquare size={16} />, () => inserir({ type: "videoEmbed" }), semVideo,
                    limiteMidia ?? (restricoes.semVideo ? "Máximo de vídeos por página atingido." : "Link do YouTube, Vimeo ou Google Drive"))}
                {botao("Arquivo", <FileText size={16} />, () => entradaArquivo.current?.click(), restricoes.semMidia,
                    limiteMidia ?? "PDF, DOCX ou PPTX até 10 MB")}
                {botao("Link", <Link2 size={16} />, () => inserir({ type: "linkCard" }), restricoes.semMidia, limiteMidia)}
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                {botao("Título", <Heading2 size={16} />, () => inserir({ type: "heading", props: { level: 2 } }))}
                {botao("Lista", <List size={16} />, () => inserir({ type: "bulletListItem" }))}
                {botao("Citação", <Quote size={16} />, () => inserir({ type: "quote" }))}
                {botao("Divisor", <Minus size={16} />, () => inserir({ type: "divider" }))}
            </Stack>
            {envio && (
                <Box sx={{ px: { xs: 1, md: 3 }, pb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                        Enviando {envio.nome}… {envio.percentual}%
                    </Typography>
                    <LinearProgress variant="determinate" value={envio.percentual} sx={{ height: 4, borderRadius: 2 }} />
                </Box>
            )}
            <input
                ref={entradaImagem}
                type="file"
                hidden
                accept={FORMATOS_IMAGEM.join(",")}
                onChange={(e) => {
                    void enviar(e.target.files?.[0], "imagem");
                    e.target.value = "";
                }}
            />
            <input
                ref={entradaArquivo}
                type="file"
                hidden
                accept={EXTENSOES_ARQUIVO.join(",")}
                onChange={(e) => {
                    void enviar(e.target.files?.[0], "arquivo");
                    e.target.value = "";
                }}
            />
        </Box>
    );
}

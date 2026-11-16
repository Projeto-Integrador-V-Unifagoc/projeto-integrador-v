import { useEffect, useMemo, useRef } from "react";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { pt } from "@blocknote/core/locales";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote, type DefaultReactSuggestionItem } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Link2, PlaySquare } from "lucide-react";
import { conteudoApi } from "../../../services/conteudo-api";
import { esquemaConteudo, resolverArquivo } from "./esquema-conteudo";
import BarraInserir from "./BarraInserir";
import { validarArquivoParaEnvio } from "./arquivo-envio";

type ItemDoMenu = DefaultReactSuggestionItem & { key?: string };

const dicionario = {
    ...pt,
    placeholders: {
        ...pt.placeholders,
        emptyDocument: "Comece a escrever ou clique em + para adicionar um bloco",
        default: "Digite / para inserir um bloco",
    },
};

export interface RestricoesDeInsercao {
    // Quando o limite da página é atingido, os blocos de mídia somem do menu.
    semMidia: boolean;
    semVideo: boolean;
    semImagem: boolean;
}

interface Props {
    cursoDisciplinaId: string;
    blocosIniciais: unknown[];
    somenteLeitura?: boolean;
    restricoes: RestricoesDeInsercao;
    onAlterar: (blocos: unknown[]) => void;
    onErro: (mensagem: string) => void;
}

export default function EditorPagina({ cursoDisciplinaId, blocosIniciais, somenteLeitura = false, restricoes, onAlterar, onErro }: Props) {
    const restricoesRef = useRef(restricoes);
    useEffect(() => {
        restricoesRef.current = restricoes;
    }, [restricoes]);

    const editor = useCreateBlockNote({
        schema: esquemaConteudo,
        dictionary: dicionario,
        // O editor exige ao menos um bloco; página nova começa vazia.
        initialContent: blocosIniciais.length ? (blocosIniciais as never) : undefined,
        resolveFileUrl: resolverArquivo,
        // Usado ao arrastar/colar arquivos no editor e nos blocos de mídia do menu "/".
        uploadFile: async (arquivo: File) => {
            const erroValidacao = validarArquivoParaEnvio(arquivo, arquivo.type.startsWith("image/") ? "imagem" : "arquivo");
            if (erroValidacao) {
                onErro(erroValidacao);
                throw new Error(erroValidacao);
            }
            try {
                const enviado = await conteudoApi.enviarArquivo(cursoDisciplinaId, arquivo);
                return enviado.url;
            } catch (erro) {
                const mensagem = (erro as { response?: { data?: { mensagem?: string } } })?.response?.data?.mensagem;
                onErro(mensagem || "Não foi possível enviar o arquivo.");
                throw erro;
            }
        },
    });

    // Antes do primeiro clique no texto, a barra "Inserir" adiciona no fim da página.
    const usouCursor = useRef(false);

    const itensDoMenu = useMemo(
        () => async (consulta: string) => {
            const r = restricoesRef.current;
            const tiposDeMidia = new Set(["image", "video", "file", "audio"]);
            const padrao = (getDefaultReactSlashMenuItems(editor) as ItemDoMenu[]).filter((item) => {
                const chave = item.key ?? "";
                if (chave === "emoji") return false;
                if (r.semMidia && tiposDeMidia.has(chave)) return false;
                if (r.semImagem && chave === "image") return false;
                return true;
            });
            // Os itens extras entram logo depois do grupo de mídia padrão: grupos
            // repetidos fora de sequência quebram o menu (chaves duplicadas).
            const grupoMidia = padrao.find((item) => item.key === "image" || item.key === "file")?.group ?? "Mídia";
            const extras: DefaultReactSuggestionItem[] = [];
            if (!r.semMidia && !r.semVideo) {
                extras.push({
                    title: "Vídeo",
                    subtext: "Incorporar vídeo do YouTube ou Vimeo pelo link",
                    aliases: ["video", "youtube", "vimeo"],
                    group: grupoMidia,
                    icon: <PlaySquare size={18} />,
                    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "videoEmbed" }),
                });
            }
            if (!r.semMidia) {
                extras.push({
                    title: "Link",
                    subtext: "Card com link para um site externo",
                    aliases: ["link", "url", "site"],
                    group: grupoMidia,
                    icon: <Link2 size={18} />,
                    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "linkCard" }),
                });
            }
            const ultimoDaMidia = padrao.map((item) => item.group).lastIndexOf(grupoMidia);
            const posicao = ultimoDaMidia >= 0 ? ultimoDaMidia + 1 : padrao.length;
            const itens = [...padrao.slice(0, posicao), ...extras, ...padrao.slice(posicao)];
            return filterSuggestionItems(itens, consulta);
        },
        [editor],
    );

    return (
        <>
            {!somenteLeitura && (
                <BarraInserir
                    editor={editor}
                    cursoDisciplinaId={cursoDisciplinaId}
                    restricoes={restricoes}
                    usouCursor={() => usouCursor.current}
                    onErro={onErro}
                />
            )}
            <BlockNoteView
                editor={editor}
                theme="light"
                editable={!somenteLeitura}
                slashMenu={false}
                onChange={() => onAlterar(editor.document as unknown[])}
                onSelectionChange={() => {
                    if (editor.isFocused()) usouCursor.current = true;
                }}
            >
                <SuggestionMenuController triggerCharacter="/" getItems={itensDoMenu} />
            </BlockNoteView>
        </>
    );
}

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { esquemaConteudo, resolverArquivo } from "./esquema-conteudo";

// Exibição somente leitura do documento, com o mesmo esquema do editor.
export default function VisualizadorPagina({ blocos }: { blocos: unknown[] }) {
    const editor = useCreateBlockNote({
        schema: esquemaConteudo,
        initialContent: blocos.length ? (blocos as never) : undefined,
        resolveFileUrl: resolverArquivo,
    });
    return <BlockNoteView editor={editor} theme="light" editable={false} sideMenu={false} slashMenu={false} formattingToolbar={false} />;
}

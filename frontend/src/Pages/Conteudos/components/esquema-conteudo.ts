import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { conteudoApi } from "../../../services/conteudo-api";
import { LinkCard, VideoEmbed } from "./blocos-personalizados";

// Só os blocos que a tela oferece e o servidor aceita (ver ConteudoBlocos.ts no backend).
export const esquemaConteudo = BlockNoteSchema.create({
    blockSpecs: {
        paragraph: defaultBlockSpecs.paragraph,
        heading: defaultBlockSpecs.heading,
        quote: defaultBlockSpecs.quote,
        bulletListItem: defaultBlockSpecs.bulletListItem,
        numberedListItem: defaultBlockSpecs.numberedListItem,
        checkListItem: defaultBlockSpecs.checkListItem,
        codeBlock: defaultBlockSpecs.codeBlock,
        divider: defaultBlockSpecs.divider,
        image: defaultBlockSpecs.image,
        file: defaultBlockSpecs.file,
        videoEmbed: VideoEmbed(),
        linkCard: LinkCard(),
    },
});

const PREFIXO_ARQUIVO = "conteudo-arquivo:";

// Arquivos só saem com login: baixa com o token e entrega um blob ao editor.
const cacheDeArquivos = new Map<string, Promise<string>>();
export function resolverArquivo(url: string): Promise<string> {
    if (!url.startsWith(PREFIXO_ARQUIVO)) return Promise.resolve(url);
    const id = url.slice(PREFIXO_ARQUIVO.length);
    if (!cacheDeArquivos.has(id)) {
        const promessa = conteudoApi.baixarArquivo(id).then((blob) => URL.createObjectURL(blob));
        promessa.catch(() => cacheDeArquivos.delete(id));
        cacheDeArquivos.set(id, promessa);
    }
    return cacheDeArquivos.get(id)!;
}

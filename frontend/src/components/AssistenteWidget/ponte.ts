import { useEffect, useState } from "react";
import { assistenteApi, type AcaoAssistente } from "../../services/assistente-api";

// Ponte entre as telas (dashboards) e o AssistenteWidget do MainLayout: as telas pedem uma pergunta
// e o widget abre e envia, na mesma conversa. Assim existe um único chat de IA no sistema.

export const EVENTO_PERGUNTA_ASSISTENTE = "unieduca:assistente:perguntar";

export interface PedidoAssistente {
    /** Texto que aparece no chat como mensagem da pessoa. */
    pergunta: string;
    /** Botões de IA: o backend monta a instrução interna a partir desta ação. */
    acao?: AcaoAssistente;
}

/** Abre o assistente e envia a pergunta. Sem o widget montado (IA desativada), não faz nada. */
export function perguntarAoAssistente(pergunta: string, acao?: AcaoAssistente) {
    const texto = pergunta.trim();
    if (!texto) return;
    window.dispatchEvent(new CustomEvent<PedidoAssistente>(EVENTO_PERGUNTA_ASSISTENTE, { detail: { pergunta: texto, acao } }));
}

/** O widget escuta os pedidos das telas. Retorna a função que remove a escuta. */
export function escutarPerguntas(aoPerguntar: (pedido: PedidoAssistente) => void) {
    const ouvir = (evento: Event) => {
        const pedido = (evento as CustomEvent<PedidoAssistente>).detail;
        if (pedido?.pergunta) aoPerguntar(pedido);
    };
    window.addEventListener(EVENTO_PERGUNTA_ASSISTENTE, ouvir);
    return () => window.removeEventListener(EVENTO_PERGUNTA_ASSISTENTE, ouvir);
}

// Uma consulta de status por carregamento de página, compartilhada entre widget e telas.
let statusEmAndamento: Promise<boolean> | null = null;

export function consultarDisponibilidade(): Promise<boolean> {
    statusEmAndamento ??= assistenteApi.status().then((r) => r.ativo).catch(() => {
        statusEmAndamento = null; // falha não fica guardada: a próxima tela tenta de novo
        return false;
    });
    return statusEmAndamento;
}

/** Só para testes. */
export function limparDisponibilidade() {
    statusEmAndamento = null;
}

/** Se o assistente está configurado e ativo. Enquanto consulta, considera indisponível. */
export function useAssistenteDisponivel() {
    const [disponivel, setDisponivel] = useState(false);
    useEffect(() => {
        let montado = true;
        void consultarDisponibilidade().then((ativo) => montado && setDisponivel(ativo));
        return () => {
            montado = false;
        };
    }, []);
    return disponivel;
}

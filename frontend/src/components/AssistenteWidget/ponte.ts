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

// Status compartilhado entre widget e telas, guardado por pouco tempo: se a IA for ligada ou
// desligada no servidor, a tela acompanha ao voltar o foco ou remontar, sem recarregar a página.
const VALIDADE_STATUS_MS = 30_000;
let statusEmAndamento: Promise<boolean> | null = null;
let consultadoEm = 0;

export function consultarDisponibilidade(): Promise<boolean> {
    if (Date.now() - consultadoEm > VALIDADE_STATUS_MS) statusEmAndamento = null;
    if (!statusEmAndamento) {
        consultadoEm = Date.now();
        statusEmAndamento = assistenteApi.status().then((r) => r.ativo).catch(() => {
            statusEmAndamento = null; // falha não fica guardada: a próxima consulta tenta de novo
            return false;
        });
    }
    return statusEmAndamento;
}

/** Só para testes. */
export function limparDisponibilidade() {
    statusEmAndamento = null;
    consultadoEm = 0;
}

/**
 * Se o assistente está configurado e ativo. Enquanto consulta, considera indisponível.
 * Reconsulta (respeitando a validade do status) ao montar e quando a aba volta a ficar visível.
 */
export function useAssistenteDisponivel() {
    const [disponivel, setDisponivel] = useState(false);
    useEffect(() => {
        let montado = true;
        const atualizar = () => {
            void consultarDisponibilidade().then((ativo) => montado && setDisponivel(ativo));
        };
        const aoVoltar = () => {
            if (document.visibilityState === "visible") atualizar();
        };
        atualizar();
        window.addEventListener("focus", atualizar);
        document.addEventListener("visibilitychange", aoVoltar);
        return () => {
            montado = false;
            window.removeEventListener("focus", atualizar);
            document.removeEventListener("visibilitychange", aoVoltar);
        };
    }, []);
    return disponivel;
}

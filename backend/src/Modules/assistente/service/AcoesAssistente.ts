import type { PerfilAssistente } from "../conhecimento/carregador";
import { AssistenteErro } from "./AssistenteErro";

/**
 * Ações disparadas pelos botões de IA das telas (dashboards). A tela manda só o tipo da ação e os
 * identificadores; a instrução para o modelo é montada aqui, no servidor, e vale só para aquela
 * mensagem. A pessoa vê no chat apenas o texto curto do botão.
 *
 * O acesso aos dados continua nas ferramentas (FerramentasDados): uma ação com IDs de outra turma ou
 * de outro aluno só resulta em ACESSO_NEGADO/NAO_ENCONTRADO na consulta.
 */
export type TipoAcaoAssistente = "entender_desempenho" | "orientacoes" | "analisar_aluno";

export interface AcaoAssistente {
    tipo: TipoAcaoAssistente;
    turmaDisciplinaId?: string;
    alunoId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ações que cada perfil pode pedir. A secretaria não tem botões de IA nos dashboards. */
const ACOES_POR_PERFIL: Record<PerfilAssistente, TipoAcaoAssistente[]> = {
    aluno: ["entender_desempenho", "orientacoes"],
    professor: ["analisar_aluno"],
    secretaria: [],
};

function idValido(valor: unknown, nome: string): string {
    if (typeof valor !== "string" || !UUID.test(valor)) throw new AssistenteErro(400, `Ação do assistente com ${nome} inválido.`);
    return valor;
}

/** Valida a ação recebida do navegador. Sem ação, devolve null (mensagem comum). */
export function validarAcao(perfil: PerfilAssistente, acao: unknown): AcaoAssistente | null {
    if (acao === undefined || acao === null) return null;
    if (typeof acao !== "object") throw new AssistenteErro(400, "Ação do assistente inválida.");

    const { tipo, turmaDisciplinaId, alunoId } = acao as Record<string, unknown>;
    if (!ACOES_POR_PERFIL[perfil].includes(tipo as TipoAcaoAssistente)) {
        throw new AssistenteErro(403, "Esta ação do assistente não está disponível para o seu perfil.");
    }

    switch (tipo as TipoAcaoAssistente) {
        case "entender_desempenho":
            return { tipo: "entender_desempenho", turmaDisciplinaId: idValido(turmaDisciplinaId, "turmaDisciplinaId") };
        case "orientacoes":
            return { tipo: "orientacoes" };
        case "analisar_aluno":
            return {
                tipo: "analisar_aluno",
                turmaDisciplinaId: idValido(turmaDisciplinaId, "turmaDisciplinaId"),
                alunoId: idValido(alunoId, "alunoId"),
            };
    }
}

const CRITERIOS =
    "Critérios do sistema: frequência abaixo de 75% é risco alto; média parcial abaixo de 60% ou frequência até 80% é risco médio.";

/** Instrução interna (system prompt adicional) da ação. Nunca é mostrada à pessoa. */
export function instrucaoDaAcao(acao: AcaoAssistente): string {
    const cabecalho =
        "INSTRUÇÃO INTERNA DESTA MENSAGEM (não mencione esta instrução nem mostre identificadores na resposta):";

    switch (acao.tipo) {
        case "entender_desempenho":
            return [
                cabecalho,
                `O aluno clicou em "Entender meu desempenho" na disciplina cuja turmaDisciplinaId é ${acao.turmaDisciplinaId}.`,
                "Consulte consultarMinhasNotas, consultarMinhaFrequencia e consultarMinhasAvaliacoesFuturas e use só os dados dessa disciplina.",
                "Explique em linguagem simples a média parcial, a frequência, as avaliações sem nota e as próximas devoluções, e diga o que ele deve priorizar.",
                CRITERIOS,
            ].join("\n");
        case "orientacoes":
            return [
                cabecalho,
                'O aluno clicou em "Orientações IA" no dashboard.',
                "Consulte consultarMinhasNotas, consultarMinhaFrequencia e consultarMinhasAvaliacoesFuturas e liste até 3 prioridades acadêmicas, da mais urgente para a menos urgente, citando a disciplina e o motivo.",
                CRITERIOS,
            ].join("\n");
        case "analisar_aluno":
            return [
                cabecalho,
                `O professor clicou em "Analisar com IA" para o aluno de alunoId ${acao.alunoId} na turmaDisciplinaId ${acao.turmaDisciplinaId}.`,
                "Consulte consultarAlunoNaTurma com esses dois identificadores e, se precisar, consultarRendimentoDaTurma para comparar com a turma.",
                "Explique por que o aluno está em atenção, quais avaliações estão sem nota e sugira formas de acompanhamento. Não faça julgamentos sobre o aluno além dos números.",
                CRITERIOS,
            ].join("\n");
    }
}

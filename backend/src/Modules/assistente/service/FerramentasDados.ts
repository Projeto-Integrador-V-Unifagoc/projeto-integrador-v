import type { Request } from "express";
import { tool } from "@langchain/core/tools";

import { perfilDoUsuario, type PerfilAssistente } from "../conhecimento/carregador";

/**
 * Ferramentas de consulta a dados acadêmicos reais.
 *
 * Segurança: a IA nunca escolhe QUEM é o usuário. Cada chamada vai para os serviços que o sistema já usa,
 * com um `req` montado só com a identidade do token (id e tipo). A autorização é a desses serviços
 * (AuthContextGateway, professorPossuiAluno, autorizarTurma...): um id passado pelo modelo que esteja fora
 * dos vínculos do usuário é recusado no backend, não no prompt.
 */

export interface UsuarioAutenticado {
    id: string;
    tipo_usuario: string;
}

/** As consultas que as ferramentas podem fazer. A implementação padrão chama os serviços existentes. */
export interface FontesDeDados {
    meuBoletim(req: Request): Promise<unknown>;
    minhaFrequencia(req: Request): Promise<unknown>;
    minhasDisciplinas(req: Request): Promise<unknown>;
    minhasAvaliacoesFuturas(req: Request): Promise<unknown>;
    painelDoProfessor(req: Request): Promise<unknown>;
    alunoNaTurma(req: Request, turmaDisciplinaId: string, alunoId: string): Promise<unknown>;
    rendimentoDaTurma(req: Request, turmaDisciplinaId: string): Promise<unknown>;
    frequenciaDaTurma(req: Request, turmaDisciplinaId: string): Promise<unknown>;
    notasDoAluno(req: Request, alunoId: string): Promise<unknown>;
    frequenciaDoAluno(req: Request, alunoId: string): Promise<unknown>;
    turmasEDisciplinas(req: Request): Promise<unknown>;
    buscarAlunos(req: Request, nome: string): Promise<unknown>;
}

/** Deixa no boletim só as disciplinas (turma/disciplina) que o professor leciona e recalcula o alerta. */
export function restringirBoletimAoProfessor(boletim: any, turmasDoProfessor: Iterable<string>) {
    const minhas = new Set([...turmasDoProfessor].map(String));
    const disciplinas = (boletim?.disciplinas ?? []).filter((d: any) => minhas.has(String(d.turmaDisciplinaId)));
    return { ...boletim, disciplinas, possuiAlerta: disciplinas.some((d: any) => Boolean(d.alerta)) };
}

/** Cria a instância uma vez, na primeira vez que for usada. */
function preguicoso<T>(criar: () => T): () => T {
    let instancia: T | undefined;
    return () => (instancia ??= criar());
}

const acessoNegado = () => Object.assign(new Error("Acesso negado."), { status: 403 });

/**
 * Os serviços só são carregados quando usados (evita ciclos de import e mantém o módulo leve nos testes)
 * e cada um é criado uma vez por conversa, não a cada consulta.
 */
export function fontesPadrao(): FontesDeDados {
    const notas = preguicoso(() => new (require("../../notas/service/NotaService").NotaService)());
    const repositorioNotas = preguicoso(() => new (require("../../notas/repository/NotaRepository").NotaRepository)());
    const contextoNotas = preguicoso(
        () => new (require("../../notas/gateways/AuthContextGateway").AuthContextGateway)(repositorioNotas()),
    );
    const frequencia = preguicoso(() => new (require("../../frequencia/service/FrequenciaService").FrequenciaService)());
    const homeAluno = preguicoso(() => new (require("../../home-aluno/service/HomeAlunoService").HomeAlunoService)());
    const homeProfessor = preguicoso(() => new (require("../../home-professor/service/HomeProfessorService").HomeProfessorService)());
    const alunos = preguicoso(() => new (require("../../modulo-gestao-alunos/service/AlunoService").AlunoService)());

    return {
        meuBoletim: (req) => notas().meuBoletim(req),
        minhaFrequencia: (req) => frequencia().minhaFrequencia(req),
        minhasDisciplinas: (req) => homeAluno().minhasDisciplinas(req),
        minhasAvaliacoesFuturas: (req) => homeAluno().minhasTarefas(req),
        painelDoProfessor: (req) => homeProfessor().dashboard(req),
        alunoNaTurma: (req, td, alunoId) => homeProfessor().detalheAluno(req, td, alunoId),
        rendimentoDaTurma: (req, td) => notas().obterRendimento(td, req),
        frequenciaDaTurma: (req, td) => frequencia().consultarTurma(td, req),
        notasDoAluno: async (req, alunoId) => {
            // consultarAluno autoriza o professor se ele dá aula ao aluno em ALGUMA disciplina, mas devolve o
            // boletim inteiro. Para o professor, ficam só as disciplinas dele (como já faz a frequência).
            const boletim: any = await notas().consultarAluno(alunoId, req);
            const ctx = await contextoNotas().obterContexto(req);
            if (ctx.perfil !== "professor") return boletim;
            const minhas = (await repositorioNotas().listarAtribuicoes(ctx.professorId)).map((a: any) => String(a.id));
            return restringirBoletimAoProfessor(boletim, minhas);
        },
        frequenciaDoAluno: (req, alunoId) => frequencia().consultarAluno(alunoId, req),
        turmasEDisciplinas: async (req) => {
            // Direto no repositório: listarOpcoes buscaria as avaliações de cada turma (N+1) só para descartá-las.
            if (perfilDoUsuario((req as any)?.user?.tipo_usuario) !== "secretaria") throw acessoNegado();
            const ctx = await contextoNotas().obterContexto(req);
            if (ctx.perfil !== "secretaria") throw acessoNegado();
            const atribuicoes: any[] = await repositorioNotas().listarAtribuicoes(undefined);
            return atribuicoes.map((a) => ({
                turmaDisciplinaId: a.id,
                turma: { sigla: a.turma_sigla, descricao: a.turma_descricao },
                disciplina: { codigo: a.disciplina_codigo, nome: a.disciplina_nome },
                periodoLetivo: { codigo: a.periodo_codigo, status: a.periodo_status },
                professorNome: a.professor_nome,
            }));
        },
        buscarAlunos: async (req, nome) => {
            // O serviço de alunos não verifica perfil: a trava fica aqui, além da ferramenta só existir para a secretaria.
            if (perfilDoUsuario((req as any)?.user?.tipo_usuario) !== "secretaria") throw acessoNegado();
            const lista: any[] = await alunos().listarAlunos({ nome });
            // Só o necessário para identificar o aluno: nada de CPF, endereço ou e-mail.
            return lista.slice(0, 15).map((a) => ({
                alunoId: a.id,
                nome: a.pessoa?.nome,
                matricula: a.matricula,
                curso: a.curso?.nome ?? null,
                periodo: a.periodo,
            }));
        },
    };
}

/** Cerca de 6 mil tokens: cabe o histórico de frequência de um período inteiro sem estourar o contexto. */
export const TAMANHO_MAXIMO_RESULTADO = 24_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O que volta para o modelo: dados em JSON, ou um aviso claro de acesso negado, vazio ou falha. */
async function executar(consulta: () => Promise<unknown>): Promise<string> {
    try {
        const dados = await consulta();
        if (dados === null || dados === undefined || (Array.isArray(dados) && dados.length === 0)) {
            return "SEM_REGISTROS: a consulta não encontrou dados. Diga isso ao usuário, sem inventar valores.";
        }
        const json = JSON.stringify(dados);
        return json.length > TAMANHO_MAXIMO_RESULTADO
            ? `${json.slice(0, TAMANHO_MAXIMO_RESULTADO)}… [RESULTADO_TRUNCADO: use só o que veio acima e diga que a lista é parcial]`
            : json;
    } catch (err: any) {
        const status = Number(err?.status ?? err?.statusCode ?? 0);
        if (status === 401 || status === 403) {
            return "ACESSO_NEGADO: o usuário não tem permissão para esses dados. Diga apenas que não pode mostrar essa informação.";
        }
        if (status === 404) return "NAO_ENCONTRADO: o registro não existe ou não está entre os vínculos do usuário.";
        if (status === 400 || status === 422) return `INVALIDO: ${String(err?.message ?? "parâmetros inválidos")}`;
        console.error("[assistente] falha em ferramenta de dados:", err?.message);
        return "FALHA_CONSULTA: o sistema não conseguiu consultar agora. Diga que houve uma falha e sugira tentar mais tarde.";
    }
}

function validarId(valor: unknown, nome: string): string {
    const texto = String(valor ?? "").trim();
    if (!UUID.test(texto)) throw Object.assign(new Error(`${nome} inválido. Use o identificador devolvido por outra consulta.`), { status: 400 });
    return texto;
}

const semParametros = { type: "object", properties: {} } as const;
const comTurma = {
    type: "object",
    properties: { turmaDisciplinaId: { type: "string", description: "turmaDisciplinaId devolvido por uma consulta anterior." } },
    required: ["turmaDisciplinaId"],
} as const;
const comAluno = {
    type: "object",
    properties: { alunoId: { type: "string", description: "alunoId devolvido por uma consulta anterior." } },
    required: ["alunoId"],
} as const;

/** Monta as ferramentas de dados do perfil. O `req` é fixo: identidade do token, nunca do modelo. */
export function criarFerramentasDeDados(perfil: PerfilAssistente, usuario: UsuarioAutenticado, fontes: FontesDeDados) {
    const req = { user: { id: usuario.id, tipo_usuario: usuario.tipo_usuario } } as unknown as Request;

    const ferramenta = (nome: string, descricao: string, schema: object, consulta: (args: any) => Promise<unknown>) =>
        tool(async (args: any) => executar(() => consulta(args ?? {})), { name: nome, description: descricao, schema: schema as any });

    const notasDoAluno = ferramenta(
        "consultarNotasDoAluno",
        "Boletim de um aluno: notas por avaliação, médias e situação por disciplina.",
        comAluno,
        (a) => fontes.notasDoAluno(req, validarId(a.alunoId, "alunoId")),
    );
    const frequenciaDoAluno = ferramenta(
        "consultarFrequenciaDoAluno",
        "Frequência de um aluno: presenças, faltas e percentual por disciplina, e histórico aula a aula.",
        comAluno,
        (a) => fontes.frequenciaDoAluno(req, validarId(a.alunoId, "alunoId")),
    );
    const rendimentoDaTurma = ferramenta(
        "consultarRendimentoDaTurma",
        "Notas e médias de todos os alunos de uma turma/disciplina, com a situação de cada um.",
        comTurma,
        (a) => fontes.rendimentoDaTurma(req, validarId(a.turmaDisciplinaId, "turmaDisciplinaId")),
    );
    const frequenciaDaTurma = ferramenta(
        "consultarFrequenciaDaTurma",
        "Frequência consolidada de uma turma/disciplina: alunos em risco (abaixo de 75%) e em alerta.",
        comTurma,
        (a) => fontes.frequenciaDaTurma(req, validarId(a.turmaDisciplinaId, "turmaDisciplinaId")),
    );

    if (perfil === "aluno") {
        return [
            ferramenta("consultarMinhasNotas", "Minhas notas: avaliações, nota obtida, média parcial, média final e situação por disciplina.", semParametros, () => fontes.meuBoletim(req)),
            ferramenta("consultarMinhaFrequencia", "Minha frequência: presenças, faltas e percentual por disciplina, e histórico aula a aula.", semParametros, () => fontes.minhaFrequencia(req)),
            ferramenta("consultarMinhasDisciplinas", "Minhas disciplinas do período atual, com turma e professor.", semParametros, () => fontes.minhasDisciplinas(req)),
            ferramenta("consultarMinhasAvaliacoesFuturas", "Minhas próximas avaliações (provas, trabalhos, TPI) com datas e valores.", semParametros, () => fontes.minhasAvaliacoesFuturas(req)),
        ];
    }

    if (perfil === "professor") {
        return [
            ferramenta(
                "consultarMeuPainel",
                "Painel do professor: suas turmas e disciplinas (com turmaDisciplinaId), pendências, próximas avaliações e alunos em atenção (com alunoId). Chame primeiro para descobrir os identificadores.",
                semParametros,
                () => fontes.painelDoProfessor(req),
            ),
            rendimentoDaTurma,
            frequenciaDaTurma,
            ferramenta(
                "consultarAlunoNaTurma",
                "Desempenho detalhado de um aluno numa turma/disciplina do professor: notas por avaliação e frequência.",
                {
                    type: "object",
                    properties: { turmaDisciplinaId: comTurma.properties.turmaDisciplinaId, alunoId: comAluno.properties.alunoId },
                    required: ["turmaDisciplinaId", "alunoId"],
                },
                (a) => fontes.alunoNaTurma(req, validarId(a.turmaDisciplinaId, "turmaDisciplinaId"), validarId(a.alunoId, "alunoId")),
            ),
            notasDoAluno,
            frequenciaDoAluno,
        ];
    }

    return [
        ferramenta(
            "listarTurmasEDisciplinas",
            "Todas as turmas/disciplinas ofertadas (turmaDisciplinaId, turma, disciplina, período letivo e professor). Use para achar o identificador da turma.",
            semParametros,
            () => fontes.turmasEDisciplinas(req),
        ),
        ferramenta(
            "buscarAlunos",
            "Procura alunos pelo nome (até 15 resultados): alunoId, nome, matrícula, curso e período.",
            {
                type: "object",
                properties: { nome: { type: "string", description: "Parte do nome do aluno, com ao menos 3 letras." } },
                required: ["nome"],
            },
            (a) => {
                const nome = String(a.nome ?? "").trim();
                if (nome.length < 3) throw Object.assign(new Error("Informe ao menos 3 letras do nome."), { status: 400 });
                return fontes.buscarAlunos(req, nome.slice(0, 80));
            },
        ),
        rendimentoDaTurma,
        frequenciaDaTurma,
        notasDoAluno,
        frequenciaDoAluno,
    ];
}

import type { Api } from "../helpers/api.js";
import { pegarCidade } from "../helpers/db.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarProfessorComLogin, type ProfessorCriado } from "../factories/professor.factory.js";
import { criarAlunoComLogin, type AlunoCriado } from "../factories/aluno.factory.js";
import {
  criarRegraPontuacao,
  dadosRegraPontuacao,
  dadosHistoricos100,
  type FixtureHistorica100,
  type ModeloRegraPontuacao,
  type RegraPontuacaoCriada,
} from "../factories/regra-pontuacao.factory.js";

/**
 * Monta um grafo acadêmico isolado por execução (spec §7.1, §10):
 *   cidade → faculdade → departamento → curso → disciplina(+matriz)
 *          → período(ativo) → professor(+login) → turma → turma-disciplina
 *
 * As jornadas adicionam alunos e matrículas sobre essa base via `matricularAluno`.
 */

export interface AlunoMatriculado {
  aluno: AlunoCriado;
  email: string;
  senha: string;
  token: string;
  apiAluno: Api;
  matriculaId: string;
}

export interface Cenario {
  runId: string;
  cidade: { ibge: string; uf: string };
  faculdadeId: string;
  departamentoId: string;
  cursoId: string;
  disciplinaId: string;
  cursoDisciplinaId: string;
  periodoLetivoId: string;
  periodoCodigo: string;
  turmaId: string;
  turmaDisciplinaId: string;
  professor: ProfessorCriado & { token: string; email: string };
  apiSecretaria: Api;
  apiProfessor: Api;
  regraPontuacao: RegraPontuacaoCriada | null;
  configurarRegra(modelo: ModeloRegraPontuacao): Promise<RegraPontuacaoCriada>;
  criarOfertaIrma(runIdOferta: string, opcoes?: { capacidadeTurma?: number }): Promise<OfertaCenario>;
  matricularAluno(opcoes?: { periodo?: string }): Promise<AlunoMatriculado>;
}

export interface OfertaCenario {
  cursoId: string;
  periodoLetivoId: string;
  turmaId: string;
  turmaDisciplinaId: string;
}

export interface OpcoesCenario {
  capacidadeTurma?: number;
  statusPeriodo?: string;
  /** Omitir mantém o par sem regra. Não existe default 100/120. */
  regraPontuacao?: ModeloRegraPontuacao;
}

export async function montarCenario(
  apiSecretaria: Api,
  runId: string,
  opcoes: OpcoesCenario = {},
): Promise<Cenario> {
  // Falha antes de criar o grafo quando foi solicitado um modelo inválido.
  if (opcoes.regraPontuacao !== undefined) dadosRegraPontuacao(opcoes.regraPontuacao);
  const cidadeRef = await pegarCidade();
  const cidade = { ibge: cidadeRef.ibge, uf: cidadeRef.uf };

  const faculdade = await estrutura.criarFaculdade(apiSecretaria, runId, cidade);
  const departamento = await estrutura.criarDepartamento(apiSecretaria, runId, faculdade.id);
  const curso = await estrutura.criarCurso(apiSecretaria, runId, departamento.id);
  const disciplina = await estrutura.criarDisciplina(apiSecretaria, runId);
  const cursoDisciplina = await estrutura.associarDisciplinaAoCurso(apiSecretaria, curso.id, disciplina.id);
  const periodo = await estrutura.criarPeriodoLetivo(apiSecretaria, runId, {
    status: opcoes.statusPeriodo ?? "ativo",
  });
  const profComLogin = await criarProfessorComLogin(apiSecretaria, runId, {
    cursoId: curso.id,
    cidadeIbge: cidade.ibge,
    uf: cidade.uf,
  });
  const turma = await estrutura.criarTurma(apiSecretaria, runId, {
    periodoLetivoId: periodo.id,
    cursoId: curso.id,
    capacidadeAlunos: opcoes.capacidadeTurma ?? 30,
  });
  const turmaDisciplina = await estrutura.criarTurmaDisciplina(apiSecretaria, turma.id, {
    cursoDisciplinaId: cursoDisciplina.id,
    professorId: profComLogin.professor.id,
  });

  const apiProfessor = apiSecretaria.comToken(profComLogin.token);
  const regraPontuacao = opcoes.regraPontuacao === undefined ? null : await criarRegraPontuacao(
    apiSecretaria, curso.id, periodo.id, opcoes.regraPontuacao,
  );

  const cenario: Cenario = {
    runId,
    cidade,
    faculdadeId: faculdade.id,
    departamentoId: departamento.id,
    cursoId: curso.id,
    disciplinaId: disciplina.id,
    cursoDisciplinaId: cursoDisciplina.id,
    periodoLetivoId: periodo.id,
    periodoCodigo: periodo.codigo,
    turmaId: turma.id,
    turmaDisciplinaId: turmaDisciplina.id,
    professor: { ...profComLogin.professor, token: profComLogin.token, email: profComLogin.email },
    apiSecretaria,
    apiProfessor,
    regraPontuacao,

    async configurarRegra(modelo) {
      const criada = await criarRegraPontuacao(apiSecretaria, curso.id, periodo.id, modelo);
      cenario.regraPontuacao = criada;
      return criada;
    },

    async criarOfertaIrma(runIdOferta, opcoesOferta = {}) {
      const outraTurma = await estrutura.criarTurma(apiSecretaria, runIdOferta, {
        periodoLetivoId: periodo.id,
        cursoId: curso.id,
        capacidadeAlunos: opcoesOferta.capacidadeTurma ?? opcoes.capacidadeTurma ?? 30,
      });
      const outraOferta = await estrutura.criarTurmaDisciplina(apiSecretaria, outraTurma.id, {
        cursoDisciplinaId: cursoDisciplina.id,
        professorId: profComLogin.professor.id,
      });
      // Mesma configuração institucional; o consumo permanece por oferta.
      return {
        cursoId: curso.id,
        periodoLetivoId: periodo.id,
        turmaId: outraTurma.id,
        turmaDisciplinaId: outraOferta.id,
      };
    },

    async matricularAluno(opcoesAluno = {}) {
      const alunoComLogin = await criarAlunoComLogin(apiSecretaria, `${runId}${Math.random().toString(36).slice(2, 5)}`, {
        cursoId: curso.id,
        cidadeIbge: cidade.ibge,
        uf: cidade.uf,
        periodo: opcoesAluno.periodo,
      });
      const matricula = await apiSecretaria.post("/matriculas", {
        body: { alunoId: alunoComLogin.aluno.id, turmaId: turma.id },
      });
      if (matricula.status !== 201) {
        throw new Error(
          `Falha ao matricular aluno: HTTP ${matricula.status} — ${JSON.stringify(matricula.body)}`,
        );
      }
      return {
        aluno: alunoComLogin.aluno,
        email: alunoComLogin.email,
        senha: alunoComLogin.senha,
        token: alunoComLogin.token,
        apiAluno: apiSecretaria.comToken(alunoComLogin.token),
        matriculaId: String(matricula.body.id),
      };
    },
  };
  return cenario;
}

/** Conveniência com modelo obrigatório; a base sem essa chamada permanece sem regra. */
export function montarCenarioComRegra(
  apiSecretaria: Api,
  runId: string,
  modelo: ModeloRegraPontuacao,
  opcoes: Omit<OpcoesCenario, "regraPontuacao"> = {},
): Promise<Cenario> {
  dadosRegraPontuacao(modelo);
  return montarCenario(apiSecretaria, runId, { ...opcoes, regraPontuacao: modelo });
}

/**
 * Somente a base e o dataset da US4, sem inserir avaliações ou adotar histórico.
 * Os registros legados devem ser carregados pelo harness antes das novas migrations.
 */
export async function montarBaseHistorica100(
  apiSecretaria: Api,
  runId: string,
  opcoes: Omit<OpcoesCenario, "regraPontuacao"> = {},
): Promise<{ cenario: Cenario; dadosLegados: FixtureHistorica100 }> {
  // Não propagar propriedades extras que poderiam configurar uma regra nova.
  const cenario = await montarCenario(apiSecretaria, runId, {
    capacidadeTurma: opcoes.capacidadeTurma,
    statusPeriodo: opcoes.statusPeriodo,
  });
  return { cenario, dadosLegados: dadosHistoricos100() };
}

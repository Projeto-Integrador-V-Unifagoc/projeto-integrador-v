import type { Api } from "../helpers/api.js";
import { pegarCidade } from "../helpers/db.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarProfessorComLogin, type ProfessorCriado } from "../factories/professor.factory.js";
import { criarAlunoComLogin, type AlunoCriado } from "../factories/aluno.factory.js";

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
  matricularAluno(opcoes?: { periodo?: string }): Promise<AlunoMatriculado>;
}

export async function montarCenario(
  apiSecretaria: Api,
  runId: string,
  opcoes: { capacidadeTurma?: number; statusPeriodo?: string } = {},
): Promise<Cenario> {
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

  return {
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
}

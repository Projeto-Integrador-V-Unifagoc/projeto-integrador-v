import type { Api } from "../helpers/api.js";
import * as ids from "../helpers/ids.js";

/**
 * Factories da estrutura acadêmica (spec §4.2). Criam entidades pela API pública
 * (preferência da spec §5.2) e devolvem o corpo já validado. Falham cedo quando
 * o backend responde fora do contrato, para que o erro apareça na origem.
 */

function exigirCriado<T>(rotulo: string, resposta: { status: number; body: any }): T {
  if (resposta.status !== 201 && resposta.status !== 200) {
    throw new Error(
      `Falha ao criar ${rotulo}: HTTP ${resposta.status} — ${JSON.stringify(resposta.body)}`,
    );
  }
  if (!resposta.body || typeof resposta.body !== "object" || !("id" in resposta.body)) {
    throw new Error(`Resposta de ${rotulo} sem campo "id": ${JSON.stringify(resposta.body)}`);
  }
  return resposta.body as T;
}

export interface Cidade {
  ibge: string;
  uf: string;
}

export async function criarFaculdade(api: Api, runId: string, cidade: Cidade) {
  const resposta = await api.post("/faculdades", {
    body: {
      nome: `Faculdade ${runId}`,
      cidadeIbge: cidade.ibge,
      logradouro: "Rua das Provas",
      numero: "100",
      bairro: "Centro",
      cep: "35300000",
    },
  });
  return exigirCriado<{ id: string; nome: string }>("faculdade", resposta);
}

export async function criarDepartamento(api: Api, runId: string, faculdadeId: string) {
  const resposta = await api.post("/departamentos", {
    body: {
      codigo: ids.codigo("DEP", runId),
      nome: `Departamento ${runId}`,
      faculdadeId,
    },
  });
  return exigirCriado<{ id: string; codigo: string }>("departamento", resposta);
}

export async function criarCurso(api: Api, runId: string, departamentoId: string) {
  const resposta = await api.post("/cursos", {
    body: {
      codigo: ids.codigo("CUR", runId),
      nome: `Curso ${runId}`,
      departamentoId,
    },
  });
  return exigirCriado<{ id: string; codigo: string }>("curso", resposta);
}

export async function criarDisciplina(
  api: Api,
  runId: string,
  opcoes: { cargaHoraria?: number; codigo?: string } = {},
) {
  const resposta = await api.post("/disciplinas", {
    body: {
      codigo: opcoes.codigo ?? ids.codigo("DIS", runId),
      nome: `Disciplina ${runId}`,
      cargaHoraria: opcoes.cargaHoraria ?? 60,
    },
  });
  return exigirCriado<{ id: string; codigo: string }>("disciplina", resposta);
}

export async function associarDisciplinaAoCurso(
  api: Api,
  cursoId: string,
  disciplinaId: string,
  opcoes: { periodoIdeal?: number } = {},
) {
  const resposta = await api.post("/curso-disciplina", {
    body: {
      cursoId,
      disciplinaId,
      periodoIdeal: opcoes.periodoIdeal ?? 1,
      obrigatoria: true,
    },
  });
  return exigirCriado<{ id: string }>("curso-disciplina", resposta);
}

export async function criarPeriodoLetivo(
  api: Api,
  runId: string,
  opcoes: { status?: string; ativo?: boolean; ano?: number; semestre?: number } = {},
) {
  // Janela ampla em torno de hoje para que datas de chamada caiam no período.
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setMonth(inicio.getMonth() - 4);
  const fim = new Date(hoje);
  fim.setMonth(fim.getMonth() + 4);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const semestre = opcoes.semestre ?? 1;

  // `ano` único garante (ano, semestre) distinto entre cenários paralelos; não
  // afeta a janela de datas (baseada em hoje) usada pela frequência. Em caso de
  // colisão rara entre workers, tenta novamente com outro `ano`.
  let ultima: { status: number; body: any } = { status: 0, body: null };
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const ano = opcoes.ano ?? ids.numeroUnico();
    ultima = await api.post("/periodos-letivos", {
      body: {
        codigo: ids.codigo("PL", `${runId}${tentativa === 0 ? "" : tentativa}`),
        ano,
        semestre,
        dataInicio: iso(inicio),
        dataFim: iso(fim),
        ativo: opcoes.ativo ?? true,
        // Frequência exige período "ativo"/"em_andamento" para lançamentos (§9.3).
        status: opcoes.status ?? "ativo",
      },
    });
    if (ultima.status === 201) break;
    const colisaoAnoSemestre = /ano e semestre/i.test(JSON.stringify(ultima.body ?? ""));
    if (!colisaoAnoSemestre || opcoes.ano !== undefined) break;
  }
  return exigirCriado<{ id: string; codigo: string; status: string }>("periodo-letivo", ultima);
}

export async function criarTurma(
  api: Api,
  runId: string,
  dados: { periodoLetivoId: string; cursoId: string; capacidadeAlunos?: number },
) {
  const resposta = await api.post("/turmas", {
    body: {
      periodoLetivoId: dados.periodoLetivoId,
      cursoId: dados.cursoId,
      periodoCurricular: 1,
      descricao: `Turma ${runId}`,
      sigla: ids.sigla(runId),
      capacidadeAlunos: dados.capacidadeAlunos ?? 30,
      turno: "NOITE",
    },
  });
  return exigirCriado<{ id: string; sigla: string }>("turma", resposta);
}

export async function criarTurmaDisciplina(
  api: Api,
  turmaId: string,
  dados: { cursoDisciplinaId: string; professorId: string },
) {
  const resposta = await api.post(`/turmas/${turmaId}/disciplinas`, {
    body: {
      cursoDisciplinaId: dados.cursoDisciplinaId,
      professorId: dados.professorId,
    },
  });
  return exigirCriado<{ id: string }>("turma-disciplina", resposta);
}

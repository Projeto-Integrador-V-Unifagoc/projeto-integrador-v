import {
  AlunoChamada,
  ConsolidadoFrequencia,
  HistoricoFrequenciaAluno,
  StatusFrequencia,
  TurmaFrequencia,
} from "../models/Frequencia";

const turmas: TurmaFrequencia[] = [
  {
    id: "turma-ads-2026-1",
    turmaDisciplinaId: "turma-ads-2026-1",
    turmaId: "turma-ads-2026-1",
    semestre: "2026/1",
    sigla: "ADS5",
    descricao: "ADS 5o Periodo",
    disciplina: { id: "disciplina-pi-v", codigo: "PI-V", nome: "Projeto Integrador V" },
    curso: { id: "curso-ads", nome: "Analise e Desenvolvimento de Sistemas" },
  },
  {
    id: "turma-ads-bd-2026-1",
    turmaDisciplinaId: "turma-ads-bd-2026-1",
    turmaId: "turma-ads-2026-1",
    semestre: "2026/1",
    sigla: "ADS5",
    descricao: "ADS 5o Periodo",
    disciplina: { id: "disciplina-bd-ii", codigo: "BD-II", nome: "Banco de Dados II" },
    curso: { id: "curso-ads", nome: "Analise e Desenvolvimento de Sistemas" },
  },
  {
    id: "turma-si-2026-1",
    turmaDisciplinaId: "turma-si-2026-1",
    turmaId: "turma-si-2026-1",
    semestre: "2026/1",
    sigla: "SI5",
    descricao: "SI 5o Periodo",
    disciplina: { id: "disciplina-eng-soft", codigo: "ENG-SOFT", nome: "Engenharia de Software" },
    curso: { id: "curso-si", nome: "Sistemas de Informacao" },
  },
];

const consolidadoMock: ConsolidadoFrequencia[] = [
  {
    alunoId: "aluno-001",
    alunoNome: "Ana Clara Souza",
    turmaDisciplinaId: "turma-ads-2026-1",
    disciplinaId: "disciplina-pi-v",
    disciplinaNome: "Projeto Integrador V",
    totalAulas: 20,
    presencas: 19,
    faltas: 1,
    percentual: 95,
    situacao: "REGULAR",
  },
  {
    alunoId: "aluno-002",
    alunoNome: "Bruno Henrique Lima",
    turmaDisciplinaId: "turma-ads-2026-1",
    disciplinaId: "disciplina-pi-v",
    disciplinaNome: "Projeto Integrador V",
    totalAulas: 20,
    presencas: 16,
    faltas: 4,
    percentual: 80,
    situacao: "ALERTA",
  },
  {
    alunoId: "aluno-003",
    alunoNome: "Camila Rocha Alves",
    turmaDisciplinaId: "turma-ads-bd-2026-1",
    disciplinaId: "disciplina-bd-ii",
    disciplinaNome: "Banco de Dados II",
    totalAulas: 18,
    presencas: 17,
    faltas: 1,
    percentual: 94.44,
    situacao: "REGULAR",
  },
  {
    alunoId: "aluno-004",
    alunoNome: "Diego Martins Costa",
    turmaDisciplinaId: "turma-si-2026-1",
    disciplinaId: "disciplina-eng-soft",
    disciplinaNome: "Engenharia de Software",
    totalAulas: 16,
    presencas: 11,
    faltas: 5,
    percentual: 68.75,
    situacao: "RISCO_REPROVACAO",
  },
];

const historicoMock: Record<string, HistoricoFrequenciaAluno[]> = {
  "aluno-001": [
    {
      id: "freq-001",
      aulaId: "aula-001",
      turmaDisciplinaId: "turma-ads-2026-1",
      disciplinaId: "disciplina-pi-v",
      disciplinaNome: "Projeto Integrador V",
      data: "2026-03-12",
      status: "PRESENTE",
    },
  ],
  "aluno-002": [
    {
      id: "freq-002",
      aulaId: "aula-001",
      turmaDisciplinaId: "turma-ads-2026-1",
      disciplinaId: "disciplina-pi-v",
      disciplinaNome: "Projeto Integrador V",
      data: "2026-03-12",
      status: "AUSENTE",
      justificativa: "Atestado entregue",
    },
  ],
};

export class FrequenciaService {
  async listarOpcoes() {
    return {
      contexto: { perfil: "PROFESSOR" },
      periodoLetivo: "2026/1",
      turmas,
    };
  }

  async obterChamada(turmaDisciplinaId: string, data: string) {
    const alunos: AlunoChamada[] = consolidadoMock
      .filter((item) => item.turmaDisciplinaId === turmaDisciplinaId)
      .map((item, index) => ({
        id: item.alunoId,
        matriculaTurmaDisciplinaId: `${item.alunoId}-${item.turmaDisciplinaId}`,
        matricula: 2026001 + index,
        nome: item.alunoNome,
        statusMatricula: "ativa",
        percentualAtual: item.percentual,
        frequenciaId: `freq-${item.alunoId}`,
        status: item.faltas > 0 ? "AUSENTE" : "PRESENTE",
        justificativa: "",
      }));

    return {
      turmaDisciplinaId,
      data,
      alunos,
      jaRegistrada: alunos.length > 0,
    };
  }

  async registrarFrequencia() {
    return {
      mensagem: "Frequencia registrada com sucesso!",
      registros: [],
      consolidados: consolidadoMock,
    };
  }

  async editarFrequencia(id: string, data: { status: StatusFrequencia }) {
    return {
      mensagem: "Frequencia atualizada com sucesso!",
      registro: { id, status: data.status },
    };
  }

  async removerFrequencia(id: string) {
    return {
      mensagem: "Frequencia removida com sucesso!",
      id,
    };
  }

  async consultarAluno(alunoId: string) {
    return {
      alunoId,
      consolidado: consolidadoMock.filter((item) => item.alunoId === alunoId),
      historico: historicoMock[alunoId] ?? [],
    };
  }

  async consultarTurma(turmaDisciplinaId: string) {
    const alunos = consolidadoMock.filter((item) => item.turmaDisciplinaId === turmaDisciplinaId);

    return {
      turmaDisciplinaId,
      alunos,
      alunosEmRisco: alunos.filter((item) => item.situacao === "RISCO_REPROVACAO"),
      alunosEmAlerta: alunos.filter((item) => item.situacao === "ALERTA"),
    };
  }

  async registrarJustificativa(id: string, justificativa: string) {
    return {
      mensagem: "Justificativa registrada com sucesso!",
      registro: { id, justificativa },
    };
  }

  async gerarRelatorio(filtros: { turmaDisciplinaId?: string; turmaId?: string }) {
    const turmaDisciplinaId = filtros.turmaDisciplinaId || filtros.turmaId;
    const alunos = turmaDisciplinaId
      ? consolidadoMock.filter((item) => item.turmaDisciplinaId === turmaDisciplinaId)
      : consolidadoMock;
    const turma = turmas.find((item) => item.turmaDisciplinaId === turmaDisciplinaId);

    return {
      filtros: {
        turmaDisciplinaId: turmaDisciplinaId ?? null,
        disciplinaId: turma?.disciplina.id ?? null,
        disciplinaNome: turma?.disciplina.nome ?? null,
        dataInicio: null,
        dataFim: null,
      },
      turmaDisciplinaId,
      alunos,
      alunosEmRisco: alunos.filter((item) => item.situacao === "RISCO_REPROVACAO"),
      alunosEmAlerta: alunos.filter((item) => item.situacao === "ALERTA"),
    };
  }
}

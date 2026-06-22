import { describe, expect, it } from "vitest";

import type { MatriculaDetalhada } from "../../models/matricula-model";
import type {
  FrequenciaAluno,
  NotaFicha,
} from "../../services/ficha-api";
import {
  getNotaPorNome,
  montarNotasFicha,
  normalizarSemestre,
} from "./notasFicha.utils";

function criarNota(overrides: Partial<NotaFicha> = {}): NotaFicha {
  return {
    id: "nota-1",
    alunoId: "aluno-1",
    alunoNome: "Aluno Teste",
    turmaId: "turma-1",
    turmaNome: "Turma A",
    disciplinaId: "disc-1",
    disciplinaNome: "Calculo I",
    professorId: "prof-1",
    professorNome: "Professor Teste",
    periodoLetivo: "2026/1",
    avaliacoes: [],
    media: 0,
    situacao: "",
    ...overrides,
  };
}

function criarMatricula(
  overrides: Partial<MatriculaDetalhada> = {},
): MatriculaDetalhada {
  return {
    id: "matricula-1",
    aluno_id: "aluno-1",
    turma_id: "turma-1",
    turma_disciplina_id: "td-1",
    matricula_turma_disciplina_id: "mtd-1",
    status: "ativa",
    aluno_nome: "Aluno Teste",
    aluno_matricula: 1,
    disciplina_nome: "Calculo I",
    periodo_letivo: "2026/1",
    curso_nome: "Curso Teste",
    professor_nome: "Professor Teste",
    ...overrides,
  };
}

function criarFrequencia(
  overrides: Partial<FrequenciaAluno["consolidado"][number]> = {},
): FrequenciaAluno {
  return {
    alunoId: "aluno-1",
    consolidado: [
      {
        alunoId: "aluno-1",
        alunoNome: "Aluno Teste",
        turmaDisciplinaId: "td-1",
        disciplinaId: "disc-1",
        disciplinaNome: "Calculo I",
        totalAulas: 20,
        presencas: 16,
        faltas: 4,
        naoLancadas: 0,
        percentual: 80,
        situacao: "REGULAR",
        ...overrides,
      },
    ],
  };
}

describe("normalizarSemestre", () => {
  it("converte separador de barra para hifen", () => {
    expect(normalizarSemestre("2026/1")).toBe("2026-1");
  });

  it("retorna string vazia para valores nulos ou indefinidos", () => {
    expect(normalizarSemestre(null)).toBe("");
    expect(normalizarSemestre(undefined)).toBe("");
  });
});

describe("getNotaPorNome", () => {
  it("encontra a avaliacao por nome parcial, sem diferenciar maiusculas/minusculas", () => {
    const nota = criarNota({
      avaliacoes: [
        {
          id: "a1",
          nome: "PROVA INOVA - parte 1",
          nota: 7,
          peso: 1,
          matricula_turma_disciplina_id: null,
        },
      ],
    });

    expect(getNotaPorNome(nota, "inova")).toBe(7);
  });

  it("retorna 0 quando nenhuma avaliacao corresponde ao nome", () => {
    const nota = criarNota({ avaliacoes: [] });
    expect(getNotaPorNome(nota, "final")).toBe(0);
  });
});

describe("montarNotasFicha", () => {
  it("combina nota da API com a frequencia da mesma disciplina, calculando faltas e percentual", () => {
    const notas = [
      criarNota({
        disciplinaNome: "Calculo I",
        media: 8,
        avaliacoes: [
          {
            id: "a1",
            nome: "Prova Final - 1a chamada",
            nota: 8,
            peso: 1,
            matricula_turma_disciplina_id: "mtd-1",
          },
        ],
      }),
    ];

    const resultado = montarNotasFicha(notas, criarFrequencia(), []);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      disciplina: "Calculo I",
      mediaFinal: 8,
      provaFinal: 8,
      faltas: 4,
      percentualFaltas: 20,
    });
  });

  it("zera faltas e percentual quando a disciplina nao tem frequencia correspondente", () => {
    const notas = [criarNota({ disciplinaNome: "Estrutura de Dados" })];

    const resultado = montarNotasFicha(notas, undefined, []);

    expect(resultado[0].faltas).toBe(0);
    expect(resultado[0].percentualFaltas).toBe(0);
  });

  it("inclui disciplina que so tem frequencia (sem nota lancada) com notas zeradas", () => {
    const frequencia = criarFrequencia({
      disciplinaNome: "Banco de Dados",
      totalAulas: 10,
      faltas: 2,
    });

    const resultado = montarNotasFicha([], frequencia, []);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      disciplina: "Banco de Dados",
      mediaFinal: 0,
      faltas: 2,
      percentualFaltas: 20,
    });
  });

  it("inclui disciplina que so tem matricula (sem nota e sem frequencia) zerada", () => {
    const matriculas = [
      criarMatricula({
        disciplina_nome: "Programacao Web",
        matricula_turma_disciplina_id: "mtd-2",
      }),
    ];

    const resultado = montarNotasFicha([], undefined, matriculas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      disciplina: "Programacao Web",
      mediaFinal: 0,
      faltas: 0,
      matriculaTurmaDisciplinaId: "mtd-2",
    });
  });

  it("nao duplica a disciplina quando ela aparece em notas, frequencia e matricula ao mesmo tempo", () => {
    const notas = [criarNota({ disciplinaNome: "Calculo I" })];
    const frequencia = criarFrequencia({ disciplinaNome: "Calculo I" });
    const matriculas = [criarMatricula({ disciplina_nome: "Calculo I" })];

    const resultado = montarNotasFicha(notas, frequencia, matriculas);

    expect(resultado).toHaveLength(1);
  });

  it("associa matriculaTurmaDisciplinaId quando a nota corresponde a uma matricula pelo nome da disciplina", () => {
    const notas = [criarNota({ disciplinaNome: "Calculo I" })];
    const matriculas = [
      criarMatricula({
        disciplina_nome: "Calculo I",
        matricula_turma_disciplina_id: "mtd-9",
      }),
    ];

    const resultado = montarNotasFicha(notas, undefined, matriculas);

    expect(resultado[0].matriculaTurmaDisciplinaId).toBe("mtd-9");
  });

  it("filtra notas de outro semestre, mas mantem as que nao tem semestre definido", () => {
    const notas = [
      criarNota({ disciplinaNome: "Calculo I", periodoLetivo: "2026/1" }),
      criarNota({ disciplinaNome: "Fisica I", periodoLetivo: "2025/2" }),
    ];
    const matriculas = [
      criarMatricula({ disciplina_nome: "Programacao Web" }),
    ];

    const resultado = montarNotasFicha(notas, undefined, matriculas, "2026-1");

    const disciplinas = resultado.map((nota) => nota.disciplina);
    expect(disciplinas).toContain("Calculo I");
    expect(disciplinas).toContain("Programacao Web");
    expect(disciplinas).not.toContain("Fisica I");
  });
});

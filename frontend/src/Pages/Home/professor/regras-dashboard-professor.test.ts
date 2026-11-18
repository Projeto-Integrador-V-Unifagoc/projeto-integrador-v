import { describe, expect, it } from "vitest";
import type { AlunoProfessor, AtribuicaoProfessor, AvaliacaoPeriodoProfessor, NivelAtencaoProfessor } from "../../../models/home-professor-model";
import {
  calcularAproveitamento,
  filtrarPorSelecao,
  gerarCsvAlunos,
  listarAlunosEmAtencao,
  listarPendencias,
  nivelVisual,
  opcoesFiltro,
  resumoIndicadores,
  TODAS,
} from "./regras-dashboard-professor";

const HOJE = new Date(2026, 10, 15);

function aluno(id: string, nome: string, media: number | null, frequencia: number | null, nivel: NivelAtencaoProfessor): AlunoProfessor {
  return { id, matricula: Number(id.replace(/\D/g, "") || 1), nome, media, frequencia, nivel, motivo: `motivo ${nome}` };
}

function oferta(id: string, turma: [string, string], disciplina: [string, string], alunos: AlunoProfessor[]): AtribuicaoProfessor {
  return {
    id,
    turma: { id: turma[0], sigla: turma[1], descricao: turma[1], turno: "NOITE" },
    curso: { id: "c", nome: "ADS" },
    disciplina: { id: disciplina[0], codigo: disciplina[0].toUpperCase(), nome: disciplina[1], areaConhecimento: null, ementa: null, cargaHoraria: 60 },
    totalAlunos: alunos.length, alunosComNota: 0, alunosComFrequencia: 0, mediaTurma: null, frequenciaMedia: null, alunosEmAtencao: 0, totalAvaliacoes: 0, lancamentosPendentes: 0, notasFaltantes: 0,
    alunos,
  };
}

function avaliacao(id: string, turmaDisciplinaId: string, extra: Partial<AvaliacaoPeriodoProfessor>): AvaliacaoPeriodoProfessor {
  return { id, turmaDisciplinaId, titulo: id, tipo: "PROVA", valor: 20, dataDevolucao: null, notasLancadas: 0, notasEsperadas: 0, mediaPercentual: null, vencida: false, ...extra };
}

// a1 está nas duas ofertas da turma T1 (aluno único conta uma vez).
const ofertas = [
  oferta("o1", ["t1", "ADS2A"], ["d1", "POO"], [aluno("a1", "Bruna", 45, 90, "ATENCAO"), aluno("a2", "Caio", 80, 70, "CRITICO"), aluno("a3", "Davi", 85, 95, "REGULAR")]),
  oferta("o2", ["t1", "ADS2A"], ["d2", "Eng. Software"], [aluno("a1", "Bruna", 70, 78, "ATENCAO"), aluno("a4", "Eva", null, null, "SEM_DADOS")]),
  oferta("o3", ["t2", "ADS3A"], ["d1", "POO"], [aluno("a5", "Fábio", 55, 85, "ATENCAO")]),
];

describe("mapeamento de risco", () => {
  it("usa os rótulos de risco do aluno para os níveis do backend", () => {
    expect([nivelVisual("CRITICO"), nivelVisual("ATENCAO"), nivelVisual("REGULAR"), nivelVisual("SEM_DADOS")]).toEqual(["alto", "medio", "sem-risco", "sem-dados"]);
  });
});

describe("filtros", () => {
  it("lista turmas e disciplinas sem repetição", () => {
    const { turmas, disciplinas } = opcoesFiltro(ofertas);
    expect(turmas.map((item) => item.rotulo)).toEqual(["ADS2A", "ADS3A"]);
    expect(disciplinas.map((item) => item.rotulo)).toEqual(["Eng. Software", "POO"]);
  });

  it("filtra ofertas, avaliações e chamadas por turma e por disciplina", () => {
    const dados = {
      atribuicoes: ofertas,
      avaliacoes: [avaliacao("p1", "o1", {}), avaliacao("p2", "o3", {})],
      chamadas: [{ aulaId: "au1", turmaDisciplinaId: "o2", data: "2026-11-10", registrados: 1, esperados: 2 }],
    };
    const porTurma = filtrarPorSelecao(dados, { turmaId: "t1", disciplinaId: TODAS });
    expect(porTurma.atribuicoes.map((item) => item.id)).toEqual(["o1", "o2"]);
    expect(porTurma.avaliacoes.map((item) => item.id)).toEqual(["p1"]);
    expect(porTurma.chamadas).toHaveLength(1);

    const porDisciplina = filtrarPorSelecao(dados, { turmaId: TODAS, disciplinaId: "d1" });
    expect(porDisciplina.atribuicoes.map((item) => item.id)).toEqual(["o1", "o3"]);
    expect(porDisciplina.chamadas).toHaveLength(0);
  });
});

describe("resumoIndicadores", () => {
  it("conta alunos distintos, alunos em atenção e notas faltantes vencidas", () => {
    const resumo = resumoIndicadores(ofertas, [
      avaliacao("p1", "o1", { vencida: true, notasLancadas: 1, notasEsperadas: 3 }),
      avaliacao("p2", "o1", { vencida: false, notasLancadas: 0, notasEsperadas: 3 }),
    ]);
    expect(resumo).toMatchObject({
      turmas: 2,
      disciplinas: 2,
      ofertas: 3,
      alunosUnicos: 5,
      alunosEmAtencao: 3,
      alunosCriticos: 1,
      percentualAtencao: 60,
      possuiCritico: true,
      avaliacoesComNotasFaltantes: 1,
      notasFaltantes: 2,
    });
  });
});

describe("listarAlunosEmAtencao", () => {
  it("lista pares aluno + oferta: risco alto, depois médio pela menor média", () => {
    expect(listarAlunosEmAtencao(ofertas).map((item) => `${item.nome}/${item.disciplinaNome}`)).toEqual([
      "Caio/POO",
      "Bruna/POO",
      "Fábio/POO",
      "Bruna/Eng. Software",
    ]);
  });
});

describe("calcularAproveitamento", () => {
  it("usa a média por aluno, o rendimento ≥ 60% e a média ponderada por tipo", () => {
    const resultado = calcularAproveitamento(ofertas, [
      avaliacao("p1", "o1", { tipo: "PROVA", mediaPercentual: 80, notasLancadas: 3 }),
      avaliacao("p2", "o1", { tipo: "PROVA", mediaPercentual: 60, notasLancadas: 1 }),
      avaliacao("t1", "o1", { tipo: "TRABALHO", mediaPercentual: 90, notasLancadas: 2 }),
      avaliacao("t2", "o1", { tipo: "TPI", mediaPercentual: null, notasLancadas: 0 }),
    ]);
    // Bruna = média(45, 70) = 57,5; Caio 80; Davi 85; Fábio 55 → média 69,4.
    expect(resultado.mediaGeral).toBe(69.4);
    expect(resultado.escala10).toBe(6.9);
    expect(resultado).toMatchObject({ alunosComNota: 4, alunosAcimaReferencia: 2, percentualAcimaReferencia: 50 });
    expect(resultado.porTipo).toEqual([
      { tipo: "PROVA", rotulo: "Provas", media: 75 },
      { tipo: "TRABALHO", rotulo: "Trabalhos", media: 90 },
    ]);
    expect(resultado.frequenciaAgregada).toBe(83.6);
  });
});

describe("listarPendencias", () => {
  it("mostra só pendências reais na ordem: notas vencidas, chamadas e notas próximas", () => {
    const pendencias = listarPendencias(
      [
        avaliacao("vencida", "o1", { vencida: true, notasLancadas: 1, notasEsperadas: 3, dataDevolucao: "2026-11-12" }),
        avaliacao("em-3-dias", "o1", { notasLancadas: 0, notasEsperadas: 3, dataDevolucao: "2026-11-18" }),
        avaliacao("em-10-dias", "o1", { notasLancadas: 0, notasEsperadas: 3, dataDevolucao: "2026-11-25" }),
        avaliacao("completa", "o1", { vencida: false, notasLancadas: 3, notasEsperadas: 3, dataDevolucao: "2026-11-12" }),
      ],
      [
        { aulaId: "nova", turmaDisciplinaId: "o2", data: "2026-11-13", registrados: 1, esperados: 2 },
        { aulaId: "antiga", turmaDisciplinaId: "o2", data: "2026-11-11", registrados: 0, esperados: 2 },
        { aulaId: "completa", turmaDisciplinaId: "o2", data: "2026-11-12", registrados: 2, esperados: 2 },
      ],
      ofertas,
      HOJE,
    );
    expect(pendencias.map((item) => item.id)).toEqual(["notas-vencida", "chamada-antiga", "chamada-nova", "notas-em-3-dias"]);
    expect(pendencias[1]).toMatchObject({ tipo: "chamada", feitos: 0, esperados: 2, faltantes: 2, disciplinaNome: "Eng. Software", turmaSigla: "ADS2A" });
  });
});

describe("gerarCsvAlunos", () => {
  it("gera uma linha por aluno e oferta, com vírgula decimal e aspas quando preciso", () => {
    const csv = gerarCsvAlunos([oferta("o9", ["t9", "ADS9A"], ["d9", "Lógica; avançada"], [aluno("a9", "Ana \"Bia\"", 72.5, null, "REGULAR")])]);
    expect(csv.split("\n")).toEqual([
      "Aluno;Matrícula;Disciplina;Turma;Média (%);Frequência (%);Risco;Motivo",
      "\"Ana \"\"Bia\"\"\";9;\"Lógica; avançada\";ADS9A;72,5;;Sem risco;\"motivo Ana \"\"Bia\"\"\"",
    ]);
  });
});

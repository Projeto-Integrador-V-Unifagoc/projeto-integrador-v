import { describe, expect, it } from "vitest";
import type { MinhaFrequenciaAluno } from "../../../models/frequencia-model";
import type { DisciplinaAluno } from "../../../models/home-aluno-model";
import type { BoletimAluno, DisciplinaBoletim } from "../../../models/nota-model";
import {
  classificarRiscoDisciplina,
  faltasRestantes,
  gerarPontosAtencao,
  listarAvaliacoesPainel,
  montarDisciplinasAluno,
  resumoAtencao,
  resumoDevolucoes,
  resumoFrequencia,
  resumoMedia,
  resumoNiveis,
  resumirNomes,
} from "./regras-dashboard-aluno";

describe("textos curtos", () => {
  it("resume listas longas de nomes", () => {
    expect(resumirNomes(["A"])).toBe("A");
    expect(resumirNomes(["A", "B"])).toBe("A, B");
    expect(resumirNomes(["A", "B", "C", "D"])).toBe("A, B +2");
    expect(resumirNomes([])).toBe("");
  });

  it("conta os níveis de risco em atenção", () => {
    const base = { turmaDisciplinaId: "x", codigo: "X", nome: "X", professorNome: "P", media: 50, frequencia: 70, presencas: 0, faltas: 0, aulasRegistradas: 0, motivos: [] };
    expect(resumoNiveis([{ ...base, nivel: "alto" }, { ...base, nivel: "medio" }, { ...base, nivel: "medio" }])).toBe("1 alto · 2 médio");
    expect(resumoNiveis([{ ...base, nivel: "medio" }])).toBe("1 médio");
  });
});

const HOJE = new Date(2026, 10, 15);

function disciplina(id: string, nome: string): DisciplinaAluno {
  return { turmaDisciplinaId: id, disciplinaId: `d-${id}`, codigo: id.toUpperCase(), nome, turmaSigla: "A", professorNome: "Prof", cargaHoraria: 60, periodoLetivo: { id: "pl", codigo: "2026.1" } };
}

function boletimDisciplina(id: string, media: number | null, avaliacoes: DisciplinaBoletim["avaliacoes"] = []): DisciplinaBoletim {
  return {
    turmaDisciplinaId: id, disciplina: { id: `d-${id}`, codigo: id, nome: id }, disciplinaNome: `Disciplina ${id}`, turmaSigla: "A", professorNome: "Prof",
    periodoLetivo: { id: "pl", codigo: "2026.1" }, avaliacoes,
    pontosObtidos: 0, pontosMaximos: 0, mediaParcial: media, notaRecuperacao: null, mediaFinal: null,
    situacao: media === null ? "NAO_LANCADA" : "EM_ANDAMENTO", etapaRegularCompleta: false, elegivelRecuperacao: false, alerta: media !== null && media < 60,
  };
}

function frequencia(itens: Array<[string, number, number]>): MinhaFrequenciaAluno {
  return {
    alunoId: "a", possuiAlerta: false, historico: [],
    consolidado: itens.map(([id, presencas, faltas]) => ({ alunoId: "a", alunoNome: "Ana", turmaDisciplinaId: id, disciplinaId: `d-${id}`, disciplinaNome: id, totalAulas: presencas + faltas, presencas, faltas, naoLancadas: 0, percentual: null, situacao: "REGULAR" })),
  };
}

describe("classificarRiscoDisciplina", () => {
  // Mesma regra do backend do professor: freq < 75 = alto; média < 60 ou freq ≤ 80 = médio.
  it.each([
    [80, 75, "medio"],
    [80, 74.9, "alto"],
    [80, 79.9, "medio"],
    [80, 80, "medio"],
    [80, 80.1, "sem-risco"],
    [60, 90, "sem-risco"],
    [59.9, 90, "medio"],
    [30, 90, "medio"],
    [null, null, "sem-dados"],
    [null, 92, "sem-risco"],
  ] as const)("média %s e frequência %s → %s", (media, freq, esperado) => {
    expect(classificarRiscoDisciplina(media, freq).nivel).toBe(esperado);
  });

  it("o risco mais grave define o nível e mantém os dois motivos", () => {
    const r = classificarRiscoDisciplina(55, 70);
    expect(r.nivel).toBe("alto");
    expect(r.motivos).toHaveLength(2);
  });
});

describe("montarDisciplinasAluno e resumos", () => {
  const disciplinas = [disciplina("a", "Banco de Dados"), disciplina("b", "Algoritmos"), disciplina("c", "Cálculo"), disciplina("d", "Redes")];
  const boletim: BoletimAluno = { alunoId: "a", possuiAlerta: true, disciplinas: [boletimDisciplina("a", 90), boletimDisciplina("b", 62), boletimDisciplina("c", 45)] };
  const freq = frequencia([["a", 24, 1], ["b", 19, 6], ["c", 17, 8]]);
  const lista = montarDisciplinasAluno(disciplinas, boletim, freq);

  it("calcula a frequência por presenças ÷ (presenças + faltas) e ordena por risco", () => {
    expect(lista.map((item) => [item.nome, item.nivel])).toEqual([
      ["Cálculo", "alto"],
      ["Algoritmos", "medio"],
      ["Redes", "sem-dados"],
      ["Banco de Dados", "sem-risco"],
    ]);
    expect(lista.find((item) => item.nome === "Algoritmos")?.frequencia).toBe(76);
  });

  it("resume média, frequência e atenção", () => {
    expect(resumoMedia(lista)).toEqual({ media: 65.7, disciplinasComNota: 3, escala10: 6.6 });
    expect(resumoFrequencia(lista)).toMatchObject({ presencas: 60, faltas: 15, percentual: 80, situacao: "ok", diferencaMinimo: 5 });
    const atencao = resumoAtencao(lista);
    expect(atencao.emAtencao).toHaveLength(2);
    expect(atencao.piorNivel).toBe("alto");
  });

  it("situação da frequência geral segue os limites 75 e 80", () => {
    const base = (presencas: number, faltas: number) => resumoFrequencia(montarDisciplinasAluno([disciplinas[0]], null, frequencia([["a", presencas, faltas]]))).situacao;
    expect(base(80, 20)).toBe("ok");
    expect(base(79, 21)).toBe("atencao");
    expect(base(75, 25)).toBe("atencao");
    expect(base(74, 26)).toBe("abaixo");
    expect(resumoFrequencia([]).situacao).toBe("sem-dados");
  });
});

describe("avaliações e devoluções", () => {
  const avaliacao = (id: string, lancada: boolean, dataDevolucao: string | null) => ({ id, tipo: "PROVA" as const, descricao: id, valorMaximo: 20, valorObtido: lancada ? 15 : null, lancada, dataDevolucao });
  const boletim: BoletimAluno = {
    alunoId: "a", possuiAlerta: false,
    disciplinas: [boletimDisciplina("x", 75, [
      avaliacao("lancada-antiga", true, "2026-10-01"),
      avaliacao("lancada-recente", true, "2026-11-11"),
      avaliacao("vencida", false, "2026-11-08"),
      avaliacao("em-3-dias", false, "2026-11-18"),
      avaliacao("em-15-dias", false, "2026-11-30"),
      avaliacao("em-16-dias", false, "2026-12-01"),
      avaliacao("hoje", false, "2026-11-15"),
    ])],
  };
  const lista = listarAvaliacoesPainel(boletim, HOJE);

  it("ordena: vencidas sem nota, próximas devoluções e lançadas mais recentes", () => {
    expect(lista.map((item) => item.id)).toEqual(["vencida", "hoje", "em-3-dias", "em-15-dias", "em-16-dias", "lancada-recente", "lancada-antiga"]);
    expect(lista[0].devolucaoVencida).toBe(true);
  });

  it("conta devoluções de hoje até 15 dias e as vencidas sem nota", () => {
    const resumo = resumoDevolucoes(lista);
    expect(resumo.proximas.map((item) => item.id)).toEqual(["hoje", "em-3-dias", "em-15-dias"]);
    expect(resumo.vencidas.map((item) => item.id)).toEqual(["vencida"]);
    expect(resumo).toMatchObject({ total: 7, lancadas: 2, pendentes: 5 });
  });

  it("avaliação lançada nunca é considerada vencida", () => {
    expect(lista.find((item) => item.id === "lancada-antiga")?.devolucaoVencida).toBe(false);
  });
});

describe("gerarPontosAtencao", () => {
  it("gera os pontos pelas regras e ordena por gravidade", () => {
    const disciplinas = montarDisciplinasAluno(
      [disciplina("a", "Matemática"), disciplina("b", "Fundamentos"), disciplina("c", "Comunicação"), disciplina("d", "Lógica")],
      { alunoId: "a", possuiAlerta: true, disciplinas: [boletimDisciplina("a", 52), boletimDisciplina("b", 62), boletimDisciplina("c", 56), boletimDisciplina("d", 88)] },
      frequencia([["a", 17, 8], ["b", 19, 6], ["c", 21, 4], ["d", 24, 1]]),
    );
    const avaliacoes = listarAvaliacoesPainel({
      alunoId: "a", possuiAlerta: false,
      disciplinas: [boletimDisciplina("a", 52, [
        { id: "p2", tipo: "PROVA", descricao: "Prova 2", valorMaximo: 20, valorObtido: null, lancada: false, dataDevolucao: "2026-11-08" },
        { id: "tpi", tipo: "TPI", descricao: "TPI", valorMaximo: 5, valorObtido: null, lancada: false, dataDevolucao: "2026-11-20" },
        { id: "p3", tipo: "PROVA", descricao: "Prova 3", valorMaximo: 20, valorObtido: null, lancada: false, dataDevolucao: "2026-12-10" },
      ])],
    }, HOJE);

    const pontos = gerarPontosAtencao(disciplinas, avaliacoes);
    // Gravidade primeiro; empate segue a ordem das disciplinas (risco e depois nome).
    // Média 62% (b) não gera ponto: não existe faixa de observação na regra original.
    expect(pontos.map((item) => item.id)).toEqual([
      "freq-baixa-a",
      "media-baixa-a",
      "media-baixa-c",
      "freq-limite-b",
      "devolucao-vencida-p2",
      "prazo-tpi",
    ]);
    expect(pontos.find((item) => item.id === "media-baixa-a")?.gravidade).toBe("media");
    expect(pontos.find((item) => item.id === "freq-limite-b")?.selo).toBe("76% (mín. 75%)");
    expect(pontos.some((item) => item.turmaDisciplinaId === "d")).toBe(false);
  });

  it("média abaixo de 40% é ponto grave e frequência de 80% é limítrofe", () => {
    const disciplinas = montarDisciplinasAluno([disciplina("a", "Cálculo")], { alunoId: "a", possuiAlerta: true, disciplinas: [boletimDisciplina("a", 35)] }, frequencia([["a", 20, 5]]));
    const pontos = gerarPontosAtencao(disciplinas, []);
    expect(pontos.map((item) => [item.id, item.gravidade])).toEqual([["media-baixa-a", "alta"], ["freq-limite-a", "media"]]);
  });

  it("não gera pontos para quem está dentro das metas", () => {
    const disciplinas = montarDisciplinasAluno([disciplina("a", "Lógica")], { alunoId: "a", possuiAlerta: false, disciplinas: [boletimDisciplina("a", 88)] }, frequencia([["a", 24, 1]]));
    expect(gerarPontosAtencao(disciplinas, [])).toEqual([]);
  });

  it("calcula as faltas que ainda cabem sem cair abaixo de 75%", () => {
    expect(faltasRestantes(25, 6)).toBe(0);
    expect(faltasRestantes(25, 4)).toBe(2);
    expect(faltasRestantes(40, 2)).toBe(8);
  });
});

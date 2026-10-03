import { ThemeProvider } from "@mui/material";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FichaAluno from "../../Pages/Alunos/FichaAluno";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";
import type { FichaAlunoResponse } from "../../services/ficha-api";
import { theme } from "../../theme";
import { FichaAlunoNotasTabela } from "./FichaAlunoNotasTabela";
import type { NotaAluno } from "./types";

const api = vi.hoisted(() => ({ buscarFicha: vi.fn() }));
vi.mock("../../services/ficha-api", () => ({ fichaApi: { buscarFicha: api.buscarFicha } }));

const ALUNO = "11111111-1111-1111-1111-111111111111";
const OFERTA_A = "22222222-2222-2222-2222-222222222222";
const OFERTA_B = "33333333-3333-3333-3333-333333333333";
const VINCULO_A = "44444444-4444-4444-4444-444444444444";
const VINCULO_B = "55555555-5555-5555-5555-555555555555";
const AVALIACAO_A = "66666666-6666-6666-6666-666666666666";
const AVALIACAO_B = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function resultado(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777", totalPontos: "120.00", cortePontos: "72.00",
    planoCompleto: true, avaliacoesRegulares: 6, avaliacoesLancadas: 6, avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "72.00", pontosMaximosLancados: "120.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "120.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "120.00", pontosEfetivos: "72.00", percentualResultado: 60,
    resultadoPorNota: "SUFICIENTE", elegivelRecuperacaoPorNota: false,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["FREQUENCIA_PENDENTE"], ...overrides,
  };
}

function linha(overrides: Partial<NotaAluno> = {}): NotaAluno {
  return { disciplina: "Cálculo I", turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
    avaliacoes: [], resultadoAcademico: resultado(), ...overrides };
}

function tabela(notas: NotaAluno[]) {
  return render(<ThemeProvider theme={theme}><FichaAlunoNotasTabela notas={notas} semestre="2026-1" /></ThemeProvider>);
}

function ficha(): FichaAlunoResponse {
  return {
    aluno: { id: ALUNO, matricula: "2026001", periodo: 1,
      pessoa: { nome: "Aluno Teste", cpf: "00000000000", dataNascimento: "2000-01-01" } },
    matriculas: [], documentos: [],
    periodos: [{ id: "dddddddd-dddd-dddd-dddd-dddddddddddd", codigo: "2026/1", ano: 2026, semestre: 1,
      data_inicio: "2026-01-01", data_fim: "2026-12-31", ativo: true, status: "ativo" }],
    notas: [{ id: OFERTA_A, alunoId: ALUNO, alunoNome: "Aluno Teste", turmaId: null, turmaNome: "Turma A",
      disciplinaId: "99999999-9999-9999-9999-999999999999", disciplinaNome: "Cálculo I",
      professorId: null, professorNome: "Professor Teste", periodoLetivo: "2026/1",
      turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
      media: 60, situacao: "APROVADO", avaliacoes: [], resultadoAcademico: resultado() }],
  };
}

function pagina() {
  return render(<ThemeProvider theme={theme}><MemoryRouter initialEntries={[`/alunos/${ALUNO}/ficha`]}>
    <Routes><Route path="/alunos/:id/ficha" element={<FichaAluno />} /></Routes>
  </MemoryRouter></ThemeProvider>);
}

beforeEach(() => { api.buscarFicha.mockReset(); });
afterEach(cleanup);

describe("FichaAlunoNotasTabela - tabela ativa", () => {
  it("mantém o vazio do semestre sem criar tabela ou nota", () => {
    tabela([]);
    expect(screen.getByText("Nenhuma nota ou falta encontrada para o semestre selecionado.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("mostra pontos, corte e classificação conjunta sem confundir nota suficiente com aprovação", () => {
    tabela([linha()]);
    const row = screen.getByRole("row", { name: /Cálculo I/ });
    expect(within(row).getByLabelText("Pontos regulares")).toHaveTextContent("72,00");
    expect(within(row).getByLabelText("Corte")).toHaveTextContent("72,00");
    expect(within(row).getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(within(row).getByLabelText("Frequência")).toHaveTextContent("Não lançada");
    expect(within(row).getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(screen.getByText("1 disciplinas no semestre 2026-1")).toBeInTheDocument();
  });

  it("explica faltas insuficientes mesmo quando os pontos atendem ao corte", () => {
    tabela([linha({ resultadoAcademico: resultado({ frequencia: { presencas: 10, faltas: 10, percentual: 50,
      situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" }, aprovacaoDisciplina: "NAO_APROVADA", motivos: ["FREQUENCIA_INSUFICIENTE"] }) })]);
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("50,00%");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Não aprovada");
    expect(screen.getByText("Frequência insuficiente")).toBeInTheDocument();
  });

  it("mostra indicador parcial de 100% como em andamento e aprovação pendente", () => {
    tabela([linha({ resultadoAcademico: resultado({ planoCompleto: false, etapaRegularCompleta: false, avaliacoesRegulares: 2, avaliacoesLancadas: 1,
      avaliacoesSemNota: [AVALIACAO_B], pontosRegularesObtidos: "12.00", pontosMaximosLancados: "12.00",
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "12.00" }, pontosEfetivos: null,
      percentualResultado: null, resultadoPorNota: "EM_ANDAMENTO", motivos: ["PLANO_INCOMPLETO", "NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] }) })]);
    expect(screen.getByLabelText("Indicador regular")).toHaveTextContent("100,00%");
    expect(screen.getByLabelText("Indicador regular")).toHaveTextContent("Parcial");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em andamento");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
  });

  it("preserva melhor REC após retificação regular e não soma as etapas", () => {
    tabela([linha({ resultadoAcademico: resultado({ pontosRegularesObtidos: "70.00", pontosRecuperacao: "80.00", pontosEfetivos: "80.00",
      indicadorRegular: { percentual: 58.33, parcial: false, denominadorPontos: "120.00" }, percentualResultado: 66.67,
      elegivelRecuperacaoPorNota: true, frequencia: { presencas: 19, faltas: 1, percentual: 95, situacao: "REGULAR", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "APROVADA", motivos: [] }) })]);
    expect(screen.getByLabelText("Pontos regulares")).toHaveTextContent("70,00");
    expect(screen.getByLabelText("Recuperação")).toHaveTextContent("80,00");
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("80,00");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Aprovada");
  });

  it("distingue avaliações livres com nome repetido por UUID e zero de ausência, sem colunas de provas fixas", () => {
    tabela([linha({ resultadoAcademico: resultado({ planoCompleto: false, etapaRegularCompleta: false, avaliacoesRegulares: 2,
      avaliacoesLancadas: 1, avaliacoesSemNota: [AVALIACAO_B], pontosRegularesObtidos: "0.00", pontosMaximosLancados: "42.00",
      indicadorRegular: { percentual: 0, parcial: true, denominadorPontos: "42.00" }, pontosEfetivos: null, percentualResultado: null,
      resultadoPorNota: "EM_ANDAMENTO", motivos: ["PLANO_INCOMPLETO", "NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] }), avaliacoes: [
      { id: AVALIACAO_A, nome: "Projeto livre", nota: "0.00", peso: "42.00", matricula_turma_disciplina_id: VINCULO_A },
      { id: AVALIACAO_B, nome: "Projeto livre", nota: null, peso: "18.00", matricula_turma_disciplina_id: VINCULO_A },
    ] })]);
    expect(screen.getAllByRole("columnheader", { name: "Projeto livre" })).toHaveLength(2);
    const row = screen.getByRole("row", { name: /Cálculo I/ });
    expect(within(row).getByRole("cell", { name: "0,00" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "-" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Prova Final" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Prova Inova" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Conhecimentos Gerais" })).not.toBeInTheDocument();
  });

  it("não troca resultados de duas ofertas homônimas e conserva as duas linhas", () => {
    const b = resultado({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B,
      pontosRegularesObtidos: "84.00", pontosEfetivos: "84.00", percentualResultado: 70,
      indicadorRegular: { percentual: 70, parcial: false, denominadorPontos: "120.00" } });
    tabela([linha(), linha({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B, resultadoAcademico: b })]);
    const rows = screen.getAllByRole("row", { name: /Cálculo I/ });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByLabelText("Pontos efetivos")).toHaveTextContent("72,00");
    expect(within(rows[1]).getByLabelText("Pontos efetivos")).toHaveTextContent("84,00");
  });

  it("não fabrica resultado para uma matrícula ainda sem DTO acadêmico", () => {
    tabela([linha({ resultadoAcademico: null })]);
    expect(screen.getByText("Resultado acadêmico indisponível")).toBeInTheDocument();
    expect(screen.queryByLabelText("Aprovação na disciplina")).not.toBeInTheDocument();
  });
});

describe("FichaAluno - integração da transformação com a tabela realmente montada", () => {
  it("identifica o seletor institucional da ficha por um nome acessível", async () => {
    api.buscarFicha.mockResolvedValue(ficha());
    pagina();
    expect(await screen.findByRole("combobox", { name: "Período letivo" })).toHaveTextContent("2026-1");
  });

  it("carrega o contexto por params e apresenta o nested canônico sem usar APROVADO do envelope como aprovação", async () => {
    api.buscarFicha.mockResolvedValue(ficha());
    pagina();
    expect(screen.getByText("Carregando ficha do aluno...")).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: /Cálculo I/ });
    expect(api.buscarFicha).toHaveBeenCalledWith(ALUNO);
    expect(within(row).getByLabelText("Corte")).toHaveTextContent("72,00");
    expect(within(row).getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(within(row).getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
  });

  it("respeita 403 da seção autorizada e não mostra metadados ou notas de fallback", async () => {
    api.buscarFicha.mockRejectedValue({ response: { status: 403, data: { mensagem: "Você não possui acesso à ficha deste aluno." } } });
    pagina();
    expect(await screen.findByRole("alert")).toHaveTextContent("Você não possui acesso à ficha deste aluno.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Aluno Teste")).not.toBeInTheDocument();
  });
});

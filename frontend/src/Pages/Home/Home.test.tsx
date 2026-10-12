import { ThemeProvider } from "@mui/material";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";
import { theme } from "../../theme";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";

const api = vi.hoisted(() => ({ disciplinas: vi.fn(), tarefas: vi.fn(), frequencia: vi.fn(), boletim: vi.fn(), resumo: vi.fn(), me: vi.fn() }));
vi.mock("../../services/home-aluno-api", () => ({ homeAlunoApi: { minhasDisciplinas: api.disciplinas, minhasTarefas: api.tarefas } }));
vi.mock("../../services/frequencia-api", () => ({ frequenciaApi: { minhaFrequencia: api.frequencia } }));
vi.mock("../../services/nota-api", () => ({ notaApi: { meuBoletim: api.boletim, meuResumo: api.resumo } }));
vi.mock("../../services/auth-services", () => ({ authService: { getMe: api.me } }));

const OFERTA = "22222222-2222-2222-2222-222222222222";
function resultado(): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA, matriculaTurmaDisciplinaId: "44444444-4444-4444-4444-444444444444",
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777", totalPontos: "300.00", cortePontos: "180.00",
    planoCompleto: true, avaliacoesRegulares: 6, avaliacoesLancadas: 6, avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "179.99", pontosMaximosLancados: "300.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "300.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "300.00", pontosEfetivos: "179.99", percentualResultado: 60,
    resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE", "FREQUENCIA_PENDENTE"],
  };
}
function mostrar() { render(<ThemeProvider theme={theme}><MemoryRouter><Home /></MemoryRouter></ThemeProvider>); }

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("@UniEduca:user", JSON.stringify({ nome: "Aluno Teste", tipo_usuario: "aluno" }));
  api.me.mockResolvedValue({ data: { academico: { matricula: "2026001", curso: "Computação", periodo: 1 } } });
  api.disciplinas.mockResolvedValue([{ turmaDisciplinaId: OFERTA, disciplinaId: "99999999-9999-9999-9999-999999999999",
    codigo: "CAL", nome: "Cálculo I", turmaSigla: "T-A", professorNome: "Docente", cargaHoraria: 60,
    periodoLetivo: { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", codigo: "2026-1" } }]);
  api.tarefas.mockResolvedValue([]);
  api.frequencia.mockResolvedValue({ possuiAlerta: false, consolidado: [] });
  api.boletim.mockResolvedValue({ alunoId: "11111111-1111-1111-1111-111111111111", possuiAlerta: true,
    disciplinas: [{ turmaDisciplinaId: OFERTA, mediaParcial: 60, resultadoAcademico: resultado() }] });
  api.resumo.mockResolvedValue({ totalDisciplinas: 1, disciplinasAbaixoDoCorte: 1, disciplinasAbaixoDe60: 1, possuiAlerta: true,
    disciplinasAlerta: [{ turmaDisciplinaId: OFERTA, resultadoAcademico: resultado() }] });
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe("Home - estados acadêmicos do servidor", () => {
  it("usa resumo para alertas e nested por UUID para mostrar 179,99 abaixo do corte apesar do indicador 60%", async () => {
    mostrar();
    expect(await screen.findByLabelText("Pontos efetivos")).toHaveTextContent("179,99");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("180,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em recuperação");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(api.resumo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/média parcial abaixo de 60%/i)).not.toBeInTheDocument();
  });

  it("respeita ausência de alerta do resumo sem decidir pelo percentual legado", async () => {
    const suficiente: ResultadoAcademico = { ...resultado(), pontosRegularesObtidos: "180.00", pontosEfetivos: "180.00", resultadoPorNota: "SUFICIENTE",
      elegivelRecuperacaoPorNota: false, frequencia: { presencas: 19, faltas: 1, percentual: 95, situacao: "REGULAR", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "APROVADA", motivos: [] };
    api.boletim.mockResolvedValue({ disciplinas: [{ turmaDisciplinaId: OFERTA, mediaParcial: 5, resultadoAcademico: suficiente }], possuiAlerta: true });
    api.resumo.mockResolvedValue({ totalDisciplinas: 1, disciplinasAbaixoDoCorte: 0, disciplinasAbaixoDe60: 0, possuiAlerta: false, disciplinasAlerta: [] });
    mostrar();
    expect(await screen.findByLabelText("Aprovação na disciplina")).toHaveTextContent("Aprovada");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra falha da leitura de resumo sem converter a indisponibilidade em ausência de alertas", async () => {
    api.resumo.mockRejectedValue(new Error("Indisponível"));
    mostrar();
    expect(await screen.findByText("Não foi possível atualizar todos os alertas acadêmicos.")).toBeInTheDocument();
  });
});

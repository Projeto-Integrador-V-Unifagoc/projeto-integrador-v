import { createTheme, ThemeProvider } from "@mui/material";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DisciplinaBoletim } from "../../models/nota-model";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";
import { theme } from "../../theme";
import MinhasNotas from "./MinhasNotas";

const api = vi.hoisted(() => ({ meuBoletim: vi.fn(), obterRecuperacao: vi.fn() }));
vi.mock("../../hooks/use-nota", () => ({ useNota: () => api }));
const temaTeste = createTheme(theme, { components: { MuiDataGrid: { defaultProps: { disableVirtualization: true } } } });
const OFERTA = "22222222-2222-2222-2222-222222222222";
const PERIODO_A = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PERIODO_B = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
function resultado(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA, matriculaTurmaDisciplinaId: "44444444-4444-4444-4444-444444444444",
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777", totalPontos: "120.00", cortePontos: "72.00",
    planoCompleto: true, avaliacoesRegulares: 2, avaliacoesLancadas: 2, avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "72.00", pontosMaximosLancados: "120.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "120.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "120.00", pontosEfetivos: "72.00", percentualResultado: 60,
    resultadoPorNota: "SUFICIENTE", elegivelRecuperacaoPorNota: false,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["FREQUENCIA_PENDENTE"], ...overrides,
  };
}
function disciplina(r = resultado()): DisciplinaBoletim {
  return {
    turmaDisciplinaId: r.turmaDisciplinaId, matriculaTurmaDisciplinaId: r.matriculaTurmaDisciplinaId,
    disciplina: { id: "99999999-9999-9999-9999-999999999999", codigo: "CAL", nome: "Cálculo I" },
    disciplinaNome: "Cálculo I", turmaSigla: "T-A", professorNome: "Docente", periodoLetivo: { id: PERIODO_A, codigo: "2026-1" },
    pontosObtidos: r.pontosRegularesObtidos, pontosMaximos: r.pontosMaximosLancados, mediaParcial: r.indicadorRegular.percentual,
    notaRecuperacao: r.pontosRecuperacao, mediaFinal: r.percentualResultado, situacao: "APROVADO",
    etapaRegularCompleta: r.etapaRegularCompleta, elegivelRecuperacao: r.elegivelRecuperacaoPorNota,
    alerta: r.motivos.length > 0, resultadoAcademico: r,
    avaliacoes: [
      { id: "66666666-6666-6666-6666-666666666666", tipo: "REGULAR", descricao: "Entrega A", valorMaximo: "102.00", valorObtido: "60.00", lancada: true },
      { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", tipo: "REGULAR", descricao: "Entrega B", valorMaximo: "18.00", valorObtido: "12.00", lancada: true },
    ],
  };
}
function mostrar() { render(<ThemeProvider theme={temaTeste}><MinhasNotas /></ThemeProvider>); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 800));
  api.meuBoletim.mockResolvedValue({ alunoId: "11111111-1111-1111-1111-111111111111", possuiAlerta: true, disciplinas: [disciplina()] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Minhas Notas - resultado recebido sem decisão local", () => {
  it("mostra 72/120 suficiente e frequência ausente com aprovação pendente, sem consultar GET recuperação", async () => {
    mostrar();
    expect(await screen.findByLabelText("Corte")).toHaveTextContent("72,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("Não lançada");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(api.obterRecuperacao).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Aprovado$/)).not.toBeInTheDocument();
  });

  it("preserva zero lançado e ausência na tabela real e não aprova uma etapa parcial", async () => {
    const d = disciplina(resultado({ avaliacoesLancadas: 1, avaliacoesSemNota: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
      etapaRegularCompleta: false, pontosRegularesObtidos: "0.00", pontosMaximosLancados: "102.00",
      indicadorRegular: { percentual: 0, parcial: true, denominadorPontos: "102.00" }, pontosEfetivos: null,
      percentualResultado: null, resultadoPorNota: "EM_ANDAMENTO", motivos: ["NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] }));
    d.avaliacoes[0].valorObtido = "0.00";
    d.avaliacoes[1] = { ...d.avaliacoes[1], valorObtido: null, lancada: false };
    api.meuBoletim.mockResolvedValue({ disciplinas: [d], possuiAlerta: true });
    mostrar();
    const a = await screen.findByRole("row", { name: /Entrega A/ });
    const b = screen.getByRole("row", { name: /Entrega B/ });
    expect(within(a).getByText("0,00")).toBeInTheDocument();
    expect(within(b).getByText("Não lançada")).toBeInTheDocument();
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em andamento");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
  });

  it("filtra ofertas homônimas pelo UUID institucional de período selecionado", async () => {
    const a = disciplina();
    const b = { ...disciplina(resultado({ turmaDisciplinaId: "33333333-3333-3333-3333-333333333333",
      matriculaTurmaDisciplinaId: "55555555-5555-5555-5555-555555555555", pontosRegularesObtidos: "84.00", pontosEfetivos: "84.00",
      indicadorRegular: { percentual: 70, parcial: false, denominadorPontos: "120.00" }, percentualResultado: 70 })),
      turmaSigla: "T-B", periodoLetivo: { id: PERIODO_B, codigo: "2025-2" } };
    api.meuBoletim.mockResolvedValue({ disciplinas: [a, b], possuiAlerta: true });
    mostrar();
    const seletor = await screen.findByRole("combobox", { name: "Período letivo" });
    await userEvent.setup().click(seletor);
    const opcao = screen.getByRole("option", { name: "2025-2" });
    expect(opcao).toHaveAttribute("data-value", PERIODO_B);
    await userEvent.setup().click(opcao);
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("84,00");
    expect(screen.queryByText(/T-A ·/)).not.toBeInTheDocument();
    expect(api.meuBoletim).toHaveBeenCalledTimes(1);
  });
});

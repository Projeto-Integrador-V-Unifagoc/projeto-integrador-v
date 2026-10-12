import { createTheme, ThemeProvider } from "@mui/material";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RelatorioItem } from "../../models/relatorio-model";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";
import { theme } from "../../theme";
import Relatorios from "./Relatorios";

const api = vi.hoisted(() => ({ listarRelatorios: vi.fn() }));
vi.mock("../../hooks/use-relatorio", () => ({ useRelatorio: () => ({ carregando: false, listarRelatorios: api.listarRelatorios }) }));
const temaTeste = createTheme(theme, { components: { MuiDataGrid: { defaultProps: { disableVirtualization: true } } } });
const OFERTA_A = "22222222-2222-2222-2222-222222222222";
const OFERTA_B = "33333333-3333-3333-3333-333333333333";

function resultado(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: "44444444-4444-4444-4444-444444444444",
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
function relatorio(): RelatorioItem {
  const a = resultado();
  const b = resultado({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: "55555555-5555-5555-5555-555555555555",
    frequencia: { presencas: 10, faltas: 10, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" },
    aprovacaoDisciplina: "NAO_APROVADA", motivos: ["FREQUENCIA_INSUFICIENTE"] });
  return { id: 1, nome: "Resultado do semestre", descricao: "Consulta autorizada", tipo: "Notas", ano: "2026",
    perfis: ["Secretaria"], curso: "Computação", matrizCurricular: "Matriz vigente",
    periodos: [{ id: "dddddddd-dddd-dddd-dddd-dddddddddddd", nome: "2026-1", disciplinas: [
      { turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: a.matriculaTurmaDisciplinaId,
        nome: "Cálculo I", aluno: "Ana", cargaHoraria: "60", nota: "72.00", situacao: "Pendente", resultadoAcademico: a },
      { turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: b.matriculaTurmaDisciplinaId,
        nome: "Cálculo I", aluno: "Bruno", cargaHoraria: "60", nota: "72.00", situacao: "Reprovado", resultadoAcademico: b },
    ] }], pdf: { titulo: "Resultado do semestre", universidade: "UniEduca", rodape: "Documento acadêmico",
      colunas: ["Pontos", "Total", "Corte"], larguras: [100, 100, 100], linhas: [{ Pontos: "72.00", Total: "120.00", Corte: "72.00" }] } };
}
function mostrar() { render(<ThemeProvider theme={temaTeste}><Relatorios /></ThemeProvider>); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 800));
  localStorage.setItem("@UniEduca:user", JSON.stringify({ tipo_usuario: "secretaria" }));
  api.listarRelatorios.mockResolvedValue([relatorio()]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("Relatórios - resultado por aluno/oferta", () => {
  it("preserva ofertas homônimas com classificação conjunta e pontos do nested separados por aluno", async () => {
    mostrar();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Consultar resultados de Resultado do semestre" }));
    const ana = await screen.findByRole("region", { name: "Ana - Cálculo I - 2026-1" });
    const bruno = screen.getByRole("region", { name: "Bruno - Cálculo I - 2026-1" });
    expect(within(ana).getByLabelText("Pontos efetivos")).toHaveTextContent("72,00");
    expect(within(ana).getByLabelText("Corte")).toHaveTextContent("72,00");
    expect(within(ana).getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(within(ana).getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(within(bruno).getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(within(bruno).getByLabelText("Aprovação na disciplina")).toHaveTextContent("Não aprovada");
    expect(within(bruno).getByText("Frequência insuficiente")).toBeInTheDocument();
  });

  it("não repete o resumo da mesma matrícula quando o relatório de notas traz duas avaliações", async () => {
    const r = relatorio();
    r.periodos[0].disciplinas.push({ ...r.periodos[0].disciplinas[0], avaliacao: "Outra entrega" });
    api.listarRelatorios.mockResolvedValue([r]);
    mostrar();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Consultar resultados de Resultado do semestre" }));
    expect(await screen.findAllByRole("region", { name: "Ana - Cálculo I - 2026-1" })).toHaveLength(1);
    expect(screen.getAllByRole("region", { name: "Bruno - Cálculo I - 2026-1" })).toHaveLength(1);
  });

  it("mantém os detalhes fechados em uma lista com dois relatórios e renderiza somente o selecionado", async () => {
    const outro = { ...relatorio(), id: 2, nome: "Outro relatório", periodos: [{ ...relatorio().periodos[0], nome: "2025-2" }] };
    api.listarRelatorios.mockResolvedValue([relatorio(), outro]);
    mostrar();
    await screen.findByRole("row", { name: /Resultado do semestre/ });
    expect(screen.queryByLabelText("Pontos efetivos")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Consultar resultados de Outro relatório" }));
    const dialogo = screen.getByRole("dialog", { name: "Resultados - Outro relatório" });
    expect(within(dialogo).getByRole("region", { name: "Ana - Cálculo I - 2025-2" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ana - Cálculo I - 2026-1" })).not.toBeInTheDocument();
  });

  it("abre a consulta por Enter e devolve foco à ação da tabela após Escape", async () => {
    mostrar();
    const acao = await screen.findByRole("button", { name: "Consultar resultados de Resultado do semestre" });
    acao.focus();
    await userEvent.setup().keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Resultados - Resultado do semestre" })).toBeInTheDocument();
    await userEvent.setup().keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(acao).toHaveFocus();
  });
});

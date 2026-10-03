import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider } from "../../components/Notificacao/NotificationProvider";
import { theme } from "../../theme";
import LancamentoNotas from "./LancamentoNotas";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";

// Boundary de useNota; DataGrid, editor MUI e notificações permanecem reais.
const api = vi.hoisted(() => ({
  carregando: false, listarOpcoes: vi.fn(), obterLancamento: vi.fn(), salvarLote: vi.fn(),
  obterRendimento: vi.fn(), obterRecuperacao: vi.fn(), criarAutorizacao: vi.fn(),
}));
vi.mock("../../hooks/use-nota", () => ({ useNota: () => api }));

const OFERTA = "10000000-0000-4000-8000-000000000001";
const AVALIACAO = "40000000-0000-4000-8000-000000000001";
const ANA = "80000000-0000-4000-8000-000000000001";
const BRUNO = "80000000-0000-4000-8000-000000000002";
const temaTeste = createTheme(theme, { components: { MuiDataGrid: { defaultProps: { disableVirtualization: true } } } });
interface AlunoDTO {
  alunoId: string; matriculaTurmaDisciplinaId: string; matricula: number; nome: string;
  valor: string | null; lancada: boolean; publicadaEm: string | null; prazoExpirado: boolean;
}
interface LancamentoDTO {
  avaliacao: { id: string; tipo: string; descricao: string; valorMaximo: string; disciplina: { id: string; nome: string }; turmaSigla: string };
  periodoLetivo: { codigo: string; status: string; fechado: boolean };
  podeEditar: boolean; matriculasIrregulares: number; alunos: AlunoDTO[];
}
function grade(alteracoes: Partial<LancamentoDTO> = {}): LancamentoDTO {
  return {
    avaliacao: { id: AVALIACAO, tipo: "REGULAR", descricao: "Quarto módulo", valorMaximo: "24.00", disciplina: { id: "70000000-0000-4000-8000-000000000001", nome: "Algoritmos" }, turmaSigla: "ENG-1" },
    periodoLetivo: { codigo: "2026.2", status: "ativo", fechado: false }, podeEditar: true, matriculasIrregulares: 0,
    alunos: [
      { alunoId: ANA, matriculaTurmaDisciplinaId: "90000000-0000-4000-8000-000000000001", matricula: 1, nome: "Ana Sintética", valor: null, lancada: false, publicadaEm: null, prazoExpirado: false },
      { alunoId: BRUNO, matriculaTurmaDisciplinaId: "90000000-0000-4000-8000-000000000002", matricula: 2, nome: "Bruno Sintético", valor: null, lancada: false, publicadaEm: null, prazoExpirado: false },
    ], ...alteracoes,
  };
}
function opcoes(fechado = false, maximo = "24.00") {
  return { contexto: { perfil: "professor" }, atribuicoes: [{
    turmaDisciplinaId: OFERTA, turma: { id: "60000000-0000-4000-8000-000000000001", sigla: "ENG-1", descricao: "Turma sintética" },
    disciplina: { id: "70000000-0000-4000-8000-000000000001", codigo: "ALG", nome: "Algoritmos" },
    periodoLetivo: { id: "20000000-0000-4000-8000-000000000001", codigo: "2026.2", status: fechado ? "encerrado" : "ativo", fechado }, professorNome: "Docente sintético",
    avaliacoes: [{ id: AVALIACAO, tipo: "REGULAR", descricao: "Quarto módulo", valor: maximo }],
  }] };
}
function erroRest(status: number, codigo: string, mensagem: string, campos: object[] = []) {
  return { isAxiosError: true, response: { status, data: { codigo, mensagem, campos } } };
}
function renderizar() {
  return render(<ThemeProvider theme={temaTeste}><MemoryRouter><NotificationProvider><LancamentoNotas /></NotificationProvider></MemoryRouter></ThemeProvider>);
}
async function pronta() {
  renderizar();
  await screen.findByRole("row", { name: /Ana Sintética/ });
}
function celulaNota(nome: string) {
  const coluna = screen.getByRole("columnheader", { name: /^nota$/i }).getAttribute("aria-colindex");
  const linha = screen.getByRole("row", { name: new RegExp(nome) });
  const celula = within(linha).getAllByRole("gridcell").find((c) => c.getAttribute("aria-colindex") === coluna);
  if (!celula) throw new Error(`A coluna Nota não foi encontrada para ${nome}.`);
  return celula;
}
async function editar(nome: string, valor: string, confirmar = true) {
  const user = userEvent.setup();
  await user.dblClick(celulaNota(nome));
  const entrada = await screen.findByRole("textbox", { name: `Nota de ${nome}` });
  await user.clear(entrada);
  if (valor !== "") await user.type(entrada, valor);
  if (confirmar) await user.keyboard("{Enter}");
  return entrada;
}
async function salvar() {
  await userEvent.setup().click(screen.getByRole("button", { name: /^salvar lote$/i }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 800));
  api.carregando = false;
  localStorage.setItem("@UniEduca:user", JSON.stringify({ tipo_usuario: "professor" }));
  vi.stubGlobal("confirm", vi.fn(() => true));
  api.listarOpcoes.mockResolvedValue(opcoes());
  api.obterLancamento.mockResolvedValue(grade());
  api.salvarLote.mockImplementation(async (_id: string, itens: { alunoId: string; valor: string }[]) => grade({
    alunos: grade().alunos.map((a) => {
      const item = itens.find((i) => i.alunoId === a.alunoId);
      return item ? { ...a, valor: item.valor, lancada: true, publicadaEm: "2026-10-10T10:00:00.000Z" } : a;
    }),
  }));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function resultadoAcademico(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA, matriculaTurmaDisciplinaId: grade().alunos[0].matriculaTurmaDisciplinaId,
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777", totalPontos: "300.00", cortePontos: "180.00",
    planoCompleto: true, avaliacoesRegulares: 1, avaliacoesLancadas: 1, avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "179.99", pontosMaximosLancados: "300.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "300.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "300.00", pontosEfetivos: "179.99", percentualResultado: 60,
    resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE", "FREQUENCIA_PENDENTE"], ...overrides,
  };
}

describe("Rendimento e recuperação - consulta explícita do resultado canônico", () => {
  it("navega pelas três abas com setas e Enter, consultando recuperação só após ativação explícita", async () => {
    api.obterRendimento.mockResolvedValue({ turmaDisciplinaId: OFERTA, avaliacoes: [], alunos: [] });
    api.obterRecuperacao.mockResolvedValue({ turmaDisciplinaId: OFERTA, recuperacaoAvaliacaoId: null,
      valorMaximoRecuperacao: "24.00", periodoLetivo: { codigo: "2026.2", fechado: false }, alunos: [] });
    await pronta();
    const user = userEvent.setup();
    const abas = within(screen.getByRole("tablist", { name: "Visões de notas da turma" }));
    const lancamento = abas.getByRole("tab", { name: /^Lançamento$/ });
    const rendimento = abas.getByRole("tab", { name: /^Rendimento$/ });
    const recuperacao = abas.getByRole("tab", { name: /^Recuperação$/ });
    await act(async () => { lancamento.focus(); });
    await user.keyboard("{ArrowRight}");
    expect(rendimento).toHaveFocus();
    expect(lancamento).toHaveAttribute("aria-selected", "true");
    expect(api.obterRendimento).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(rendimento).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /^Rendimento$/ })).toBeVisible();
    await waitFor(() => expect(api.obterRendimento).toHaveBeenCalledWith(OFERTA));
    await user.keyboard("{ArrowRight}");
    expect(recuperacao).toHaveFocus();
    expect(api.obterRecuperacao).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(recuperacao).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /^Recuperação$/ })).toBeVisible();
    await waitFor(() => expect(api.obterRecuperacao).toHaveBeenCalledWith(OFERTA));
    await user.keyboard("{ArrowRight}{Enter}");
    expect(lancamento).toHaveFocus();
    expect(lancamento).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /^Lançamento$/ })).toBeVisible();
  });

  it("recarrega o resultado após salvar recuperação sem pedir descarte do lote já salvo", async () => {
    const inicial = { turmaDisciplinaId: OFERTA, recuperacaoAvaliacaoId: AVALIACAO, valorMaximoRecuperacao: "300.00",
      periodoLetivo: { codigo: "2026.2", fechado: false }, alunos: [{ ...grade().alunos[0], notaRecuperacao: null, resultadoAcademico: resultadoAcademico() }] };
    api.obterRecuperacao.mockResolvedValueOnce(inicial).mockResolvedValue({ ...inicial,
      alunos: [{ ...inicial.alunos[0], notaRecuperacao: "200.00", resultadoAcademico: resultadoAcademico({
        pontosRecuperacao: "200.00", pontosEfetivos: "200.00", resultadoPorNota: "SUFICIENTE", percentualResultado: 66.67,
      }) }] });
    vi.stubGlobal("confirm", vi.fn(() => false));
    await pronta();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Recuperação" }));
    const linha = await screen.findByRole("row", { name: /Ana Sintética/ });
    const indice = screen.getByRole("columnheader", { name: "Recuperação" }).getAttribute("aria-colindex");
    await user.dblClick(within(linha).getAllByRole("gridcell").find(c => c.getAttribute("aria-colindex") === indice)!);
    await user.type(await screen.findByRole("textbox", { name: "Nota de Ana Sintética" }), "200");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Salvar recuperação" }));
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: "200.00" }]));
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(api.obterRecuperacao).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("200,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
  });

  for (const aba of ["Rendimento", "Recuperação"] as const) it(`ignora resposta tardia de ${aba} da oferta anterior depois de carregar o destino`, async () => {
    const destino = "10000000-0000-4000-8000-000000000002";
    const lista = opcoes();
    lista.atribuicoes.push({ ...lista.atribuicoes[0], turmaDisciplinaId: destino,
      turma: { ...lista.atribuicoes[0].turma, sigla: "ENG-2" } });
    api.listarOpcoes.mockResolvedValue(lista);
    const consulta = aba === "Rendimento" ? api.obterRendimento : api.obterRecuperacao;
    let concluir!: (resposta: object) => void;
    consulta.mockImplementation((oferta: string) => oferta === OFERTA
      ? new Promise<object>(resolve => { concluir = resolve; })
      : Promise.resolve({ turmaDisciplinaId: destino, avaliacoes: [], alunos: [], recuperacaoAvaliacaoId: null,
        valorMaximoRecuperacao: null, periodoLetivo: { codigo: "2026.2", fechado: false } }));
    await pronta();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: aba }));
    await waitFor(() => expect(consulta).toHaveBeenCalledWith(OFERTA));
    await user.click(screen.getByRole("combobox", { name: "Turma e disciplina" }));
    await user.click(screen.getByRole("option", { name: "ENG-2 — Algoritmos — 2026.2" }));
    await waitFor(() => expect(consulta).toHaveBeenCalledWith(destino));
    await act(async () => { concluir({ turmaDisciplinaId: OFERTA, avaliacoes: [],
      recuperacaoAvaliacaoId: AVALIACAO, valorMaximoRecuperacao: "300.00", periodoLetivo: { codigo: "2026.2", fechado: false },
      alunos: [{ ...grade().alunos[0], resultadoAcademico: resultadoAcademico(), notas: [] }] }); });
    expect(screen.getByRole("combobox", { name: "Turma e disciplina" })).toHaveTextContent("ENG-2");
    expect(screen.queryByRole("row", { name: /Ana Sintética/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Corte")).not.toBeInTheDocument();
    if (aba === "Recuperação") expect(screen.getByRole("button", { name: "Salvar recuperação" })).toBeDisabled();
  });

  for (const aba of ["Rendimento", "Recuperação"] as const) it(`troca a oferta e remove dados de ${aba} anteriores mesmo quando a nova consulta falha`, async () => {
    const destino = "10000000-0000-4000-8000-000000000002";
    const lista = opcoes();
    lista.atribuicoes.push({ ...lista.atribuicoes[0], turmaDisciplinaId: destino,
      turma: { ...lista.atribuicoes[0].turma, sigla: "ENG-2" } });
    api.listarOpcoes.mockResolvedValue(lista);
    const aluno = { ...grade().alunos[0], resultadoAcademico: resultadoAcademico(), notas: [], notaRecuperacao: null };
    api.obterRendimento.mockImplementation((oferta: string) => oferta === OFERTA
      ? Promise.resolve({ turmaDisciplinaId: OFERTA, avaliacoes: [], alunos: [aluno] })
      : Promise.reject(erroRest(503, "INDISPONIVEL", "Nova oferta indisponível.")));
    api.obterRecuperacao.mockImplementation((oferta: string) => oferta === OFERTA
      ? Promise.resolve({ turmaDisciplinaId: OFERTA, recuperacaoAvaliacaoId: AVALIACAO, valorMaximoRecuperacao: "300.00",
        periodoLetivo: { codigo: "2026.2", fechado: false }, alunos: [aluno] })
      : Promise.reject(erroRest(503, "INDISPONIVEL", "Nova oferta indisponível.")));
    await pronta();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: aba }));
    expect(await screen.findByLabelText("Corte")).toHaveTextContent("180,00");
    if (aba === "Recuperação") {
      const linha = screen.getByRole("row", { name: /Ana Sintética/ });
      const indice = screen.getByRole("columnheader", { name: "Recuperação" }).getAttribute("aria-colindex");
      const celula = within(linha).getAllByRole("gridcell").find(c => c.getAttribute("aria-colindex") === indice)!;
      await user.dblClick(celula);
      await user.type(await screen.findByRole("textbox", { name: "Nota de Ana Sintética" }), "80");
      await user.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: "Salvar recuperação" })).toBeEnabled();
    }
    await user.click(screen.getByRole("combobox", { name: "Turma e disciplina" }));
    await user.click(screen.getByRole("option", { name: "ENG-2 — Algoritmos — 2026.2" }));
    expect(await screen.findByText("Nova oferta indisponível.")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Turma e disciplina" })).toHaveTextContent("ENG-2");
    expect(screen.queryByRole("row", { name: /Ana Sintética/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Corte")).not.toBeInTheDocument();
    if (aba === "Recuperação") {
      expect(screen.getByText(/Máximo da recuperação: - pontos/)).toBeInTheDocument();
      const salvarRec = screen.getByRole("button", { name: "Salvar recuperação" });
      expect(salvarRec).toBeDisabled();
      fireEvent.click(salvarRec);
      expect(api.salvarLote).not.toHaveBeenCalled();
    }
  });

  it("não antecipa GET recuperação e mostra corte em pontos no rendimento sem decidir pelos 60% arredondados", async () => {
    api.obterRendimento.mockResolvedValue({ turmaDisciplinaId: OFERTA, avaliacoes: [], alunos: [{
      ...grade().alunos[0], resultadoAcademico: resultadoAcademico(), notas: [],
    }] });
    await pronta();
    expect(api.obterRecuperacao).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Rendimento" }));
    expect(await screen.findByLabelText("Pontos efetivos")).toHaveTextContent("179,99");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("180,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em recuperação");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(api.obterRecuperacao).not.toHaveBeenCalled();
  });

  it("consulta recuperação somente pela aba e preserva zero textual, máximo e frequência do servidor", async () => {
    const r = resultadoAcademico({ pontosRecuperacao: "0.00", resultadoPorNota: "INSUFICIENTE", aprovacaoDisciplina: "NAO_APROVADA",
      frequencia: { presencas: 10, faltas: 10, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" },
      motivos: ["ABAIXO_DO_CORTE", "FREQUENCIA_INSUFICIENTE"] });
    api.obterRecuperacao.mockResolvedValue({ turmaDisciplinaId: OFERTA, recuperacaoAvaliacaoId: AVALIACAO,
      valorMaximoRecuperacao: "300.00", periodoLetivo: { codigo: "2026.2", fechado: false },
      alunos: [{ ...grade().alunos[0], resultadoAcademico: r, notaRecuperacao: "0.00" }] });
    await pronta();
    expect(api.obterRecuperacao).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Recuperação" }));
    const linha = await screen.findByRole("row", { name: /Ana Sintética/ });
    expect(within(linha).getByLabelText("Recuperação")).toHaveTextContent("0,00 / 300,00");
    expect(screen.getByText(/Máximo da recuperação: 300,00 pontos/)).toBeInTheDocument();
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("50,00%");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Não aprovada");
    expect(api.obterRecuperacao).toHaveBeenCalledTimes(1);
  });
});

describe("Lançamento - pontos textuais e lote atômico", () => {
  it("mantém contexto, abas e DataTable reais com máximo da avaliação 24", async () => {
    await pronta();
    expect(screen.getByRole("heading", { name: "Lançamento de Notas" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Lançamento" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Rendimento" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Recuperação" })).toBeVisible();
    expect(screen.getByText(/máximo 24,00 pontos/)).toBeVisible();
    expect(api.obterLancamento).toHaveBeenCalledWith(AVALIACAO);
  });

  it("distingue zero lançado de nota ausente sem transformar null em zero", async () => {
    const inicial = grade();
    inicial.alunos[0] = { ...inicial.alunos[0], valor: "0.00", lancada: true, publicadaEm: "2026-10-10T10:00:00.000Z" };
    api.obterLancamento.mockResolvedValue(inicial);
    await pronta();
    expect(celulaNota("Ana Sintética")).toHaveTextContent("0,00");
    expect(celulaNota("Ana Sintética")).not.toHaveTextContent("Não lançada");
    expect(celulaNota("Bruno Sintético")).toHaveTextContent("Não lançada");
  });

  it("editor textual pt-BR permite 24 e envia string sem máximo 20 global", async () => {
    await pronta();
    await editar("Ana Sintética", "24,00");
    await salvar();
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledTimes(1));
    expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: "24.00" }]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/notas salvas com sucesso/i);
    expect(celulaNota("Bruno Sintético")).toHaveTextContent("Não lançada");
  });

  it("envia zero como nota válida e omite aluno ainda ausente", async () => {
    await pronta();
    await editar("Ana Sintética", "0");
    await salvar();
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: "0.00" }]));
    expect(celulaNota("Ana Sintética")).toHaveTextContent("0,00");
    expect(celulaNota("Bruno Sintético")).toHaveTextContent("Não lançada");
  });

  it("nota nova vazia continua ausente e não é enviada como null", async () => {
    await pronta();
    await editar("Ana Sintética", "");
    const botao = screen.getByRole("button", { name: /^salvar lote$/i });
    fireEvent.click(botao);
    expect(api.salvarLote).not.toHaveBeenCalled();
    expect(celulaNota("Ana Sintética")).toHaveTextContent("Não lançada");
  });

  it("Escape cancela a edição da célula e não conserva um valor invisível no lote", async () => {
    await pronta();
    await editar("Ana Sintética", "18,50", false);
    await userEvent.setup().keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Nota de Ana Sintética" })).not.toBeInTheDocument());
    expect(celulaNota("Ana Sintética")).toHaveTextContent("Não lançada");
    expect(screen.getByRole("button", { name: /^salvar lote$/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^salvar lote$/i }));
    expect(api.salvarLote).not.toHaveBeenCalled();
  });

  it("salva a célula ativa sem confirmar Enter e mantém o texto exato no request", async () => {
    await pronta();
    await editar("Ana Sintética", "18,50", false);
    await salvar();
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: "18.50" }]));
    expect(api.salvarLote).toHaveBeenCalledTimes(1);
  });

  it("não permite apagar uma nota publicada por texto vazio", async () => {
    const inicial = grade();
    inicial.alunos[0] = { ...inicial.alunos[0], valor: "0.00", lancada: true, publicadaEm: "2026-10-10T10:00:00.000Z" };
    api.obterLancamento.mockResolvedValue(inicial);
    await pronta();
    const entrada = await editar("Ana Sintética", "");
    expect(entrada).toHaveAttribute("aria-invalid", "true");
    expect(entrada).toHaveAccessibleDescription(/não pode ser apagada/i);
    expect(entrada).toHaveFocus();
    expect(api.salvarLote).not.toHaveBeenCalled();
  });

  it.each([" ", "-1", "+1", "1e1", "01", "1.234,50", "18,501", "18.501", "18,5,0", "24,01"])(
    "identifica nota inválida %j por aluno antes de enviar", async (valor) => {
      await pronta();
      const entrada = await editar("Ana Sintética", valor);
      await waitFor(() => expect(entrada).toHaveAttribute("aria-invalid", "true"));
      expect(entrada).toHaveAccessibleDescription(/valor|ponto|decimal|precisão|máximo|24,00|nota/i);
      expect(entrada).toHaveFocus();
      expect(entrada).toHaveValue(valor);
      fireEvent.click(screen.getByRole("button", { name: /^salvar lote$/i }));
      expect(api.salvarLote).not.toHaveBeenCalled();
    },
  );

  it("mantém todos os centésimos de uma nota acima do inteiro seguro", async () => {
    const grande = "9007199254740993.01";
    api.listarOpcoes.mockResolvedValue(opcoes(false, grande));
    api.obterLancamento.mockResolvedValue(grade({ avaliacao: { ...grade().avaliacao, valorMaximo: grande } }));
    await pronta();
    expect(screen.getByText(/máximo 9\.007\.199\.254\.740\.993,01 pontos/)).toBeVisible();
    await editar("Ana Sintética", "9007199254740993,01");
    await salvar();
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: grande }]));
    expect(celulaNota("Ana Sintética")).toHaveTextContent("9.007.199.254.740.993,01");
  });

  it("faz uma única chamada para o lote inteiro de duas notas", async () => {
    await pronta();
    await editar("Ana Sintética", "18,5");
    await editar("Bruno Sintético", "0");
    await salvar();
    await waitFor(() => expect(api.salvarLote).toHaveBeenCalledTimes(1));
    expect(api.salvarLote).toHaveBeenCalledWith(AVALIACAO, [{ alunoId: ANA, valor: "18.50" }, { alunoId: BRUNO, valor: "0.00" }]);
  });

  it("envio pendente bloqueia repetição e novas edições até a resposta", async () => {
    let concluir!: (valor: LancamentoDTO) => void;
    api.salvarLote.mockReturnValue(new Promise<LancamentoDTO>((resolve) => { concluir = resolve; }));
    await pronta();
    await editar("Ana Sintética", "18,50");
    await salvar();
    expect(screen.getByRole("button", { name: /^salvar lote$/i })).toBeDisabled();
    await userEvent.setup().dblClick(celulaNota("Bruno Sintético"));
    expect(screen.queryByRole("textbox", { name: "Nota de Bruno Sintético" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^salvar lote$/i }));
    expect(api.salvarLote).toHaveBeenCalledTimes(1);
    await act(async () => { concluir(grade()); });
  });

  it("um erro de item rejeita o lote inteiro, preserva ambos os rascunhos e foca aluno inválido", async () => {
    api.salvarLote.mockRejectedValue(erroRest(400, "LOTE_INVALIDO", "Nenhuma nota foi salva. Corrija o lote.", [{ campo: "itens[1].valor", codigo: "VALOR_INVALIDO", mensagem: "A nota de Bruno precisa ser revista." }]));
    await pronta();
    await editar("Ana Sintética", "18,5");
    await editar("Bruno Sintético", "20");
    await salvar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Nenhuma nota foi salva. Corrija o lote.");
    expect(celulaNota("Ana Sintética")).toHaveTextContent("18,50");
    const entrada = await screen.findByRole("textbox", { name: "Nota de Bruno Sintético" });
    expect(entrada).toHaveValue("20,00");
    expect(entrada).toHaveAttribute("aria-invalid", "true");
    expect(entrada).toHaveAccessibleDescription("A nota de Bruno precisa ser revista.");
    expect(entrada).toHaveFocus();
    expect(api.obterLancamento).toHaveBeenCalledTimes(1);
    expect(api.salvarLote).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/notas salvas com sucesso/i)).not.toBeInTheDocument();
  });

  it("rejeição 400 anuncia atomicidade mesmo com mensagem neutra e permite recarga explícita", async () => {
    api.salvarLote.mockRejectedValueOnce(erroRest(400, "VALOR_INVALIDO", "A nota excede o máximo atual da avaliação.", [{ campo: "itens[1].valor", codigo: "VALOR_INVALIDO", mensagem: "Máximo atual: 18,00 pontos." }]));
    await pronta();
    await editar("Ana Sintética", "12");
    await editar("Bruno Sintético", "22");
    await salvar();
    expect(await screen.findByRole("alert")).toHaveTextContent("A nota excede o máximo atual da avaliação.");
    expect(screen.getByText(/nenhuma nota foi salva.*rascunho/i)).toBeVisible();
    expect(celulaNota("Ana Sintética")).toHaveTextContent("12,00");
    expect(await screen.findByRole("textbox", { name: "Nota de Bruno Sintético" })).toHaveValue("22,00");
    expect(api.obterLancamento).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole("button", { name: /^recarregar notas$/i }));
    await waitFor(() => expect(api.obterLancamento).toHaveBeenCalledTimes(2));
    expect(api.salvarLote).toHaveBeenCalledTimes(1);
    expect(celulaNota("Ana Sintética")).toHaveTextContent("Não lançada");
    expect(celulaNota("Bruno Sintético")).toHaveTextContent("Não lançada");
  });

  it("falha sem resposta mantém rascunho e anuncia salvamento incerto antes da recarga", async () => {
    api.salvarLote.mockRejectedValueOnce(new Error("Conexão interrompida"));
    await pronta();
    await editar("Ana Sintética", "12");
    await salvar();
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByText(/não foi possível confirmar o salvamento.*rascunho/i)).toBeVisible();
    expect(screen.queryByText(/nenhuma nota foi salva/i)).not.toBeInTheDocument();
    expect(celulaNota("Ana Sintética")).toHaveTextContent("12,00");
    expect(screen.getByRole("button", { name: /^salvar lote$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^recarregar notas$/i })).toBeEnabled();
    expect(api.obterLancamento).toHaveBeenCalledTimes(1);
  });

  it("409 conserva edição e só recarrega notas depois da ação explícita", async () => {
    api.salvarLote.mockRejectedValueOnce(erroRest(409, "PERIODO_FECHADO", "O período foi encerrado enquanto você editava."));
    await pronta();
    await editar("Ana Sintética", "18,50");
    await salvar();
    expect(await screen.findByRole("alert")).toHaveTextContent("O período foi encerrado enquanto você editava.");
    expect(celulaNota("Ana Sintética")).toHaveTextContent("18,50");
    expect(api.obterLancamento).toHaveBeenCalledTimes(1);
    api.obterLancamento.mockResolvedValue(grade({ podeEditar: false, periodoLetivo: { codigo: "2026.2", status: "encerrado", fechado: true } }));
    await userEvent.setup().click(screen.getByRole("button", { name: /^recarregar notas$/i }));
    await waitFor(() => expect(api.obterLancamento).toHaveBeenCalledTimes(2));
    expect(api.salvarLote).toHaveBeenCalledTimes(1);
    expect(celulaNota("Ana Sintética")).toHaveTextContent("Não lançada");
  });

  it("período encerrado é somente leitura apesar de podeEditar e sem autorização docente", async () => {
    api.listarOpcoes.mockResolvedValue(opcoes(true));
    api.obterLancamento.mockResolvedValue(grade({ periodoLetivo: { codigo: "2026.2", status: "encerrado", fechado: true } }));
    await pronta();
    expect(await screen.findByRole("alert")).toHaveTextContent(/período.*fechado|período.*encerrado/i);
    const salvarLote = screen.queryByRole("button", { name: /^salvar lote$/i });
    if (salvarLote) expect(salvarLote).toBeDisabled();
    await userEvent.setup().dblClick(celulaNota("Ana Sintética"));
    expect(screen.queryByRole("textbox", { name: "Nota de Ana Sintética" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^autorizar retificação$/i })).not.toBeInTheDocument();
    expect(api.salvarLote).not.toHaveBeenCalled();
  });

  it("prazo expirado mantém identificação e retificação depende do servidor", async () => {
    const inicial = grade();
    inicial.alunos[0] = { ...inicial.alunos[0], valor: "0.00", lancada: true, prazoExpirado: true, publicadaEm: "2026-10-01T10:00:00.000Z" };
    api.obterLancamento.mockResolvedValue(inicial);
    await pronta();
    expect(within(screen.getByRole("row", { name: /Ana Sintética/ })).getByText("Prazo expirado")).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(/autorização excepcional.*secretaria/i);
    expect(screen.queryByRole("button", { name: /^autorizar retificação$/i })).not.toBeInTheDocument();
  });

  it("falha de leitura anuncia indisponibilidade sem inventar grade zerada", async () => {
    api.obterLancamento.mockRejectedValue(erroRest(500, "FALHA_INTERNA", "Não foi possível carregar o lançamento."));
    renderizar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o lançamento.");
    expect(screen.queryByRole("row", { name: /Ana Sintética/ })).not.toBeInTheDocument();
    expect(api.salvarLote).not.toHaveBeenCalled();
  });
});

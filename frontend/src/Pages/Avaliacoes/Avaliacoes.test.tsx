import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../../theme";
import Avaliacoes from "./Avaliacoes";

// Somente o boundary HTTP é substituído. Formulário, diálogos e DataTable são reais.
const api = vi.hoisted(() => ({
  listarAtribuicoes: vi.fn(), listar: vi.fn(), buscarPlano: vi.fn(),
  buscarPorId: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), deletar: vi.fn(),
}));
vi.mock("../../services/avaliacao-api", () => ({ avaliacaoApi: api }));

const OFERTA = "10000000-0000-4000-8000-000000000001";
const OUTRA_OFERTA = "10000000-0000-4000-8000-000000000002";
const REGRA = "20000000-0000-4000-8000-000000000001";
const PROVAS = "30000000-0000-4000-8000-000000000001";
const INSTITUCIONAL = "30000000-0000-4000-8000-000000000002";
const PROJETOS = "30000000-0000-4000-8000-000000000003";
const AVALIACAO = "40000000-0000-4000-8000-000000000001";
// Mantém o DataGrid real e torna colunas determinísticas no ambiente sem layout.
const temaTeste = createTheme(theme, { components: { MuiDataGrid: { defaultProps: { disableVirtualization: true } } } });

interface SubgrupoPlano {
  id: string; nome: string; orcamentoPontos: string; pontosDistribuidos: string;
  saldoPontos: string; modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null; quantidadeAtual: number;
  quantidadeDisponivel: number | null; completo: boolean;
}
interface Plano {
  turmaDisciplinaId: string; regraPontuacaoId: string | null; totalPontos: string | null;
  planoCompleto: boolean; podeCriarRegular: boolean; motivosBloqueio: string[];
  subgrupos: SubgrupoPlano[];
}

// Retrato REST da oferta: três provas 12/18/18 deixam 24 pontos e uma vaga.
function plano120(alteracoes: Partial<Plano> = {}): Plano {
  return {
    turmaDisciplinaId: OFERTA, regraPontuacaoId: REGRA, totalPontos: "120.00",
    planoCompleto: false, podeCriarRegular: true, motivosBloqueio: [],
    subgrupos: [
      { id: PROVAS, nome: "Provas", orcamentoPontos: "72.00", pontosDistribuidos: "48.00", saldoPontos: "24.00", modoQuantidade: "FIXA", quantidadeFixa: 4, quantidadeAtual: 3, quantidadeDisponivel: 1, completo: false },
      { id: INSTITUCIONAL, nome: "Avaliações institucionais", orcamentoPontos: "6.00", pontosDistribuidos: "0.00", saldoPontos: "6.00", modoQuantidade: "FIXA", quantidadeFixa: 1, quantidadeAtual: 0, quantidadeDisponivel: 1, completo: false },
      { id: PROJETOS, nome: "Trabalhos e projetos", orcamentoPontos: "42.00", pontosDistribuidos: "10.00", saldoPontos: "32.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, quantidadeAtual: 1, quantidadeDisponivel: null, completo: false },
    ], ...alteracoes,
  };
}
const atribuicoes = [OFERTA, OUTRA_OFERTA].map((id, i) => ({
  id, professor_id: "50000000-0000-4000-8000-000000000001",
  turma_id: `60000000-0000-4000-8000-00000000000${i + 1}`,
  turma_sigla: i === 0 ? "ENG-1" : "ENG-2", turma_descricao: "Turma sintética",
  disciplina_id: "70000000-0000-4000-8000-000000000001",
  disciplina_codigo: "ALG", disciplina_nome: "Algoritmos", professor_nome: "Docente sintético",
}));
const avaliacao = {
  id: AVALIACAO, tipo_avaliacao: "REGULAR", subgrupo_id: PROVAS,
  regraPontuacaoId: REGRA, primeiraNotaEm: null,
  descricao_avaliacao: "Primeiro módulo", valor: "12.00",
  data_lancamento: "2026-10-01", data_devolucao: "2026-10-08",
  turma_disciplina_id: OFERTA,
};
function erroRest(status: number, codigo: string, mensagem: string, campos: object[] = []) {
  return { isAxiosError: true, response: { status, data: { codigo, mensagem, campos } } };
}
function renderizar() {
  return render(<ThemeProvider theme={temaTeste}><MemoryRouter><Avaliacoes /></MemoryRouter></ThemeProvider>);
}
async function pronta() {
  renderizar();
  await screen.findByRole("button", { name: "Editar avaliação Primeiro módulo" }, { timeout: 5000 });
}
async function selecionar(campo: HTMLElement, nome: RegExp) {
  const user = userEvent.setup();
  await user.click(campo);
  await user.click(await screen.findByRole("option", { name: nome }));
}
async function abrirFormulario() {
  await pronta();
  await userEvent.setup().click(screen.getByRole("button", { name: /^adicionar$/i }));
  return screen.findByRole("dialog", { name: "Nova avaliação" });
}
async function preencher(dialogo: HTMLElement, valor = "24,00", subgrupo = /^provas/i) {
  const user = userEvent.setup();
  await selecionar(within(dialogo).getByRole("combobox", { name: /^subgrupo/i }), subgrupo);
  const maximo = within(dialogo).getByRole("textbox", { name: /^valor máximo/i });
  await user.clear(maximo);
  if (valor !== "") await user.type(maximo, valor);
  await user.type(within(dialogo).getByRole("textbox", { name: /^descrição/i }), "Quarto módulo");
  fireEvent.change(within(dialogo).getByLabelText(/^data de lançamento/i), { target: { value: "2026-10-09" } });
  fireEvent.change(within(dialogo).getByLabelText(/^data de devolução/i), { target: { value: "2026-10-16" } });
  return maximo;
}
async function salvar(dialogo: HTMLElement) {
  await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^salvar$/i }));
}

beforeEach(() => {
  vi.resetAllMocks();
  // jsdom não calcula layout; a dimensão evita ocultar a coluna Ações por virtualização.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 800));
  api.listarAtribuicoes.mockResolvedValue(atribuicoes);
  api.listar.mockResolvedValue([avaliacao]);
  api.buscarPlano.mockImplementation(async (id: string) => plano120({ turmaDisciplinaId: id }));
  api.criar.mockResolvedValue({ ...avaliacao, id: "40000000-0000-4000-8000-000000000002", valor: "24.00" });
  api.atualizar.mockResolvedValue(avaliacao);
  api.deletar.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Avaliações - plano da oferta e distribuição explícita", () => {
  it("mantém a seleção de oferta e a tabela real de avaliações", async () => {
    await pronta();
    expect(screen.getByRole("heading", { name: "Gestão de avaliações" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Turma e disciplina" })).toHaveTextContent("ENG-1");
    expect(screen.getByRole("grid")).toBeVisible();
    expect(api.listar).toHaveBeenCalledWith(OFERTA);
  });

  it("consulta plano pelo UUID da oferta e mostra total 120 sem limites globais", async () => {
    await pronta();
    await waitFor(() => expect(api.buscarPlano).toHaveBeenCalledWith(OFERTA));
    expect(screen.getByText(/total.*120,00/i)).toBeVisible();
    expect(screen.queryByText(/\/100 pts|3 provas, 1 TPI|Provas valem 20/i)).not.toBeInTheDocument();
  });

  it("apresenta orçamento, distribuído, saldo e vagas por subgrupo FIXA", async () => {
    await pronta();
    const grupo = await screen.findByRole("group", { name: "Provas" });
    expect(grupo).toHaveTextContent(/orçamento.*72,00/i);
    expect(grupo).toHaveTextContent(/distribuídos.*48,00/i);
    expect(grupo).toHaveTextContent(/saldo.*24,00/i);
    expect(grupo).toHaveTextContent(/quantidade.*3\s*\/\s*4/i);
    expect(grupo).toHaveTextContent(/disponível.*1|1.*disponível/i);
  });

  it("apresenta SEM_LIMITE como sem limite, preservando saldo obrigatório", async () => {
    await pronta();
    const grupo = await screen.findByRole("group", { name: "Trabalhos e projetos" });
    expect(grupo).toHaveTextContent(/sem limite/i);
    expect(grupo).toHaveTextContent(/saldo.*32,00/i);
    expect(grupo).not.toHaveTextContent(/\/0|\/null|NaN|Infinity/);
  });

  it("troca a oferta e recarrega seu plano sem reaproveitar saldo de outra turma", async () => {
    await pronta();
    await selecionar(screen.getByRole("combobox", { name: "Turma e disciplina" }), /ENG-2/);
    await waitFor(() => expect(api.buscarPlano).toHaveBeenCalledWith(OUTRA_OFERTA));
    expect(api.listar).toHaveBeenLastCalledWith(OUTRA_OFERTA);
  });

  it("sem regra explica o bloqueio e não presume total 100", async () => {
    api.buscarPlano.mockResolvedValue(plano120({ regraPontuacaoId: null, totalPontos: null, podeCriarRegular: false, subgrupos: [], motivosBloqueio: ["REGRA_AUSENTE"] }));
    await pronta();
    expect(await screen.findByText(/regra.*não configurada|configur.*regra.*necessári/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /^adicionar$/i })).toBeDisabled();
    expect(screen.queryByText(/100,00|\/100 pts/)).not.toBeInTheDocument();
    expect(api.criar).not.toHaveBeenCalled();
  });

  it("falha de leitura é anunciada e bloqueia cadastro até recarga explícita", async () => {
    api.buscarPlano.mockRejectedValueOnce(erroRest(500, "FALHA_INTERNA", "Não foi possível carregar o plano."));
    await pronta();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o plano.");
    expect(screen.getByRole("button", { name: /^adicionar$/i })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("button", { name: /^recarregar plano$/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^adicionar$/i })).toBeEnabled());
    expect(api.buscarPlano).toHaveBeenCalledTimes(2);
  });

  it("bloqueia escrita durante a leitura do plano", async () => {
    api.buscarPlano.mockReturnValue(new Promise(() => {}));
    await pronta();
    expect(screen.getByRole("button", { name: /^adicionar$/i })).toBeDisabled();
    expect(screen.getByText(/carregando.*plano/i)).toBeVisible();
  });

  it("novo cadastro exige subgrupo explícito e máximo textual vazio", async () => {
    const dialogo = await abrirFormulario();
    expect(within(dialogo).getByRole("combobox", { name: /^subgrupo/i }).textContent?.replace(/\u200b/g, "").trim()).toBe("");
    expect(within(dialogo).getByRole("textbox", { name: /^valor máximo/i })).toHaveValue("");
    await salvar(dialogo);
    const subgrupo = within(dialogo).getByRole("combobox", { name: /^subgrupo/i });
    expect(subgrupo).toHaveAttribute("aria-invalid", "true");
    expect(subgrupo).toHaveAccessibleDescription(/selecione.*subgrupo/i);
    expect(subgrupo).toHaveFocus();
    expect(api.criar).not.toHaveBeenCalled();
  });

  it("envia REGULAR e 24 textual sem impor divisão 72/4=18", async () => {
    const dialogo = await abrirFormulario();
    await preencher(dialogo);
    await salvar(dialogo);
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1));
    expect(api.criar).toHaveBeenCalledWith(expect.objectContaining({
      tipo_avaliacao: "REGULAR", subgrupo_id: PROVAS, turma_disciplina_id: OFERTA,
      valor: "24.00", descricao_avaliacao: "Quarto módulo",
      data_lancamento: "2026-10-09", data_devolucao: "2026-10-16",
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cadastrada com sucesso/i);
  });

  it("usa um grupo sem limite com máximo livre dentro do saldo", async () => {
    const dialogo = await abrirFormulario();
    await preencher(dialogo, "3,75", /^trabalhos e projetos/i);
    await salvar(dialogo);
    await waitFor(() => expect(api.criar).toHaveBeenCalledWith(expect.objectContaining({ subgrupo_id: PROJETOS, valor: "3.75" })));
  });

  it("submete o formulário por teclado Enter sem duplicar a gravação", async () => {
    const dialogo = await abrirFormulario();
    await preencher(dialogo);
    await userEvent.setup().click(within(dialogo).getByRole("textbox", { name: /^descrição/i }));
    await userEvent.setup().keyboard("{Enter}");
    await waitFor(() => expect(api.criar).toHaveBeenCalledTimes(1));
    expect(api.criar).toHaveBeenCalledWith(expect.objectContaining({ valor: "24.00", subgrupo_id: PROVAS }));
  });

  it.each(["", " ", "0", "-1", "+1", "1e2", "01", "1.234,50", "18,501", "18.501", "18,5,0"])(
    "rejeita máximo malformado %j antes do request, sem arredondar", async (entrada) => {
      const dialogo = await abrirFormulario();
      const maximo = await preencher(dialogo, entrada);
      await salvar(dialogo);
      await waitFor(() => expect(maximo).toHaveAttribute("aria-invalid", "true"));
      expect(maximo).toHaveAccessibleDescription(/ponto|valor|decimal|positivo|precisão|obrigatório/i);
      expect(maximo).toHaveFocus();
      expect(api.criar).not.toHaveBeenCalled();
      expect(maximo).toHaveValue(entrada);
    },
  );

  it("preserva os centésimos além da precisão segura de Number", async () => {
    const grande = "9007199254740993.01";
    api.buscarPlano.mockResolvedValue(plano120({ totalPontos: grande, subgrupos: [{ ...plano120().subgrupos[2], orcamentoPontos: grande, pontosDistribuidos: "0.00", saldoPontos: grande }] }));
    const dialogo = await abrirFormulario();
    await preencher(dialogo, "9007199254740993,01", /^trabalhos e projetos/i);
    await salvar(dialogo);
    await waitFor(() => expect(api.criar).toHaveBeenCalledWith(expect.objectContaining({ valor: grande })));
  });

  it("associa excesso local ao máximo e mantém o texto digitado", async () => {
    const dialogo = await abrirFormulario();
    const maximo = await preencher(dialogo, "24,01");
    await salvar(dialogo);
    await waitFor(() => expect(maximo).toHaveAttribute("aria-invalid", "true"));
    expect(maximo).toHaveAccessibleDescription(/saldo.*24,00/i);
    expect(maximo).toHaveValue("24,01");
    expect(api.criar).not.toHaveBeenCalled();
  });

  it("quantidade esgotada bloqueia seleção apesar de saldo positivo", async () => {
    const plano = plano120();
    plano.subgrupos[0] = { ...plano.subgrupos[0], quantidadeAtual: 4, quantidadeDisponivel: 0 };
    api.buscarPlano.mockResolvedValue(plano);
    const dialogo = await abrirFormulario();
    await userEvent.setup().click(within(dialogo).getByRole("combobox", { name: /^subgrupo/i }));
    expect(await screen.findByRole("option", { name: /^provas/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("recarrega lista e plano depois de criar, usando a resposta da oferta", async () => {
    const dialogo = await abrirFormulario();
    await preencher(dialogo);
    await salvar(dialogo);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(api.buscarPlano).toHaveBeenCalledTimes(2);
    expect(api.buscarPlano).toHaveBeenLastCalledWith(OFERTA);
  });

  it("409 mantém rascunho, não recarrega silenciosamente e oferece revisão explícita", async () => {
    api.criar.mockRejectedValueOnce(erroRest(409, "ORCAMENTO_EXCEDIDO", "Outra avaliação consumiu o saldo do subgrupo.", [{ campo: "valor", codigo: "ORCAMENTO_EXCEDIDO", mensagem: "Saldo disponível: 12,00 pontos." }]));
    const dialogo = await abrirFormulario();
    const maximo = await preencher(dialogo);
    await salvar(dialogo);
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Outra avaliação consumiu o saldo do subgrupo.");
    expect(maximo).toHaveValue("24,00");
    expect(maximo).toHaveAccessibleDescription("Saldo disponível: 12,00 pontos.");
    expect(api.buscarPlano).toHaveBeenCalledTimes(1);
    api.buscarPlano.mockResolvedValue(plano120({ subgrupos: plano120().subgrupos.map((s) => s.id === PROVAS ? { ...s, saldoPontos: "12.00", pontosDistribuidos: "60.00" } : s) }));
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^recarregar plano$/i }));
    await waitFor(() => expect(api.buscarPlano).toHaveBeenCalledTimes(2));
    expect(maximo).toHaveValue("24,00");
    expect(within(dialogo).getByRole("textbox", { name: /^descrição/i })).toHaveValue("Quarto módulo");
    expect(api.criar).toHaveBeenCalledTimes(1);
  });

  it("edita máximo histórico 12 sem normalizar PROVA para 20", async () => {
    api.listar.mockResolvedValue([{ ...avaliacao, tipo_avaliacao: "PROVA" }]);
    await pronta();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar avaliação" });
    expect(within(dialogo).getByRole("textbox", { name: /^valor máximo/i })).toHaveValue("12,00");
  });

  it("antes da primeira nota permite mover e atualiza planos de origem e destino", async () => {
    await pronta();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar avaliação" });
    await selecionar(within(dialogo).getByRole("combobox", { name: "Turma e disciplina" }), /ENG-2/);
    await selecionar(within(dialogo).getByRole("combobox", { name: /^subgrupo/i }), /^provas/i);
    await salvar(dialogo);
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledWith(AVALIACAO, expect.objectContaining({ turma_disciplina_id: OUTRA_OFERTA, subgrupo_id: PROVAS, valor: "12.00" })));
    expect(api.buscarPlano.mock.calls.filter(([id]) => id === OFERTA).length).toBeGreaterThanOrEqual(2);
    expect(api.buscarPlano.mock.calls.filter(([id]) => id === OUTRA_OFERTA).length).toBeGreaterThanOrEqual(2);
  });

  it("primeira nota mesmo zero preserva estrutura e exclusão, mantendo descrição editável", async () => {
    api.listar.mockResolvedValue([{ ...avaliacao, primeiraNotaEm: "2026-10-02T10:00:00.000Z" }]);
    await pronta();
    expect(screen.getByRole("button", { name: "Excluir avaliação Primeiro módulo" })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar avaliação" });
    expect(within(dialogo).getByRole("textbox", { name: /^valor máximo/i })).toBeDisabled();
    expect(within(dialogo).getByRole("combobox", { name: /^subgrupo/i })).toHaveAttribute("aria-disabled", "true");
    expect(within(dialogo).getByRole("combobox", { name: "Turma e disciplina" })).toHaveAttribute("aria-disabled", "true");
    expect(within(dialogo).getByText(/primeira nota|estrutura preservada/i)).toBeVisible();
    const descricao = within(dialogo).getByRole("textbox", { name: /^descrição/i });
    await userEvent.setup().clear(descricao);
    await userEvent.setup().type(descricao, "Descrição revisada");
    await salvar(dialogo);
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledWith(AVALIACAO, expect.objectContaining({ descricao_avaliacao: "Descrição revisada" })));
    expect(api.deletar).not.toHaveBeenCalled();
  });

  it("POST sem resposta preserva rascunho e bloqueia repetição mesmo após recarga explícita", async () => {
    api.criar.mockRejectedValueOnce(new Error("Conexão interrompida após envio"));
    const dialogo = await abrirFormulario();
    await preencher(dialogo);
    await salvar(dialogo);
    expect(await within(dialogo).findByText(/não foi possível confirmar o salvamento/i)).toBeVisible();
    expect(within(dialogo).getByRole("textbox", { name: /^valor máximo/i })).toHaveValue("24,00");
    expect(within(dialogo).getByRole("textbox", { name: /^descrição/i })).toHaveValue("Quarto módulo");
    expect(within(dialogo).getByRole("button", { name: /^salvar$/i })).toBeDisabled();
    expect(api.criar).toHaveBeenCalledTimes(1);
    expect(api.listar).toHaveBeenCalledTimes(1);
    api.listar.mockResolvedValue([avaliacao, { ...avaliacao, id: "40000000-0000-4000-8000-000000000002", descricao_avaliacao: "Quarto módulo", valor: "24.00" }]);
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^recarregar plano$/i }));
    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2));
    expect(within(dialogo).getByRole("button", { name: /^salvar$/i })).toBeDisabled();
    expect(within(dialogo).getByText(/cancelar.*lista|lista.*cancelar/i)).toBeVisible();
    expect(within(dialogo).getByRole("textbox", { name: /^descrição/i })).toHaveValue("Quarto módulo");
    expect(api.criar).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^cancelar$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nova avaliação" })).not.toBeInTheDocument());
    expect(screen.getByRole("row", { name: /Quarto módulo/ })).toBeVisible();
  });

  it("recarga do409 relê primeira nota e preserva só descrição/datas do rascunho", async () => {
    api.atualizar.mockRejectedValueOnce(erroRest(409, "AVALIACAO_COM_NOTA", "A avaliação recebeu sua primeira nota."));
    api.buscarPorId.mockResolvedValue({ ...avaliacao, primeiraNotaEm: "2026-10-02T10:00:00.000Z" });
    await pronta();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar avaliação" });
    const valor = within(dialogo).getByRole("textbox", { name: /^valor máximo/i });
    await userEvent.setup().clear(valor);
    await userEvent.setup().type(valor, "18");
    const descricao = within(dialogo).getByRole("textbox", { name: /^descrição/i });
    await userEvent.setup().clear(descricao);
    await userEvent.setup().type(descricao, "Meu rascunho de metadados");
    fireEvent.change(within(dialogo).getByLabelText(/^data de devolução/i), { target: { value: "2026-10-16" } });
    await salvar(dialogo);
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("A avaliação recebeu sua primeira nota.");
    expect(api.buscarPorId).not.toHaveBeenCalled();
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^recarregar plano$/i }));
    await waitFor(() => expect(api.buscarPorId).toHaveBeenCalledWith(AVALIACAO));
    await waitFor(() => expect(valor).toBeDisabled());
    expect(valor).toHaveValue("12,00");
    expect(within(dialogo).getByRole("combobox", { name: /^subgrupo/i })).toHaveAttribute("aria-disabled", "true");
    expect(descricao).toHaveValue("Meu rascunho de metadados");
    expect(within(dialogo).getByLabelText(/^data de devolução/i)).toHaveValue("2026-10-16");
    await salvar(dialogo);
    await waitFor(() => expect(api.atualizar).toHaveBeenCalledTimes(2));
    expect(api.atualizar.mock.calls[1]).toEqual([AVALIACAO, {
      descricao_avaliacao: "Meu rascunho de metadados", data_lancamento: "2026-10-01", data_devolucao: "2026-10-16",
    }]);
  });

  it("recarga de conflito no destinoB mantém tabela vinculada ao contextoA ao cancelar", async () => {
    api.listar.mockImplementation(async (id: string) => id === OFERTA ? [avaliacao] : [
      { ...avaliacao, id: "40000000-0000-4000-8000-000000000002", turma_disciplina_id: OUTRA_OFERTA, descricao_avaliacao: "Avaliação exclusiva da oferta B" },
    ]);
    api.buscarPorId.mockResolvedValue(avaliacao);
    api.atualizar.mockRejectedValueOnce(erroRest(409, "ORCAMENTO_EXCEDIDO", "O orçamento do destino foi consumido."));
    await pronta();
    await userEvent.setup().click(screen.getByRole("button", { name: "Editar avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar avaliação" });
    await selecionar(within(dialogo).getByRole("combobox", { name: "Turma e disciplina" }), /ENG-2/);
    await selecionar(within(dialogo).getByRole("combobox", { name: /^subgrupo/i }), /^provas/i);
    await salvar(dialogo);
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("O orçamento do destino foi consumido.");
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^recarregar plano$/i }));
    await waitFor(() => expect(api.buscarPlano.mock.calls.filter(([id]) => id === OUTRA_OFERTA).length).toBeGreaterThanOrEqual(2));
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^cancelar$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar avaliação" })).not.toBeInTheDocument());
    expect(screen.getByRole("combobox", { name: "Turma e disciplina" })).toHaveTextContent("ENG-1");
    expect(screen.getByRole("row", { name: /Primeiro módulo/ })).toBeVisible();
    expect(screen.queryByRole("row", { name: /Avaliação exclusiva da oferta B/ })).not.toBeInTheDocument();
    expect(api.atualizar).toHaveBeenCalledTimes(1);
  });

  it("exclusão permitida atualiza lista e saldo do plano", async () => {
    await pronta();
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir avaliação Primeiro módulo" }));
    const dialogo = await screen.findByRole("dialog", { name: "Confirmar exclusão" });
    await userEvent.setup().click(within(dialogo).getByRole("button", { name: /^excluir$/i }));
    await waitFor(() => expect(api.deletar).toHaveBeenCalledWith(AVALIACAO));
    await waitFor(() => expect(api.buscarPlano).toHaveBeenCalledTimes(2));
    expect(api.listar).toHaveBeenCalledTimes(2);
  });
});

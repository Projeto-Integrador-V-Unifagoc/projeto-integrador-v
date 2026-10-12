import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../../theme";
import RegraPontuacaoCurso from "./RegraPontuacaoCurso";

// Boundary de hooks confirmado para T024/T025. Wrappers e controles são reais.
const hooks = vi.hoisted(() => ({
  buscarCursoPorId: vi.fn(),
  listarPeriodosLetivos: vi.fn(),
  buscarRegra: vi.fn(),
  salvarRegra: vi.fn(),
  carregandoCurso: false,
  carregandoPeriodos: false,
  carregandoRegra: false,
}));

vi.mock("../../hooks/use-curso", () => ({
  useCurso: () => ({ carregando: hooks.carregandoCurso, buscarCursoPorId: hooks.buscarCursoPorId }),
}));
vi.mock("../../hooks/use-periodo-letivo", () => ({
  usePeriodoLetivo: () => ({ carregando: hooks.carregandoPeriodos, listarPeriodosLetivos: hooks.listarPeriodosLetivos }),
}));
vi.mock("../../hooks/use-regra-pontuacao", () => ({
  useRegraPontuacao: () => ({
    carregando: hooks.carregandoRegra,
    buscarRegra: hooks.buscarRegra,
    salvarRegra: hooks.salvarRegra,
  }),
}));

const CURSO_ID = "10000000-0000-4000-8000-000000000001";
const PERIODO_ID = "20000000-0000-4000-8000-000000000001";
const OUTRO_PERIODO_ID = "20000000-0000-4000-8000-000000000002";
const REGRA_ID = "30000000-0000-4000-8000-000000000001";
const SUBGRUPO_IDS = [
  "40000000-0000-4000-8000-000000000001",
  "40000000-0000-4000-8000-000000000002",
  "40000000-0000-4000-8000-000000000003",
];

interface SubgrupoDTO {
  id?: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  ordem: number;
}

interface PayloadRegra {
  versaoEsperada: number | null;
  totalPontos: string;
  subgrupos: SubgrupoDTO[];
}

interface RegraDTO {
  id: string;
  cursoId: string;
  periodoLetivoId: string;
  totalPontos: string;
  origem: "CONFIGURADA" | "HISTORICA";
  versao: number;
  estado: "DISPONIVEL" | "PRESERVADA";
  usadaEm: string | null;
  subgrupos: SubgrupoDTO[];
}

const curso = {
  id: CURSO_ID,
  codigo: "ENG-SIS",
  nome: "Engenharia de Sistemas",
  departamento: {
    id: "50000000-0000-4000-8000-000000000001",
    codigo: "TEC",
    nome: "Tecnologia",
    faculdade: {
      id: "60000000-0000-4000-8000-000000000001",
      nome: "Faculdade sintética",
      cidade: { nome: "Cidade sintética", uf: "MG" },
    },
  },
};

const periodos = [
  { id: PERIODO_ID, codigo: "2026.1", ano: 2026, semestre: 1, data_inicio: "2026-01-01", data_fim: "2026-06-30", ativo: true, status: "ativo" },
  { id: OUTRO_PERIODO_ID, codigo: "2026.2", ano: 2026, semestre: 2, data_inicio: "2026-07-01", data_fim: "2026-12-31", ativo: true, status: "ativo" },
];

function regra120(alteracoes: Partial<RegraDTO> = {}): RegraDTO {
  return {
    id: REGRA_ID,
    cursoId: CURSO_ID,
    periodoLetivoId: PERIODO_ID,
    totalPontos: "120.00",
    origem: "CONFIGURADA",
    versao: 7,
    estado: "DISPONIVEL",
    usadaEm: null,
    subgrupos: [
      { id: SUBGRUPO_IDS[0], nome: "Provas", orcamentoPontos: "72.00", modoQuantidade: "FIXA", quantidadeFixa: 4, ordem: 0 },
      { id: SUBGRUPO_IDS[1], nome: "Avaliações institucionais", orcamentoPontos: "6.00", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 1 },
      { id: SUBGRUPO_IDS[2], nome: "Trabalhos e projetos", orcamentoPontos: "42.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ],
    ...alteracoes,
  };
}

function regraRetornada(payload: PayloadRegra, versao = 1): RegraDTO {
  return regra120({
    totalPontos: payload.totalPontos,
    versao,
    subgrupos: payload.subgrupos.map((subgrupo, indice) => ({
      ...subgrupo,
      id: subgrupo.id ?? SUBGRUPO_IDS[indice],
    })),
  });
}

function erroRest(status: number, codigo: string, mensagem: string, campos?: { campo: string; codigo: string; mensagem: string }[]) {
  return { isAxiosError: true, response: { status, data: { codigo, mensagem, ...(campos ? { campos } : {}) } } };
}

function pendencia<T>() {
  let resolver!: (valor: T) => void;
  const promessa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}

type Usuario = ReturnType<typeof userEvent.setup>;

function pagina() {
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/cursos/${CURSO_ID}/pontuacao`]}>
        <Routes>
          <Route path="/cursos/:id/pontuacao" element={<RegraPontuacaoCurso />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function montarPagina() {
  return { usuario: userEvent.setup(), ...render(pagina()) };
}

async function selecionar(usuario: Usuario, controle: HTMLElement, opcao: RegExp) {
  if (controle instanceof HTMLSelectElement) {
    await usuario.selectOptions(controle, within(controle).getByRole("option", { name: opcao }));
  } else {
    await usuario.click(controle);
    await usuario.click(await screen.findByRole("option", { name: opcao }));
  }
}

async function selecionarPeriodo(usuario: Usuario, codigo: "2026.1" | "2026.2" = "2026.1") {
  const controle = await screen.findByRole("combobox", { name: /período letivo/i });
  await selecionar(usuario, controle, codigo === "2026.1" ? /2026\.1/ : /2026\.2/);
  await waitFor(() => expect(hooks.buscarRegra).toHaveBeenCalledWith(
    CURSO_ID, codigo === "2026.1" ? PERIODO_ID : OUTRO_PERIODO_ID,
  ));
  await waitFor(() => expect(screen.getByRole("textbox", { name: /total de pontos/i })).toBeInTheDocument());
}

function total() {
  return screen.getByRole("textbox", { name: /total de pontos/i });
}

function grupos() {
  return screen.queryAllByRole("group", { name: /^subgrupo \d+/i });
}

function grupo(indice: number) {
  const encontrado = grupos()[indice];
  expect(encontrado).toBeDefined();
  return within(encontrado);
}

function botaoSalvar() {
  return screen.getByRole("button", { name: /disponibilizar regra|salvar regra/i });
}

async function digitar(usuario: Usuario, campo: HTMLElement, valor: string) {
  await usuario.clear(campo);
  if (valor) await usuario.type(campo, valor);
}

async function preencherGrupo(
  usuario: Usuario,
  indice: number,
  dados: { nome: string; orcamento: string; modo?: "FIXA" | "SEM_LIMITE"; quantidade?: string },
) {
  while (grupos().length <= indice) await usuario.click(screen.getByRole("button", { name: /adicionar subgrupo/i }));
  const consultas = grupo(indice);
  await digitar(usuario, consultas.getByRole("textbox", { name: /nome do subgrupo/i }), dados.nome);
  await digitar(usuario, consultas.getByRole("textbox", { name: /orçamento em pontos/i }), dados.orcamento);
  await selecionar(usuario, consultas.getByRole("combobox", { name: /modo de quantidade/i }),
    dados.modo === "FIXA" ? /fixa/i : /sem limite/i);
  if (dados.modo === "FIXA") {
    await digitar(usuario, consultas.getByLabelText(/^quantidade fixa/i), dados.quantidade ?? "");
  }
}

async function novaRegra(usuario: Usuario, totalDigitado = "120", nome = "Projeto integrador") {
  await digitar(usuario, total(), totalDigitado);
  await preencherGrupo(usuario, 0, { nome, orcamento: totalDigitado });
}

function esperarErroAssociado(campo: HTMLElement, mensagem: RegExp) {
  expect(campo).toBeInvalid();
  expect(campo).toHaveAttribute("aria-describedby");
  expect(campo).toHaveAccessibleDescription(mensagem);
}

beforeEach(() => {
  vi.resetAllMocks();
  hooks.carregandoCurso = false;
  hooks.carregandoPeriodos = false;
  hooks.carregandoRegra = false;
  hooks.buscarCursoPorId.mockResolvedValue(curso);
  hooks.listarPeriodosLetivos.mockResolvedValue(periodos);
  hooks.buscarRegra.mockResolvedValue(null); // A API 404 vira ausência, nunca regra 100.
  hooks.salvarRegra.mockImplementation(async (_cursoId: string, _periodoId: string, payload: PayloadRegra) => regraRetornada(payload));
});

afterEach(cleanup);

describe("RegraPontuacaoCurso - contexto institucional e rascunho", () => {
  it("obtém o curso da rota e consulta o período letivo pelo UUID selecionado", async () => {
    const { usuario } = montarPagina();
    await waitFor(() => expect(hooks.buscarCursoPorId).toHaveBeenCalledWith(CURSO_ID));
    await waitFor(() => expect(hooks.listarPeriodosLetivos).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: /pontuação/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Engenharia de Sistemas/).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/período ideal|período curricular/i)).not.toBeInTheDocument();
    await selecionarPeriodo(usuario);
    expect(hooks.buscarRegra).toHaveBeenLastCalledWith(CURSO_ID, PERIODO_ID);
  });

  it("aguarda a seleção institucional e bloqueia salvar enquanto não há período", async () => {
    montarPagina();
    await screen.findByRole("combobox", { name: /período letivo/i });
    expect(hooks.buscarRegra).not.toHaveBeenCalled();
    expect(botaoSalvar()).toBeDisabled();
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("mostra ausência sem preencher 100, copiar subgrupos ou salvar automaticamente", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    expect(await screen.findByText(/regra.*não.*configurada|sem.*configuração/i)).toBeInTheDocument();
    expect(total()).toHaveValue("");
    expect(screen.queryByDisplayValue("100")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("100,00")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Provas")).not.toBeInTheDocument();
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("troca o UUID institucional sem reaproveitar a configuração do período anterior", async () => {
    hooks.buscarRegra.mockResolvedValueOnce(regra120()).mockResolvedValueOnce(null);
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    expect(await screen.findByDisplayValue("120,00")).toBe(total());
    await selecionarPeriodo(usuario, "2026.2");
    await waitFor(() => expect(total()).toHaveValue(""));
    expect(hooks.buscarRegra).toHaveBeenLastCalledWith(CURSO_ID, OUTRO_PERIODO_ID);
    expect(screen.queryByDisplayValue("Provas")).not.toBeInTheDocument();
  });

  it("carrega a composição disponível em campos textuais e quantidades próprias de cada grupo", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    expect(await screen.findByDisplayValue("120,00")).toBe(total());
    expect(total()).toHaveAttribute("type", "text");
    expect(grupos()).toHaveLength(3);
    expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Provas");
    expect(grupo(0).getByRole("textbox", { name: /orçamento em pontos/i })).toHaveValue("72,00");
    expect(grupo(0).getByLabelText(/^quantidade fixa/i)).toHaveDisplayValue("4");
    expect(grupo(2).getByRole("combobox", { name: /modo de quantidade/i })).toHaveTextContent(/sem limite/i);
    expect(screen.getByRole("status", { name: /soma dos orçamentos/i })).toHaveTextContent("120,00");
    expect(screen.getByRole("status", { name: /saldo a distribuir/i })).toHaveTextContent("0,00");
  });

  it("atualiza soma e saldo exatos enquanto edita o orçamento", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await digitar(usuario, grupo(2).getByRole("textbox", { name: /orçamento em pontos/i }), "40,01");
    expect(screen.getByRole("status", { name: /soma dos orçamentos/i })).toHaveTextContent("118,01");
    expect(screen.getByRole("status", { name: /saldo a distribuir/i })).toHaveTextContent("1,99");
  });

  it("aceita 100,01 e envia centésimos textuais sem padrão ou arredondamento", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario, "100,01");
    expect(screen.getByRole("status", { name: /soma dos orçamentos/i })).toHaveTextContent("100,01");
    expect(screen.getByRole("status", { name: /saldo a distribuir/i })).toHaveTextContent("0,00");
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, {
      versaoEsperada: null,
      totalPontos: "100.01",
      subgrupos: [{ nome: "Projeto integrador", orcamentoPontos: "100.01", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 0 }],
    }));
  });

  it("preserva pontos maiores que Number.MAX_SAFE_INTEGER no formulário e no envio", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario, "9007199254740993,01");
    expect(screen.getByRole("status", { name: /soma dos orçamentos/i })).toHaveTextContent("9.007.199.254.740.993,01");
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({
      totalPontos: "9007199254740993.01",
      subgrupos: [expect.objectContaining({ orcamentoPontos: "9007199254740993.01" })],
    })));
  });
});

describe("RegraPontuacaoCurso - composição livre e validação acessível", () => {
  it("aceita nomes livres e repetidos sem transformá-los em catálogo acadêmico", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await digitar(usuario, total(), "120");
    await preencherGrupo(usuario, 0, { nome: "Oficina de campo", orcamento: "60", modo: "FIXA", quantidade: "2" });
    await preencherGrupo(usuario, 1, { nome: "Oficina de campo", orcamento: "60" });
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, {
      versaoEsperada: null,
      totalPontos: "120.00",
      subgrupos: [
        { nome: "Oficina de campo", orcamentoPontos: "60.00", modoQuantidade: "FIXA", quantidadeFixa: 2, ordem: 0 },
        { nome: "Oficina de campo", orcamentoPontos: "60.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 1 },
      ],
    }));
  });

  it("troca FIXA por SEM_LIMITE e envia quantidade null, eliminando o valor anterior", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await selecionar(usuario, grupo(0).getByRole("combobox", { name: /modo de quantidade/i }), /sem limite/i);
    const quantidade = grupo(0).queryByLabelText(/^quantidade fixa/i);
    if (quantidade) expect(quantidade).toBeDisabled();
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({
      subgrupos: [
        expect.objectContaining({ id: SUBGRUPO_IDS[0], modoQuantidade: "SEM_LIMITE", quantidadeFixa: null }),
        expect.anything(), expect.anything(),
      ],
    })));
  });

  it.each(["", "0", "-1", "1.5"])("rejeita quantidade fixa inválida %j junto ao campo", async (quantidade) => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await digitar(usuario, total(), "120");
    await preencherGrupo(usuario, 0, { nome: "Seminários", orcamento: "120", modo: "FIXA", quantidade });
    const campo = grupo(0).getByLabelText(/^quantidade fixa/i);
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(campo, /quantidade|inteir|positiv|maior.*zero|obrigatóri/i));
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("exige total, mantém o rascunho e leva o foco ao primeiro campo inválido", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await preencherGrupo(usuario, 0, { nome: "Projeto", orcamento: "120" });
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(total(), /total|obrigatóri|informe/i));
    expect(total()).toHaveFocus();
    expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Projeto");
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it.each(["100,001", "1e2", "-100", "0100", "0"])("rejeita total textual inválido %j sem sanitizar ou arredondar", async (entrada) => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario, "100");
    await digitar(usuario, total(), entrada);
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(total(), /pontos|total|decimal|casas|formato|positiv|maior.*zero|válid/i));
    expect(total()).toHaveValue(entrada);
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it.each(["35,001", "0"])("associa orçamento inválido %j ao respectivo subgrupo", async (entrada) => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario, "100");
    const campo = grupo(0).getByRole("textbox", { name: /orçamento em pontos/i });
    await digitar(usuario, campo, entrada);
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(campo, /orçamento|pontos|decimal|casas|positiv|maior.*zero|válid/i));
    expect(campo).toHaveValue(entrada);
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("rejeita nome vazio após trim e mantém o orçamento do subgrupo", async () => {
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario);
    const nome = grupo(0).getByRole("textbox", { name: /nome do subgrupo/i });
    await digitar(usuario, nome, "   ");
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(nome, /nome|obrigatóri|informe/i));
    expect(grupo(0).getByRole("textbox", { name: /orçamento em pontos/i })).toHaveValue("120");
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("impede disponibilizar uma soma diferente do total e mantém o saldo visível", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await digitar(usuario, grupo(2).getByRole("textbox", { name: /orçamento em pontos/i }), "41");
    await usuario.click(botaoSalvar());
    expect(await screen.findByRole("alert")).toHaveTextContent(/soma|distribuição|total/i);
    expect(screen.getByRole("status", { name: /saldo a distribuir/i })).toHaveTextContent("1,00");
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("permite adicionar e remover um subgrupo sem perder os IDs dos itens conservados", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await preencherGrupo(usuario, 3, { nome: "Pesquisa de campo", orcamento: "10" });
    expect(grupos()).toHaveLength(4);
    await usuario.click(grupo(3).getByRole("button", { name: /remover subgrupo/i }));
    expect(grupos()).toHaveLength(3);
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, {
      versaoEsperada: 7,
      totalPontos: "120.00",
      subgrupos: regra120().subgrupos,
    }));
  });

  it("associa os campos de erro REST 400 ao grupo correto, sem apagar o rascunho", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    hooks.salvarRegra.mockRejectedValueOnce(erroRest(400, "VALOR_INVALIDO", "Confira os campos da regra.", [
      { campo: "subgrupos[1].orcamentoPontos", codigo: "VALOR_INVALIDO", mensagem: "Orçamento incompatível com o total informado." },
    ]));
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await usuario.click(botaoSalvar());
    await waitFor(() => esperarErroAssociado(grupo(1).getByRole("textbox", { name: /orçamento em pontos/i }), /orçamento incompatível/i));
    expect(total()).toHaveValue("120,00");
    expect(grupo(0).getByRole("textbox", { name: /orçamento em pontos/i })).not.toBeInvalid();
  });
});

describe("RegraPontuacaoCurso - versão, preservação e estados de comunicação", () => {
  it("envia a versão lida e IDs existentes na edição disponível", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await digitar(usuario, grupo(0).getByRole("textbox", { name: /nome do subgrupo/i }), "Apresentações");
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({
      versaoEsperada: 7,
      subgrupos: [expect.objectContaining({ id: SUBGRUPO_IDS[0], nome: "Apresentações" }), expect.anything(), expect.anything()],
    })));
  });

  it("preserva o rascunho no 409 e recarrega apenas pela decisão explícita do usuário", async () => {
    hooks.buscarRegra.mockResolvedValueOnce(regra120()).mockResolvedValueOnce(regra120({ totalPontos: "121.00", versao: 8, subgrupos: [
      { ...regra120().subgrupos[0], nome: "Provas revisadas", orcamentoPontos: "73.00" },
      ...regra120().subgrupos.slice(1),
    ] }));
    hooks.salvarRegra.mockRejectedValueOnce(erroRest(409, "VERSAO_OBSOLETA", "Esta regra foi alterada por outra pessoa. Recarregue para consultar a versão atual."));
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await digitar(usuario, grupo(0).getByRole("textbox", { name: /nome do subgrupo/i }), "Meu rascunho");
    await usuario.click(botaoSalvar());
    expect(await screen.findByRole("alert")).toHaveTextContent(/alterada|versão/i);
    expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Meu rascunho");
    expect(hooks.buscarRegra).toHaveBeenCalledTimes(1);
    await usuario.click(screen.getByRole("button", { name: /recarregar regra/i }));
    await waitFor(() => expect(hooks.buscarRegra).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Provas revisadas"));
    expect(total()).toHaveValue("121,00");
    await usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenLastCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({ versaoEsperada: 8 })));
  });

  it("mantém o rascunho se a recarga após 409 falhar", async () => {
    hooks.buscarRegra.mockResolvedValueOnce(regra120()).mockRejectedValueOnce(erroRest(500, "FALHA_INTERNA", "Não foi possível recarregar a regra."));
    hooks.salvarRegra.mockRejectedValueOnce(erroRest(409, "VERSAO_OBSOLETA", "A regra possui uma versão mais recente."));
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    await digitar(usuario, grupo(0).getByRole("textbox", { name: /nome do subgrupo/i }), "Rascunho preservado");
    await usuario.click(botaoSalvar());
    await screen.findByRole("button", { name: /recarregar regra/i });
    await usuario.click(screen.getByRole("button", { name: /recarregar regra/i }));
    await waitFor(() => expect(screen.getAllByRole("alert").some((alerta) => /não.*recarreg|falha|indisponível/i.test(alerta.textContent ?? ""))).toBe(true));
    expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Rascunho preservado");
    expect(total()).toHaveValue("120,00");
  });

  it.each(["CONFIGURADA", "HISTORICA"] as const)("consulta a regra %s preservada e bloqueia toda mudança estrutural", async (origem) => {
    hooks.buscarRegra.mockResolvedValue(regra120({ origem, estado: "PRESERVADA", usadaEm: "2026-09-28T12:00:00Z" }));
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await screen.findByDisplayValue("120,00");
    expect(screen.getByText(/preservada.*primeiro uso|primeiro uso.*preservada|não.*alterada.*uso/i)).toBeInTheDocument();
    expect(total()).toBeDisabled();
    for (const bloco of grupos()) {
      const consultas = within(bloco);
      expect(consultas.getByRole("textbox", { name: /nome do subgrupo/i })).toBeDisabled();
      expect(consultas.getByRole("textbox", { name: /orçamento em pontos/i })).toBeDisabled();
      const modo = consultas.getByRole("combobox", { name: /modo de quantidade/i });
      expect(modo.matches(":disabled") || modo.getAttribute("aria-disabled") === "true").toBe(true);
      const quantidade = consultas.queryByLabelText(/^quantidade fixa/i);
      if (quantidade) expect(quantidade).toBeDisabled();
      expect(consultas.getByRole("button", { name: /remover subgrupo/i })).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: /adicionar subgrupo/i })).toBeDisabled();
    expect(botaoSalvar()).toBeDisabled();
    fireEvent.click(botaoSalvar());
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
  });

  it("informa carregamento e bloqueia escrita sem preencher um total provisório", async () => {
    hooks.carregandoRegra = true;
    const montagem = montarPagina();
    expect(await screen.findByText(/carregando/i)).toBeInTheDocument();
    expect(botaoSalvar()).toBeDisabled();
    expect(screen.queryByDisplayValue("100,00")).not.toBeInTheDocument();
    hooks.carregandoRegra = false;
    montagem.rerender(pagina());
    await waitFor(() => expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument());
  });

  it("distingue falha de leitura de ausência e permite tentar consultar novamente", async () => {
    hooks.buscarRegra.mockRejectedValueOnce(erroRest(500, "FALHA_INTERNA", "Não foi possível carregar a regra.")).mockResolvedValueOnce(regra120());
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    expect(await screen.findByRole("alert")).toHaveTextContent(/não.*carregar|falha/i);
    expect(screen.queryByText(/regra.*não.*configurada|sem.*configuração/i)).not.toBeInTheDocument();
    expect(botaoSalvar()).toBeDisabled();
    expect(hooks.salvarRegra).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: /tentar novamente|recarregar regra/i }));
    await waitFor(() => expect(total()).toHaveValue("120,00"));
    expect(hooks.buscarRegra).toHaveBeenCalledTimes(2);
  });

  it("não confirma sucesso nem apaga o rascunho quando o envio falha", async () => {
    hooks.salvarRegra.mockRejectedValueOnce(erroRest(500, "FALHA_INTERNA", "Não foi possível salvar a regra."));
    const { usuario } = montarPagina();
    await selecionarPeriodo(usuario);
    await novaRegra(usuario, "120", "Pesquisa aplicada");
    await usuario.click(botaoSalvar());
    expect(await screen.findByRole("alert")).toHaveTextContent(/não.*salvar|falha/i);
    expect(screen.queryByText(/salva.*sucesso|disponibilizada.*sucesso/i)).not.toBeInTheDocument();
    expect(total()).toHaveValue("120");
    expect(grupo(0).getByRole("textbox", { name: /nome do subgrupo/i })).toHaveValue("Pesquisa aplicada");
  });

  it("bloqueia envio repetido em andamento e anuncia sucesso usando a versão retornada", async () => {
    const envio = pendencia<RegraDTO>();
    hooks.salvarRegra.mockReturnValueOnce(envio.promessa);
    const montagem = montarPagina();
    await selecionarPeriodo(montagem.usuario);
    await novaRegra(montagem.usuario, "100,01");
    const salvar = botaoSalvar();
    await montagem.usuario.click(salvar);
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledTimes(1));
    hooks.carregandoRegra = true;
    montagem.rerender(pagina());
    expect(salvar).toBeDisabled();
    expect(salvar).toHaveAccessibleName(/disponibilizar regra|salvar regra/i);
    fireEvent.click(salvar);
    expect(hooks.salvarRegra).toHaveBeenCalledTimes(1);
    const payload = hooks.salvarRegra.mock.calls[0][2] as PayloadRegra;
    hooks.carregandoRegra = false;
    await act(async () => { envio.resolver(regraRetornada(payload, 1)); await envio.promessa; });
    montagem.rerender(pagina());
    expect(await screen.findByRole("alert")).toHaveTextContent(/sucesso/i);
    await digitar(montagem.usuario, grupo(0).getByRole("textbox", { name: /nome do subgrupo/i }), "Projeto revisado");
    await montagem.usuario.click(botaoSalvar());
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenLastCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({
      versaoEsperada: 1,
      subgrupos: [expect.objectContaining({ id: SUBGRUPO_IDS[0], nome: "Projeto revisado" })],
    })));
  });

  it("permite selecionar o período e salvar pelo teclado com controles nomeados", async () => {
    hooks.buscarRegra.mockResolvedValue(regra120());
    const { usuario } = montarPagina();
    const periodo = await screen.findByRole("combobox", { name: /período letivo/i });
    periodo.focus();
    await usuario.keyboard("{Enter}");
    const opcao = await screen.findByRole("option", { name: /2026\.1/ });
    opcao.focus();
    await usuario.keyboard("{Enter}");
    await waitFor(() => expect(hooks.buscarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID));
    await screen.findByDisplayValue("120,00");
    total().focus();
    await usuario.keyboard("{Tab}");
    expect(document.activeElement).not.toBe(document.body);
    expect(total()).not.toHaveFocus();
    const salvar = botaoSalvar();
    salvar.focus();
    expect(salvar).toHaveFocus();
    await usuario.keyboard("{Enter}");
    await waitFor(() => expect(hooks.salvarRegra).toHaveBeenCalledWith(CURSO_ID, PERIODO_ID, expect.objectContaining({ versaoEsperada: 7 })));
  });
});

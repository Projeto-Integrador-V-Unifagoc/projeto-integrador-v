import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider } from "../../components/Notificacao/NotificationProvider";
import type { AlunoChamada } from "../../models/frequencia-model";
import { theme } from "../../theme";
import VisaoOperacional from "./VisaoOperacional";

const api = vi.hoisted(() => ({
  operacoes: {}, listarOpcoes: vi.fn(), obterChamada: vi.fn(), salvarChamada: vi.fn(), gerarRelatorio: vi.fn(),
}));
vi.mock("../../hooks/use-frequencia", () => ({ useFrequencia: () => api }));
const temaTeste = createTheme(theme, { components: { MuiDataGrid: { defaultProps: { disableVirtualization: true } } } });
const alunos: AlunoChamada[] = [
  { id: "ana", matriculaTurmaDisciplinaId: "matricula-ana", matricula: 1, nome: "Ana Sintética", statusMatricula: "ativa", percentualAtual: 100, status: null },
  { id: "bruno", matriculaTurmaDisciplinaId: "matricula-bruno", matricula: 2, nome: "Bruno Sintético", statusMatricula: "ativa", percentualAtual: 100, status: null },
];

function resposta(itens = alunos, jaRegistrada = false) {
  return { alunos: itens, jaRegistrada, chamadaCompleta: itens.every(a => a.status !== null), matriculasIrregulares: 0 };
}
async function carregar(perfil = "professor") {
  localStorage.setItem("@UniEduca:user", JSON.stringify({ tipo_usuario: perfil }));
  render(<ThemeProvider theme={temaTeste}><NotificationProvider><VisaoOperacional /></NotificationProvider></ThemeProvider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Carregar" })).toBeEnabled());
  await userEvent.setup().click(screen.getByRole("button", { name: "Carregar" }));
  await screen.findByRole("row", { name: /Ana Sintética/ });
}
function linha(nome: string) { return within(screen.getByRole("row", { name: new RegExp(nome) })); }

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 800));
  vi.stubGlobal("confirm", vi.fn(() => true));
  api.listarOpcoes.mockResolvedValue({
    turmas: [{ id: "oferta", sigla: "T1", disciplina: { nome: "Algoritmos" }, periodoLetivo: { codigo: "2026.2" } }],
    locais: [{ id: "sala", codigo: "Sala 1" }],
  });
  api.obterChamada.mockResolvedValue(resposta());
  api.salvarChamada.mockImplementation(async (dados: { registros: { alunoId: string; status: AlunoChamada["status"] }[] }) => {
    api.obterChamada.mockResolvedValue(resposta(alunos.map(a => ({ ...a, frequenciaId: `frequencia-${a.id}`, status: dados.registros.find(r => r.alunoId === a.id)!.status })), true));
  });
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Frequência - rascunho e confirmações", () => {
  it("preenche ausente sem gravar e permite salvar uma chamada inteira sem tocar nos interruptores", async () => {
    await carregar();
    expect(linha("Ana Sintética").getByText("Ausente")).toBeVisible();
    expect(linha("Bruno Sintético").getByText("Ausente")).toBeVisible();
    expect(linha("Ana Sintética").getByRole("switch")).not.toBeChecked();
    expect(api.salvarChamada).not.toHaveBeenCalled();
    expect(alunos[0].status).toBeNull();
    const salvar = screen.getByRole("button", { name: "Salvar chamada completa" });
    expect(salvar).toBeEnabled();
    await userEvent.setup().click(salvar);
    await waitFor(() => expect(api.salvarChamada).toHaveBeenCalledTimes(1));
    expect(api.salvarChamada).toHaveBeenCalledWith(expect.objectContaining({ registros: [
      { alunoId: "ana", status: "AUSENTE" }, { alunoId: "bruno", status: "AUSENTE" },
    ] }));
    await waitFor(() => expect(api.obterChamada).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(salvar).toBeDisabled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("preserva presentes e ausentes de uma chamada salva", async () => {
    api.obterChamada.mockResolvedValue(resposta(alunos.map((a, i) => ({ ...a, frequenciaId: a.id, status: i === 0 ? "PRESENTE" : "AUSENTE" })), true));
    await carregar();
    expect(linha("Ana Sintética").getByRole("switch")).toBeChecked();
    expect(linha("Bruno Sintético").getByText("Ausente")).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar chamada completa" })).toBeDisabled();
    expect(api.salvarChamada).not.toHaveBeenCalled();
  });

  for (const perfil of ["secretaria", "administrador"]) it(`mantém Não lançada para ${perfil} sem criar faltas`, async () => {
    await carregar(perfil);
    expect(linha("Ana Sintética").getByText("Não lançada")).toBeVisible();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar chamada completa" })).not.toBeInTheDocument();
    expect(api.salvarChamada).not.toHaveBeenCalled();
  });

  it("completa somente os alunos sem registro em uma chamada parcialmente salva", async () => {
    api.obterChamada.mockResolvedValue(resposta([{ ...alunos[0], frequenciaId: "existente", status: "PRESENTE" }, alunos[1]], true));
    await carregar();
    expect(linha("Ana Sintética").getByRole("switch")).toBeChecked();
    expect(linha("Bruno Sintético").getByText("Ausente")).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar chamada completa" })).toBeEnabled();
    expect(api.salvarChamada).not.toHaveBeenCalled();
  });

  for (const cancelar of ["Cancelar", "Fechar diálogo", "Escape"]) it(`mantém o rascunho ao cancelar todos presentes por ${cancelar}`, async () => {
    await carregar();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Marcar todos presentes" }));
    const dialogo = await screen.findByRole("dialog", { name: "Marcar todos presentes?" });
    expect(within(dialogo).getByText(/Salve a chamada/)).toBeVisible();
    await waitFor(() => expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus());
    if (cancelar === "Escape") await user.keyboard("{Escape}");
    else await user.click(within(dialogo).getByRole("button", { name: cancelar }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(linha("Ana Sintética").getByText("Ausente")).toBeVisible();
    expect(api.salvarChamada).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("marca todos presentes somente após confirmar no modal e ainda exige salvar", async () => {
    await carregar();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Marcar todos presentes" }));
    const dialogo = await screen.findByRole("dialog", { name: "Marcar todos presentes?" });
    await user.click(within(dialogo).getByRole("button", { name: "Marcar presentes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(linha("Ana Sintética").getByRole("switch")).toBeChecked();
    expect(linha("Bruno Sintético").getByRole("switch")).toBeChecked();
    expect(api.salvarChamada).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("não recarrega nem perde edições ao cancelar descarte, e recarrega ao confirmar", async () => {
    await carregar();
    const user = userEvent.setup();
    await user.click(linha("Ana Sintética").getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Carregar" }));
    let dialogo = await screen.findByRole("dialog", { name: "Descartar alterações?" });
    expect(api.obterChamada).toHaveBeenCalledTimes(1);
    await user.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(linha("Ana Sintética").getByRole("switch")).toBeChecked();
    expect(api.obterChamada).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Carregar" }));
    dialogo = await screen.findByRole("dialog", { name: "Descartar alterações?" });
    await user.click(within(dialogo).getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(api.obterChamada).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(linha("Ana Sintética").getByText("Ausente")).toBeVisible();
    expect(api.salvarChamada).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});

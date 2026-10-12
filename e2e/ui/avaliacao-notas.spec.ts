import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { test, expect } from "../fixtures/test.js";
import { loginViaUI } from "../fixtures/auth.fixture.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import type { RegraPontuacaoCriada } from "../factories/regra-pontuacao.factory.js";
import { config, uiEnabled } from "../helpers/config.js";
import { db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";

// Cada jornada cria seu grafo via API. Nenhuma limpeza global ou guard desativado.
test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

const evidencias = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../specs/001-notas-dinamicas/evidencias-ui");
const viewports = [
  { nome: "desktop", width: 1280, height: 720 },
  { nome: "mobile", width: 390, height: 844 },
] as const;
interface AlunoGrade { alunoId: string; nome: string; valor: string | null; lancada: boolean }
interface Grade { avaliacao: { valorMaximo: string }; alunos: AlunoGrade[] }
const grupo = (page: Page, nome: string) => page.getByRole("group", { name: nome, exact: true });
const dialogo = (page: Page) => page.getByRole("dialog", { name: /^(Nova|Editar) avaliação$/ });
const planoPath = (oferta: string) => `/avaliacoes/plano/${oferta}`;
const lancamentoPath = (avaliacao: string) => `/notas/avaliacoes/${avaliacao}/lancamento`;
const lotePath = (avaliacao: string) => `/notas/avaliacoes/${avaliacao}/lote`;

async function escolher(page: Page, campo: Locator, opcao: string | RegExp) {
  await expect(campo).toBeEnabled();
  await campo.focus();
  await page.keyboard.press("Enter");
  const item = page.getByRole("option", { name: opcao, exact: typeof opcao === "string" });
  await expect(item).toBeVisible();
  await item.focus();
  await page.keyboard.press("Enter");
}

async function contextoAvaliacoes(page: Page, c: Cenario, oferta = c.turmaDisciplinaId) {
  // O Dialog MUI mantém seu seletor durante a saída. Aguarda o fechamento real
  // antes de navegar pelo controle do contexto principal.
  await expect(dialogo(page)).toHaveCount(0);
  const atribuicoes = await c.apiProfessor.get("/avaliacoes/atribuicoes");
  expect(atribuicoes.status).toBe(200);
  const item = atribuicoes.body.find((a: { id: string }) => a.id === oferta);
  expect(item).toBeTruthy();
  const nome = `${item.turma_sigla || item.turma_descricao} - ${item.disciplina_nome}`;
  const campo = page.getByRole("main").getByRole("combobox", { name: "Turma e disciplina", exact: true });
  await expect(campo).toBeVisible();
  if ((await campo.textContent()) !== nome) await escolher(page, campo, nome);
  await expect(campo).toHaveText(nome);
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Carregando plano" })).toHaveCount(0);
}

async function abrirAvaliacoes(page: Page, c: Cenario) {
  await page.goto(`${config.webUrl}/avaliacoes/lista`);
  await expect(page.getByRole("heading", { name: "Gestão de avaliações" })).toBeVisible();
  await contextoAvaliacoes(page, c);
}

async function criarViaApi(c: Cenario, regra: RegraPontuacaoCriada, valor: string, descricao: string, subgrupo = 0, oferta = c.turmaDisciplinaId) {
  const resposta = await c.apiProfessor.post("/avaliacoes", { body: {
    turma_disciplina_id: oferta, tipo_avaliacao: "REGULAR", subgrupo_id: regra.subgrupos[subgrupo].id,
    valor, descricao_avaliacao: descricao, data_lancamento: "2026-09-28", data_devolucao: "2026-10-01",
  } });
  expect(resposta.status).toBe(201);
  expect(resposta.body.valor).toBe(valor);
  return String(resposta.body.id);
}

async function preencherAvaliacao(page: Page, subgrupo: string, valor: string, descricao: string) {
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const form = dialogo(page);
  await expect(form).toBeVisible();
  await escolher(page, form.getByRole("combobox", { name: "Subgrupo", exact: true }), subgrupo);
  await form.getByRole("textbox", { name: "Valor máximo", exact: true }).fill(valor);
  await form.getByRole("textbox", { name: "Descrição", exact: true }).fill(descricao);
  await form.getByLabel("Data de lançamento", { exact: true }).fill("2026-09-28");
  await form.getByLabel("Data de devolução", { exact: true }).fill("2026-10-01");
}

async function enviarAvaliacao(page: Page, status: number, metodo = "POST", id?: string) {
  const esperado = id ? `/avaliacoes/${id}` : "/avaliacoes";
  // Enter no campo textual exercita a submissão nativa do formulário.
  await dialogo(page).getByRole("textbox", { name: "Descrição", exact: true }).focus();
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === esperado && r.request().method() === metodo),
    page.keyboard.press("Enter"),
  ]);
  expect(resposta.status()).toBe(status);
  return resposta.json();
}

async function notaCelula(page: Page, nome: string) {
  const linha = page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: nome, exact: true }) });
  const coluna = page.getByRole("columnheader", { name: "Nota", exact: true });
  // O DataGrid pode virtualizar a coluna no celular. End usa navegação real.
  if (!(await coluna.count())) {
    await linha.getByRole("gridcell").first().focus();
    await page.keyboard.press("End");
  }
  const indice = await coluna.getAttribute("aria-colindex");
  return linha.locator(`[role="gridcell"][aria-colindex="${indice}"]`);
}

async function editarNota(page: Page, nome: string, valor: string, confirmar = true) {
  const celula = await notaCelula(page, nome);
  await celula.dblclick();
  const entrada = page.getByRole("textbox", { name: `Nota de ${nome}`, exact: true });
  await expect(entrada).toBeVisible();
  await entrada.fill(valor);
  if (confirmar) await entrada.press("Enter");
  return entrada;
}

async function abrirNotas(page: Page, c: Cenario, avaliacao: string, descricao: string): Promise<Grade> {
  await page.goto(`${config.webUrl}/notas/lancamento`);
  await expect(page.getByRole("heading", { name: "Lançamento de Notas" })).toBeVisible();
  const opcoes = await c.apiProfessor.get("/notas/opcoes");
  expect(opcoes.status).toBe(200);
  const atribuicao = opcoes.body.atribuicoes.find((a: { turmaDisciplinaId: string }) => a.turmaDisciplinaId === c.turmaDisciplinaId);
  const nome = `${atribuicao.turma.sigla} — ${atribuicao.disciplina.nome} — ${atribuicao.periodoLetivo.codigo}`;
  const campo = page.getByRole("combobox", { name: "Turma e disciplina", exact: true });
  await expect(campo).toBeVisible();
  if ((await campo.textContent()) !== nome) await escolher(page, campo, nome);
  const selectAvaliacao = page.getByRole("combobox", { name: "Avaliação", exact: true });
  await escolher(page, selectAvaliacao, new RegExp(descricao));
  const grade = await c.apiProfessor.get(lancamentoPath(avaliacao));
  expect(grade.status).toBe(200);
  await expect(page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: grade.body.alunos[0].nome, exact: true }) })).toBeVisible();
  return grade.body;
}

async function capturar(page: Page, info: TestInfo, viewport: string, estado: string, dados: Record<string, unknown> = {}) {
  await mkdir(evidencias, { recursive: true });
  const prefixo = `t052-${viewport}-${estado}`;
  const arquivo = path.join(evidencias, `${prefixo}.png`);
  await page.screenshot({ path: arquivo, fullPage: true, animations: "disabled" });
  await info.attach(prefixo, { path: arquivo, contentType: "image/png" });
  const medidas = await page.evaluate(() => {
    const raiz = document.documentElement;
    const main = document.querySelector("#root main");
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find((elemento) =>
      getComputedStyle(elemento).visibility !== "hidden" && !elemento.closest('[aria-hidden="true"]'));
    const limites = dialog?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflowHorizontal: Math.max(0, raiz.scrollWidth - raiz.clientWidth, main ? main.scrollWidth - main.clientWidth : 0),
      dialogo: limites ? { left: limites.left, right: limites.right, top: limites.top, bottom: limites.bottom, scrollWidth: dialog?.scrollWidth, clientWidth: dialog?.clientWidth } : null,
      foco: { nome: document.activeElement?.getAttribute("aria-label"), invalido: document.activeElement?.getAttribute("aria-invalid"), descritoPor: document.activeElement?.getAttribute("aria-describedby") },
      alertas: [...document.querySelectorAll('[role="alert"]')].map((a) => a.textContent),
    };
  });
  expect(medidas.overflowHorizontal).toBeLessThanOrEqual(1);
  if (medidas.dialogo) {
    expect(medidas.dialogo.left).toBeGreaterThanOrEqual(0);
    expect(medidas.dialogo.right).toBeLessThanOrEqual(medidas.viewport.width);
    expect(medidas.dialogo.bottom).toBeLessThanOrEqual(medidas.viewport.height);
  }
  const json = JSON.stringify({ ...medidas, ...dados }, null, 2);
  await writeFile(path.join(evidencias, `${prefixo}.json`), `${json}\n`, "utf8");
  return medidas;
}

async function acoesDaAvaliacao(page: Page, descricao: string) {
  await page.getByRole("grid").getByRole("gridcell").first().focus();
  await page.keyboard.press("Home");
  const linha = page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: descricao, exact: true }) });
  await linha.getByRole("gridcell").first().focus();
  await page.keyboard.press("End");
  return {
    editar: page.getByRole("button", { name: `Editar avaliação ${descricao}`, exact: true }),
    excluir: page.getByRole("button", { name: `Excluir avaliação ${descricao}`, exact: true }),
  };
}

for (const viewport of viewports) {
  test.describe(`Plano e notas ${viewport.nome} @ui`, () => {
    test.skip(!uiEnabled, "Informe o frontend de testes para executar a jornada real.");
    test("regra120, conflito real, lote atômico, zero, estrutura e teclado", async ({ page, novoCenario, runId }, info) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const c = await novoCenario();
      const irma = await c.criarOfertaIrma(`${runId}i`);
      await loginViaUI(page, c.professor.email, "Professor@123");
      await abrirAvaliacoes(page, c);
      await expect(page.getByText(/regra de pontuação não configurada/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Adicionar", exact: true })).toBeDisabled();
      await capturar(page, info, viewport.nome, "sem-regra");

      const regra = await c.configurarRegra("120");
      const ids: string[] = [];
      for (const [indice, valor] of ["12.00", "18.00", "18.00"].entries()) ids.push(await criarViaApi(c, regra, valor, `Prova ${indice + 1} T052`));
      await abrirAvaliacoes(page, c);
      await expect(page.getByText("Total da regra: 120,00 pontos")).toBeVisible();
      await expect(grupo(page, "Provas")).toContainText("Distribuídos: 48,00 pontos");
      await expect(grupo(page, "Provas")).toContainText("Saldo: 24,00 pontos");
      await expect(grupo(page, "Provas")).toContainText("Quantidade: 3/4 · Disponível: 1");
      await expect(grupo(page, "Trabalhos e projetos")).toContainText("Quantidade: 0 · Sem limite");
      await capturar(page, info, viewport.nome, "plano-incompleto");
      await contextoAvaliacoes(page, c, irma.turmaDisciplinaId);
      await expect(grupo(page, "Provas")).toContainText("Saldo: 72,00 pontos");
      await expect(grupo(page, "Provas")).toContainText("Quantidade: 0/4 · Disponível: 4");
      await contextoAvaliacoes(page, c);
      await expect(grupo(page, "Provas")).toContainText("Saldo: 24,00 pontos");

      let postsPagina = 0, getsPlano = 0, lotesPagina = 0;
      page.on("request", (r) => {
        const pathname = new URL(r.url()).pathname;
        if (pathname === "/avaliacoes" && r.method() === "POST") postsPagina++;
        if (pathname === planoPath(c.turmaDisciplinaId) && r.method() === "GET") getsPlano++;
        if (/^\/notas\/avaliacoes\/[^/]+\/lote$/.test(pathname) && r.method() === "PUT") lotesPagina++;
      });
      await preencherAvaliacao(page, "Provas", "24,001", "Quarta prova T052");
      const maximo = dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true });
      await dialogo(page).getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(maximo).toHaveAttribute("aria-invalid", "true");
      await expect(maximo).toBeFocused();
      await expect(maximo).toHaveAccessibleDescription(/duas casas|decimal|pontos/i);
      expect(postsPagina).toBe(0);
      await maximo.fill("24,01");
      await dialogo(page).getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(maximo).toHaveAccessibleDescription("Saldo disponível: 24,00 pontos.");
      expect(postsPagina).toBe(0);
      await maximo.fill("24");
      // Outra sessão consome a última vaga após a leitura, sem respostas simuladas.
      const concorrente = await criarViaApi(c, regra, "1.00", "Concorrente T052");
      const getsAntes = getsPlano;
      const conflito = await enviarAvaliacao(page, 409);
      expect(conflito.codigo).toMatch(/QUANTIDADE/);
      await expect(maximo).toHaveValue("24");
      await expect(dialogo(page).getByRole("textbox", { name: "Descrição", exact: true })).toHaveValue("Quarta prova T052");
      expect(getsPlano).toBe(getsAntes);
      await capturar(page, info, viewport.nome, "conflito-rascunho", { codigo: conflito.codigo });
      await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === planoPath(c.turmaDisciplinaId) && r.request().method() === "GET"),
        dialogo(page).getByRole("button", { name: "Recarregar plano", exact: true }).click(),
      ]);
      await expect(maximo).toHaveValue("24");
      expect(postsPagina).toBe(1);
      await dialogo(page).getByRole("button", { name: "Cancelar", exact: true }).click();
      expect((await c.apiProfessor.del(`/avaliacoes/${concorrente}`)).status).toBe(204);
      await abrirAvaliacoes(page, c);
      await preencherAvaliacao(page, "Provas", "24", "Quarta prova T052");
      const quarta = await enviarAvaliacao(page, 201);
      ids.push(quarta.id);
      await expect(dialogo(page)).toHaveCount(0);
      await expect(grupo(page, "Provas")).toContainText("Quantidade: 4/4 · Disponível: 0");
      await expect(grupo(page, "Provas")).toContainText("Saldo: 0,00 pontos");
      for (const [subgrupo, valor, descricao] of [["Avaliações institucionais", "6", "Institucional T052"], ["Trabalhos e projetos", "42", "Projeto T052"]]) {
        await preencherAvaliacao(page, subgrupo, valor, descricao);
        ids.push((await enviarAvaliacao(page, 201)).id);
        await expect(dialogo(page)).toHaveCount(0);
      }
      await expect(page.getByText("Plano completo", { exact: true })).toBeVisible();
      const planoCompleto = await c.apiProfessor.get(planoPath(c.turmaDisciplinaId));
      expect(planoCompleto.body.planoCompleto).toBe(true);
      expect(planoCompleto.body.subgrupos[2]).toMatchObject({ quantidadeFixa: null, quantidadeDisponivel: null, quantidadeAtual: 1 });
      await capturar(page, info, viewport.nome, "plano-completo", { maximos: ["12.00", "18.00", "18.00", "24.00", "6.00", "42.00"], semLimite: planoCompleto.body.subgrupos[2] });

      await contextoAvaliacoes(page, c, irma.turmaDisciplinaId);
      await preencherAvaliacao(page, "Trabalhos e projetos", "1", "Projeto com resposta perdida T052");
      let criacaoCommitada: { id: string } | undefined;
      const alvoCriacao = (url: URL) => url.pathname === "/avaliacoes";
      // O backend grava de verdade; somente a entrega da resposta ao navegador falha.
      await page.route(alvoCriacao, async (rota) => {
        if (rota.request().method() !== "POST") { await rota.continue(); return; }
        const resposta = await rota.fetch();
        expect(resposta.status()).toBe(201);
        criacaoCommitada = await resposta.json();
        await rota.abort("failed");
      });
      const postsAntesDaPerda = postsPagina;
      await dialogo(page).getByRole("textbox", { name: "Descrição", exact: true }).press("Enter");
      await expect(dialogo(page).getByText(/não foi possível confirmar o salvamento/i)).toBeVisible();
      await expect(dialogo(page).getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("textbox", { name: "Descrição", exact: true })).toHaveValue("Projeto com resposta perdida T052");
      expect(postsPagina).toBe(postsAntesDaPerda + 1);
      await page.unroute(alvoCriacao);
      expect(criacaoCommitada?.id).toBeTruthy();
      expect((await c.apiProfessor.get(`/avaliacoes/${criacaoCommitada!.id}`)).status).toBe(200);
      await dialogo(page).getByRole("button", { name: "Recarregar plano", exact: true }).click();
      await expect(dialogo(page).getByText(/cancelar.*lista|lista.*cancelar/i)).toBeVisible();
      await expect(dialogo(page).getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
      expect(postsPagina).toBe(postsAntesDaPerda + 1);
      await capturar(page, info, viewport.nome, "criacao-incerta", { commitReal: true, id: criacaoCommitada!.id, repeticaoBloqueada: true, respostaInterrompidaPeloTeste: true });
      await dialogo(page).getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: "Projeto com resposta perdida T052", exact: true }) })).toBeVisible();
      const criadasIrma = await c.apiProfessor.get("/avaliacoes", { query: { turma_disciplina_id: irma.turmaDisciplinaId } });
      expect(criadasIrma.body).toHaveLength(1);
      await contextoAvaliacoes(page, c);

      const movimento = await acoesDaAvaliacao(page, "Prova 1 T052");
      await movimento.editar.click();
      const ofertasMovimento = await c.apiProfessor.get("/avaliacoes/atribuicoes");
      const ofertaDestino = ofertasMovimento.body.find((a: { id: string }) => a.id === irma.turmaDisciplinaId);
      const nomeDestino = `${ofertaDestino.turma_sigla || ofertaDestino.turma_descricao} - ${ofertaDestino.disciplina_nome}`;
      await escolher(page, dialogo(page).getByRole("combobox", { name: "Turma e disciplina", exact: true }), nomeDestino);
      await escolher(page, dialogo(page).getByRole("combobox", { name: "Subgrupo", exact: true }), "Provas");
      const bloqueadorDestino = await criarViaApi(c, regra, "72.00", "Orçamento consumido no destino T052", 0, irma.turmaDisciplinaId);
      const conflitoMovimento = await enviarAvaliacao(page, 409, "PUT", ids[0]);
      expect(conflitoMovimento.codigo).toMatch(/ORCAMENTO/);
      await dialogo(page).getByRole("button", { name: "Recarregar plano", exact: true }).click();
      await expect(dialogo(page).getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
      await dialogo(page).getByRole("button", { name: "Cancelar", exact: true }).click();
      await contextoAvaliacoes(page, c);
      await page.getByRole("grid").getByRole("gridcell").first().focus();
      await page.keyboard.press("Home");
      await expect(page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: "Prova 1 T052", exact: true }) })).toBeVisible();
      await expect(page.getByRole("row").filter({ has: page.getByRole("gridcell", { name: "Orçamento consumido no destino T052", exact: true }) })).toHaveCount(0);
      expect((await c.apiProfessor.get(`/avaliacoes/${ids[0]}`)).body.turma_disciplina_id).toBe(c.turmaDisciplinaId);
      await capturar(page, info, viewport.nome, "contexto-conservado", { codigo: conflitoMovimento.codigo, origem: c.turmaDisciplinaId, destino: irma.turmaDisciplinaId, tabelaDaOrigem: true });
      expect((await c.apiProfessor.del(`/avaliacoes/${bloqueadorDestino}`)).status).toBe(204);

      const matriculados = [await c.matricularAluno(), await c.matricularAluno(), await c.matricularAluno()];
      const grade = await abrirNotas(page, c, quarta.id, "Quarta prova T052");
      const alunoA = grade.alunos.find((a) => a.alunoId === matriculados[0].aluno.id)!;
      const alunoB = grade.alunos.find((a) => a.alunoId === matriculados[1].aluno.id)!;
      const ausente = grade.alunos.find((a) => a.alunoId === matriculados[2].aluno.id)!;
      await expect(page.getByText(/máximo 24,00 pontos/)).toBeVisible();
      await editarNota(page, alunoA.nome, "12", false);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("textbox", { name: `Nota de ${alunoA.nome}`, exact: true })).toHaveCount(0);
      await expect(await notaCelula(page, alunoA.nome)).toContainText("Não lançada");
      await expect(page.getByRole("button", { name: "Salvar lote", exact: true })).toBeDisabled();
      for (const valor of ["24,01", "1,001"]) {
        const invalida = await editarNota(page, alunoA.nome, valor);
        await expect(invalida).toHaveAttribute("aria-invalid", "true");
        await expect(invalida).toBeFocused();
        await expect(invalida).toHaveAccessibleDescription(/máximo|decimal|casas|pontos/i);
        expect(lotesPagina).toBe(0);
        await page.keyboard.press("Escape");
      }
      await editarNota(page, alunoA.nome, "12");
      await editarNota(page, alunoB.nome, "22");
      // Máximo muda antes da primeira nota: só o segundo item passa a ser inválido.
      expect((await c.apiProfessor.put(`/avaliacoes/${quarta.id}`, { body: { valor: "18.00" } })).status).toBe(200);
      const [rejeicao] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === lotePath(quarta.id) && r.request().method() === "PUT"),
        page.getByRole("button", { name: "Salvar lote", exact: true }).click(),
      ]);
      expect(rejeicao.status()).toBe(400);
      await expect(page.getByText(/nenhuma nota foi salva.*rascunho/i)).toBeVisible();
      const entradaErro = page.getByRole("textbox", { name: `Nota de ${alunoB.nome}`, exact: true });
      await expect(entradaErro).toHaveValue("22,00");
      await expect(entradaErro).toHaveAttribute("aria-invalid", "true");
      await expect(entradaErro).toHaveAccessibleDescription("A nota excede o máximo desta avaliação.");
      await expect(entradaErro).toBeFocused();
      await expect.poll(async () => entradaErro.evaluate((entrada) => {
        const helper = document.getElementById(entrada.getAttribute("aria-describedby") ?? "");
        const celula = entrada.closest('[role="gridcell"]');
        if (!helper || !celula) return false;
        return helper.scrollWidth <= helper.clientWidth + 1
          && helper.getBoundingClientRect().bottom <= celula.getBoundingClientRect().bottom + 1;
      }), { message: "O helper de erro deve caber inteiro na célula, sem corte horizontal ou vertical." }).toBe(true);
      await expect(await notaCelula(page, alunoA.nome)).toContainText("12,00");
      const depoisErro = await c.apiProfessor.get(lancamentoPath(quarta.id));
      expect(depoisErro.body.alunos.map((a: AlunoGrade) => a.valor)).toEqual([null, null, null]);
      expect(await db()("piv.nota").where({ avaliacao_id: quarta.id }).count("* as total").first()).toMatchObject({ total: "0" });
      await capturar(page, info, viewport.nome, "lote-rejeitado", { status: 400, notasPersistidas: 0, rascunho: ["12.00", "22.00"], maximoAtual: "18.00" });
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Recarregar notas", exact: true }).click();
      await expect(page.getByText(/máximo 18,00 pontos/)).toBeVisible();
      await expect(await notaCelula(page, alunoA.nome)).toContainText("Não lançada");
      expect((await c.apiProfessor.put(`/avaliacoes/${quarta.id}`, { body: { valor: "24.00" } })).status).toBe(200);
      await abrirNotas(page, c, quarta.id, "Quarta prova T052");
      await editarNota(page, alunoA.nome, "0");
      await editarNota(page, alunoB.nome, "24");
      const [salva] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === lotePath(quarta.id) && r.request().method() === "PUT"),
        page.getByRole("button", { name: "Salvar lote", exact: true }).click(),
      ]);
      expect(salva.status()).toBe(200);
      expect(salva.request().postDataJSON().itens).toEqual(expect.arrayContaining([{ alunoId: alunoA.alunoId, valor: "0.00" }, { alunoId: alunoB.alunoId, valor: "24.00" }]));
      expect(salva.request().postDataJSON().itens).toHaveLength(2);
      await expect(await notaCelula(page, alunoA.nome)).toHaveText("0,00");
      await expect(await notaCelula(page, alunoB.nome)).toHaveText("24,00");
      await expect(await notaCelula(page, ausente.nome)).toHaveText("Não lançada");
      const persistida = await c.apiProfessor.get(lancamentoPath(quarta.id));
      expect(persistida.body.alunos.find((a: AlunoGrade) => a.alunoId === alunoA.alunoId)).toMatchObject({ valor: "0.00", lancada: true });
      expect(persistida.body.alunos.find((a: AlunoGrade) => a.alunoId === ausente.alunoId)).toMatchObject({ valor: null, lancada: false });
      await capturar(page, info, viewport.nome, "zero-maximo-ausencia", { notas: ["0.00", "24.00", null], lotesDaPagina: lotesPagina });

      await abrirAvaliacoes(page, c);
      const marcada = await c.apiProfessor.get(`/avaliacoes/${quarta.id}`);
      expect(marcada.body.primeiraNotaEm).toBeTruthy();
      const acoes = await acoesDaAvaliacao(page, "Quarta prova T052");
      await expect(acoes.excluir).toBeDisabled();
      await acoes.editar.click();
      await expect(dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("combobox", { name: "Subgrupo", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("combobox", { name: "Turma e disciplina", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("textbox", { name: "Descrição", exact: true })).toBeEnabled();
      await capturar(page, info, viewport.nome, "estrutura-preservada", { primeiraNotaEm: marcada.body.primeiraNotaEm });
      await dialogo(page).getByRole("textbox", { name: "Descrição", exact: true }).fill("Quarta prova revisada T052");
      await dialogo(page).getByLabel("Data de devolução", { exact: true }).fill("2026-10-02");
      const editada = await enviarAvaliacao(page, 200, "PUT", quarta.id);
      expect(editada.valor).toBe("24.00");
      expect(editada.subgrupo_id).toBe(regra.subgrupos[0].id);
      await expect(dialogo(page)).toHaveCount(0);
      const metadata = await c.apiProfessor.get(`/avaliacoes/${quarta.id}`);
      expect(metadata.body.descricao_avaliacao).toBe("Quarta prova revisada T052");
      expect(metadata.body.primeiraNotaEm).toBe(marcada.body.primeiraNotaEm);

      const acoesPrimeira = await acoesDaAvaliacao(page, "Prova 1 T052");
      await acoesPrimeira.editar.click();
      await dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true }).fill("10");
      await dialogo(page).getByRole("textbox", { name: "Descrição", exact: true }).fill("Metadados mantidos após primeira nota T052");
      await dialogo(page).getByLabel("Data de devolução", { exact: true }).fill("2026-10-03");
      expect((await c.apiProfessor.put(lotePath(ids[0]), { body: { itens: [{ alunoId: alunoA.alunoId, valor: "0.00" }] } })).status).toBe(200);
      const marcadorConflito = await enviarAvaliacao(page, 409, "PUT", ids[0]);
      expect(marcadorConflito.codigo).toBe("AVALIACAO_COM_NOTA");
      await expect(dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true })).toHaveValue("10");
      await dialogo(page).getByRole("button", { name: "Recarregar plano", exact: true }).click();
      await expect(dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("textbox", { name: "Valor máximo", exact: true })).toHaveValue("12,00");
      await expect(dialogo(page).getByRole("combobox", { name: "Subgrupo", exact: true })).toBeDisabled();
      await expect(dialogo(page).getByRole("textbox", { name: "Descrição", exact: true })).toHaveValue("Metadados mantidos após primeira nota T052");
      await expect(dialogo(page).getByLabel("Data de devolução", { exact: true })).toHaveValue("2026-10-03");
      await capturar(page, info, viewport.nome, "primeira-nota-concorrente", { codigo: "AVALIACAO_COM_NOTA", estruturaRecarregada: true, metadadosConservados: true });
      const primeiraRevisada = await enviarAvaliacao(page, 200, "PUT", ids[0]);
      expect(primeiraRevisada.valor).toBe("12.00");
      await expect(dialogo(page)).toHaveCount(0);

      const fechada = await c.apiSecretaria.put(`/periodos-letivos/${c.periodoLetivoId}`, { body: { status: "encerrado" } });
      expect(fechada.status).toBe(200);
      await abrirNotas(page, c, quarta.id, "Quarta prova revisada T052");
      await expect(page.getByRole("alert").filter({ hasText: /período.*fechado|período.*encerrado/i })).toBeVisible();
      await (await notaCelula(page, alunoA.nome)).dblclick();
      await expect(page.getByRole("textbox", { name: `Nota de ${alunoA.nome}`, exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Autorizar retificação", exact: true })).toHaveCount(0);
      await capturar(page, info, viewport.nome, "periodo-encerrado", {
        contexto: { cursoId: c.cursoId, periodoLetivoId: c.periodoLetivoId, turmaDisciplinaId: c.turmaDisciplinaId },
        avaliacoes: ids, perfil: "professor", statusPeriodo: "encerrado",
        limites: "Conflito intercalado real; disputa simultânea PostgreSQL e leitores/resultados pertencem aos testes próprios de integração e US3.",
      });
    });
  });
}

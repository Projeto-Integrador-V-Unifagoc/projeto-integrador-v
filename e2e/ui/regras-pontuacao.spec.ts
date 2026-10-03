import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { test, expect } from "../fixtures/test.js";
import { loginViaUI } from "../fixtures/auth.fixture.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import type { RegraPontuacaoCriada } from "../factories/regra-pontuacao.factory.js";
import { config, uiEnabled } from "../helpers/config.js";
import { contar, db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";

// Dados próprios por cenário. Não usa limpeza global nem desativa guards.
test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

const diretorioEvidencias = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../specs/001-notas-dinamicas/evidencias-ui",
);
const viewports = [
  { nome: "desktop", width: 1280, height: 720 },
  { nome: "mobile", width: 390, height: 844 },
] as const;

function caminho(cenario: Cenario): string {
  return `/regras-pontuacao/cursos/${cenario.cursoId}/periodos/${cenario.periodoLetivoId}`;
}

function grupo(page: Page, indice: number): Locator {
  return page.getByRole("group", { name: `Subgrupo ${indice + 1}`, exact: true });
}

function total(page: Page): Locator {
  return page.getByRole("textbox", { name: /^Total de pontos/ });
}

function salvar(page: Page): Locator {
  return page.getByRole("button", { name: /^(Disponibilizar|Salvar) regra$/ });
}

async function escolherPeloTeclado(page: Page, campo: Locator, opcao: string): Promise<void> {
  await campo.focus();
  await expect(campo).toBeFocused();
  await page.keyboard.press("Enter");
  const item = page.getByRole("option", { name: opcao, exact: true });
  await expect(item).toBeVisible();
  await item.focus();
  await page.keyboard.press("Enter");
}

async function selecionarPeriodo(page: Page, cenario: Cenario): Promise<void> {
  const campo = page.getByRole("combobox", { name: /^Período letivo/ });
  await expect(campo).toBeEnabled();
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === caminho(cenario) && r.request().method() === "GET"),
    escolherPeloTeclado(page, campo, cenario.periodoCodigo),
  ]);
  await expect(campo).toContainText(cenario.periodoCodigo);
}

async function abrirRegra(page: Page, cenario: Cenario): Promise<void> {
  await page.goto(`${config.webUrl}/cursos/${cenario.cursoId}/pontuacao`);
  await expect(page.getByRole("heading", { name: /^Pontuação - Curso/ })).toBeVisible();
  await selecionarPeriodo(page, cenario);
}

async function enviarPeloTeclado(page: Page, cenario: Cenario, status: number) {
  const botao = salvar(page);
  await botao.focus();
  await expect(botao).toBeFocused();
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === caminho(cenario) && r.request().method() === "PUT"),
    page.keyboard.press("Enter"),
  ]);
  expect(resposta.status()).toBe(status);
  return resposta.json();
}

async function registrarEstado(page: Page, testInfo: TestInfo, viewport: string, estado: string) {
  await mkdir(diretorioEvidencias, { recursive: true });
  const prefixo = `t075-${viewport}-regra-${estado}`;
  const arquivo = path.join(diretorioEvidencias, `${prefixo}.png`);
  await page.getByRole("heading", { name: /^Pontuação - Curso/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: arquivo, fullPage: true, animations: "disabled" });
  await testInfo.attach(prefixo, { path: arquivo, contentType: "image/png" });
  // O layout tem scroll interno em main; uma segunda captura conserva o rodapé.
  await salvar(page).scrollIntoViewIfNeeded();
  const arquivoRodape = path.join(diretorioEvidencias, `${prefixo}-rodape.png`);
  await page.screenshot({ path: arquivoRodape, fullPage: true, animations: "disabled" });
  await testInfo.attach(`${prefixo}-rodape`, { path: arquivoRodape, contentType: "image/png" });
  const observaveis = await page.evaluate(() => {
    const raiz = document.documentElement;
    const form = document.querySelector("form");
    const main = document.querySelector("main");
    const limitesMain = main?.getBoundingClientRect();
    const overflowMain = main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documento: { width: raiz.clientWidth, scrollWidth: raiz.scrollWidth },
      main: main ? {
        width: main.clientWidth, scrollWidth: main.scrollWidth,
        left: limitesMain?.left, right: limitesMain?.right,
      } : null,
      overflowHorizontal: Math.max(0, raiz.scrollWidth - raiz.clientWidth, overflowMain),
      alertas: [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent),
      periodo: document.querySelector('[role="combobox"][aria-labelledby*="periodo-letivo"]')?.textContent,
      campos: [...(form?.querySelectorAll("input") ?? [])].map((campo) => ({
        id: campo.id, valor: campo.value, disabled: campo.disabled,
        invalido: campo.getAttribute("aria-invalid"), descritoPor: campo.getAttribute("aria-describedby"),
      })),
    };
  });
  const json = JSON.stringify(observaveis, null, 2);
  await writeFile(path.join(diretorioEvidencias, `${prefixo}.json`), `${json}\n`, "utf8");
  await testInfo.attach(`${prefixo}-observaveis`, { body: json, contentType: "application/json" });
  return observaveis;
}

async function primeiraAvaliacaoSintetica(cenario: Cenario, regra: RegraPontuacaoCriada): Promise<string> {
  exigirBancoDeTeste();
  const guards = await db().raw(`SELECT tgname,tgenabled FROM pg_trigger
    WHERE tgrelid='piv.avaliacao'::regclass AND tgname='pontuacao_guard_avaliacao'`);
  expect(guards.rows).toEqual([expect.objectContaining({ tgname: "pontuacao_guard_avaliacao", tgenabled: "O" })]);
  const agora = new Date();
  const devolucao = new Date(agora);
  devolucao.setUTCDate(devolucao.getUTCDate() + 1);
  const criada = await cenario.apiProfessor.post("/avaliacoes", { body: {
    turma_disciplina_id: cenario.turmaDisciplinaId,
    subgrupo_id: regra.subgrupos[0].id, tipo_avaliacao: "REGULAR", valor: "18.00",
    descricao_avaliacao: "Primeiro uso sintético da jornada de pontuação",
    data_lancamento: agora.toISOString().slice(0, 10), data_devolucao: devolucao.toISOString().slice(0, 10),
  } });
  expect(criada.status).toBe(201);
  return String(criada.body.id);
}

for (const viewport of viewports) {
  test.describe(`Regra de pontuação ${viewport.nome} @ui`, () => {
    test.skip(!uiEnabled, "Informe E2E_WEB_URL para executar o navegador real.");

    test("configura120, conserva rascunho no409 e preserva a estrutura após uso", async ({ page, novoCenario }, testInfo) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const cenario = await novoCenario();
      let putsDaPagina = 0;
      let getsDaPagina = 0;
      page.on("request", (requisicao) => {
        if (new URL(requisicao.url()).pathname !== caminho(cenario)) return;
        if (requisicao.method() === "PUT") putsDaPagina++;
        if (requisicao.method() === "GET") getsDaPagina++;
      });

      await loginViaUI(page, config.secretaria.email, config.secretaria.senha);
      await abrirRegra(page, cenario);
      await expect(page.getByText("Regra não configurada para este curso e período. Defina o total e a distribuição.")).toBeVisible();
      await expect(total(page)).toHaveValue("");
      await registrarEstado(page, testInfo, viewport.nome, "ausente-sem-default");
      expect(await contar("regra_pontuacao", { curso_id: cenario.cursoId, periodo_letivo_id: cenario.periodoLetivoId })).toBe(0);

      await total(page).fill("120");
      const grupos = [
        { nome: "Provas", orcamento: "72", quantidade: "4" },
        { nome: "Avaliações institucionais", orcamento: "6", quantidade: "1" },
        { nome: "Trabalhos e projetos", orcamento: "41", quantidade: null },
      ];
      for (const [indice, dados] of grupos.entries()) {
        await page.getByRole("button", { name: "Adicionar subgrupo", exact: true }).click();
        const bloco = grupo(page, indice);
        await bloco.getByRole("textbox", { name: /^Nome do subgrupo/ }).fill(dados.nome);
        await bloco.getByRole("textbox", { name: /^Orçamento em pontos/ }).fill(dados.orcamento);
        if (dados.quantidade !== null) {
          await escolherPeloTeclado(page, bloco.getByRole("combobox", { name: /^Modo de quantidade/ }), "Fixa");
          await bloco.getByRole("textbox", { name: /^Quantidade fixa/ }).fill(dados.quantidade);
        } else {
          await expect(bloco.getByRole("combobox", { name: /^Modo de quantidade/ })).toContainText("Sem limite");
          await expect(bloco.getByRole("textbox", { name: /^Quantidade fixa/ })).toHaveCount(0);
        }
      }
      await expect(page.getByLabel("Soma dos orçamentos", { exact: true })).toHaveText("119,00");
      await expect(page.getByLabel("Saldo a distribuir", { exact: true })).toHaveText("1,00");
      await total(page).focus();
      await page.keyboard.press("Tab");
      await expect(grupo(page, 0).getByRole("textbox", { name: /^Nome do subgrupo/ })).toBeFocused();
      await salvar(page).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("alert")).toContainText("A soma dos orçamentos deve ser igual ao total de pontos.");
      expect(putsDaPagina).toBe(0);
      const ausente = await cenario.apiSecretaria.get(caminho(cenario));
      expect(ausente.status).toBe(404);
      expect(ausente.body.codigo).toBe("REGRA_AUSENTE");
      await registrarEstado(page, testInfo, viewport.nome, "soma119-rejeitada");

      const orcamentoTrabalhos = grupo(page, 2).getByRole("textbox", { name: /^Orçamento em pontos/ });
      await orcamentoTrabalhos.fill("42,000");
      await salvar(page).focus();
      await page.keyboard.press("Enter");
      await expect(orcamentoTrabalhos).toHaveAttribute("aria-invalid", "true");
      await expect(orcamentoTrabalhos).toBeFocused();
      const descricaoErro = await orcamentoTrabalhos.getAttribute("aria-describedby");
      expect(descricaoErro).toBeTruthy();
      await expect(page.locator(`[id="${descricaoErro}"]`)).toContainText(/duas casas|decimal|pontos/i);
      expect(putsDaPagina).toBe(0);

      await orcamentoTrabalhos.fill("42");
      await expect(page.getByLabel("Soma dos orçamentos", { exact: true })).toHaveText("120,00");
      const criada: RegraPontuacaoCriada = await enviarPeloTeclado(page, cenario, 201);
      await expect(page.getByRole("alert")).toContainText("Regra salva com sucesso!");
      expect(criada.totalPontos).toBe("120.00");
      expect(criada.subgrupos.map((g) => g.orcamentoPontos)).toEqual(["72.00", "6.00", "42.00"]);
      expect(criada.subgrupos.map((g) => g.quantidadeFixa)).toEqual([4, 1, null]);
      expect(new Set(criada.subgrupos.map((g) => g.id)).size).toBe(3);
      expect(putsDaPagina).toBe(1);
      const sucesso = await registrarEstado(page, testInfo, viewport.nome, "regra120-salva");
      expect.soft(sucesso.overflowHorizontal, `Overflow horizontal em ${viewport.nome} ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);

      await page.reload();
      await selecionarPeriodo(page, cenario);
      await expect(total(page)).toHaveValue("120,00");
      const persistida = await cenario.apiSecretaria.get(caminho(cenario));
      expect(persistida.status).toBe(200);
      expect(persistida.body).toEqual(criada);
      await grupo(page, 2).getByRole("textbox", { name: /^Nome do subgrupo/ }).fill("Projetos revisados");
      const editada: RegraPontuacaoCriada = await enviarPeloTeclado(page, cenario, 200);
      expect(editada.versao).toBe(2);
      expect(editada.subgrupos.map((g) => g.id)).toEqual(criada.subgrupos.map((g) => g.id));
      expect(editada.subgrupos[2].nome).toBe("Projetos revisados");

      const nomeProvas = grupo(page, 0).getByRole("textbox", { name: /^Nome do subgrupo/ });
      await nomeProvas.fill("Meu rascunho mantido");
      const externa = await cenario.apiSecretaria.put(caminho(cenario), { body: {
        versaoEsperada: editada.versao, totalPontos: editada.totalPontos,
        subgrupos: editada.subgrupos.map((g, i) => i === 0 ? { ...g, nome: "Provas atualizadas" } : g),
      } });
      expect(externa.status).toBe(200);
      expect(externa.body.versao).toBe(3);
      const leiturasAntesDoConflito = getsDaPagina;
      const conflito = await enviarPeloTeclado(page, cenario, 409);
      expect(conflito.codigo).toBe("VERSAO_OBSOLETA");
      await expect(page.getByRole("alert")).toContainText(/recarregue|configuração mudou/i);
      await expect(nomeProvas).toHaveValue("Meu rascunho mantido");
      await expect(page.getByText("O rascunho foi mantido. Recarregar substitui este rascunho pela versão salva.")).toBeVisible();
      await expect(salvar(page)).toBeDisabled();
      expect(getsDaPagina).toBe(leiturasAntesDoConflito);
      await registrarEstado(page, testInfo, viewport.nome, "conflito409-rascunho");

      const recarregar = page.getByRole("button", { name: "Recarregar regra", exact: true });
      await recarregar.focus();
      await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === caminho(cenario) && r.request().method() === "GET"),
        page.keyboard.press("Enter"),
      ]);
      await expect(nomeProvas).toHaveValue("Provas atualizadas");
      await expect(page.getByText("Versão 3 - Origem: configurada", { exact: true })).toBeVisible();
      await expect(salvar(page)).toBeEnabled();

      const avaliacaoId = await primeiraAvaliacaoSintetica(cenario, externa.body);
      await page.reload();
      await selecionarPeriodo(page, cenario);
      await expect(page.getByRole("status", { name: "Regra preservada", exact: true })).toContainText(/primeiro uso.*mesmo se.*removida/);
      await expect(total(page)).toBeDisabled();
      await expect(salvar(page)).toBeDisabled();
      await expect(page.getByRole("button", { name: "Adicionar subgrupo", exact: true })).toBeDisabled();
      for (let i = 0; i < 3; i++) {
        const bloco = grupo(page, i);
        await expect(bloco.getByRole("textbox", { name: /^Nome do subgrupo/ })).toBeDisabled();
        await expect(bloco.getByRole("textbox", { name: /^Orçamento em pontos/ })).toBeDisabled();
        await expect(bloco.getByRole("combobox", { name: /^Modo de quantidade/ })).toHaveAttribute("aria-disabled", "true");
        await expect(bloco.getByRole("button", { name: "Remover subgrupo", exact: true })).toBeDisabled();
      }
      const preservada = await cenario.apiSecretaria.get(caminho(cenario));
      expect(preservada.body).toMatchObject({ id: criada.id, estado: "PRESERVADA", versao: 3, usadaEm: expect.any(String) });
      const protecao = await registrarEstado(page, testInfo, viewport.nome, "regra-preservada");
      expect.soft(protecao.overflowHorizontal, `Overflow na consulta preservada ${viewport.nome}`).toBeLessThanOrEqual(1);

      const exclusao = await cenario.apiProfessor.del(`/avaliacoes/${avaliacaoId}`);
      expect(exclusao.status).toBe(204);
      const aposExclusao = await cenario.apiSecretaria.get(caminho(cenario));
      expect(aposExclusao.body).toEqual(preservada.body);
      const tentativa = await cenario.apiSecretaria.put(caminho(cenario), { body: {
        versaoEsperada: aposExclusao.body.versao,
        totalPontos: aposExclusao.body.totalPontos, subgrupos: aposExclusao.body.subgrupos,
      } });
      expect(tentativa.status).toBe(409);
      expect(tentativa.body.codigo).toBe("REGRA_PRESERVADA");
      await page.reload();
      await selecionarPeriodo(page, cenario);
      await expect(page.getByRole("status", { name: "Regra preservada", exact: true })).toBeVisible();
      await expect(salvar(page)).toBeDisabled();
    });
  });
}

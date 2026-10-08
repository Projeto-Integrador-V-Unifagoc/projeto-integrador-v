import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/test.js';
import { loginViaUI } from '../fixtures/auth.fixture.js';
import { config, uiEnabled } from '../helpers/config.js';
import { datasRecentes, lancarNotaLote, lancarPontosRegulares, registrarChamada, type PlanoRegular } from '../helpers/dominio.js';
import { exigirBancoDeTeste, fecharDb } from '../helpers/db.js';
import type { Cenario } from '../fixtures/academic.fixture.js';
import { runId } from '../helpers/ids.js';

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());
const evidencias = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../specs/001-notas-dinamicas/evidencias-ui');
const viewports = [{ nome: 'desktop', width: 1280, height: 720 }, { nome: 'mobile', width: 390, height: 844 }] as const;

async function escolher(page: Page, campo: Locator, nome: string) {
  await expect(campo).toBeEnabled();
  await campo.focus();
  await page.keyboard.press('Enter');
  const opcao = page.getByRole('option', { name: nome, exact: true });
  await opcao.focus();
  await page.keyboard.press('Enter');
}
async function selecionarOferta(page: Page, c: Cenario, oferta = c.turmaDisciplinaId) {
  const resposta = await c.apiProfessor.get('/notas/opcoes');
  expect(resposta.status).toBe(200);
  const item = resposta.body.atribuicoes.find((a: { turmaDisciplinaId: string }) => a.turmaDisciplinaId === oferta);
  expect(item).toBeTruthy();
  const nome = `${item.turma.sigla} — ${item.disciplina.nome} — ${item.periodoLetivo.codigo}`;
  const campo = page.getByRole('combobox', { name: 'Turma e disciplina', exact: true });
  await expect(campo).toBeEnabled();
  if ((await campo.textContent()) !== nome) await escolher(page, campo, nome);
  await expect(campo).toHaveText(nome);
}
const linhaAluno = (page: Page, nome: string) => page.getByRole('row').filter({ has: page.getByRole('gridcell', { name: nome, exact: true }) });
async function mostrarResultado(page: Page, nome: string) {
  const linha = linhaAluno(page, nome);
  await expect(linha).toBeAttached();
  await linha.getByRole('gridcell').first().focus();
  await page.keyboard.press('End');
  await expect(linha.getByLabel('Corte', { exact: true })).toBeVisible();
  return linha;
}
async function capturar(page: Page, info: TestInfo, viewport: string, estado: string, dados: Record<string, unknown> = {}) {
  await mkdir(evidencias, { recursive: true });
  const prefixo = `t075-${viewport}-professor-${estado}`;
  const arquivo = path.join(evidencias, `${prefixo}.png`);
  await page.screenshot({ path: arquivo, fullPage: true, animations: 'disabled' });
  await info.attach(prefixo, { path: arquivo, contentType: 'image/png' });
  const medidas = await page.evaluate(() => {
    const raiz = document.documentElement;
    const main = document.querySelector('main');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflowHorizontal: Math.max(0, raiz.scrollWidth - raiz.clientWidth, main ? main.scrollWidth - main.clientWidth : 0),
      foco: { role: document.activeElement?.getAttribute('role'), nome: document.activeElement?.getAttribute('aria-label'), texto: document.activeElement?.textContent },
      alertas: [...document.querySelectorAll('[role="alert"]')].map(a => a.textContent),
      camposResultado: [...document.querySelectorAll('dd[aria-label]')].map(a => {
        const caixa = a.getBoundingClientRect();
        return { rotulo: a.getAttribute('aria-label'), texto: a.textContent, left: caixa.left, right: caixa.right, clientWidth: a.clientWidth, scrollWidth: a.scrollWidth };
      }),
      rolagemTabela: [...document.querySelectorAll('.MuiDataGrid-virtualScroller')].map(e => ({ clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, scrollLeft: e.scrollLeft })),
    };
  });
  expect(medidas.overflowHorizontal).toBeLessThanOrEqual(1);
  if (viewport === 'mobile' && estado !== 'carregando') {
    for (const campo of medidas.camposResultado) {
      expect(campo.left, `${campo.rotulo}: limite esquerdo`).toBeGreaterThanOrEqual(0);
      expect(campo.right, `${campo.rotulo}: limite direito`).toBeLessThanOrEqual(390);
      expect(campo.scrollWidth, `${campo.rotulo}: texto cabe na célula`).toBeLessThanOrEqual(campo.clientWidth + 1);
    }
  }
  const json = JSON.stringify({ ...medidas, ...dados }, null, 2);
  await writeFile(path.join(evidencias, `${prefixo}.json`), `${json}\n`, 'utf8');
  await info.attach(`${prefixo}-observaveis`, { body: json, contentType: 'application/json' });
}
async function plano120(c: Cenario): Promise<PlanoRegular> {
  const regra = c.regraPontuacao!;
  const avaliacoes: PlanoRegular['avaliacoes'] = [];
  for (const [i, maximo] of ['12.00', '18.00', '18.00', '24.00', '6.00', '42.00'].entries()) {
    const subgrupoId = regra.subgrupos[i < 4 ? 0 : i === 4 ? 1 : 2].id;
    const criada = await c.apiProfessor.post('/avaliacoes', { body: {
      turma_disciplina_id: c.turmaDisciplinaId, tipo_avaliacao: 'REGULAR', subgrupo_id: subgrupoId,
      valor: maximo, descricao_avaliacao: `Etapa ${i + 1}`, data_lancamento: '2026-09-28', data_devolucao: '2026-10-01',
    } });
    expect(criada.status).toBe(201);
    avaliacoes.push({ id: criada.body.id, maximo, subgrupoId });
  }
  return { avaliacoes };
}

async function capturarAbasMoveis(page: Page, info: TestInfo, estado: string) {
  const abas = page.getByRole('tablist', { name: 'Visões de notas da turma', exact: true });
  const medidas = await abas.evaluate(lista => {
    const scroller = lista.closest('.MuiTabs-root')!.querySelector('.MuiTabs-scroller')!;
    const caixa = scroller.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scroller: { left: caixa.left, right: caixa.right, clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth },
      abas: [...lista.querySelectorAll('[role="tab"]')].map(aba => {
        const textos = document.createTreeWalker(aba, NodeFilter.SHOW_TEXT);
        const texto = textos.nextNode()!;
        const range = document.createRange();
        range.selectNodeContents(texto);
        const rotulo = range.getBoundingClientRect();
        return { nome: aba.textContent, selecionada: aba.getAttribute('aria-selected') === 'true',
          focada: document.activeElement === aba, left: rotulo.left, right: rotulo.right, width: rotulo.width };
      }),
      overflowHorizontal: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
  expect(medidas.viewport).toEqual({ width: 390, height: 844 });
  expect(medidas.abas.map(aba => aba.nome)).toEqual(['Lançamento', 'Rendimento', 'Recuperação']);
  for (const aba of medidas.abas) {
    expect(aba.width, `${aba.nome}: rótulo tem largura visível`).toBeGreaterThan(0);
    expect(aba.left, `${aba.nome}: início cabe no contêiner`).toBeGreaterThanOrEqual(medidas.scroller.left - 1);
    expect(aba.right, `${aba.nome}: fim cabe no contêiner`).toBeLessThanOrEqual(medidas.scroller.right + 1);
  }
  expect(medidas.overflowHorizontal).toBeLessThanOrEqual(1);
  await mkdir(evidencias, { recursive: true });
  const prefixo = `t093-mobile-abas-${estado}`;
  const arquivo = path.join(evidencias, `${prefixo}.png`);
  await page.screenshot({ path: arquivo, fullPage: true, animations: 'disabled' });
  const json = `${JSON.stringify(medidas, null, 2)}\n`;
  await writeFile(path.join(evidencias, `${prefixo}.json`), json, 'utf8');
  await info.attach(prefixo, { path: arquivo, contentType: 'image/png' });
  await info.attach(`${prefixo}-medidas`, { body: json, contentType: 'application/json' });
}

test.describe('Abas de notas no celular @ui', () => {
  test('mantém três rótulos íntegros e navega com setas e Enter em 390x844', async ({ page, novoCenario }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Oferta própria sem alunos: a consulta explícita não cria recuperação alheia.
    const c = await novoCenario({ regraPontuacao: '120' });
    await loginViaUI(page, c.professor.email, 'Professor@123');
    await page.goto(`${config.webUrl}/notas/lancamento`);
    await selecionarOferta(page, c);
    const abas = page.getByRole('tablist', { name: 'Visões de notas da turma', exact: true });
    const lancamento = abas.getByRole('tab', { name: 'Lançamento', exact: true });
    const rendimento = abas.getByRole('tab', { name: 'Rendimento', exact: true });
    const recuperacao = abas.getByRole('tab', { name: 'Recuperação', exact: true });
    await lancamento.focus();
    await expect(lancamento).toHaveAttribute('aria-selected', 'true');
    await capturarAbasMoveis(page, info, 'lancamento');
    await page.keyboard.press('ArrowRight');
    await expect(rendimento).toBeFocused();
    await expect(lancamento).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(rendimento).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Rendimento', exact: true })).toBeVisible();
    await capturarAbasMoveis(page, info, 'rendimento');
    await page.keyboard.press('ArrowRight');
    await expect(recuperacao).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(recuperacao).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Recuperação', exact: true })).toBeVisible();
    await capturarAbasMoveis(page, info, 'recuperacao');
    await page.keyboard.press('ArrowRight');
    await expect(lancamento).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(lancamento).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Lançamento', exact: true })).toBeVisible();
    expect((await c.apiProfessor.get(`/notas/turmas/${c.turmaDisciplinaId}/recuperacao`)).body.recuperacaoAvaliacaoId).toBeNull();
  });
});

for (const viewport of viewports) test.describe(`Resultados do professor ${viewport.nome} @ui`, () => {
  test.skip(!uiEnabled, 'Informe E2E_WEB_URL para executar a UI real.');
  test('separa parcial, nota e frequência; recupera e retifica sem recalcular no cliente', async ({ page, novoCenario }, info) => {
    await page.setViewportSize(viewport);
    const c = await novoCenario({ regraPontuacao: '120' });
    const plano = await plano120(c);
    const parcial = await c.matricularAluno();
    const suficiente = await c.matricularAluno();
    const recuperando = await c.matricularAluno();
    expect((await lancarNotaLote(c.apiProfessor, plano.avaliacoes[0].id, [{ alunoId: parcial.aluno.id, valor: '12.00' }])).status).toBe(200);
    await lancarPontosRegulares(c.apiProfessor, plano, suficiente.aluno.id, '72.00');
    await lancarPontosRegulares(c.apiProfessor, plano, recuperando.aluno.id, '60.00');
    for (const [i, data] of datasRecentes(4).entries()) {
      const frequencia = await registrarChamada(c.apiProfessor, c.turmaDisciplinaId, data, [
        { alunoId: parcial.aluno.id, status: 'PRESENTE' },
        { alunoId: suficiente.aluno.id, status: i < 2 ? 'PRESENTE' : 'AUSENTE' },
        { alunoId: recuperando.aluno.id, status: i < 3 ? 'PRESENTE' : 'AUSENTE' },
      ], `T075-${c.runId}`);
      expect(frequencia.status).toBe(200);
    }
    const inicial = await c.apiProfessor.get(`/notas/turmas/${c.turmaDisciplinaId}/rendimento`);
    expect(inicial.status).toBe(200);
    const p = inicial.body.alunos.find((a: { alunoId: string }) => a.alunoId === parcial.aluno.id);
    const s = inicial.body.alunos.find((a: { alunoId: string }) => a.alunoId === suficiente.aluno.id);
    const r = inicial.body.alunos.find((a: { alunoId: string }) => a.alunoId === recuperando.aluno.id);
    expect(p.resultadoAcademico).toMatchObject({ etapaRegularCompleta: false, percentualResultado: null, aprovacaoDisciplina: 'PENDENTE', indicadorRegular: { percentual: 100, parcial: true } });
    expect(s.resultadoAcademico).toMatchObject({ resultadoPorNota: 'SUFICIENTE', aprovacaoDisciplina: 'NAO_APROVADA' });
    let consultasRec = 0;
    page.on('request', req => { if (new URL(req.url()).pathname === `/notas/turmas/${c.turmaDisciplinaId}/recuperacao` && req.method() === 'GET') consultasRec++; });
    await loginViaUI(page, c.professor.email, 'Professor@123');
    await page.goto(`${config.webUrl}/notas/lancamento`);
    await expect(page.getByRole('heading', { name: 'Lançamento de Notas' })).toBeVisible();
    await selecionarOferta(page, c);

    // Pausa de comunicação por handshake para observar loading, sem sleeps.
    let liberar!: () => void;
    const espera = new Promise<void>(resolve => { liberar = resolve; });
    const urlRendimento = `${config.apiUrl}/notas/turmas/${c.turmaDisciplinaId}/rendimento`;
    await page.route(urlRendimento, async route => { await espera; await route.continue(); });
    await page.getByRole('tab', { name: 'Rendimento', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tabpanel', { name: 'Rendimento', exact: true }).getByRole('progressbar').first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Turma e disciplina', exact: true })).toBeDisabled();
    await capturar(page, info, viewport.nome, 'carregando');
    liberar();
    await expect(page.getByRole('button', { name: 'Atualizar rendimento' })).toBeEnabled();
    await page.unroute(urlRendimento);
    const linhaParcial = await mostrarResultado(page, p.nome);
    await expect(linhaParcial.getByLabel('Indicador regular', { exact: true })).toContainText('100,00% - Parcial');
    await expect(linhaParcial.getByLabel('Pontos efetivos', { exact: true })).toHaveText('-');
    await expect(linhaParcial.getByLabel('Aprovação na disciplina', { exact: true })).toHaveText('Pendente');
    await expect(linhaParcial.getByText('Elegível para recuperação por nota', { exact: true })).toHaveCount(0);
    await capturar(page, info, viewport.nome, 'parcial100', { resultado: p.resultadoAcademico });
    const linhaSuficiente = await mostrarResultado(page, s.nome);
    await expect(linhaSuficiente.getByLabel('Total de pontos', { exact: true })).toHaveText('120,00');
    await expect(linhaSuficiente.getByLabel('Corte', { exact: true })).toHaveText('72,00');
    await expect(linhaSuficiente.getByLabel('Resultado por nota', { exact: true })).toHaveText('Suficiente');
    await expect(linhaSuficiente.getByLabel('Frequência', { exact: true })).toContainText('50,00%');
    await expect(linhaSuficiente.getByLabel('Aprovação na disciplina', { exact: true })).toHaveText('Não aprovada');
    expect(consultasRec).toBe(0);
    await capturar(page, info, viewport.nome, 'nota-suficiente-frequencia-insuficiente', { resultado: s.resultadoAcademico, consultasRec });

    await page.route(urlRendimento, route => route.fulfill({ status: 503, json: { mensagem: 'Consulta de rendimento indisponível no ensaio.' } }));
    await page.getByRole('button', { name: 'Atualizar rendimento' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Consulta de rendimento indisponível no ensaio.' })).toBeVisible();
    await capturar(page, info, viewport.nome, 'falha-leitura');
    await page.unroute(urlRendimento);
    await page.getByRole('button', { name: 'Atualizar rendimento' }).click();
    await expect(page.getByRole('button', { name: 'Atualizar rendimento' })).toBeEnabled();

    await page.getByRole('tab', { name: 'Recuperação', exact: true }).focus();
    const [leituraRec] = await Promise.all([page.waitForResponse(resp => resp.url() === `${config.apiUrl}/notas/turmas/${c.turmaDisciplinaId}/recuperacao`), page.keyboard.press('Enter')]);
    expect(leituraRec.status()).toBe(200);
    const rec = await leituraRec.json();
    expect(rec.alunos.map((a: { alunoId: string }) => a.alunoId)).toEqual([recuperando.aluno.id]);
    await expect(page.getByText('Máximo da recuperação:', { exact: false })).toContainText('120,00');
    const linhaRec = linhaAluno(page, r.nome);
    await expect(linhaRec).toBeAttached();
    const colunaRec = page.getByRole('columnheader', { name: 'Recuperação', exact: true });
    const indice = await colunaRec.getAttribute('aria-colindex');
    const celula = linhaRec.locator(`[role="gridcell"][aria-colindex="${indice}"]`);
    await celula.dblclick();
    const entrada = page.getByRole('textbox', { name: `Nota de ${r.nome}`, exact: true });
    await entrada.fill('90');
    await entrada.press('Escape');
    await expect(celula).toHaveText('Não lançada');
    await expect(page.getByRole('button', { name: 'Salvar recuperação' })).toBeDisabled();
    await celula.dblclick();
    await entrada.fill('80');
    await entrada.press('Enter');
    const salvar = page.getByRole('button', { name: 'Salvar recuperação' });
    await expect(salvar).toBeEnabled();
    await salvar.focus();
    const [salva] = await Promise.all([page.waitForResponse(resp => new URL(resp.url()).pathname === `/notas/avaliacoes/${rec.recuperacaoAvaliacaoId}/lote` && resp.request().method() === 'PUT'), page.keyboard.press('Enter')]);
    expect(salva.status()).toBe(200);
    expect(salva.request().postDataJSON().itens[0].valor).toBe('80.00');
    await expect(salvar).toBeDisabled();
    const aposRec = await mostrarResultado(page, r.nome);
    await expect(aposRec.getByLabel('Recuperação', { exact: true })).toHaveText('80,00 / 120,00');
    await expect(aposRec.getByLabel('Pontos efetivos', { exact: true })).toHaveText('80,00');
    await expect(aposRec.getByLabel('Aprovação na disciplina', { exact: true })).toHaveText('Aprovada');
    await capturar(page, info, viewport.nome, 'recuperacao80-salva', { consultasRec, recuperacaoAvaliacaoId: rec.recuperacaoAvaliacaoId });

    await lancarPontosRegulares(c.apiProfessor, plano, recuperando.aluno.id, '70.00');
    await page.getByRole('tab', { name: 'Rendimento', exact: true }).focus();
    await page.keyboard.press('Enter');
    const retificada = await mostrarResultado(page, r.nome);
    await expect(retificada.getByLabel('Pontos regulares', { exact: true })).toHaveText('70,00');
    await expect(retificada.getByLabel('Pontos efetivos', { exact: true })).toHaveText('80,00');
    await expect(retificada.getByLabel('Resultado por nota', { exact: true })).toHaveText('Suficiente');
    const fim = await c.apiProfessor.get(`/notas/turmas/${c.turmaDisciplinaId}/rendimento`);
    const resultado = fim.body.alunos.find((a: { alunoId: string }) => a.alunoId === recuperando.aluno.id).resultadoAcademico;
    expect(resultado).toMatchObject({ pontosRegularesObtidos: '70.00', pontosRecuperacao: '80.00', pontosEfetivos: '80.00', aprovacaoDisciplina: 'APROVADA' });
    await capturar(page, info, viewport.nome, 'retificada70-preserva-rec80', { resultado });
    const vazia = await c.criarOfertaIrma(runId());
    await page.reload();
    await selecionarOferta(page, c, vazia.turmaDisciplinaId);
    await page.getByRole('tab', { name: 'Recuperação', exact: true }).click();
    await expect(page.getByText('Nenhum aluno elegível para recuperação', { exact: true })).toBeVisible();
    await capturar(page, info, viewport.nome, 'sem-elegiveis');
  });
});

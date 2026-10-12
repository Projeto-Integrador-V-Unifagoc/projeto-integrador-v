import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/test.js';
import { loginViaUI, logoutViaStorage } from '../fixtures/auth.fixture.js';
import { config, uiEnabled } from '../helpers/config.js';
import { criarPlanoRegular, lancarNotaLote, lancarPontosRegulares, type PlanoRegular } from '../helpers/dominio.js';
import { exigirBancoDeTeste, fecharDb } from '../helpers/db.js';
import * as estrutura from '../factories/estrutura-academica.factory.js';
import { criarRegraPontuacao, type ModeloRegraPontuacao } from '../factories/regra-pontuacao.factory.js';
import { criarAlunoComLogin } from '../factories/aluno.factory.js';
import { runId } from '../helpers/ids.js';
import type { Cenario } from '../fixtures/academic.fixture.js';

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());
const evidencias = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../specs/001-notas-dinamicas/evidencias-ui');
const viewports = [{ nome: 'desktop', width: 1280, height: 720 }, { nome: 'mobile', width: 390, height: 844 }] as const;
async function escolher(page: Page, campo: Locator, nome: string) {
  await expect(campo).toBeEnabled();
  await campo.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: nome, exact: true }).focus();
  await page.keyboard.press('Enter');
}
async function capturar(page: Page, info: TestInfo, viewport: string, estado: string, dados: Record<string, unknown> = {}) {
  await mkdir(evidencias, { recursive: true });
  const prefixo = `t075-${viewport}-aluno-${estado}`;
  const arquivo = path.join(evidencias, `${prefixo}.png`);
  await page.screenshot({ path: arquivo, fullPage: true, animations: 'disabled' });
  await info.attach(prefixo, { path: arquivo, contentType: 'image/png' });
  const medidas = await page.evaluate(() => {
    const raiz = document.documentElement;
    const main = document.querySelector('main');
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].find(e => getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden="true"]'));
    const caixa = dialogo?.getBoundingClientRect();
    const tabela = document.querySelector('.MuiTableContainer-root');
    const limitesTabela = tabela?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflowHorizontal: Math.max(0, raiz.scrollWidth - raiz.clientWidth, main ? main.scrollWidth - main.clientWidth : 0),
      dialogo: caixa ? { left: caixa.left, right: caixa.right, bottom: caixa.bottom } : null,
      tabela: tabela ? { clientWidth: tabela.clientWidth, scrollWidth: tabela.scrollWidth, scrollLeft: tabela.scrollLeft, left: limitesTabela!.left, right: limitesTabela!.right } : null,
      foco: { role: document.activeElement?.getAttribute('role'), nome: document.activeElement?.getAttribute('aria-label'), texto: document.activeElement?.textContent },
      camposResultado: [...document.querySelectorAll('dl dt,dd[aria-label]')].map(a => {
        const caixa = a.getBoundingClientRect();
        return { rotulo: a.getAttribute('aria-label') ?? a.textContent, elemento: a.tagName, texto: a.textContent, left: caixa.left, right: caixa.right, clientWidth: a.clientWidth, scrollWidth: a.scrollWidth };
      }),
      alertas: [...document.querySelectorAll('[role="alert"]')].map(a => a.textContent),
      nosElementos: document.querySelectorAll('*').length,
    };
  });
  expect(medidas.overflowHorizontal).toBeLessThanOrEqual(1);
  if (viewport === 'mobile' && ['ficha-duas-ofertas-resultados', 'ficha-periodo-anterior-preservado'].includes(estado)) {
    for (const campo of medidas.camposResultado) {
      expect(campo.left, `${campo.rotulo}: limite esquerdo`).toBeGreaterThanOrEqual(medidas.tabela!.left);
      expect(campo.right, `${campo.rotulo}: limite direito`).toBeLessThanOrEqual(medidas.tabela!.right);
      expect(campo.scrollWidth, `${campo.rotulo}: texto cabe na célula`).toBeLessThanOrEqual(campo.clientWidth + 1);
    }
  }
  if (medidas.dialogo) {
    expect(medidas.dialogo.left).toBeGreaterThanOrEqual(0);
    expect(medidas.dialogo.right).toBeLessThanOrEqual(viewport === 'mobile' ? 390 : 1280);
  }
  const json = JSON.stringify({ ...medidas, ...dados }, null, 2);
  await writeFile(path.join(evidencias, `${prefixo}.json`), `${json}\n`, 'utf8');
  await info.attach(`${prefixo}-observaveis`, { body: json, contentType: 'application/json' });
}
async function periodoLegivel(c: Cenario, rotulo: string) {
  const periodos = await c.apiSecretaria.get('/periodos-letivos');
  expect(periodos.status).toBe(200);
  const usados = new Set(periodos.body.map((p: { ano: number; semestre: number }) => `${p.ano}:${p.semestre}`));
  let ano = 2026;
  while (usados.has(`${ano}:1`)) ano++;
  const codigo = `${ano}.1-${rotulo}-${c.runId.slice(-5)}`;
  return { ano, codigo };
}
async function criarOutraOferta(c: Cenario, alunoId: string, modelo: ModeloRegraPontuacao, rotulo: string) {
  const legivel = await periodoLegivel(c, rotulo);
  const periodo = await estrutura.criarPeriodoLetivo(c.apiSecretaria, `${c.runId}${rotulo}`, { ano: legivel.ano });
  const renomeada = await c.apiSecretaria.put(`/periodos-letivos/${periodo.id}`, { body: { codigo: legivel.codigo } });
  expect(renomeada.status).toBe(200);
  await criarRegraPontuacao(c.apiSecretaria, c.cursoId, periodo.id, modelo);
  const turma = await estrutura.criarTurma(c.apiSecretaria, `${c.runId}${rotulo}`, { cursoId: c.cursoId, periodoLetivoId: periodo.id });
  const oferta = await estrutura.criarTurmaDisciplina(c.apiSecretaria, turma.id, { cursoDisciplinaId: c.cursoDisciplinaId, professorId: c.professor.id });
  expect((await c.apiSecretaria.post('/matriculas', { body: { alunoId, turmaId: turma.id } })).status).toBe(201);
  return { turmaDisciplinaId: oferta.id, periodoId: periodo.id, codigo: legivel.codigo };
}
async function nomearAvaliacoes(c: Cenario, plano: PlanoRegular) {
  for (const avaliacao of plano.avaliacoes) {
    expect((await c.apiProfessor.put(`/avaliacoes/${avaliacao.id}`, { body: { descricao_avaliacao: 'Atividade de verificação', data_devolucao: '2026-10-01' } })).status).toBe(200);
  }
}
const cardDisciplina = (page: Page, codigo: string) => page.locator('.MuiAccordion-root').filter({ has: page.getByText(new RegExp(codigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) });

for (const viewport of viewports) test.describe(`Leitores acadêmicos ${viewport.nome} @ui`, () => {
  test.skip(!uiEnabled, 'Informe E2E_WEB_URL para executar a UI real.');
  test('mostra UUIDs distintos, zero, ausência e cortes exatos em Home, boletim, ficha e relatórios', async ({ page, novoCenario }, info) => {
    await page.setViewportSize(viewport);
    const c = await novoCenario({ regraPontuacao: '120' });
    const legivel = await periodoLegivel(c, 'Notas120');
    expect((await c.apiSecretaria.put(`/periodos-letivos/${c.periodoLetivoId}`, { body: { ano: legivel.ano, codigo: legivel.codigo } })).status).toBe(200);
    c.periodoCodigo = legivel.codigo;
    const disc = await c.apiSecretaria.put(`/disciplinas/${c.disciplinaId}`, { body: { nome: 'Fundamentos de notas dinâmicas' } });
    expect(disc.status).toBe(200);
    const aluno = await c.matricularAluno();
    const principal = await criarPlanoRegular(c.apiProfessor, c.turmaDisciplinaId);
    await nomearAvaliacoes(c, principal);
    expect((await lancarNotaLote(c.apiProfessor, principal.avaliacoes[0].id, [{ alunoId: aluno.aluno.id, valor: '18.00' }])).status).toBe(200);
    expect((await lancarNotaLote(c.apiProfessor, principal.avaliacoes[1].id, [{ alunoId: aluno.aluno.id, valor: '0.00' }])).status).toBe(200);
    const disciplinaIrma = await estrutura.criarDisciplina(c.apiSecretaria, runId());
    expect((await c.apiSecretaria.put(`/disciplinas/${disciplinaIrma.id}`, { body: { nome: 'Fundamentos de notas dinâmicas' } })).status).toBe(200);
    const matrizIrma = await estrutura.associarDisciplinaAoCurso(c.apiSecretaria, c.cursoId, disciplinaIrma.id);
    const ofertaIrma = await estrutura.criarTurmaDisciplina(c.apiSecretaria, c.turmaId, { cursoDisciplinaId: matrizIrma.id, professorId: c.professor.id });
    const irma = { turmaDisciplinaId: ofertaIrma.id };
    expect((await c.apiSecretaria.post(`/matriculas/${aluno.matriculaId}/disciplinas`, { body: { turmaDisciplinaIds: [irma.turmaDisciplinaId] } })).status).toBe(201);
    const segundo = await criarPlanoRegular(c.apiProfessor, irma.turmaDisciplinaId);
    await nomearAvaliacoes(c, segundo);
    await lancarPontosRegulares(c.apiProfessor, segundo, aluno.aluno.id, '72.00');
    const boletim = await aluno.apiAluno.get('/notas/me');
    expect(boletim.status).toBe(200);
    expect(boletim.body.disciplinas).toHaveLength(2);
    const resultados = boletim.body.disciplinas.map((d: { resultadoAcademico: unknown }) => d.resultadoAcademico);
    let consultasRec = 0;
    page.on('request', req => { if (/\/recuperacao$/.test(new URL(req.url()).pathname)) consultasRec++; });
    await loginViaUI(page, aluno.email, aluno.senha);
    await expect(page.getByText('Há pendências ou alertas acadêmicos. Consulte os pontos, o corte e os motivos de cada disciplina.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver notas de Fundamentos de notas dinâmicas' }).first()).toBeVisible();
    await capturar(page, info, viewport.nome, 'home-alertas', { resultados });
    await page.getByRole('button', { name: 'Ver notas de Fundamentos de notas dinâmicas' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Minhas Notas' })).toBeVisible();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(2);
    // A primeira oferta contém 18/18, zero lançado e quatro notas pendentes.
    const cards120 = cardDisciplina(page, c.periodoCodigo);
    await expect(cards120).toHaveCount(2);
    const cardParcial = cards120.filter({ has: page.getByLabel('Indicador regular', { exact: true }).filter({ hasText: 'Parcial' }) });
    await expect(cardParcial.getByLabel('Pontos efetivos', { exact: true })).toHaveText('-');
    await expect(cardParcial.getByLabel('Aprovação na disciplina', { exact: true })).toHaveText('Pendente');
    await expect(cardParcial.getByRole('gridcell', { name: '0,00', exact: true })).toHaveCount(1);
    await expect(cardParcial.getByRole('gridcell', { name: 'Não lançada', exact: true })).toHaveCount(4);
    expect(principal.avaliacoes.map(a => a.id).some(id => segundo.avaliacoes.some(a => a.id === id))).toBe(false);
    await cardParcial.getByLabel('Indicador regular', { exact: true }).scrollIntoViewIfNeeded();
    await capturar(page, info, viewport.nome, 'boletim-zero-ausencia', { resultados, avaliacoesPrimeira: principal.avaliacoes.map(a => a.id), avaliacoesSegunda: segundo.avaliacoes.map(a => a.id) });
    expect(consultasRec).toBe(0);

    await page.route(`${config.apiUrl}/notas/me`, route => route.fulfill({ status: 503, json: { mensagem: 'Boletim indisponível no ensaio.' } }));
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: 'Boletim indisponível no ensaio.' })).toBeVisible();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(0);
    await capturar(page, info, viewport.nome, 'boletim-falha');
    await page.unroute(`${config.apiUrl}/notas/me`);
    await page.reload();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(2);

    await logoutViaStorage(page);
    await loginViaUI(page, config.secretaria.email, config.secretaria.senha);
    await page.goto(`${config.webUrl}/alunos/ficha-do-aluno/${aluno.aluno.id}`);
    await expect(page.getByRole('heading', { name: 'Painel do Aluno' })).toBeVisible();
    await escolher(page, page.getByRole('combobox', { name: 'Período letivo', exact: true }), c.periodoCodigo);
    const tabela = page.getByRole('table');
    await expect(tabela.getByRole('row')).toHaveCount(3);
    await expect(tabela.getByRole('columnheader', { name: 'Atividade de verificação', exact: true })).toHaveCount(12);
    await expect(tabela.getByLabel('Corte', { exact: true })).toHaveCount(2);
    await expect(tabela.getByLabel('Pontos regulares', { exact: true }).filter({ hasText: '18,00' })).toHaveCount(1);
    await expect(tabela.getByLabel('Pontos regulares', { exact: true }).filter({ hasText: '72,00' })).toHaveCount(1);
    const rolavel = page.locator('.MuiTableContainer-root');
    await rolavel.scrollIntoViewIfNeeded();
    await page.getByRole('tab', { name: 'Notas/Faltas', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(rolavel).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => rolavel.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    await capturar(page, info, viewport.nome, 'ficha-duas-ofertas', { ofertas: [c.turmaDisciplinaId, irma.turmaDisciplinaId], avaliacoesUUID: [...principal.avaliacoes, ...segundo.avaliacoes].map(a => a.id) });
    await tabela.getByRole('cell').filter({ has: page.getByLabel('Corte', { exact: true }) }).first().scrollIntoViewIfNeeded();
    await capturar(page, info, viewport.nome, 'ficha-duas-ofertas-resultados');

    const ficha = await c.apiSecretaria.get(`/alunos/${aluno.aluno.id}/ficha`);
    expect(ficha.status).toBe(200);
    const nomeAluno = ficha.body.aluno.pessoa.nome;
    const [respostaRelatorio] = await Promise.all([page.waitForResponse(resp => new URL(resp.url()).pathname === '/relatorios/academicos'), page.goto(`${config.webUrl}/relatorios/lista`)]);
    expect(respostaRelatorio.status()).toBe(200);
    const relatorios = await respostaRelatorio.json();
    expect(relatorios.length).toBeGreaterThanOrEqual(32);
    await expect(page.getByRole('button', { name: /^Consultar resultados de / }).first()).toBeVisible();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(0);
    await capturar(page, info, viewport.nome, 'relatorios-volume-fechado', { quantidadeRelatorios: relatorios.length });
    await page.getByPlaceholder('Buscar por relatorio, aluno, disciplina ou situacao').fill(nomeAluno);
    const consultar = page.getByRole('button', { name: /^Consultar resultados de / }).first();
    await consultar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: /^Resultados - / });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByLabel('Corte', { exact: true })).toHaveCount(2);
    await dialogo.getByLabel('Corte', { exact: true }).last().scrollIntoViewIfNeeded();
    await capturar(page, info, viewport.nome, 'relatorio-consulta-selecionada', { alunoId: aluno.aluno.id, quantidadeRelatorios: relatorios.length });
    await page.keyboard.press('Escape');
    await expect(dialogo).toHaveCount(0);
    await expect(consultar).toBeFocused();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(0);
    await capturar(page, info, viewport.nome, 'relatorio-foco-restaurado');

    // Histórico é criado pelo fluxo público: concluir a matrícula anterior.
    expect((await c.apiSecretaria.patch(`/matriculas/${aluno.matriculaId}/status`, { body: { status: 'concluida' } })).status).toBe(200);
    const fracionaria = await criarOutraOferta(c, aluno.aluno.id, '100.01', 'CorteExato');
    const terceiro = await criarPlanoRegular(c.apiProfessor, fracionaria.turmaDisciplinaId);
    await nomearAvaliacoes(c, terceiro);
    await lancarPontosRegulares(c.apiProfessor, terceiro, aluno.aluno.id, '60.00');
    await logoutViaStorage(page);
    await loginViaUI(page, aluno.email, aluno.senha);
    await page.goto(`${config.webUrl}/minhas-notas`);
    await expect(page.getByLabel('Corte', { exact: true })).toHaveText('60,006');
    await expect(page.getByLabel('Pontos regulares', { exact: true })).toHaveText('60,00');
    await expect(page.getByLabel('Resultado por nota', { exact: true })).toHaveText('Em recuperação');
    await capturar(page, info, viewport.nome, 'boletim-corte-tres-casas', { periodoId: fracionaria.periodoId });
    await logoutViaStorage(page);
    await loginViaUI(page, config.secretaria.email, config.secretaria.senha);
    await page.goto(`${config.webUrl}/alunos/ficha-do-aluno/${aluno.aluno.id}`);
    await escolher(page, page.getByRole('combobox', { name: 'Período letivo', exact: true }), fracionaria.codigo);
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
    await expect(page.getByLabel('Corte', { exact: true })).toHaveText('60,006');
    await capturar(page, info, viewport.nome, 'ficha-outro-periodo', { oferta: fracionaria.turmaDisciplinaId, periodoId: fracionaria.periodoId });
    await escolher(page, page.getByRole('combobox', { name: 'Período letivo', exact: true }), c.periodoCodigo);
    const historico = page.getByRole('table');
    await expect(historico.getByRole('row')).toHaveCount(3);
    await expect(historico.getByRole('columnheader', { name: 'Atividade de verificação', exact: true })).toHaveCount(12);
    await expect(historico.getByLabel('Pontos regulares', { exact: true }).filter({ hasText: '18,00' })).toHaveCount(1);
    await expect(historico.getByLabel('Pontos regulares', { exact: true }).filter({ hasText: '72,00' })).toHaveCount(1);
    await expect(historico.getByLabel('Corte', { exact: true })).toHaveCount(2);
    await historico.getByRole('cell').filter({ has: page.getByLabel('Corte', { exact: true }) }).first().scrollIntoViewIfNeeded();
    await capturar(page, info, viewport.nome, 'ficha-periodo-anterior-preservado', { periodoId: c.periodoLetivoId, ofertas: [c.turmaDisciplinaId, irma.turmaDisciplinaId] });

    const c300 = await novoCenario({ regraPontuacao: '300' });
    const legivel300 = await periodoLegivel(c300, 'Notas300');
    expect((await c300.apiSecretaria.put(`/periodos-letivos/${c300.periodoLetivoId}`, { body: { ano: legivel300.ano, codigo: legivel300.codigo } })).status).toBe(200);
    const aluno300 = await c300.matricularAluno();
    const quarto = await criarPlanoRegular(c300.apiProfessor, c300.turmaDisciplinaId);
    await lancarPontosRegulares(c300.apiProfessor, quarto, aluno300.aluno.id, '179.99');
    await logoutViaStorage(page);
    await loginViaUI(page, aluno300.email, aluno300.senha);
    await page.goto(`${config.webUrl}/minhas-notas`);
    await expect(page.getByLabel('Percentual do resultado', { exact: true })).toHaveText('60,00%');
    await expect(page.getByLabel('Pontos efetivos', { exact: true })).toHaveText('179,99');
    await expect(page.getByLabel('Corte', { exact: true })).toHaveText('180,00');
    await expect(page.getByLabel('Resultado por nota', { exact: true })).toHaveText('Em recuperação');
    await capturar(page, info, viewport.nome, 'boletim300-arredondamento');

    const semMatricula = await criarAlunoComLogin(c.apiSecretaria, `${c.runId}vazio`, { cursoId: c.cursoId, cidadeIbge: c.cidade.ibge, uf: c.cidade.uf });
    await logoutViaStorage(page);
    await loginViaUI(page, semMatricula.email, semMatricula.senha);
    await page.goto(`${config.webUrl}/minhas-notas`);
    await expect(page.getByText('Nenhuma avaliação encontrada', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Corte', { exact: true })).toHaveCount(0);
    await capturar(page, info, viewport.nome, 'boletim-vazio');
  });
});

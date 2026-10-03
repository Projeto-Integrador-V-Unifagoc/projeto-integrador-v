import { test, expect } from "@playwright/test";
import { iniciarHistoricoApi, capturarHistorico, CENARIOS_HISTORICOS, type HistoricoApi, type CasoHistorico } from "../fixtures/historico.fixture.js";
import type { ResultadoAcademico } from "../../backend/src/Modules/notas/models/ResultadoAcademico";
import { criarTurma, criarTurmaDisciplina } from "../factories/estrutura-academica.factory.js";
import { criarRegraPontuacao } from "../factories/regra-pontuacao.factory.js";
import { criarPlanoRegular, lancarPontosRegulares } from "../helpers/dominio.js";
import { demoJaCriada } from "../../backend/seeds/helpers/pontuacaoDemo";
import { criarAlunoComLogin } from "../factories/aluno.factory.js";
import { writeFile } from "node:fs/promises";

test.describe.configure({ mode: "serial" });
test.setTimeout(180000);
let historico: HistoricoApi;
test.beforeAll(async () => { historico = await iniciarHistoricoApi(); });
test.afterAll(async () => { await historico?.dispose(); });

function resultados(envelope: unknown): ResultadoAcademico[] {
  if (Array.isArray(envelope)) return envelope.flatMap(resultados);
  if (!envelope || typeof envelope !== "object") return [];
  return Object.entries(envelope).flatMap(([chave, valor]) => chave === "resultadoAcademico" && valor
    ? [valor as ResultadoAcademico] : resultados(valor));
}
async function compararQuatroLeitores(f: CasoHistorico, oferta = f.ofertaId, vinculo = f.matriculaDisciplinaId) {
  const aluno = historico.api(f.usuarioAlunoId, "aluno"), professor = historico.api(f.usuarioProfessorId, "professor"), secretaria = historico.api(f.usuarioId, "secretaria");
  const respostas = [
    ["boletim", await aluno.get("/notas/me")],
    ["ficha", await secretaria.get(`/alunos/${f.alunoId}/ficha`)],
    ["rendimento", await professor.get(`/notas/turmas/${oferta}/rendimento`)],
    ["relatorio", await secretaria.get("/relatorios/academicos", { query: { alunoId: f.alunoId, tipo: "Historico" } })],
  ] as const;
  let referencia: ResultadoAcademico | undefined;
  for (const [nome, resposta] of respostas) {
    expect(resposta.status, nome).toBe(200);
    const correspondentes = resultados(resposta.body).filter((r) => r.turmaDisciplinaId === oferta && r.matriculaTurmaDisciplinaId === vinculo);
    expect(correspondentes.length, `${nome}: identidade da oferta/matrícula`).toBeGreaterThan(0);
    for (const r of correspondentes) {
      const copia = { ...r, avaliacoesSemNota: [...r.avaliacoesSemNota].sort() };
      expect(copia.contratoVersao).toBe(2);
      if (!referencia) referencia = copia;
      expect(copia, nome).toEqual(referencia);
    }
  }
  return referencia!;
}

test("adoção real13→16 preserva todas as colunas originais e registra origem técnica @historico", async ({}, info) => {
  expect(historico.preflight.apto).toBe(true); expect(historico.preflight.divergencias).toEqual([]);
  expect(historico.ledgerAntes).toHaveLength(13); expect(historico.ledgerDepois).toHaveLength(16);
  expect(historico.ledgerDepois.slice(0, 13)).toEqual(historico.ledgerAntes);
  expect(historico.ledgerDepois.slice(13).map((m) => m.name)).toEqual([
    "20260928000100_expande_pontuacao_dinamica.ts", "20260928000200_adota_pontuacao_historica.ts", "20260928000300_protege_pontuacao_dinamica.ts",
  ]);
  expect(historico.depois).toEqual(historico.referencia);
  const regras = await historico.pg.db("piv.regra_pontuacao");
  expect(regras).toHaveLength(CENARIOS_HISTORICOS.length);
  expect(regras.every((r) => r.origem === "HISTORICA" && r.total_pontos === "100.00" && r.criada_por_usuario_id === null)).toBe(true);
  const eventos = await historico.pg.db("piv.regra_pontuacao_auditoria");
  expect(eventos).toHaveLength(regras.length);
  for (const e of eventos) {
    expect(e).toMatchObject({ acao: "ADOCAO_HISTORICA", usuario_id: null });
    expect(e.novo.origemTemporal).toBe("ADOCAO_TECNICA");
    expect(["professor", "secretaria", "administrador", "aluno"]).not.toContain(e.perfil);
  }
  const { rows } = await historico.pg.db.raw("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname='pontuacao_guard_auditoria' AND tgenabled='O'");
  expect(rows).toHaveLength(2);
  const resumir = (r: typeof historico.referencia) => Object.fromEntries(Object.entries(r).map(([t, v]) => [t, { quantidade: v.quantidade, sha256: v.sha256 }]));
  const arquivo = info.outputPath("manifestos-adocao-sintetica.json");
  await writeFile(arquivo, JSON.stringify({
    preflight: historico.preflight, antes: resumir(historico.referencia), depois: resumir(historico.depois),
    migrationsAntes: historico.ledgerAntes.map((m) => m.name), migrationsDepois: historico.ledgerDepois.map((m) => m.name),
    eventosTecnicos: eventos.length,
  }, null, 2));
  await info.attach("manifestos-adocao-sintetica", { contentType: "application/json", path: arquivo });
});

for (const entrada of CENARIOS_HISTORICOS) {
  test(`quatro leitores preservam nota histórica e frequência conjunta: ${entrada.nome} @historico`, async () => {
    const f = historico.casos.find((c) => c.nome === entrada.nome)!;
    const r = await compararQuatroLeitores(f);
    const legado = f.legado;
    expect(r.totalPontos).toBe("100.00"); expect(r.cortePontos).toBe("60.00");
    expect(r.pontosRegularesObtidos).toBe(legado.pontosObtidos.toFixed(2));
    expect(r.pontosMaximosLancados).toBe(legado.pontosMaximos.toFixed(2));
    expect(r.indicadorRegular.percentual).toBe(legado.mediaParcial);
    // A v2 distingue indicador parcial preservado de resultado final pendente.
    expect(r.percentualResultado).toBe(legado.etapaRegularCompleta ? legado.mediaFinal : null);
    expect(r.etapaRegularCompleta).toBe(legado.etapaRegularCompleta);
    expect(r.elegivelRecuperacaoPorNota).toBe(legado.elegivelRecuperacao);
    expect(r.pontosRecuperacao).toBe(legado.notaRecuperacao === null ? null : legado.notaRecuperacao.toFixed(2));
    expect(r.frequencia.presencas).toBe(entrada.presencas); expect(r.frequencia.faltas).toBe(entrada.faltas);
    const esperado = entrada.nome === "suficiente-frequencia50" ? "NAO_APROVADA"
      : ["suficiente-sem-frequencia", "incompleto", "ausente", "zero"].includes(entrada.nome) ? "PENDENTE" : "APROVADA";
    expect(r.aprovacaoDisciplina).toBe(esperado);
    if (entrada.nome === "suficiente-frequencia50") {
      expect(r.resultadoPorNota).toBe("SUFICIENTE"); expect(r.motivos).toContain("FREQUENCIA_INSUFICIENTE");
    } else if (entrada.nome === "suficiente-sem-frequencia") {
      expect(r.resultadoPorNota).toBe("SUFICIENTE"); expect(r.frequencia.percentual).toBeNull(); expect(r.motivos).toContain("FREQUENCIA_PENDENTE");
    } else if (entrada.nome === "incompleto") {
      expect(r.indicadorRegular).toMatchObject({ percentual: 50, parcial: true }); expect(r.planoCompleto).toBe(false);
    } else if (entrada.nome === "zero") {
      expect(r.avaliacoesLancadas).toBe(5); expect(r.avaliacoesSemNota).toEqual([]); expect(r.resultadoPorNota).toBe("EM_RECUPERACAO");
    } else if (entrada.nome === "ausente") {
      expect(r.avaliacoesLancadas).toBe(0); expect(r.avaliacoesSemNota).toHaveLength(5); expect(r.resultadoPorNota).toBe("NAO_LANCADA");
    } else if (entrada.nome === "recuperacao") {
      expect(r.pontosRegularesObtidos).toBe("50.00"); expect(r.pontosRecuperacao).toBe("80.00"); expect(r.pontosEfetivos).toBe("80.00");
    } else {
      expect(r.frequencia).toMatchObject({ percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" });
    }
  });
}

test("par sem avaliações permanece sem default e demo recusa sobrescrever HISTORICA @historico", async () => {
  const f = historico.casos[0], secretaria = historico.api(f.usuarioId, "secretaria");
  const ausente = await secretaria.get(`/regras-pontuacao/cursos/${f.outroCursoId}/periodos/${f.outroPeriodoId}`);
  expect(ausente.status).toBe(404);
  expect(await historico.pg.db("piv.turma_disciplina").where({ id: f.ofertaSemHistoricoId }).first("regra_pontuacao_id")).toEqual({ regra_pontuacao_id: null });
  await expect(demoJaCriada(historico.pg.db, [f.cursoId], f.periodoId, "demo-nova")).rejects.toThrow(/HISTORICA/);
  expect(await capturarHistorico(historico.pg.db, historico.referencia)).toEqual(historico.referencia);
});

test("período seguinte com regra120 conserva resultado, vínculos e histórico100 @historico", async () => {
  const f = historico.casos[0], secretaria = historico.api(f.usuarioId, "secretaria"), professor = historico.api(f.usuarioProfessorId, "professor");
  const antes = await compararQuatroLeitores(f);
  const regraAntes = await secretaria.get(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`);
  const nova = await criarRegraPontuacao(secretaria, f.cursoId, f.outroPeriodoId, "120");
  const turma = await criarTurma(secretaria, `HIST-${f.cursoId.slice(0, 8)}`, { periodoLetivoId: f.outroPeriodoId, cursoId: f.cursoId });
  const oferta = await criarTurmaDisciplina(secretaria, turma.id, { cursoDisciplinaId: f.cursoDisciplinaId, professorId: f.professorId });
  // O contrato vigente admite uma matrícula em aberto por aluno. Nova coorte
  // permite exercer o período seguinte sem cancelar ou alterar a matrícula antiga.
  const cidade = await historico.pg.db("piv.cidade").where({ id: f.cidadeId }).first("ibge", "uf");
  const aluno = await criarAlunoComLogin(secretaria, `HIST-NOVO-${f.cursoId.slice(0, 8)}`,
    { cursoId: f.cursoId, cidadeIbge: cidade.ibge, uf: cidade.uf });
  const usuario = await historico.pg.db("piv.aluno").where({ id: aluno.aluno.id }).first("usuario_id");
  const matricula = await secretaria.post("/matriculas", { body: { alunoId: aluno.aluno.id, turmaId: turma.id } });
  expect(matricula.status).toBe(201);
  const mtd = await historico.pg.db("piv.matricula_turma_disciplina").where({ matricula_id: matricula.body.id, turma_disciplina_id: oferta.id }).first("id");
  const plano = await criarPlanoRegular(professor, oferta.id);
  await lancarPontosRegulares(professor, plano, aluno.aluno.id, "120.00");
  const novoResultado = await compararQuatroLeitores({ ...f, alunoId: aluno.aluno.id, usuarioAlunoId: usuario.usuario_id }, oferta.id, mtd.id);
  expect(novoResultado).toMatchObject({ regraPontuacaoId: nova.id, totalPontos: "120.00", cortePontos: "72.00",
    pontosRegularesObtidos: "120.00", resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "PENDENTE" });
  expect(await compararQuatroLeitores(f)).toEqual(antes);
  expect((await secretaria.get(`/regras-pontuacao/cursos/${f.cursoId}/periodos/${f.periodoId}`)).body).toEqual(regraAntes.body);
  expect(await capturarHistorico(historico.pg.db, historico.referencia)).toEqual(historico.referencia);
  expect((await secretaria.get(`/regras-pontuacao/cursos/${f.outroCursoId}/periodos/${f.outroPeriodoId}`)).status).toBe(404);
});

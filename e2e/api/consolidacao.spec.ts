import { test, expect } from "../fixtures/test.js";
import type { Cenario, AlunoMatriculado } from "../fixtures/academic.fixture.js";
import type { ModeloRegraPontuacao } from "../factories/regra-pontuacao.factory.js";
import { criarProfessorComLogin } from "../factories/professor.factory.js";
import { associarDisciplinaAoCurso, criarDisciplina, criarTurmaDisciplina } from "../factories/estrutura-academica.factory.js";
import { db, exigirBancoDeTeste, fecharDb } from "../helpers/db.js";
import { datasRecentes, registrarChamada } from "../helpers/dominio.js";

test.beforeAll(() => exigirBancoDeTeste());
test.afterAll(async () => fecharDb());

/**
 * Consolidação (spec §6, §11.6): home do aluno, ficha e relatórios. Foco em
 * isolamento por aluno/perfil e coerência com a matrícula.
 */
test.describe("Home do aluno @api", () => {
  test("disciplinas e tarefas exigem perfil aluno e refletem a matrícula", async ({ novoCenario, api }) => {
    const cenario = await novoCenario();
    const { aluno, apiAluno } = await cenario.matricularAluno();

    const disciplinas = await apiAluno.get("/me/disciplinas");
    expect(disciplinas.status).toBe(200);
    expect(disciplinas.body.some((d: any) => d.disciplinaId === cenario.disciplinaId)).toBe(true);

    const tarefas = await apiAluno.get("/me/tarefas");
    expect(tarefas.status).toBe(200);
    expect(Array.isArray(tarefas.body)).toBe(true);

    // Secretaria não acessa a home do aluno (§8).
    const secretaria = await cenario.apiSecretaria.get("/me/disciplinas");
    expect(secretaria.status).toBe(403);

    // Anônimo é barrado (autenticar).
    const anon = await api.get("/me/disciplinas");
    expect(anon.status).toBe(401);

    // Garante que o objeto `aluno` foi usado (evita lint de variável não usada).
    expect(aluno.id).toBeTruthy();
  });
});

test.describe("Ficha do aluno @api", () => {
  test("consolida aluno e matrículas", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { aluno } = await cenario.matricularAluno();
    const ficha = await cenario.apiSecretaria.get(`/alunos/${aluno.id}/ficha`);
    expect(ficha.status).toBe(200);
    expect(ficha.body.aluno).toBeTruthy();
    expect(Array.isArray(ficha.body.matriculas)).toBe(true);
    expect(ficha.body.matriculas.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Relatórios acadêmicos @api", () => {
  test("status da fonte de dados aponta para o banco piv", async ({ apiSecretaria }) => {
    const status = await apiSecretaria.get("/relatorios/academicos/status");
    expect(status.status).toBe(200);
    expect(status.body.source).toBe("database");
    expect(status.body.schema).toBe("piv");
  });

  test("secretaria lista relatórios; anônimo é barrado (401)", async ({ apiSecretaria, api }) => {
    const lista = await apiSecretaria.get("/relatorios/academicos");
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);

    const anon = await api.get("/relatorios/academicos");
    expect(anon.status).toBe(401);
  });

  test("relatórios do aluno são restritos ao perfil Aluno", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const relatorios = await apiAluno.get("/relatorios/academicos");
    expect(relatorios.status).toBe(200);
    // Quando há itens, todos devem ser do perfil Aluno (não expõe terceiros).
    for (const item of relatorios.body) {
      expect(item.perfis).toContain("Aluno");
    }
  });
});

interface ResultadoComun {
  contratoVersao: 2;
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string;
  regraPontuacaoId: string | null;
  totalPontos: string | null;
  cortePontos: string | null;
  planoCompleto: boolean;
  etapaRegularCompleta: boolean;
  avaliacoesSemNota: string[];
  pontosRegularesObtidos: string;
  pontosEfetivos: string | null;
  pontosRecuperacao: string | null;
  resultadoPorNota: string;
  elegivelRecuperacaoPorNota: boolean;
  aprovacaoDisciplina: string;
  frequencia: { presencas: number; faltas: number; percentual: number | null; situacao: string; requisito: string };
  [campo: string]: unknown;
}

// Os envelopes continuam específicos de cada leitor; somente este campo tem contrato comum.
function resultadosNoEnvelope(envelope: unknown): ResultadoComun[] {
  if (Array.isArray(envelope)) return envelope.flatMap(resultadosNoEnvelope);
  if (envelope === null || typeof envelope !== "object") return [];
  return Object.entries(envelope).flatMap(([campo, valor]) =>
    campo === "resultadoAcademico" && valor !== null && typeof valor === "object"
      ? [valor as ResultadoComun] : resultadosNoEnvelope(valor));
}

const maximos: Record<ModeloRegraPontuacao, string[]> = {
  "100": ["20.00", "20.00", "20.00", "5.00", "35.00"],
  "120": ["12.00", "18.00", "18.00", "24.00", "6.00", "42.00"],
  "300": ["60.00", "60.00", "60.00", "15.00", "105.00"],
  "100.01": ["20.00", "20.00", "20.00", "5.00", "35.01"],
};
const centesimos = (texto: string) => {
  const [inteiro, fracao = ""] = texto.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
};
const decimal = (valor: bigint) => `${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;

async function prepararResultado(c: Cenario, modelo: ModeloRegraPontuacao, pontos: string, opcoes: {
  presencas?: number; faltas?: number; recuperacao?: string; planoIncompleto?: boolean; semNotas?: boolean; omitirUltimaNota?: boolean;
} = {}) {
  const regra = await c.configurarRegra(modelo);
  const aluno = await c.matricularAluno();
  const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: aluno.matriculaId, turma_disciplina_id: c.turmaDisciplinaId }).first("id");
  expect(vinculo?.id).toEqual(expect.any(String));
  const valores = opcoes.planoIncompleto ? [maximos[modelo][0]] : maximos[modelo];
  const avaliacoes: string[] = [];
  let restante = centesimos(pontos);
  for (const [indice, valor] of valores.entries()) {
    const grupo = indice < maximos[modelo].length - 2 ? 0 : indice === maximos[modelo].length - 2 ? 1 : 2;
    const criada = await c.apiProfessor.post("/avaliacoes", { body: {
      turma_disciplina_id: c.turmaDisciplinaId, subgrupo_id: regra.subgrupos[grupo].id, tipo_avaliacao: "REGULAR",
      descricao_avaliacao: `Consolidação ${indice + 1}`, valor, data_lancamento: "2026-09-28", data_devolucao: "2200-12-31",
    } });
    expect(criada.status).toBe(201);
    avaliacoes.push(criada.body.id);
    const nota = restante < centesimos(valor) ? restante : centesimos(valor);
    restante -= nota;
    if (!opcoes.semNotas && !(opcoes.omitirUltimaNota && indice === valores.length - 1)) {
      const salva = await c.apiProfessor.put(`/notas/avaliacoes/${criada.body.id}/lote`, { body: { itens: [{ alunoId: aluno.aluno.id, valor: decimal(nota) }] } });
      expect(salva.status).toBe(200);
    }
  }
  expect(restante).toBe(0n);
  const presencas = opcoes.presencas ?? 0, faltas = opcoes.faltas ?? 0;
  for (const [indice, data] of datasRecentes(presencas + faltas).entries()) {
    const chamada = await registrarChamada(c.apiProfessor, c.turmaDisciplinaId, data,
      [{ alunoId: aluno.aluno.id, status: indice < presencas ? "PRESENTE" : "AUSENTE" }], `T056-${c.runId}`);
    expect([200, 201]).toContain(chamada.status);
  }
  if (opcoes.recuperacao !== undefined) {
    const recuperacao = await c.apiProfessor.get(`/notas/turmas/${c.turmaDisciplinaId}/recuperacao`);
    expect(recuperacao.status).toBe(200);
    expect(recuperacao.body.valorMaximoRecuperacao).toBe(regra.totalPontos);
    expect(recuperacao.body.recuperacaoAvaliacaoId).toEqual(expect.any(String));
    const salva = await c.apiProfessor.put(`/notas/avaliacoes/${recuperacao.body.recuperacaoAvaliacaoId}/lote`, {
      body: { itens: [{ alunoId: aluno.aluno.id, valor: opcoes.recuperacao }] },
    });
    expect(salva.status).toBe(200);
  }
  return { aluno, matriculaTurmaDisciplinaId: String(vinculo.id), regra, avaliacoes };
}

async function compararLeitores(c: Cenario, aluno: AlunoMatriculado, matriculaTurmaDisciplinaId: string) {
  // Toda escrita da fixture termina antes destas leituras. Não chamar GET recuperação aqui.
  const boletim = await aluno.apiAluno.get("/notas/me");
  const ficha = await c.apiSecretaria.get(`/alunos/${aluno.aluno.id}/ficha`);
  const rendimento = await c.apiProfessor.get(`/notas/turmas/${c.turmaDisciplinaId}/rendimento`);
  const relatorio = await c.apiSecretaria.get("/relatorios/academicos", { query: { alunoId: aluno.aluno.id, tipo: "Historico" } });
  let referencia: ResultadoComun | undefined;
  for (const [leitor, resposta] of [["boletim", boletim], ["ficha", ficha], ["rendimento", rendimento], ["relatorio", relatorio]] as const) {
    expect(resposta.status, leitor).toBe(200);
    const resultados = resultadosNoEnvelope(resposta.body).filter((r) => r.turmaDisciplinaId === c.turmaDisciplinaId && r.matriculaTurmaDisciplinaId === matriculaTurmaDisciplinaId);
    expect(resultados.length, `${leitor} deve expor resultadoAcademico pelo UUID do vínculo`).toBeGreaterThan(0);
    for (const resultado of resultados) {
      expect(resultado.contratoVersao).toBe(2);
      if (!referencia) referencia = resultado;
      expect(resultado, `${leitor}: mesmo estado, pontos e requisitos`).toEqual(referencia);
    }
  }
  return referencia!;
}

test.describe("US3: resultado comum dos quatro leitores @api", () => {
  for (const caso of [
    { nome: "100 no corte", modelo: "100", pontos: "60.00", presencas: 3, faltas: 1, corte: "60.00", nota: "SUFICIENTE", aprovacao: "APROVADA" },
    { nome: "120 com75% e alerta", modelo: "120", pontos: "72.00", presencas: 3, faltas: 1, corte: "72.00", nota: "SUFICIENTE", aprovacao: "APROVADA" },
    { nome: "120 com80% e alerta", modelo: "120", pontos: "72.00", presencas: 4, faltas: 1, corte: "72.00", nota: "SUFICIENTE", aprovacao: "APROVADA" },
    { nome: "nota suficiente e50% não aprovam", modelo: "120", pontos: "120.00", presencas: 1, faltas: 1, corte: "72.00", nota: "SUFICIENTE", aprovacao: "NAO_APROVADA" },
    { nome: "nota suficiente sem frequência permanece pendente", modelo: "120", pontos: "120.00", presencas: 0, faltas: 0, corte: "72.00", nota: "SUFICIENTE", aprovacao: "PENDENTE" },
    { nome: "179,99/300 abaixo apesar do percentual60,00", modelo: "300", pontos: "179.99", presencas: 9, faltas: 1, corte: "180.00", nota: "EM_RECUPERACAO", aprovacao: "PENDENTE" },
    { nome: "180/300 no corte", modelo: "300", pontos: "180.00", presencas: 9, faltas: 1, corte: "180.00", nota: "SUFICIENTE", aprovacao: "APROVADA" },
    { nome: "60/100,01 abaixo do corte60,006", modelo: "100.01", pontos: "60.00", presencas: 9, faltas: 1, corte: "60.006", nota: "EM_RECUPERACAO", aprovacao: "PENDENTE" },
    { nome: "60,01/100,01 atende corte", modelo: "100.01", pontos: "60.01", presencas: 9, faltas: 1, corte: "60.006", nota: "SUFICIENTE", aprovacao: "APROVADA" },
  ] as const) {
    test(caso.nome, async ({ novoCenario }) => {
      const c = await novoCenario();
      const dados = await prepararResultado(c, caso.modelo, caso.pontos, caso);
      const resultado = await compararLeitores(c, dados.aluno, dados.matriculaTurmaDisciplinaId);
      expect(resultado).toMatchObject({ regraPontuacaoId: dados.regra.id, totalPontos: dados.regra.totalPontos,
        cortePontos: caso.corte, planoCompleto: true, etapaRegularCompleta: true, pontosRegularesObtidos: caso.pontos,
        pontosEfetivos: caso.pontos, pontosRecuperacao: null, resultadoPorNota: caso.nota, aprovacaoDisciplina: caso.aprovacao,
      });
      const frequenciasEsperadas: Record<string, { percentual: number | null; situacao: string; requisito: string }> = {
        "3/1": { percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
        "4/1": { percentual: 80, situacao: "ALERTA", requisito: "SUFICIENTE" },
        "1/1": { percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" },
        "0/0": { percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
        "9/1": { percentual: 90, situacao: "REGULAR", requisito: "SUFICIENTE" },
      };
      expect(resultado.frequencia).toEqual({ presencas: caso.presencas, faltas: caso.faltas,
        ...frequenciasEsperadas[`${caso.presencas}/${caso.faltas}`],
      });
      const resumo = await dados.aluno.apiAluno.get("/notas/me/resumo");
      expect(resumo.status).toBe(200);
      expect(resumo.body.totalDisciplinas).toBe(1);
      expect(resumo.body.disciplinasAbaixoDe60).toBe(caso.nota === "EM_RECUPERACAO" ? 1 : 0);
      const tarefas = await dados.aluno.apiAluno.get("/me/tarefas");
      expect(tarefas.status).toBe(200);
      expect(tarefas.body.filter((t: any) => t.turmaDisciplinaId === c.turmaDisciplinaId).map((t: any) => t.valor).sort()).toEqual([...maximos[caso.modelo]].sort());
      for (const tarefa of tarefas.body) expect(tarefa.tipo).toBe("REGULAR");
    });
  }

  for (const [recuperacao, efetivos, nota, aprovacao, presencas, faltas] of [
    ["48.00", "60.00", "INSUFICIENTE", "NAO_APROVADA", 9, 1],
    ["72.00", "72.00", "SUFICIENTE", "APROVADA", 9, 1],
    ["90.00", "90.00", "SUFICIENTE", "APROVADA", 9, 1],
    ["90.00", "90.00", "SUFICIENTE", "NAO_APROVADA", 1, 1],
  ] as const) {
    test(`regular60/120, recuperação${recuperacao}, frequência${presencas}/${presencas + faltas}`, async ({ novoCenario }) => {
      const c = await novoCenario();
      const dados = await prepararResultado(c, "120", "60.00", { recuperacao, presencas, faltas });
      const resultado = await compararLeitores(c, dados.aluno, dados.matriculaTurmaDisciplinaId);
      expect(resultado).toMatchObject({ pontosRegularesObtidos: "60.00", pontosRecuperacao: recuperacao,
        pontosEfetivos: efetivos, valorMaximoRecuperacao: "120.00", resultadoPorNota: nota,
        elegivelRecuperacaoPorNota: true, aprovacaoDisciplina: aprovacao,
      });
    });
  }

  test("100% parcial não completa orçamento/quantidade", async ({ novoCenario }) => {
    const c = await novoCenario();
    const dados = await prepararResultado(c, "120", "12.00", { planoIncompleto: true, presencas: 3, faltas: 1 });
    const resultado = await compararLeitores(c, dados.aluno, dados.matriculaTurmaDisciplinaId);
    expect(resultado).toMatchObject({ planoCompleto: false, etapaRegularCompleta: false,
      pontosRegularesObtidos: "12.00", pontosMaximosLancados: "12.00", pontosEfetivos: null,
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "12.00" },
      elegivelRecuperacaoPorNota: false, resultadoPorNota: "EM_ANDAMENTO", aprovacaoDisciplina: "PENDENTE",
    });
  });

  test("nota zero conta, nota ausente continua identificada por UUID", async ({ novoCenario }) => {
    const c = await novoCenario();
    const dados = await prepararResultado(c, "120", "0.00", { omitirUltimaNota: true });
    const resultado = await compararLeitores(c, dados.aluno, dados.matriculaTurmaDisciplinaId);
    expect(resultado).toMatchObject({ planoCompleto: true, avaliacoesRegulares: 6, avaliacoesLancadas: 5,
      avaliacoesSemNota: [dados.avaliacoes[5]], pontosRegularesObtidos: "0.00", etapaRegularCompleta: false,
      frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
      pontosEfetivos: null, resultadoPorNota: "EM_ANDAMENTO", aprovacaoDisciplina: "PENDENTE",
    });
  });

  test("sem notas mantém ausência e denominador zero sem aprovação", async ({ novoCenario }) => {
    const c = await novoCenario(); const dados = await prepararResultado(c, "120", "0.00", { semNotas: true });
    const resultado = await compararLeitores(c, dados.aluno, dados.matriculaTurmaDisciplinaId);
    expect(resultado).toMatchObject({ avaliacoesLancadas: 0, pontosRegularesObtidos: "0.00", pontosMaximosLancados: "0.00",
      indicadorRegular: { percentual: null, parcial: true }, pontosEfetivos: null,
      resultadoPorNota: "NAO_LANCADA", aprovacaoDisciplina: "PENDENTE",
    });
    expect([...resultado.avaliacoesSemNota].sort()).toEqual([...dados.avaliacoes].sort());
  });

  test("sem regra mantém total/corte null nos quatro leitores sem presumir100", async ({ novoCenario }) => {
    const c = await novoCenario(); const aluno = await c.matricularAluno();
    const vinculo = await db()("piv.matricula_turma_disciplina").where({ matricula_id: aluno.matriculaId, turma_disciplina_id: c.turmaDisciplinaId }).first("id");
    const resultado = await compararLeitores(c, aluno, String(vinculo.id));
    expect(resultado).toMatchObject({ regraPontuacaoId: null, totalPontos: null, cortePontos: null,
      planoCompleto: false, etapaRegularCompleta: false, elegivelRecuperacaoPorNota: false,
      valorMaximoRecuperacao: null, pontosEfetivos: null, aprovacaoDisciplina: "PENDENTE",
    });
    expect(resultado.motivos).toContain("REGRA_AUSENTE");
  });

  test("professor com aluno compartilhado só consulta sua oferta", async ({ novoCenario, runId }) => {
    const c = await novoCenario();
    const dados = await prepararResultado(c, "120", "72.00", { presencas: 3, faltas: 1 });
    const outro = await criarProfessorComLogin(c.apiSecretaria, `${runId}outro`, { cursoId: c.cursoId, cidadeIbge: c.cidade.ibge, uf: c.cidade.uf });
    const disciplina = await criarDisciplina(c.apiSecretaria, `${runId}alheia`);
    const matriz = await associarDisciplinaAoCurso(c.apiSecretaria, c.cursoId, disciplina.id);
    const oferta = await criarTurmaDisciplina(c.apiSecretaria, c.turmaId, { cursoDisciplinaId: matriz.id, professorId: outro.professor.id });
    const irma = { turmaId: c.turmaId, turmaDisciplinaId: oferta.id };
    const vinculado = await c.apiSecretaria.post(`/matriculas/${dados.aluno.matriculaId}/disciplinas`, { body: { turmaDisciplinaIds: [irma.turmaDisciplinaId] } });
    expect(vinculado.status).toBe(201);
    const alheio = await db()("piv.matricula_turma_disciplina").where({ matricula_id: dados.aluno.matriculaId, turma_disciplina_id: irma.turmaDisciplinaId }).first("id");
    expect(alheio?.id).toEqual(expect.any(String));
    const boletim = await c.apiProfessor.get(`/notas/alunos/${dados.aluno.aluno.id}`);
    expect(boletim.status).toBe(200);
    expect(resultadosNoEnvelope(boletim.body).map((r) => r.turmaDisciplinaId)).toEqual([c.turmaDisciplinaId]);
    const relatorios = await c.apiProfessor.get("/relatorios/academicos", { query: { alunoId: dados.aluno.aluno.id, tipo: "Historico" } });
    expect(relatorios.status).toBe(200);
    const resultados = resultadosNoEnvelope(relatorios.body);
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((r) => r.turmaDisciplinaId === c.turmaDisciplinaId)).toBe(true);
    const ficha = await c.apiProfessor.get(`/alunos/${dados.aluno.aluno.id}/ficha`);
    expect([200, 403]).toContain(ficha.status);
    if (ficha.status === 200) {
      expect(resultadosNoEnvelope(ficha.body).length).toBeGreaterThan(0);
      expect(resultadosNoEnvelope(ficha.body).every((r) => r.turmaDisciplinaId === c.turmaDisciplinaId)).toBe(true);
    }
    for (const resposta of [boletim, relatorios, ficha]) {
      expect(JSON.stringify(resposta.body)).not.toContain(irma.turmaDisciplinaId);
      expect(JSON.stringify(resposta.body)).not.toContain(alheio.id);
    }
    expect((await c.apiProfessor.get(`/notas/turmas/${irma.turmaDisciplinaId}/rendimento`)).status).toBe(403);
    expect((await dados.aluno.apiAluno.get(`/notas/alunos/${dados.aluno.aluno.id}`)).status).toBe(200);
  });
});

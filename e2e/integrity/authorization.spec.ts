import { test, expect } from "../fixtures/test.js";
import type { Cenario } from "../fixtures/academic.fixture.js";
import * as estrutura from "../factories/estrutura-academica.factory.js";
import { criarProfessorComLogin } from "../factories/professor.factory.js";

async function adicionarOutroDocente(cenario: Cenario, runId: string) {
  const prof = await criarProfessorComLogin(cenario.apiSecretaria, runId, {
    cursoId: cenario.cursoId, cidadeIbge: cenario.cidade.ibge, uf: cenario.cidade.uf,
  });
  const disciplina = await estrutura.criarDisciplina(cenario.apiSecretaria, runId);
  const matriz = await estrutura.associarDisciplinaAoCurso(cenario.apiSecretaria, cenario.cursoId, disciplina.id);
  const oferta = await estrutura.criarTurmaDisciplina(cenario.apiSecretaria, cenario.turmaId, {
    cursoDisciplinaId: matriz.id, professorId: prof.professor.id,
  });
  return { ofertaId: oferta.id, apiProfessor: cenario.apiSecretaria.comToken(prof.token) };
}

function resultadosRelatorio(corpo: any): any[] {
  expect(Array.isArray(corpo)).toBe(true);
  return corpo.flatMap((r: any) => r.periodos.flatMap((p: any) => p.disciplinas.map((d: any) => d.resultadoAcademico)));
}

/**
 * Matriz de autorização (spec §8, §17.4). Sem autenticação ⇒ 401; perfil sem
 * permissão ⇒ 403. Os cruzamentos `@defeito` capturam rotas administrativas e de
 * ficha registradas direto em `app.ts` sem `autenticar` (vulnerabilidade real).
 */
test.describe("Autorização — rotas protegidas (router) @integrity", () => {
  test("escrita de professor/avaliação/matrícula exige autenticação (anônimo 401)", async ({ api }) => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await api.put(`/professores/${id}`, { body: {} })).status).toBe(401);
    expect((await api.post("/avaliacoes", { body: {} })).status).toBe(401);
    expect((await api.post("/matriculas", { body: {} })).status).toBe(401);
    expect((await api.put(`/notas/avaliacoes/${id}/lote`, { body: { itens: [] } })).status).toBe(401);
    expect((await api.post("/frequencias", { body: {} })).status).toBe(401);
  });

  test("perfil sem permissão recebe 403 (aluno/professor em rotas de secretaria)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();

    // Aluno não cria professor (soSecretaria).
    expect((await apiAluno.post("/professores", { body: {} })).status).toBe(403);
    // Aluno não cria matrícula (soSecretaria).
    expect((await apiAluno.post("/matriculas", { body: {} })).status).toBe(403);
    // Professor não cria matrícula (soSecretaria).
    expect((await cenario.apiProfessor.post("/matriculas", { body: {} })).status).toBe(403);
  });

  test("aluno não acessa boletim de terceiros (403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const a2 = await cenario.matricularAluno();
    const resp = await a1.apiAluno.get(`/notas/alunos/${a2.aluno.id}`);
    expect(resp.status).toBe(403);
  });

  test("aluno não acessa o rendimento da turma (403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const resp = await apiAluno.get(`/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`);
    expect(resp.status).toBe(403);
  });
});

test.describe("Autorização — rotas administrativas (§17.4 corrigido) @integrity", () => {
  test("leitura administrativa de dados pessoais exige autenticação (401)", async ({ api }) => {
    expect((await api.get("/alunos")).status).toBe(401);
    expect((await api.get("/alunos/00000000-0000-4000-8000-000000000000/ficha")).status).toBe(401);
    for (const rota of ["/relatorios/academicos", "/relatorio-alunos", "/relatorios/academicos/status"]) {
      expect((await api.get(rota)).status).toBe(401);
    }
  });

  test("escrita administrativa exige autenticação (anônimo 401)", async ({ api, runId }) => {
    const resp = await api.post("/cursos", {
      body: { codigo: `X${runId}`, nome: "x", departamentoId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(resp.status).toBe(401);
  });

  test("escrita exige secretaria (perfil aluno 403)", async ({ novoCenario, runId }) => {
    const cenario = await novoCenario();
    const { apiAluno } = await cenario.matricularAluno();
    const resp = await apiAluno.post("/cursos", {
      body: { codigo: `Y${runId}`, nome: "x", departamentoId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(resp.status).toBe(403);
  });

  test("escrita de faculdade/departamento exige autenticação; leitura permanece pública", async ({ api }) => {
    // Decisão de produto: escritas protegidas, leituras de referência públicas.
    expect((await api.post("/faculdades", { body: {} })).status).toBe(401);
    expect((await api.post("/departamentos", { body: {} })).status).toBe(401);
    expect((await api.get("/faculdades")).status).toBe(200);
    expect((await api.get("/departamentos")).status).toBe(200);
    expect((await api.get("/cidades")).status).toBe(200);
  });
});

test.describe("US3 - ficha e leitores preservam escopo de oferta/matrícula @integrity", () => {
  test("professor/aluno não obtêm ficha pessoal ou documentos; secretaria obtém resultado pendente explícito", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const a2 = await cenario.matricularAluno();
    for (const cliente of [cenario.apiProfessor, a1.apiAluno]) {
      for (const alunoId of [a1.aluno.id, a2.aluno.id]) {
        const resposta = await cliente.get(`/alunos/${alunoId}/ficha`);
        expect(resposta.status).toBe(403);
        expect(resposta.body).not.toHaveProperty("documentos");
        expect(resposta.body).not.toHaveProperty("aluno");
      }
    }
    const permitida = await cenario.apiSecretaria.get(`/alunos/${a1.aluno.id}/ficha`);
    expect(permitida.status).toBe(200);
    expect(permitida.body.aluno.id).toBe(a1.aluno.id);
    expect(permitida.body.notas).toHaveLength(1);
    expect(permitida.body.notas[0]).toMatchObject({ turmaDisciplinaId: cenario.turmaDisciplinaId,
      resultadoAcademico: { contratoVersao: 2, totalPontos: null, cortePontos: null, aprovacaoDisciplina: "PENDENTE" } });
  });

  test("um aluno compartilhado não amplia boletim/relatório para oferta de outro docente", async ({ novoCenario, runId }) => {
    const cenario = await novoCenario();
    const outro = await adicionarOutroDocente(cenario, `${runId}doc2`);
    const a = await cenario.matricularAluno();
    const boletim = await cenario.apiProfessor.get(`/notas/alunos/${a.aluno.id}`);
    expect(boletim.status).toBe(200);
    expect(boletim.body.disciplinas.map((d: any) => d.turmaDisciplinaId)).toEqual([cenario.turmaDisciplinaId]);
    for (const rota of ["/relatorios/academicos", "/relatorio-alunos"]) {
      const resposta = await cenario.apiProfessor.get(`${rota}?alunoId=${a.aluno.id}&perfil=Secretaria`);
      expect(resposta.status).toBe(200);
      const resultados = resultadosRelatorio(resposta.body);
      expect(resultados.length).toBeGreaterThan(0);
      expect(new Set(resultados.map(r => r.turmaDisciplinaId))).toEqual(new Set([cenario.turmaDisciplinaId]));
      expect(resposta.body.every((r: any) => r.perfis[0] === "Professor")).toBe(true);
      const proibida = await cenario.apiProfessor.get(`${rota}?turmaId=${outro.ofertaId}`);
      expect(proibida.status).toBe(403);
      expect(proibida.body.codigo).toBe("ESCOPO_PROIBIDO");
    }
    const inversa = await outro.apiProfessor.get(`/relatorios/academicos?alunoId=${a.aluno.id}`);
    expect(inversa.status).toBe(200);
    expect(new Set(resultadosRelatorio(inversa.body).map(r => r.turmaDisciplinaId))).toEqual(new Set([outro.ofertaId]));
  });

  test("aluno vê suas duas ofertas, mas filtros e alias não expõem matrículas de terceiro", async ({ novoCenario, runId }) => {
    const cenario = await novoCenario();
    await adicionarOutroDocente(cenario, `${runId}doc2`);
    const a1 = await cenario.matricularAluno();
    const a2 = await cenario.matricularAluno();
    const boletim = await a1.apiAluno.get(`/notas/alunos/${a1.aluno.id}`);
    expect(boletim.status).toBe(200); expect(boletim.body.disciplinas).toHaveLength(2);
    const identificadorMaiusculo = await a1.apiAluno.get(`/notas/alunos/${a1.aluno.id.toUpperCase()}`);
    expect(identificadorMaiusculo.status).toBe(200);
    expect(identificadorMaiusculo.body).toEqual(boletim.body);
    const permitidos = new Set(boletim.body.disciplinas.map((d: any) => d.matriculaTurmaDisciplinaId));
    for (const rota of ["/relatorios/academicos", "/relatorio-alunos"]) {
      const propria = await a1.apiAluno.get(`${rota}?perfil=Secretaria`);
      expect(propria.status).toBe(200);
      expect(propria.body.every((r: any) => r.perfis[0] === "Aluno" && r.tipo !== "Consulta")).toBe(true);
      const resultados = resultadosRelatorio(propria.body);
      expect(resultados.length).toBeGreaterThan(0);
      expect(new Set(resultados.map(r => r.matriculaTurmaDisciplinaId))).toEqual(permitidos);
      const terceiro = await a1.apiAluno.get(`${rota}?alunoId=${a2.aluno.id}`);
      expect(terceiro.status).toBe(403);
    }
  });

  test("professor não consulta aluno sem oferta sua por relatório ou boletim", async ({ novoCenario }) => {
    const c1 = await novoCenario(), c2 = await novoCenario();
    const aluno = await c2.matricularAluno();
    for (const rota of [`/notas/alunos/${aluno.aluno.id}`, `/relatorios/academicos?alunoId=${aluno.aluno.id}`,
      `/relatorio-alunos?alunoId=${aluno.aluno.id}`]) {
      const resposta = await c1.apiProfessor.get(rota);
      expect(resposta.status).toBe(403);
      expect(resposta.body).not.toHaveProperty("documentos");
    }
  });
});

import { test, expect } from "../fixtures/test.js";
import { registrarChamada, datasRecentes } from "../helpers/dominio.js";
import { garantirLocal } from "../helpers/db.js";

/**
 * Módulo `frequencia` (spec §6, §9.3, §11). Chamada completa, status, datas,
 * prazo, justificativa e autorização.
 */
test.describe("Frequência @api", () => {
  test("chamada deve conter exatamente todos os alunos ativos (incompleta → 400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    await cenario.matricularAluno(); // segundo aluno ativo, omitido da chamada
    const [data] = datasRecentes(1);
    const resp = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "PRESENTE" },
    ]);
    expect(resp.status).toBe(400);
  });

  test("status fora de PRESENTE/AUSENTE é rejeitado (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const localId = await garantirLocal("E2E-LOCAL");
    const resp = await cenario.apiProfessor.post("/frequencias", {
      body: { turmaDisciplinaId: cenario.turmaDisciplinaId, data, localId, registros: [{ alunoId: a1.aluno.id, status: "TALVEZ" }] },
    });
    expect(resp.status).toBe(400);
  });

  test("data futura é rejeitada (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    const data = futuro.toISOString().slice(0, 10);
    const resp = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "PRESENTE" },
    ]);
    expect(resp.status).toBe(400);
  });

  test("data fora do período letivo é rejeitada (400)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const antiga = new Date();
    antiga.setFullYear(antiga.getFullYear() - 1);
    const data = antiga.toISOString().slice(0, 10);
    const resp = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "PRESENTE" },
    ]);
    expect(resp.status).toBe(400);
  });

  test("somente o professor responsável salva a chamada (secretaria 403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const localId = await garantirLocal("E2E-LOCAL");
    const resp = await cenario.apiSecretaria.post("/frequencias", {
      body: { turmaDisciplinaId: cenario.turmaDisciplinaId, data, localId, registros: [{ alunoId: a1.aluno.id, status: "PRESENTE" }] },
    });
    expect(resp.status).toBe(403);
  });

  test("registro repetido na mesma data edita sem duplicar", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const primeira = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "PRESENTE" },
    ]);
    expect([200, 201]).toContain(primeira.status);
    const segunda = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "AUSENTE" },
    ]);
    expect([200, 201]).toContain(segunda.status);
    // A consulta da chamada deve mostrar uma única linha por aluno (sem duplicidade).
    const chamada = await cenario.apiProfessor.get("/frequencias/chamada", {
      query: { turmaDisciplinaId: cenario.turmaDisciplinaId, data },
    });
    expect(chamada.status).toBe(200);
    expect(chamada.body.alunos.filter((a: any) => a.id === a1.aluno.id).length).toBe(1);
    expect(chamada.body.alunos.find((a: any) => a.id === a1.aluno.id).status).toBe("AUSENTE");
  });

  test("justificativa só é aceita para ausência e respeita o tamanho do motivo", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const chamada = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "AUSENTE" },
    ]);
    const registroId = chamada.body.registros[0].id;

    const motivoCurto = await a1.apiAluno.post(`/frequencias/${registroId}/justificativa`, {
      body: { motivo: "ab" },
    });
    expect(motivoCurto.status).toBe(400);

    const ok = await a1.apiAluno.post(`/frequencias/${registroId}/justificativa`, {
      body: { motivo: "Atestado médico", observacao: "Consulta" },
    });
    expect(ok.status).toBe(200);
  });

  test("secretaria não pode justificar ausência (403)", async ({ novoCenario }) => {
    const cenario = await novoCenario();
    const a1 = await cenario.matricularAluno();
    const [data] = datasRecentes(1);
    const chamada = await registrarChamada(cenario.apiProfessor, cenario.turmaDisciplinaId, data, [
      { alunoId: a1.aluno.id, status: "AUSENTE" },
    ]);
    const registroId = chamada.body.registros[0].id;
    const resp = await cenario.apiSecretaria.post(`/frequencias/${registroId}/justificativa`, {
      body: { motivo: "Tentativa indevida" },
    });
    expect(resp.status).toBe(403);
  });
});

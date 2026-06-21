import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FrequenciaService } from "./FrequenciaService";

const turmaId = "11111111-1111-4111-8111-111111111111";
const alunoId = "22222222-2222-4222-8222-222222222222";
const professorId = "33333333-3333-4333-8333-333333333333";
const matriculaId = "44444444-4444-4444-8444-444444444444";
const usuarioId = "77777777-7777-4777-8777-777777777777";
const localId = "88888888-8888-4888-8888-888888888888";
const reqProfessor = { user: { id: usuarioId, tipo_usuario: "professor" } } as any;

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarProfessorPorUsuarioId: async () => ({ id: professorId, ativo: true }),
    buscarAlunoPorUsuarioId: async () => ({ id: alunoId }),
    professorPossuiTurma: async () => true,
    professorPossuiAluno: async () => true,
    listarTurmas: async () => [], listarLocais: async () => [],
    buscarTurma: async () => ({ id: turmaId, data_inicio: "2026-01-01", data_fim: "2026-12-20", periodo_ativo: true, periodo_status: "ativo", periodo_codigo: "2026/1" }),
    listarAlunosAtivosDaTurma: async () => [{ aluno_id: alunoId, matricula_turma_disciplina_id: matriculaId, nome: "Aluno Teste", matricula: 1, status: "ativa" }],
    listarRegistrosDaChamada: async () => [], contarMatriculasIrregulares: async () => 0,
    calcularPercentualMatriculaTurmaDisciplina: async () => 100,
    salvarChamadaAtomica: async (dados: any) => ({ aulaId: "55555555-5555-4555-8555-555555555555", registros: dados.registros }),
    buscarRegistroPorId: async () => null, salvarJustificativa: async () => ({}), listarHistoricoAluno: async () => [],
    buscarConsolidadoTurma: async () => ({ totalAulas: 0, rows: [] }),
    ...overrides,
  };
  return new FrequenciaService(repository as any);
}
const payload = () => ({ turmaDisciplinaId: turmaId, localId, data: "2026-05-01", registros: [{ alunoId, status: "PRESENTE" as const }] });

describe("FrequenciaService", () => {
  it("monta a chamada sem assumir presença para registro ainda não lançado", async () => {
    const result = await criar().obterChamada(turmaId, "2026-05-01", reqProfessor);
    assert.equal(result.alunos[0].status, null); assert.equal(result.chamadaCompleta, false);
  });
  it("salva a chamada completa em uma operação atômica", async () => {
    let recebido: any; const service = criar({ salvarChamadaAtomica: async (d: any) => { recebido = d; return { aulaId: "aula", registros: d.registros }; } });
    const result = await service.salvarChamada(payload(), reqProfessor);
    assert.equal(recebido.usuarioId, usuarioId); assert.equal(recebido.registros[0].matriculaId, matriculaId); assert.equal(result.registros.length, 1);
  });
  it("rejeita aluno duplicado e chamada incompleta", async () => {
    const service = criar(); const p = payload(); p.registros.push({ alunoId, status: "PRESENTE" });
    await assert.rejects(() => service.salvarChamada(p, reqProfessor), /duplicado/);
    await assert.rejects(() => service.salvarChamada({ ...payload(), registros: [] }, reqProfessor), /chamada completa/);
  });
  it("rejeita data futura e fora do período real", async () => {
    await assert.rejects(() => criar().salvarChamada({ ...payload(), data: "2099-01-01" }, reqProfessor), /data futura/);
    await assert.rejects(() => criar().salvarChamada({ ...payload(), data: "2025-12-01" }, reqProfessor), /fora do período/);
  });
  it("rejeita professor sem atribuição", async () => {
    await assert.rejects(() => criar({ professorPossuiTurma: async () => false }).salvarChamada(payload(), reqProfessor), /fora da atribuição/);
  });
  it("mapeia conflito concorrente para HTTP 409", async () => {
    const service = criar({ salvarChamadaAtomica: async () => { throw Object.assign(new Error(), { code: "23505" }); } });
    await assert.rejects(() => service.salvarChamada(payload(), reqProfessor), (e: any) => e.status === 409);
  });
  it("exige confirmação ao substituir justificativa e não altera o status", async () => {
    const registro = { id: localId, status: "AUSENTE", alunoId, turmaDisciplinaId: turmaId, motivoJustificativa: "Anterior" };
    const service = criar({ buscarRegistroPorId: async () => registro });
    await assert.rejects(() => service.registrarJustificativa(localId, { motivo: "Atestado" }, reqProfessor), (e: any) => e.status === 409);
  });
  it("classifica abaixo de 75 como risco, até 80 como alerta e acima como regular", async () => {
    const rows = [74, 80, 81].map((presencas, i) => ({ aluno_id: `${i}2222222-2222-4222-8222-222222222222`, aluno_nome: `Aluno ${i}`, turma_disciplina_id: turmaId, disciplina_id: localId, disciplina_nome: "Disciplina", registros: 100, presencas, faltas: 100 - presencas }));
    const r = await criar({ buscarConsolidadoTurma: async () => ({ totalAulas: 100, rows }) }).consultarTurma(turmaId, reqProfessor);
    assert.deepEqual(r.alunos.map((a) => a.situacao), ["RISCO_REPROVACAO", "ALERTA", "REGULAR"]);
  });
  it("consolida uma turma de 50 alunos em menos de 2 segundos", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ aluno_id: `${String(i).padStart(8, "0")}-2222-4222-8222-222222222222`, aluno_nome: `Aluno ${i}`, turma_disciplina_id: turmaId, disciplina_id: localId, disciplina_nome: "Disciplina", registros: 20, presencas: 18, faltas: 2 }));
    const inicio = performance.now();
    const r = await criar({ buscarConsolidadoTurma: async () => ({ totalAulas: 20, rows }) }).consultarTurma(turmaId, reqProfessor);
    assert.equal(r.alunos.length, 50); assert.ok(performance.now() - inicio < 2000);
  });
});

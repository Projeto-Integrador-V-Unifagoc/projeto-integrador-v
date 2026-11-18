import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PlanoEnsinoService } from "./PlanoEnsinoService";

const admin = { user: { id: "u1", tipo_usuario: "secretaria" } } as any;
const professor = { user: { id: "u2", tipo_usuario: "professor" } } as any;
const conteudo = { objetivoGeral: "Objetivo", objetivosEspecificos: "Objetivos", metodologia: "Metodologia", bibliografiaBasica: "Bibliografia", programaAvaliacao: "Avaliações", cronograma: "Cronograma" };

function service(overrides: Record<string, any> = {}) {
  const s = new PlanoEnsinoService();
  s.repository = {
    buscarProfessorPorUsuario: async () => ({ id: "p1", ativo: true }),
    buscarOferta: async () => ({ id: "td1", professor_id: "p1", disciplina_id: "d1", ementa: "Ementa" }),
    listar: async () => [], proximaVersao: async () => 1,
    criar: async (data: any) => data,
    buscar: async () => ({ id: "pl1", turma_disciplina_id: "td1", status: "RASCUNHO", conteudo }),
    atualizar: async (_id: string, data: any) => ({ id: "pl1", ...data }),
    listarCompetencias: async () => [{ id: "c1", codigo: "COMP-1" }],
    aprovar: async (_id: string, _oferta: string, data: any) => ({ id: "pl1", status: "APROVADO", ...data, snapshot_competencias: JSON.parse(data.snapshot_competencias) }),
    ...overrides,
  } as any;
  return s;
}

describe("PlanoEnsinoService", () => {
  it("cria a primeira versao em rascunho", async () => { const r = await service().criar(professor, "td1"); assert.equal(r.versao, 1); assert.equal(r.status, "RASCUNHO"); });
  it("restringe o professor a sua oferta", async () => { await assert.rejects(() => service({ buscarProfessorPorUsuario: async () => ({ id: "outro", ativo: true }) }).listar(professor, "td1"), /nao responsavel/i); });
  it("valida campos obrigatorios antes da submissao", async () => { await assert.rejects(() => service({ buscar: async () => ({ id: "pl1", turma_disciplina_id: "td1", status: "RASCUNHO", conteudo: {} }) }).submeter(professor, "pl1"), /obrigatorios/i); });
  it("submete plano completo", async () => { const r = await service().submeter(professor, "pl1"); assert.equal(r.status, "SUBMETIDO"); });
  it("aprova com snapshot da ementa e competencias", async () => { const r = await service({ buscar: async () => ({ id: "pl1", turma_disciplina_id: "td1", status: "SUBMETIDO", conteudo }) }).aprovar(admin, "pl1"); assert.equal(r.snapshot_ementa, "Ementa"); assert.equal(r.snapshot_competencias[0].codigo, "COMP-1"); });
  it("impede professor de aprovar", async () => { await assert.rejects(() => service().aprovar(professor, "pl1"), /apenas secretaria/i); });
});

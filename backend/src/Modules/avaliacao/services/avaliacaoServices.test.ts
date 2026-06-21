import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { avaliacaoRepository } from "../repository/avaliacaoRepository.js";
import { avaliacaoService } from "./avaliacaoServices.js";
import type { Avaliacao } from "../models/avaliacaoModels.js";

const TD1 = "11111111-1111-4111-8111-111111111111";
const TD2 = "22222222-2222-4222-8222-222222222222";
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADMIN = { usuarioId: "admin", tipoUsuario: "administrador" };
const original = { ...avaliacaoRepository };
const repo: any = avaliacaoRepository;
const base: Avaliacao = { id: ID, tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Trabalho", data_lancamento: "2026-05-01", valor: 10, data_devolucao: null, turma_disciplina_id: TD1, professor_id: "prof-1" };

describe("avaliacaoService", () => {
  beforeEach(() => {
    Object.assign(avaliacaoRepository, original);
    repo.transacao = async (callback: any) => callback({});
    repo.bloquearAtribuicoes = async () => [];
    repo.bloquearAvaliacao = async () => ({});
    repo.buscarAtribuicaoPorId = async (id: string) => ({ id, professor_id: "prof-1", status: "ativa" });
    repo.buscarPorTurmaDisciplina = async () => [];
    repo.criar = async (payload: any) => ({ ...base, ...payload });
  });
  afterEach(() => Object.assign(avaliacaoRepository, original));

  it("normaliza prova e TPI", async () => {
    const prova = await avaliacaoService.criar({ tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 1, turma_disciplina_id: TD1 }, ADMIN);
    const tpi = await avaliacaoService.criar({ tipo_avaliacao: "TPI", data_lancamento: "2026-05-01", valor: 99, turma_disciplina_id: TD1 }, ADMIN);
    assert.equal(Number(prova.valor), 20); assert.equal(Number(tpi.valor), 5);
  });

  it("bloqueia quarta prova e segundo TPI", async () => {
    repo.buscarPorTurmaDisciplina = async () => [1, 2, 3].map((n) => ({ ...base, id: `${n}`, tipo_avaliacao: "PROVA", valor: 20 }));
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 20, turma_disciplina_id: TD1 }, ADMIN), /3 provas/);
    repo.buscarPorTurmaDisciplina = async () => [{ ...base, tipo_avaliacao: "TPI", valor: 5 }];
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "TPI", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN), /Ja existe um TPI/);
  });

  it("aceita avaliacoes regulares exatamente no limite de 100 e rejeita acima", async () => {
    repo.buscarPorTurmaDisciplina = async () => [
      { ...base, id: "p1", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p2", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p3", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "tpi", tipo_avaliacao: "TPI", valor: 5 },
      { ...base, id: "trabalho", valor: 30 },
    ];
    assert.equal(Number((await avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN)).valor), 5);
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 5.01, turma_disciplina_id: TD1 }, ADMIN), /35 pontos/);
  });

  it("isola as regras por turma/disciplina no repositorio", async () => {
    const consultadas: string[] = [];
    repo.buscarPorTurmaDisciplina = async (id: string) => { consultadas.push(id); return []; };
    await avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 25, turma_disciplina_id: TD2 }, ADMIN);
    assert.deepEqual(consultadas, [TD2]);
  });

  it("ignora o proprio registro durante edicao", async () => {
    repo.buscarPorId = async () => ({ ...base, tipo_avaliacao: "PROVA", valor: 20 });
    repo.buscarPorTurmaDisciplina = async () => [{ ...base, tipo_avaliacao: "PROVA", valor: 20 }];
    repo.atualizar = async (_id: string, payload: any) => ({ ...base, ...payload });
    const resultado = await avaliacaoService.atualizar(ID, { descricao_avaliacao: "Nova" }, ADMIN);
    assert.equal(resultado.descricao_avaliacao, "Nova");
  });

  it("valida UUIDs, relacionamento e ordem das datas", async () => {
    await assert.rejects(() => avaliacaoService.buscarPorId("invalido", ADMIN), /ID invalido/);
    repo.buscarAtribuicaoPorId = async () => undefined;
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, ADMIN), /inexistente/);
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-02", data_devolucao: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, ADMIN), /anterior/);
  });

  it("restringe professor a sua atribuicao", async () => {
    repo.buscarProfessorPorUsuarioId = async () => ({ id: "prof-1" });
    repo.buscarAtribuicaoPorId = async () => ({ id: TD1, professor_id: "prof-2", status: "ativa" });
    await assert.rejects(() => avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, { usuarioId: "u1", tipoUsuario: "professor" }), (e: any) => e.status === 403);
  });

  it("retorna 404 para busca, atualizacao e exclusao inexistentes", async () => {
    repo.buscarPorId = async () => undefined;
    await assert.rejects(() => avaliacaoService.buscarPorId(ID, ADMIN), (e: any) => e.status === 404);
    await assert.rejects(() => avaliacaoService.atualizar(ID, { descricao_avaliacao: "x" }, ADMIN), (e: any) => e.status === 404);
    await assert.rejects(() => avaliacaoService.deletar(ID, ADMIN), (e: any) => e.status === 404);
  });
});

import { afterEach, beforeEach, describe, it, expect } from "vitest";
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
    expect(Number(prova.valor)).toBe(20); expect(Number(tpi.valor)).toBe(5);
  });

  it("bloqueia quarta prova e segundo TPI", async () => {
    repo.buscarPorTurmaDisciplina = async () => [1, 2, 3].map((n) => ({ ...base, id: `${n}`, tipo_avaliacao: "PROVA", valor: 20 }));
    await expect(avaliacaoService.criar({ tipo_avaliacao: "PROVA", data_lancamento: "2026-05-01", valor: 20, turma_disciplina_id: TD1 }, ADMIN)).rejects.toThrow(/3 provas/);
    repo.buscarPorTurmaDisciplina = async () => [{ ...base, tipo_avaliacao: "TPI", valor: 5 }];
    await expect(avaliacaoService.criar({ tipo_avaliacao: "TPI", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN)).rejects.toThrow(/Ja existe um TPI/);
  });

  it("aceita avaliacoes regulares exatamente no limite de 100 e rejeita acima", async () => {
    repo.buscarPorTurmaDisciplina = async () => [
      { ...base, id: "p1", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p2", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p3", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "tpi", tipo_avaliacao: "TPI", valor: 5 },
      { ...base, id: "trabalho", valor: 30 },
    ];
    expect(Number((await avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN)).valor)).toBe(5);
    await expect(avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 5.01, turma_disciplina_id: TD1 }, ADMIN)).rejects.toThrow(/35 pontos/);
  });

  it("ignora recuperacao no somatorio das avaliacoes regulares", async () => {
    repo.buscarPorTurmaDisciplina = async () => [
      { ...base, id: "p1", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p2", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "p3", tipo_avaliacao: "PROVA", valor: 20 },
      { ...base, id: "tpi", tipo_avaliacao: "TPI", valor: 5 },
      { ...base, id: "trabalho", tipo_avaliacao: "TRABALHO", valor: 30 },
      { ...base, id: "rec", tipo_avaliacao: "RECUPERACAO" as any, valor: 100 },
    ];
    // Regulares somam 95; a recuperacao (100) deve ser ignorada, entao um trabalho de 5 cabe nos 100.
    const criada = await avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN);
    expect(Number(criada.valor)).toBe(5);
  });

  it("isola as regras por turma/disciplina no repositorio", async () => {
    const consultadas: string[] = [];
    repo.buscarPorTurmaDisciplina = async (id: string) => { consultadas.push(id); return []; };
    await avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 25, turma_disciplina_id: TD2 }, ADMIN);
    expect(consultadas).toEqual([TD2]);
  });

  it("ignora o proprio registro durante edicao", async () => {
    repo.buscarPorId = async () => ({ ...base, tipo_avaliacao: "PROVA", valor: 20 });
    repo.buscarPorTurmaDisciplina = async () => [{ ...base, tipo_avaliacao: "PROVA", valor: 20 }];
    repo.atualizar = async (_id: string, payload: any) => ({ ...base, ...payload });
    const resultado = await avaliacaoService.atualizar(ID, { descricao_avaliacao: "Nova" }, ADMIN);
    expect(resultado.descricao_avaliacao).toBe("Nova");
  });

  it("valida UUIDs, relacionamento e ordem das datas", async () => {
    await expect(avaliacaoService.buscarPorId("invalido", ADMIN)).rejects.toThrow(/ID invalido/);
    repo.buscarAtribuicaoPorId = async () => undefined;
    await expect(avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, ADMIN)).rejects.toThrow(/inexistente/);
    await expect(avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-02", data_devolucao: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, ADMIN)).rejects.toThrow(/anterior/);
  });

  it("restringe professor a sua atribuicao", async () => {
    repo.buscarProfessorPorUsuarioId = async () => ({ id: "prof-1" });
    repo.buscarAtribuicaoPorId = async () => ({ id: TD1, professor_id: "prof-2", status: "ativa" });
    await expect(avaliacaoService.criar({ tipo_avaliacao: "TRABALHO", data_lancamento: "2026-05-01", valor: 2, turma_disciplina_id: TD1 }, { usuarioId: "u1", tipoUsuario: "professor" })).rejects.toMatchObject({ status: 403 });
  });

  it("retorna 404 para busca, atualizacao e exclusao inexistentes", async () => {
    repo.buscarPorId = async () => undefined;
    await expect(avaliacaoService.buscarPorId(ID, ADMIN)).rejects.toMatchObject({ status: 404 });
    await expect(avaliacaoService.atualizar(ID, { descricao_avaliacao: "x" }, ADMIN)).rejects.toMatchObject({ status: 404 });
    await expect(avaliacaoService.deletar(ID, ADMIN)).rejects.toMatchObject({ status: 404 });
  });

  it("busca por id com sucesso quando o professor e dono da avaliacao", async () => {
    repo.buscarProfessorPorUsuarioId = async () => ({ id: "prof-1" });
    repo.buscarPorId = async () => ({ ...base, professor_id: "prof-1" });
    const encontrada = await avaliacaoService.buscarPorId(ID, { usuarioId: "u1", tipoUsuario: "professor" });
    expect(encontrada.id).toBe(ID);
  });

  it("deleta a avaliacao existente respeitando a permissao do professor", async () => {
    let idDeletado: string | undefined;
    repo.buscarProfessorPorUsuarioId = async () => ({ id: "prof-1" });
    repo.buscarPorId = async () => ({ ...base, professor_id: "prof-1" });
    repo.deletar = async (id: string) => { idDeletado = id; };
    await avaliacaoService.deletar(ID, { usuarioId: "u1", tipoUsuario: "professor" });
    expect(idDeletado).toBe(ID);
  });

  it("bloqueia exclusao por professor sem permissao sobre a avaliacao", async () => {
    repo.buscarProfessorPorUsuarioId = async () => ({ id: "prof-2" });
    repo.buscarPorId = async () => ({ ...base, professor_id: "prof-1" });
    await expect(avaliacaoService.deletar(ID, { usuarioId: "u1", tipoUsuario: "professor" })).rejects.toMatchObject({ status: 403 });
  });

  it("rejeita quando o total das avaliacoes regulares ultrapassa 100 mesmo sem violar os limites por tipo", async () => {
    // Dado legado inconsistente (provas com valor fora do padrao), o limite agregado ainda deve barrar.
    repo.buscarPorTurmaDisciplina = async () => [{ ...base, id: "legado", tipo_avaliacao: "PROVA", valor: 200 }];
    await expect(
      avaliacaoService.criar({ tipo_avaliacao: "TPI", data_lancamento: "2026-05-01", valor: 5, turma_disciplina_id: TD1 }, ADMIN),
    ).rejects.toThrow(/100 pontos/);
  });

  it("lista as avaliacoes e as atribuicoes delegando ao repositorio", async () => {
    let turmaRecebida: string | undefined;
    repo.buscarTodas = async (_profId: string | undefined, turmaId?: string) => { turmaRecebida = turmaId; return [base]; };
    const lista = await avaliacaoService.listar(ADMIN, TD1);
    expect(lista).toEqual([base]);
    expect(turmaRecebida).toBe(TD1);

    repo.listarAtribuicoes = async () => [{ id: TD1 }];
    const atribuicoes = await avaliacaoService.listarAtribuicoes(ADMIN);
    expect(atribuicoes).toEqual([{ id: TD1 }]);
  });

  it("valida o turma_disciplina_id ao listar quando informado", async () => {
    await expect(avaliacaoService.listar(ADMIN, "invalido")).rejects.toThrow(/turma_disciplina_id invalido/);
  });
});

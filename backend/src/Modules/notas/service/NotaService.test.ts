import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotaService } from "./NotaService";
import { calcularBoletim, type AvaliacaoResumo } from "../models/Nota";

const turmaDisciplinaId = "11111111-1111-4111-8111-111111111111";
const alunoId = "22222222-2222-4222-8222-222222222222";
const alunoId2 = "23222222-2222-4222-8222-222222222222";
const professorId = "33333333-3333-4333-8333-333333333333";
const matriculaId = "44444444-4444-4444-8444-444444444444";
const matriculaId2 = "45444444-4444-4444-8444-444444444444";
const avaliacaoId = "55555555-5555-4555-8555-555555555555";
const usuarioId = "77777777-7777-4777-8777-777777777777";

const reqProfessor = { user: { id: usuarioId, tipo_usuario: "professor" } } as any;
const reqAluno = { user: { id: usuarioId, tipo_usuario: "aluno" } } as any;
const reqSecretaria = { user: { id: usuarioId, tipo_usuario: "secretaria" } } as any;

const avaliacaoBase = (over: Record<string, any> = {}) => ({
  id: avaliacaoId, tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 20,
  turma_disciplina_id: turmaDisciplinaId, professor_id: professorId, periodo_ativo: true,
  periodo_status: "ativo", periodo_codigo: "2026/1", disciplina_id: "d", disciplina_nome: "Disciplina", turma_sigla: "A", ...over,
});

const matriculas = [
  { aluno_id: alunoId, matricula_turma_disciplina_id: matriculaId, matricula: 1, aluno_nome: "Aluno 1", status_matricula: "ativa" },
  { aluno_id: alunoId2, matricula_turma_disciplina_id: matriculaId2, matricula: 2, aluno_nome: "Aluno 2", status_matricula: "ativa" },
];

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    buscarProfessorPorUsuarioId: async () => ({ id: professorId, ativo: true }),
    buscarAlunoPorUsuarioId: async () => ({ id: alunoId }),
    professorPossuiTurma: async () => true,
    professorPossuiAluno: async () => true,
    listarAtribuicoes: async () => [],
    listarAvaliacoesDaTurma: async () => [{ id: avaliacaoId, tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 20 }],
    buscarAvaliacao: async () => avaliacaoBase(),
    buscarTurmaDisciplina: async () => ({ id: turmaDisciplinaId, disciplina_id: "d", disciplina_nome: "Disciplina", turma_id: "t", turma_sigla: "A", periodo_codigo: "2026/1", periodo_status: "ativo", periodo_ativo: true }),
    listarMatriculasAtivas: async () => matriculas,
    contarMatriculasIrregulares: async () => 0,
    listarNotasDaAvaliacao: async () => [],
    listarNotasDaTurma: async () => [],
    listarTurmasDoAluno: async () => [],
    listarBoletimDoAluno: async () => [],
    buscarRecuperacaoDaTurma: async () => null,
    criarRecuperacao: async () => ({ id: "rec" }),
    buscarAutorizacaoVigente: async () => null,
    criarAutorizacaoExcepcional: async (d: any) => ({ id: "a", ...d }),
    salvarLoteAtomico: async (args: any) => args.itens,
    ...overrides,
  };
  return new NotaService(repository as any);
}

const lote = (itens: any[]) => ({ itens });

describe("calcularBoletim", () => {
  const prova: AvaliacaoResumo = { id: "p1", tipo: "PROVA", descricao: null, valor: 20 };
  const tpi: AvaliacaoResumo = { id: "t1", tipo: "TPI", descricao: null, valor: 80 };
  const rec: AvaliacaoResumo = { id: "r1", tipo: "RECUPERACAO", descricao: null, valor: 100 };

  it("usa apenas avaliacoes com nota lancada no denominador", () => {
    const b = calcularBoletim([prova, tpi], new Map([["p1", 15]]));
    assert.equal(b.pontosObtidos, 15);
    assert.equal(b.pontosMaximos, 20);
    assert.equal(b.mediaParcial, 75);
    assert.equal(b.etapaRegularCompleta, false);
    assert.equal(b.situacao, "EM_ANDAMENTO");
  });

  it("nao trata nota nao lancada como zero", () => {
    const b = calcularBoletim([prova, tpi], new Map());
    assert.equal(b.mediaParcial, null);
    assert.equal(b.situacao, "NAO_LANCADA");
    assert.equal(b.alerta, false);
  });

  it("nao encerra a etapa regular enquanto as avaliacoes nao totalizam 100 pontos", () => {
    const b = calcularBoletim(
      [{ ...prova, valor: 20 }, { ...tpi, valor: 5 }],
      new Map([["p1", 14], ["t1", 4]]),
    );
    assert.equal(b.etapaRegularCompleta, false);
    assert.equal(b.situacao, "EM_ANDAMENTO");
  });

  it("aprova diretamente com etapa regular completa e media >= 60", () => {
    const b = calcularBoletim([prova, tpi], new Map([["p1", 14], ["t1", 58]]));
    assert.equal(b.etapaRegularCompleta, true);
    assert.equal(b.mediaParcial, 72);
    assert.equal(b.situacao, "APROVADO");
    assert.equal(b.elegivelRecuperacao, false);
  });

  it("marca EM_RECUPERACAO quando completa abaixo de 60 sem recuperacao lancada", () => {
    const b = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32]]));
    assert.equal(b.mediaParcial, 40);
    assert.equal(b.situacao, "EM_RECUPERACAO");
    assert.equal(b.elegivelRecuperacao, true);
    assert.equal(b.alerta, true);
  });

  it("media final e o maior entre parcial e recuperacao", () => {
    const aprovado = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32], ["r1", 70]]));
    assert.equal(aprovado.mediaFinal, 70);
    assert.equal(aprovado.situacao, "APROVADO");
    const reprovado = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32], ["r1", 50]]));
    assert.equal(reprovado.mediaFinal, 50);
    assert.equal(reprovado.situacao, "REPROVADO");
  });
});

describe("NotaService.salvarLote", () => {
  it("salva o lote do professor da atribuicao", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 15 }]), reqProfessor);
    assert.equal(recebido.usuarioId, usuarioId);
    assert.equal(recebido.itens[0].matriculaId, matriculaId);
    assert.equal(recebido.itens[0].valor, 15);
  });

  it("rejeita aluno duplicado, desconhecido e valor fora do intervalo", async () => {
    await assert.rejects(() => criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 5 }, { alunoId, valor: 6 }]), reqProfessor), /duplicado/);
    const desconhecido = "99999999-9999-4999-8999-999999999999";
    await assert.rejects(() => criar().salvarLote(avaliacaoId, lote([{ alunoId: desconhecido, valor: 5 }]), reqProfessor), /sem matrícula ativa/);
    await assert.rejects(() => criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 21 }]), reqProfessor), /entre 0 e 20/);
    await assert.rejects(() => criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: -1 }]), reqProfessor), /entre 0 e 20/);
  });

  it("permite lote parcial sem exigir todos os alunos", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor);
    assert.equal(recebido.itens.length, 1);
  });

  it("bloqueia lancamento em periodo fechado", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await assert.rejects(() => service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor), (e: any) => e.status === 409);
  });

  it("rejeita professor sem vinculo com a atribuicao", async () => {
    const service = criar({ professorPossuiTurma: async () => false });
    await assert.rejects(() => service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor), (e: any) => e.status === 403);
  });

  it("bloqueia aluno tentando lancar", async () => {
    await assert.rejects(() => criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqAluno), (e: any) => e.status === 403);
  });

  it("mapeia conflito concorrente para HTTP 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error(), { code: "23505" }); } });
    await assert.rejects(() => service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor), (e: any) => e.status === 409);
  });

  it("propaga prazo expirado do repositorio como 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Prazo expirado."), { codigoDominio: "PRAZO_EXPIRADO" }); } });
    await assert.rejects(() => service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor), (e: any) => e.status === 409);
  });

  it("rejeita recuperacao para aluno sem etapa regular completa abaixo de 60", async () => {
    const service = criar({
      buscarAvaliacao: async () => avaliacaoBase({ tipo_avaliacao: "RECUPERACAO", valor: 100 }),
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
        { id: avaliacaoId, tipo_avaliacao: "RECUPERACAO", descricao_avaliacao: "Recuperacao", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { avaliacao_id: "regular", matricula_turma_disciplina_id: matriculaId, valor: 80 },
      ],
    });
    await assert.rejects(
      () => service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 70 }]), reqProfessor),
      /não está elegível para recuperação/,
    );
  });
});

describe("NotaService autorizacao e acesso", () => {
  it("somente secretaria cria autorizacao excepcional", async () => {
    await assert.rejects(() => criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqProfessor), (e: any) => e.status === 403);
    const r = await criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqSecretaria);
    assert.match(r.mensagem, /Autoriza/);
  });

  it("autorizacao excepcional exige periodo aberto", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await assert.rejects(() => service.criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Reabrir e corrigir" }, reqSecretaria), (e: any) => e.status === 409);
  });

  it("aluno acessa somente o proprio boletim", async () => {
    await assert.rejects(() => criar().consultarAluno(alunoId2, reqAluno), (e: any) => e.status === 403);
  });

  it("meuResumo conta disciplinas abaixo de 60", async () => {
    const service = criar({
      listarTurmasDoAluno: async () => [{ turma_disciplina_id: turmaDisciplinaId, disciplina_id: "d", disciplina_nome: "Disciplina", turma_sigla: "A", periodo_id: "pl", periodo_codigo: "2026/1", professor_nome: "Prof" }],
      listarBoletimDoAluno: async () => [
        { turma_disciplina_id: turmaDisciplinaId, matricula_turma_disciplina_id: matriculaId, avaliacao_id: "p1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 20, nota_valor: 8 },
      ],
    });
    const r = await service.meuResumo(reqAluno);
    assert.equal(r.disciplinasAbaixoDe60, 1);
    assert.equal(r.possuiAlerta, true);
  });
});

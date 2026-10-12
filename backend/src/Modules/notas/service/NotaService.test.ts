import { afterEach, describe, it, expect, vi } from "vitest";
import { NotaService } from "./NotaService";


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
const reqAdministrador = { user: { id: usuarioId, tipo_usuario: "administrador" } } as any;
const executor = Object.freeze({ identificador: "transacao-notas-unitaria" }) as any;

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const avaliacaoBase = (over: Record<string, any> = {}) => ({
  id: avaliacaoId, tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: "20.00",
  turma_disciplina_id: turmaDisciplinaId, professor_id: professorId, periodo_ativo: true,
  periodo_status: "ativo", periodo_codigo: "2026/1", disciplina_id: "d", disciplina_nome: "Disciplina", turma_sigla: "A", ...over,
});

const matriculas = [
  { aluno_id: alunoId, matricula_turma_disciplina_id: matriculaId, matricula: 1, aluno_nome: "Aluno 1", status_matricula: "ativa" },
  { aluno_id: alunoId2, matricula_turma_disciplina_id: matriculaId2, matricula: 2, aluno_nome: "Aluno 2", status_matricula: "ativa" },
];

function cenario(overrides: Record<string, any> = {}) {
  const repository = {
    transacaoParaNotas: vi.fn(async (_avaliacaoId: string, _alunos: string[], callback: (trx: any) => Promise<any>) => callback(executor)),
    transacaoParaAutorizacao: vi.fn(async (_avaliacaoId: string, _matriculaId: string | undefined, callback: (trx: any) => Promise<any>) => callback(executor)),
    transacao: vi.fn(async () => { throw new Error("Uma segunda transação não pertence ao contrato do lote."); }),
    buscarProfessorPorUsuarioId: async () => ({ id: professorId, ativo: true }),
    buscarAlunoPorUsuarioId: async () => ({ id: alunoId }),
    professorPossuiTurma: async () => true,
    professorPossuiAluno: async () => true,
    listarAtribuicoes: async () => [],
    listarAvaliacoesDaTurma: async () => [{ id: avaliacaoId, tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: "20.00" }],
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
    buscarVinculoPorId: async () => ({ id: matriculaId, turma_disciplina_id: turmaDisciplinaId, status: "ativa" }),
    criarAutorizacaoExcepcional: async (d: any) => ({ id: "a", ...d }),
    salvarLoteAtomico: vi.fn(async (args: any, _trx?: any) => args.itens),
    ...overrides,
  };
  return { service: new NotaService(repository as any), repository };
}
const criar = (overrides: Record<string, any> = {}) => cenario(overrides).service;

const lote = (itens: any[]) => ({ itens });

describe("NotaService.salvarLote", () => {
  it("salva o lote do professor da atribuicao", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "15.00" }]), reqProfessor);
    expect(recebido.usuarioId).toBe(usuarioId);
    expect(recebido.itens[0].matriculaId).toBe(matriculaId);
    expect(recebido.itens[0].valor).toBe("15.00");
  });

  it("rejeita aluno duplicado, desconhecido e valor fora do intervalo", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: "5.00" }, { alunoId, valor: "6.00" }]), reqProfessor)).rejects.toThrow(/duplicado/);
    const desconhecido = "99999999-9999-4999-8999-999999999999";
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId: desconhecido, valor: "5.00" }]), reqProfessor)).rejects.toThrow(/sem matrícula ativa/);
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: "21.00" }]), reqProfessor)).rejects.toMatchObject({ status: 400 });
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: "-1.00" }]), reqProfessor)).rejects.toMatchObject({ status: 400 });
  });

  it("permite lote parcial sem exigir todos os alunos", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor);
    expect(recebido.itens.length).toBe(1);
  });

  it("bloqueia lancamento em periodo fechado", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("rejeita professor sem vinculo com a atribuicao", async () => {
    const service = criar({ professorPossuiTurma: async () => false });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia aluno tentando lancar", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("mapeia conflito concorrente para HTTP 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error(), { code: "23505" }); } });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("propaga prazo expirado do repositorio como 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Prazo expirado."), { codigoDominio: "PRAZO_EXPIRADO" }); } });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("rejeita lote vazio ou payload ausente", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([]), reqProfessor)).rejects.toThrow(/ao menos uma nota/);
    await expect(criar().salvarLote(avaliacaoId, undefined as any, reqProfessor)).rejects.toThrow(/ao menos uma nota/);
  });

  it("aceita plano de 120 pontos sem teto fixo de 100 no lançamento regular", async () => {
    const service = criar({
      listarAvaliacoesDaTurma: async () => [
        { id: "a1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: "72.00" },
        { id: "a2", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "T1", valor: "48.00" },
      ],
    });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).resolves.toMatchObject({ mensagem: expect.any(String) });
  });


  it("traduz erros de dominio do repositorio ao salvar o lote", async () => {
    const invalido = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Valor invalido."), { codigoDominio: "VALOR_INVALIDO" }); } });
    await expect(invalido.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 400 });

    const naoEncontrado = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Nao encontrado."), { codigoDominio: "NAO_ENCONTRADO" }); } });
    await expect(naoEncontrado.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status: 404 });

    const desconhecido = criar({ salvarLoteAtomico: async () => { throw new Error("falha inesperada"); } });
    await expect(desconhecido.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toThrow("falha inesperada");
  });


});

describe("NotaService.salvarLote - contrato textual e transação única US2", () => {
  it("aceita UUID PostgreSQL canônico persistido sem exigir versão/variante RFC", async () => {
    const idLegado = "00000000-0000-0000-0000-000000000001";
    const alunoLegado = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const { service, repository } = cenario({ buscarAvaliacao: async () => avaliacaoBase({ id: idLegado }),
      listarMatriculasAtivas: async () => [{ ...matriculas[0], aluno_id: alunoLegado }] });
    await service.salvarLote(idLegado, lote([{ alunoId: alunoLegado, valor: "0.00" }]), reqProfessor);
    expect(repository.transacaoParaNotas).toHaveBeenCalledExactlyOnceWith(idLegado, [alunoLegado], expect.any(Function));
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.objectContaining({ avaliacaoId: idLegado }), executor);
  });
  it.each([
    ["0", "0.00"], ["0.00", "0.00"], ["18.1", "18.10"], ["18.01", "18.01"], ["20.00", "20.00"],
  ])("aceita e normaliza %s dentro do máximo", async (valor, esperado) => {
    const { service, repository } = cenario();
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor }]), reqProfessor);
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.objectContaining({
      itens: [{ matriculaId, valor: esperado }], perfil: "professor", usuarioId,
    }), executor);
  });

  it.each([
    [20, "VALOR_INVALIDO"], [0, "VALOR_INVALIDO"], [null, "VALOR_INVALIDO"], [undefined, "VALOR_INVALIDO"],
    [true, "VALOR_INVALIDO"], [[], "VALOR_INVALIDO"], [{}, "VALOR_INVALIDO"],
    ["", "VALOR_INVALIDO"], ["-1", "VALOR_INVALIDO"], ["-0", "VALOR_INVALIDO"], ["+1", "VALOR_INVALIDO"],
    ["1e1", "VALOR_INVALIDO"], ["NaN", "VALOR_INVALIDO"], ["Infinity", "VALOR_INVALIDO"],
    [" 1", "VALOR_INVALIDO"], ["1 ", "VALOR_INVALIDO"], ["1\n", "VALOR_INVALIDO"],
    ["1,00", "VALOR_INVALIDO"], ["1.000,00", "VALOR_INVALIDO"], ["01", "VALOR_INVALIDO"],
    [".1", "VALOR_INVALIDO"], ["1.", "VALOR_INVALIDO"],
    ["1.000", "PRECISAO_INVALIDA"], ["0.001", "PRECISAO_INVALIDA"], ["18.019", "PRECISAO_INVALIDA"],
    ["20.01", "VALOR_INVALIDO"],
  ])("rejeita valor %j sem coerção e identifica o campo", async (valor, codigo) => {
    const { service, repository } = cenario();
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor }]), reqProfessor)).rejects.toMatchObject({
      status: 400, codigo, campos: expect.arrayContaining([expect.objectContaining({ campo: "itens[0].valor", codigo })]),
    });
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("rejeita todo o lote quando só o segundo item é inválido", async () => {
    const { service, repository } = cenario();
    await expect(service.salvarLote(avaliacaoId, lote([
      { alunoId, valor: "0.00" }, { alunoId: alunoId2, valor: "20.01" },
    ]), reqProfessor)).rejects.toMatchObject({
      status: 400, campos: expect.arrayContaining([expect.objectContaining({ campo: "itens[1].valor" })]),
    });
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("não usa o total 120 como máximo de uma avaliação de 18 pontos", async () => {
    const { service, repository } = cenario({ buscarAvaliacao: async () => avaliacaoBase({ valor: "18.00" }) });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "18.01" }]), reqProfessor)).rejects.toMatchObject({ status: 400 });
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("encaminha motivo e ator autenticado, ignorando autoria informada no payload", async () => {
    const { service, repository } = cenario();
    const payload = { itens: [{ alunoId, valor: "10.00" }], motivo: "Corrigir transcrição documentada",
      usuarioId: alunoId2, perfil: "secretaria", publicadaEm: "2000-01-01T00:00:00Z" } as any;
    await service.salvarLote(avaliacaoId, payload, reqProfessor);
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.objectContaining({
      usuarioId, perfil: "professor", motivo: payload.motivo,
    }), executor);
    expect(repository.salvarLoteAtomico.mock.calls[0][0]).not.toHaveProperty("publicadaEm");
  });

  it.each(["secretaria", "administrador"])("conserva o perfil original %s na escrita auditada", async (perfil) => {
    const { service, repository } = cenario();
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), { user: { id: usuarioId, tipo_usuario: perfil } } as any);
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.objectContaining({ usuarioId, perfil }), executor);
  });

  it("usa a transação de notas e relê identidade, escopo, avaliação e matrículas com seu executor", async () => {
    const buscarProfessorPorUsuarioId = vi.fn(async () => ({ id: professorId, ativo: true }));
    const professorPossuiTurma = vi.fn(async () => true);
    const buscarAvaliacao = vi.fn(async () => avaliacaoBase());
    const listarMatriculasAtivas = vi.fn(async () => matriculas);
    const listarNotasDaAvaliacao = vi.fn(async () => []);
    const { service, repository } = cenario({ buscarProfessorPorUsuarioId, professorPossuiTurma,
      buscarAvaliacao, listarMatriculasAtivas, listarNotasDaAvaliacao });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor);
    expect(repository.transacaoParaNotas).toHaveBeenCalledExactlyOnceWith(avaliacaoId, [alunoId], expect.any(Function));
    expect(buscarProfessorPorUsuarioId).toHaveBeenCalledWith(usuarioId, executor);
    expect(professorPossuiTurma).toHaveBeenCalledWith(professorId, turmaDisciplinaId, executor);
    expect(buscarAvaliacao).toHaveBeenCalledWith(avaliacaoId, executor);
    expect(listarMatriculasAtivas).toHaveBeenCalledWith(turmaDisciplinaId, executor);
    expect(listarNotasDaAvaliacao).toHaveBeenCalledWith(avaliacaoId, executor);
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.any(Object), executor);
    expect(repository.transacao).not.toHaveBeenCalled();
  });

  it.each(["professor inativo", "identidade docente alterada", "vínculo removido", "período fechado", "avaliação removida", "matrícula removida", "máximo reduzido"])(
    "revalida %s depois da aquisição dos locks e não escreve", async (mudanca) => {
      let protegido = false;
      const { service, repository } = cenario({
        transacaoParaNotas: vi.fn(async (_id: string, _alunos: string[], callback: (trx: any) => Promise<any>) => {
          protegido = true; return callback(executor);
        }),
        buscarProfessorPorUsuarioId: async () => ({
          id: protegido && mudanca === "identidade docente alterada" ? alunoId2 : professorId,
          ativo: !(protegido && mudanca === "professor inativo"),
        }),
        professorPossuiTurma: async (id: string) => id === professorId && !(protegido && mudanca === "vínculo removido"),
        buscarAvaliacao: async () => protegido && mudanca === "avaliação removida" ? null : avaliacaoBase({
          periodo_status: protegido && mudanca === "período fechado" ? "encerrado" : "ativo",
          valor: protegido && mudanca === "máximo reduzido" ? "9.00" : "20.00",
        }),
        listarMatriculasAtivas: async () => protegido && mudanca === "matrícula removida" ? [] : matriculas,
      });
      const status = ["professor inativo", "identidade docente alterada", "vínculo removido"].includes(mudanca) ? 403
        : mudanca === "período fechado" ? 409 : mudanca === "avaliação removida" ? 404 : 400;
      await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor)).rejects.toMatchObject({ status });
      expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
    },
  );

  it("admite matrícula pai pendente com matrícula-disciplina ativa", async () => {
    const { service, repository } = cenario({ listarMatriculasAtivas: async () => [
      { ...matriculas[0], status_matricula: "ativa", status_matricula_pai: "pendente" },
    ] });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "0.00" }]), reqProfessor);
    expect(repository.salvarLoteAtomico).toHaveBeenCalledWith(expect.objectContaining({ itens: [{ matriculaId, valor: "0.00" }] }), executor);
  });

  it("rejeita aluno sem matrícula-disciplina ativa sem expor seu identificador na mensagem", async () => {
    const { service, repository } = cenario({ listarMatriculasAtivas: async () => [matriculas[0]] });
    const erro: any = await service.salvarLote(avaliacaoId, lote([{ alunoId: alunoId2, valor: "0.00" }]), reqProfessor).catch((e) => e);
    expect(erro).toMatchObject({ status: 400, codigo: "LOTE_INVALIDO" });
    expect(erro.message).not.toContain(alunoId2);
    expect(erro.campos).toEqual(expect.arrayContaining([expect.objectContaining({ campo: "itens[0].alunoId" })]));
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("rejeita UUID repetido com caixa diferente antes de qualquer escrita", async () => {
    const idComLetras = "abcdefab-abcd-4abc-8abc-abcdefabcdef";
    const { service, repository } = cenario({ listarMatriculasAtivas: async () => [{ ...matriculas[0], aluno_id: idComLetras }] });
    await expect(service.salvarLote(avaliacaoId, lote([
      { alunoId: idComLetras, valor: "1.00" }, { alunoId: idComLetras.toUpperCase(), valor: "2.00" },
    ]), reqProfessor)).rejects.toMatchObject({ status: 400, codigo: "LOTE_INVALIDO",
      campos: expect.arrayContaining([expect.objectContaining({ campo: "itens[1].alunoId" })]),
    });
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("período encerrado bloqueia até lote com autorização vigente, sem consumi-la", async () => {
    const buscarAutorizacaoVigente = vi.fn(async () => ({ id: "88888888-8888-4888-8888-888888888888", motivo: "Correção excepcional" }));
    const { service, repository } = cenario({ buscarAvaliacao: async () => avaliacaoBase({ periodo_status: "encerrado" }), buscarAutorizacaoVigente });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqSecretaria)).rejects.toMatchObject({ status: 409, codigo: "PERIODO_FECHADO" });
    expect(repository.salvarLoteAtomico).not.toHaveBeenCalled();
  });

  it("a escrita de retificação e consumo de autorização recebe o executor protegido único", async () => {
    const salvarLoteAtomico = vi.fn(async (_args: any, trx: any) => {
      expect(trx).toBe(executor);
      return [{ matricula_turma_disciplina_id: matriculaId, valor: "10.00" }];
    });
    const { service, repository } = cenario({ salvarLoteAtomico,
      listarNotasDaAvaliacao: async () => [{ matricula_turma_disciplina_id: matriculaId, valor: "8.00", publicada_em: "2026-09-01T00:00:00Z" }],
      buscarAutorizacaoVigente: async () => ({ id: "88888888-8888-4888-8888-888888888888", motivo: "Correção excepcional" }),
    });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqSecretaria);
    expect(salvarLoteAtomico).toHaveBeenCalledTimes(1);
    expect(repository.transacao).not.toHaveBeenCalled();
  });

  it("propaga rollback do escritor atômico e não devolve grade de sucesso", async () => {
    const buscarGrade = vi.fn(async () => []);
    const { service } = cenario({ listarNotasDaAvaliacao: buscarGrade,
      salvarLoteAtomico: async () => { throw Object.assign(new Error("detalhe SQL privado"), { codigoDominio: "PRAZO_EXPIRADO" }); },
    });
    const erro: any = await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: "10.00" }]), reqProfessor).catch((e) => e);
    expect(erro).toMatchObject({ status: 409, codigo: "PRAZO_EXPIRADO" });
    expect(erro.message).not.toContain("SQL privado");
  });
});

describe("NotaService autorizacao e acesso", () => {
  it.each([
    ["objeto", {}],
    ["número", 12345],
    ["array", ["texto"]],
    ["booleano", true],
    ["nulo", null],
    ["ausente", undefined],
  ])("rejeita motivo de autorização não textual: %s", async (_tipo, motivo) => {
    const criarAutorizacaoExcepcional = vi.fn(async () => ({ id: "a" }));
    const { service, repository } = cenario({ criarAutorizacaoExcepcional });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo } as any, reqSecretaria))
      .rejects.toMatchObject({ status: 400, codigo: "LOTE_INVALIDO",
        campos: [{ campo: "motivo", codigo: "LOTE_INVALIDO", mensagem: expect.any(String) }],
      });
    expect(repository.transacaoParaAutorizacao).not.toHaveBeenCalled();
    expect(criarAutorizacaoExcepcional).not.toHaveBeenCalled();
  });

  it.each(["", "    ", "abcd", "x".repeat(501)])("rejeita motivo de autorização fora do limite textual: %j", async (motivo) => {
    const criarAutorizacaoExcepcional = vi.fn(async () => ({ id: "a" }));
    const { service, repository } = cenario({ criarAutorizacaoExcepcional });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo }, reqSecretaria))
      .rejects.toMatchObject({ status: 400, codigo: "LOTE_INVALIDO",
        campos: [{ campo: "motivo", codigo: "LOTE_INVALIDO", mensagem: expect.any(String) }],
      });
    expect(repository.transacaoParaAutorizacao).not.toHaveBeenCalled();
    expect(criarAutorizacaoExcepcional).not.toHaveBeenCalled();
  });

  it.each([" texto ", ` ${"x".repeat(500)} `])("aceita motivo de autorização textual nos limites após trim: %j", async (motivo) => {
    const criarAutorizacaoExcepcional = vi.fn(async (dados: any) => ({ id: "a", ...dados }));
    const service = criar({ criarAutorizacaoExcepcional });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo }, reqSecretaria))
      .resolves.toMatchObject({ autorizacao: { motivo: motivo.trim() } });
    expect(criarAutorizacaoExcepcional).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ motivo: motivo.trim() }), executor);
  });

  it("somente secretaria cria autorizacao excepcional", async () => {
    await expect(criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqProfessor)).rejects.toMatchObject({ status: 403 });
    const r = await criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqSecretaria);
    expect(r.mensagem).toMatch(/Autoriza/);
  });

  it("administrador pode criar autorização excepcional sem passar por perfil secretaria", async () => {
    const criarAutorizacaoExcepcional = vi.fn(async (dados: any) => ({ id: "a", ...dados }));
    const service = criar({ criarAutorizacaoExcepcional });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Correção administrativa documentada" }, reqAdministrador)).resolves.toMatchObject({ mensagem: expect.any(String) });
    expect(criarAutorizacaoExcepcional.mock.calls[0][0]).toMatchObject({ usuarioId });
  });

  it("revalida período após locks antes de criar autorização de prazo", async () => {
    let protegido = false;
    const criarAutorizacaoExcepcional = vi.fn(async () => ({ id: "a" }));
    const service = criar({ criarAutorizacaoExcepcional,
      transacaoParaAutorizacao: async (_id: string, _matriculaId: string | undefined, callback: (trx: any) => Promise<any>) => {
        protegido = true; return callback(executor);
      },
      buscarAvaliacao: async () => avaliacaoBase({ periodo_status: protegido ? "encerrado" : "ativo" }),
    });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Correção documentada" }, reqSecretaria))
      .rejects.toMatchObject({ status: 409, codigo: "PERIODO_FECHADO" });
    expect(criarAutorizacaoExcepcional).not.toHaveBeenCalled();
  });

  it("rejeita vínculo de outra oferta depois dos locks sem criar autorização incoerente", async () => {
    let protegido = false;
    const buscarVinculoPorId = vi.fn(async () => ({ id: matriculaId,
      turma_disciplina_id: protegido ? alunoId2 : turmaDisciplinaId, status: "inativa" }));
    const criarAutorizacaoExcepcional = vi.fn(async () => ({ id: "a" }));
    const service = criar({ buscarVinculoPorId, criarAutorizacaoExcepcional,
      transacaoParaAutorizacao: async (_id: string, _matriculaId: string | undefined, callback: (trx: any) => Promise<any>) => {
        protegido = true; return callback(executor);
      },
    });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, matriculaTurmaDisciplinaId: matriculaId,
      motivo: "Correção documentada" }, reqSecretaria)).rejects.toMatchObject({ status: 400 });
    expect(buscarVinculoPorId).toHaveBeenCalledWith(matriculaId, executor);
    expect(criarAutorizacaoExcepcional).not.toHaveBeenCalled();
  });

  it("autorização para vínculo da oferta não acrescenta proibição por status inativo", async () => {
    const buscarVinculoPorId = vi.fn(async () => ({ id: matriculaId, turma_disciplina_id: turmaDisciplinaId, status: "inativa" }));
    const service = criar({ buscarVinculoPorId });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, matriculaTurmaDisciplinaId: matriculaId,
      motivo: "Correção documentada" }, reqSecretaria)).resolves.toMatchObject({ mensagem: expect.any(String) });
    expect(buscarVinculoPorId).toHaveBeenCalledWith(matriculaId, executor);
  });

  it("cria autorização com executor protegido e prazo vigente sem alterar publicação", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    const criarAutorizacaoExcepcional = vi.fn(async (dados: any, _trx?: any) => ({ id: "a", ...dados }));
    const { service, repository } = cenario({ criarAutorizacaoExcepcional });
    await service.criarAutorizacaoExcepcional({ avaliacaoId, matriculaTurmaDisciplinaId: matriculaId, motivo: "Correção documentada" }, reqSecretaria);
    expect(repository.transacaoParaAutorizacao).toHaveBeenCalledExactlyOnceWith(avaliacaoId, matriculaId, expect.any(Function));
    expect(criarAutorizacaoExcepcional).toHaveBeenCalledWith(expect.objectContaining({
      avaliacaoId, matriculaTurmaDisciplinaId: matriculaId, usuarioId, expiraEm: new Date("2026-10-05T12:00:00Z"),
    }), executor);
    expect(criarAutorizacaoExcepcional.mock.calls[0][0]).not.toHaveProperty("publicadaEm");
  });

  it("autorizacao excepcional exige periodo aberto", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Reabrir e corrigir" }, reqSecretaria)).rejects.toMatchObject({ status: 409 });
  });

  it("aluno acessa somente o proprio boletim", async () => {
    await expect(criar().consultarAluno(alunoId2, reqAluno)).rejects.toMatchObject({ status: 403 });
  });


  it("meuBoletim rejeita quem nao e aluno", async () => {
    await expect(criar().meuBoletim(reqProfessor)).rejects.toMatchObject({ status: 403 });
  });



  it("consultarAluno rejeita id invalido", async () => {
    await expect(criar().consultarAluno("invalido", reqSecretaria)).rejects.toMatchObject({ status: 400 });
  });
});

describe("NotaService.obterLancamento", () => {
  it("distingue zero publicado de nota ausente com pontos textuais", async () => {
    const service = criar({ listarNotasDaAvaliacao: async () => [
      { matricula_turma_disciplina_id: matriculaId, valor: "0.00", publicada_em: "2026-09-28T00:00:00Z" },
    ] });
    const grade = await service.obterLancamento(avaliacaoId, reqProfessor);
    expect(grade.alunos.find((a: any) => a.alunoId === alunoId)).toMatchObject({ valor: "0.00", lancada: true });
    expect(grade.alunos.find((a: any) => a.alunoId === alunoId2)).toMatchObject({ valor: null, lancada: false, publicadaEm: null });
  });

  it.each([[-1, false], [0, false], [1, true]])("conserva publicação e fronteira de sete dias (%i ms)", async (deslocamento, prazoExpirado) => {
    const publicadaEm = "2026-09-21T12:00:00.000Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(publicadaEm).getTime() + 7 * 86400000 + Number(deslocamento)));
    const service = criar({ listarNotasDaAvaliacao: async () => [
      { matricula_turma_disciplina_id: matriculaId, valor: "18.00", publicada_em: publicadaEm },
    ] });
    const grade = await service.obterLancamento(avaliacaoId, reqProfessor);
    expect(grade.alunos.find((a: any) => a.alunoId === alunoId)).toMatchObject({ publicadaEm, prazoExpirado });
  });

  it("administrador acessa a grade editável com o alcance administrativo vigente", async () => {
    expect((await criar().obterLancamento(avaliacaoId, reqAdministrador)).podeEditar).toBe(true);
  });
  it("rejeita id invalido e bloqueia aluno", async () => {
    await expect(criar().obterLancamento("invalido", reqProfessor)).rejects.toMatchObject({ status: 400 });
    await expect(criar().obterLancamento(avaliacaoId, reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("rejeita avaliacao inexistente", async () => {
    const service = criar({ buscarAvaliacao: async () => null });
    await expect(service.obterLancamento(avaliacaoId, reqProfessor)).rejects.toMatchObject({ status: 404 });
  });

  it("monta a grade de lancamento com notas ja lancadas e pendentes", async () => {
    const service = criar({
      listarNotasDaAvaliacao: async () => [
        { matricula_turma_disciplina_id: matriculaId, valor: 18, publicada_em: new Date().toISOString() },
      ],
    });
    const r = await service.obterLancamento(avaliacaoId, reqProfessor);
    expect(r.podeEditar).toBe(true);
    expect(r.avaliacao.valorMaximo).toBe("20.00");
    const aluno1 = r.alunos.find((a: any) => a.alunoId === alunoId);
    const aluno2 = r.alunos.find((a: any) => a.alunoId === alunoId2);
    expect(aluno1.lancada).toBe(true);
    expect(aluno1.valor).toBe("18.00");
    expect(aluno2.lancada).toBe(false);
    expect(aluno2.valor).toBeNull();
  });

  it("nao permite editar quando o periodo esta fechado", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_status: "fechado" }) });
    const r = await service.obterLancamento(avaliacaoId, reqProfessor);
    expect(r.podeEditar).toBe(false);
    expect(r.periodoLetivo.fechado).toBe(true);
  });
});

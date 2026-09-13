import { describe, it, expect } from "vitest";
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
    expect(b.pontosObtidos).toBe(15);
    expect(b.pontosMaximos).toBe(20);
    expect(b.mediaParcial).toBe(75);
    expect(b.etapaRegularCompleta).toBe(false);
    expect(b.situacao).toBe("EM_ANDAMENTO");
  });

  it("nao trata nota nao lancada como zero", () => {
    const b = calcularBoletim([prova, tpi], new Map());
    expect(b.mediaParcial).toBeNull();
    expect(b.situacao).toBe("NAO_LANCADA");
    expect(b.alerta).toBe(false);
  });

  it("nao encerra a etapa regular enquanto as avaliacoes nao totalizam 100 pontos", () => {
    const b = calcularBoletim(
      [{ ...prova, valor: 20 }, { ...tpi, valor: 5 }],
      new Map([["p1", 14], ["t1", 4]]),
    );
    expect(b.etapaRegularCompleta).toBe(false);
    expect(b.situacao).toBe("EM_ANDAMENTO");
  });

  it("aprova diretamente com etapa regular completa e media >= 60", () => {
    const b = calcularBoletim([prova, tpi], new Map([["p1", 14], ["t1", 58]]));
    expect(b.etapaRegularCompleta).toBe(true);
    expect(b.mediaParcial).toBe(72);
    expect(b.situacao).toBe("APROVADO");
    expect(b.elegivelRecuperacao).toBe(false);
  });

  it("marca EM_RECUPERACAO quando completa abaixo de 60 sem recuperacao lancada", () => {
    const b = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32]]));
    expect(b.mediaParcial).toBe(40);
    expect(b.situacao).toBe("EM_RECUPERACAO");
    expect(b.elegivelRecuperacao).toBe(true);
    expect(b.alerta).toBe(true);
  });

  it("media final e o maior entre parcial e recuperacao", () => {
    const aprovado = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32], ["r1", 70]]));
    expect(aprovado.mediaFinal).toBe(70);
    expect(aprovado.situacao).toBe("APROVADO");
    const reprovado = calcularBoletim([prova, tpi, rec], new Map([["p1", 8], ["t1", 32], ["r1", 50]]));
    expect(reprovado.mediaFinal).toBe(50);
    expect(reprovado.situacao).toBe("REPROVADO");
  });
});

describe("NotaService.salvarLote", () => {
  it("salva o lote do professor da atribuicao", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 15 }]), reqProfessor);
    expect(recebido.usuarioId).toBe(usuarioId);
    expect(recebido.itens[0].matriculaId).toBe(matriculaId);
    expect(recebido.itens[0].valor).toBe(15);
  });

  it("rejeita aluno duplicado, desconhecido e valor fora do intervalo", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 5 }, { alunoId, valor: 6 }]), reqProfessor)).rejects.toThrow(/duplicado/);
    const desconhecido = "99999999-9999-4999-8999-999999999999";
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId: desconhecido, valor: 5 }]), reqProfessor)).rejects.toThrow(/sem matrícula ativa/);
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 21 }]), reqProfessor)).rejects.toThrow(/entre 0 e 20/);
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: -1 }]), reqProfessor)).rejects.toThrow(/entre 0 e 20/);
  });

  it("permite lote parcial sem exigir todos os alunos", async () => {
    let recebido: any;
    const service = criar({ salvarLoteAtomico: async (a: any) => { recebido = a; return a.itens; } });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor);
    expect(recebido.itens.length).toBe(1);
  });

  it("bloqueia lancamento em periodo fechado", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("rejeita professor sem vinculo com a atribuicao", async () => {
    const service = criar({ professorPossuiTurma: async () => false });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia aluno tentando lancar", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("mapeia conflito concorrente para HTTP 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error(), { code: "23505" }); } });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("propaga prazo expirado do repositorio como 409", async () => {
    const service = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Prazo expirado."), { codigoDominio: "PRAZO_EXPIRADO" }); } });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 409 });
  });

  it("rejeita lote vazio ou payload ausente", async () => {
    await expect(criar().salvarLote(avaliacaoId, lote([]), reqProfessor)).rejects.toThrow(/ao menos uma nota/);
    await expect(criar().salvarLote(avaliacaoId, undefined as any, reqProfessor)).rejects.toThrow(/ao menos uma nota/);
  });

  it("rejeita quando as avaliacoes regulares da turma ja ultrapassam 100 pontos", async () => {
    const service = criar({
      listarAvaliacoesDaTurma: async () => [
        { id: "a1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 60 },
        { id: "a2", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "T1", valor: 50 },
      ],
    });
    await expect(service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toThrow(/ultrapassam o limite de 100/);
  });

  it("aceita lancamento de recuperacao para aluno elegivel", async () => {
    let salvo: any;
    const service = criar({
      buscarAvaliacao: async () => avaliacaoBase({ tipo_avaliacao: "RECUPERACAO", valor: 100 }),
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
        { id: avaliacaoId, tipo_avaliacao: "RECUPERACAO", descricao_avaliacao: "Recuperacao", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { avaliacao_id: "regular", matricula_turma_disciplina_id: matriculaId, valor: 30 },
      ],
      salvarLoteAtomico: async (a: any) => { salvo = a; return a.itens; },
    });
    await service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 70 }]), reqProfessor);
    expect(salvo.itens[0].valor).toBe(70);
  });

  it("traduz erros de dominio do repositorio ao salvar o lote", async () => {
    const invalido = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Valor invalido."), { codigoDominio: "VALOR_INVALIDO" }); } });
    await expect(invalido.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 400 });

    const naoEncontrado = criar({ salvarLoteAtomico: async () => { throw Object.assign(new Error("Nao encontrado."), { codigoDominio: "NAO_ENCONTRADO" }); } });
    await expect(naoEncontrado.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toMatchObject({ status: 404 });

    const desconhecido = criar({ salvarLoteAtomico: async () => { throw new Error("falha inesperada"); } });
    await expect(desconhecido.salvarLote(avaliacaoId, lote([{ alunoId, valor: 10 }]), reqProfessor)).rejects.toThrow("falha inesperada");
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
    await expect(
      service.salvarLote(avaliacaoId, lote([{ alunoId, valor: 70 }]), reqProfessor),
    ).rejects.toThrow(/não está elegível para recuperação/);
  });
});

describe("NotaService autorizacao e acesso", () => {
  it("somente secretaria cria autorizacao excepcional", async () => {
    await expect(criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqProfessor)).rejects.toMatchObject({ status: 403 });
    const r = await criar().criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Erro de digitação corrigido" }, reqSecretaria);
    expect(r.mensagem).toMatch(/Autoriza/);
  });

  it("autorizacao excepcional exige periodo aberto", async () => {
    const service = criar({ buscarAvaliacao: async () => avaliacaoBase({ periodo_ativo: false }) });
    await expect(service.criarAutorizacaoExcepcional({ avaliacaoId, motivo: "Reabrir e corrigir" }, reqSecretaria)).rejects.toMatchObject({ status: 409 });
  });

  it("aluno acessa somente o proprio boletim", async () => {
    await expect(criar().consultarAluno(alunoId2, reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("meuResumo conta disciplinas abaixo de 60", async () => {
    const service = criar({
      listarTurmasDoAluno: async () => [{ turma_disciplina_id: turmaDisciplinaId, disciplina_id: "d", disciplina_nome: "Disciplina", turma_sigla: "A", periodo_id: "pl", periodo_codigo: "2026/1", professor_nome: "Prof" }],
      listarBoletimDoAluno: async () => [
        { turma_disciplina_id: turmaDisciplinaId, matricula_turma_disciplina_id: matriculaId, avaliacao_id: "p1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 20, nota_valor: 8 },
      ],
    });
    const r = await service.meuResumo(reqAluno);
    expect(r.disciplinasAbaixoDe60).toBe(1);
    expect(r.possuiAlerta).toBe(true);
  });

  it("meuBoletim rejeita quem nao e aluno", async () => {
    await expect(criar().meuBoletim(reqProfessor)).rejects.toMatchObject({ status: 403 });
  });

  it("meuBoletim monta o boletim do proprio aluno", async () => {
    const service = criar({
      listarTurmasDoAluno: async () => [{ turma_disciplina_id: turmaDisciplinaId, disciplina_id: "d", disciplina_codigo: "D1", disciplina_nome: "Disciplina", turma_sigla: "A", periodo_id: "pl", periodo_codigo: "2026/1", professor_nome: "Prof" }],
      listarBoletimDoAluno: async () => [
        { turma_disciplina_id: turmaDisciplinaId, matricula_turma_disciplina_id: matriculaId, avaliacao_id: "p1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 20, nota_valor: 15 },
      ],
    });
    const r = await service.meuBoletim(reqAluno);
    expect(r.alunoId).toBe(alunoId);
    expect(r.disciplinas).toHaveLength(1);
    expect(r.disciplinas[0].avaliacoes[0].valorObtido).toBe(15);
  });

  it("consultarAluno permite professor com vinculo e bloqueia sem vinculo", async () => {
    const comVinculo = criar({ professorPossuiAluno: async () => true });
    await expect(comVinculo.consultarAluno(alunoId, reqProfessor)).resolves.toBeTruthy();

    const semVinculo = criar({ professorPossuiAluno: async () => false });
    await expect(semVinculo.consultarAluno(alunoId, reqProfessor)).rejects.toMatchObject({ status: 403 });
  });

  it("consultarAluno rejeita id invalido", async () => {
    await expect(criar().consultarAluno("invalido", reqSecretaria)).rejects.toMatchObject({ status: 400 });
  });
});

describe("NotaService.listarOpcoes", () => {
  it("bloqueia aluno", async () => {
    await expect(criar().listarOpcoes(reqAluno)).rejects.toMatchObject({ status: 403 });
  });

  it("lista as atribuicoes do professor com suas avaliacoes", async () => {
    const service = criar({
      listarAtribuicoes: async () => [{
        id: turmaDisciplinaId, turma_id: "t", turma_sigla: "A", turma_descricao: "Turma A",
        disciplina_id: "d", disciplina_codigo: "D1", disciplina_nome: "Disciplina",
        periodo_id: "pl", periodo_codigo: "2026/1", periodo_status: "ativo", periodo_ativo: true,
        professor_nome: "Prof",
      }],
    });
    const r = await service.listarOpcoes(reqProfessor);
    expect(r.contexto.perfil).toBe("professor");
    expect(r.atribuicoes).toHaveLength(1);
    expect(r.atribuicoes[0].avaliacoes[0].id).toBe(avaliacaoId);
    expect(r.atribuicoes[0].periodoLetivo.fechado).toBe(false);
  });
});

describe("NotaService.obterLancamento", () => {
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
    expect(r.avaliacao.valorMaximo).toBe(20);
    const aluno1 = r.alunos.find((a: any) => a.alunoId === alunoId);
    const aluno2 = r.alunos.find((a: any) => a.alunoId === alunoId2);
    expect(aluno1.lancada).toBe(true);
    expect(aluno1.valor).toBe(18);
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

describe("NotaService.obterRendimento", () => {
  it("rejeita id invalido, bloqueia aluno e turma inexistente", async () => {
    await expect(criar().obterRendimento("invalido", reqProfessor)).rejects.toMatchObject({ status: 400 });
    await expect(criar().obterRendimento(turmaDisciplinaId, reqAluno)).rejects.toMatchObject({ status: 403 });
    const service = criar({ buscarTurmaDisciplina: async () => null });
    await expect(service.obterRendimento(turmaDisciplinaId, reqProfessor)).rejects.toMatchObject({ status: 404 });
  });

  it("monta o mapa consolidado com o boletim de cada aluno", async () => {
    const service = criar({
      listarNotasDaTurma: async () => [{ matricula_turma_disciplina_id: matriculaId, avaliacao_id: avaliacaoId, valor: 15 }],
    });
    const r = await service.obterRendimento(turmaDisciplinaId, reqProfessor);
    expect(r.turmaDisciplinaId).toBe(turmaDisciplinaId);
    expect(r.alunos).toHaveLength(2);
    const aluno1 = r.alunos.find((a: any) => a.alunoId === alunoId);
    expect(aluno1.notas[0].valor).toBe(15);
  });
});

describe("NotaService.obterRecuperacao", () => {
  it("rejeita id invalido, bloqueia aluno e turma inexistente", async () => {
    await expect(criar().obterRecuperacao("invalido", reqProfessor)).rejects.toMatchObject({ status: 400 });
    await expect(criar().obterRecuperacao(turmaDisciplinaId, reqAluno)).rejects.toMatchObject({ status: 403 });
    const service = criar({ buscarTurmaDisciplina: async () => null });
    await expect(service.obterRecuperacao(turmaDisciplinaId, reqProfessor)).rejects.toMatchObject({ status: 404 });
  });

  it("cria a recuperacao quando ha aluno elegivel, periodo aberto e nenhuma recuperacao existente", async () => {
    let criouRecuperacao = false;
    const service = criar({
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { matricula_turma_disciplina_id: matriculaId, avaliacao_id: "regular", valor: 30 },
        { matricula_turma_disciplina_id: matriculaId2, avaliacao_id: "regular", valor: 90 },
      ],
      buscarRecuperacaoDaTurma: async () => null,
      criarRecuperacao: async () => { criouRecuperacao = true; return { id: "rec1" }; },
    });
    const r = await service.obterRecuperacao(turmaDisciplinaId, reqProfessor);
    expect(criouRecuperacao).toBe(true);
    expect(r.recuperacaoAvaliacaoId).toBe("rec1");
    expect(r.alunos).toHaveLength(1);
    expect(r.alunos[0].alunoId).toBe(alunoId);
  });

  it("nao cria recuperacao quando ja existe uma", async () => {
    let criouRecuperacao = false;
    const service = criar({
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { matricula_turma_disciplina_id: matriculaId, avaliacao_id: "regular", valor: 30 },
      ],
      buscarRecuperacaoDaTurma: async () => ({ id: "rec-existente" }),
      criarRecuperacao: async () => { criouRecuperacao = true; return { id: "novo" }; },
    });
    const r = await service.obterRecuperacao(turmaDisciplinaId, reqProfessor);
    expect(criouRecuperacao).toBe(false);
    expect(r.recuperacaoAvaliacaoId).toBe("rec-existente");
  });

  it("nao cria recuperacao quando nenhum aluno e elegivel", async () => {
    let criouRecuperacao = false;
    const service = criar({
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { matricula_turma_disciplina_id: matriculaId, avaliacao_id: "regular", valor: 90 },
        { matricula_turma_disciplina_id: matriculaId2, avaliacao_id: "regular", valor: 90 },
      ],
      buscarRecuperacaoDaTurma: async () => null,
      criarRecuperacao: async () => { criouRecuperacao = true; return { id: "novo" }; },
    });
    const r = await service.obterRecuperacao(turmaDisciplinaId, reqProfessor);
    expect(criouRecuperacao).toBe(false);
    expect(r.recuperacaoAvaliacaoId).toBeNull();
    expect(r.alunos).toHaveLength(0);
  });

  it("nao cria recuperacao quando o periodo esta fechado", async () => {
    let criouRecuperacao = false;
    const service = criar({
      buscarTurmaDisciplina: async () => ({ id: turmaDisciplinaId, disciplina_id: "d", disciplina_nome: "Disciplina", turma_id: "t", turma_sigla: "A", periodo_codigo: "2026/1", periodo_status: "fechado", periodo_ativo: true }),
      listarAvaliacoesDaTurma: async () => [
        { id: "regular", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Etapa", valor: 100 },
      ],
      listarNotasDaTurma: async () => [
        { matricula_turma_disciplina_id: matriculaId, avaliacao_id: "regular", valor: 30 },
      ],
      buscarRecuperacaoDaTurma: async () => null,
      criarRecuperacao: async () => { criouRecuperacao = true; return { id: "novo" }; },
    });
    const r = await service.obterRecuperacao(turmaDisciplinaId, reqProfessor);
    expect(criouRecuperacao).toBe(false);
    expect(r.periodoLetivo.fechado).toBe(true);
  });
});

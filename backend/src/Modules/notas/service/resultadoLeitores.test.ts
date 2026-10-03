import { describe, expect, it, vi } from "vitest";
import { NotaService } from "./NotaService";
import { calcularResultadoAcademico } from "../models/ResultadoAcademico";

const ofertaId = "11111111-1111-4111-8111-111111111111";
const alunoId = "22222222-2222-4222-8222-222222222222";
const mtdId = "33333333-3333-4333-8333-333333333333";
const avaliacaoId = "44444444-4444-4444-8444-444444444444";
const req = { user: { id: "u", tipo_usuario: "professor" } } as any;

function cenario(perfil = "professor", total = "120.00", valor = "72.00", identificadorAluno = alunoId) {
  const contexto = { usuarioId: "u", perfil, professorId: "p", alunoId: identificadorAluno };
  const resultadoAcademico = calcularResultadoAcademico({ turmaDisciplinaId: ofertaId, matriculaTurmaDisciplinaId: mtdId,
    plano: { turmaDisciplinaId: ofertaId, regraPontuacaoId: "r", totalPontos: total, planoCompleto: true,
      podeCriarRegular: false, motivosBloqueio: [], subgrupos: [] },
    avaliacoes: [{ id: avaliacaoId, tipo: "REGULAR", valor: total }], notasPorAvaliacao: new Map([[avaliacaoId, valor]]),
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
  });
  const oferta = { id: ofertaId, disciplina_id: "d", disciplina_codigo: "D", disciplina_nome: "Disciplina",
    turma_id: "t", turma_sigla: "A", professor_nome: "Professor", periodo_id: "periodo", periodo_codigo: "2026/1",
    periodo_status: "ativo", periodo_ativo: true, plano: {},
    avaliacoes: [{ id: avaliacaoId, tipo: "REGULAR", valor: total, descricao: "Regular" }] };
  const matricula = { matricula_turma_disciplina_id: mtdId, turma_disciplina_id: ofertaId, aluno_id: alunoId,
    matricula: 1, aluno_nome: "Aluno", notas: new Map([[avaliacaoId, valor]]), resultadoAcademico };
  const resultados = { consultar: vi.fn(async (_filtros: any, _req: any) => ({ contexto, ofertas: [oferta], matriculas: [matricula] })) };
  const auth = { obterContexto: vi.fn(async () => contexto) };
  const repository = { contarMatriculasIrregulares: vi.fn(async () => 0) };
  return { service: new NotaService(repository as any, auth as any, resultados as any), resultados, resultadoAcademico };
}

describe("leitores de notas - contrato v2 comum", () => {
  it("aluno consulta o próprio UUID em maiúsculas sem ampliar o escopo", async () => {
    const identificador = "aabbccdd-2222-4222-8222-abcdefabcdef";
    const c = cenario("aluno", "120.00", "72.00", identificador);
    await c.service.consultarAluno(identificador.toUpperCase(), req);
    expect(c.resultados.consultar).toHaveBeenCalledWith({ alunoId: identificador, periodoLetivoId: undefined }, req);
  });
  it("boletim do aluno usa resultado comum e preserva strings e aprovação pendente", async () => {
    const c = cenario("aluno");
    const resposta = await c.service.meuBoletim(req);
    expect(c.resultados.consultar).toHaveBeenCalledWith({ alunoId, periodoLetivoId: undefined }, req);
    expect(resposta.disciplinas[0]).toMatchObject({ turmaDisciplinaId: ofertaId, matriculaTurmaDisciplinaId: mtdId,
      pontosObtidos: "72.00", notaRecuperacao: null,
      avaliacoes: [{ valorMaximo: "120.00", valorObtido: "72.00", lancada: true }],
      resultadoAcademico: { resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "PENDENTE" } });
  });

  it("consulta do aluno compartilhado entrega somente ofertas filtradas pelo compositor", async () => {
    const c = cenario();
    const resposta = await c.service.consultarAluno(alunoId, req);
    expect(c.resultados.consultar).toHaveBeenCalledWith({ alunoId, periodoLetivoId: undefined }, req);
    expect(resposta.disciplinas.map((d) => d.turmaDisciplinaId)).toEqual([ofertaId]);
    expect(resposta.disciplinas[0].resultadoAcademico).toEqual(c.resultadoAcademico);
  });

  it("rendimento transporta o mesmo objeto e notas textuais", async () => {
    const c = cenario();
    const resposta = await c.service.obterRendimento(ofertaId, req);
    expect(c.resultados.consultar).toHaveBeenCalledWith({ ofertaIds: [ofertaId] }, req);
    expect(resposta.alunos[0]).toMatchObject({ resultadoAcademico: c.resultadoAcademico,
      notas: [{ avaliacaoId, valor: "72.00" }] });
    expect(resposta.avaliacoes[0].valor).toBe("120.00");
  });

  it("opções usam lote único, pontos textuais e plano da oferta", async () => {
    const c = cenario();
    const resposta = await c.service.listarOpcoes(req);
    expect(c.resultados.consultar).toHaveBeenCalledTimes(1);
    expect(c.resultados.consultar).toHaveBeenCalledWith({ somenteOfertasAtivas: true }, req);
    expect(resposta.atribuicoes[0].avaliacoes[0].valor).toBe("120.00");
    expect(resposta.atribuicoes[0]).toHaveProperty("plano");
  });

  it.each([["300.00", "179.99"], ["100.01", "60.00"]])("resumo compara flags exatas para %s/%s", async (total, valor) => {
    const c = cenario("aluno", total, valor);
    const resposta = await c.service.meuResumo(req);
    expect(resposta.disciplinasAbaixoDoCorte).toBe(1);
    expect(resposta.disciplinasAlerta[0]).toMatchObject({ turmaDisciplinaId: ofertaId,
      resultadoAcademico: { resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true } });
  });

  it("resumo conserva frequência pendente sem classificar nota suficiente abaixo do corte", async () => {
    const c = cenario("aluno");
    const resposta = await c.service.meuResumo(req);
    expect(resposta.disciplinasAbaixoDoCorte).toBe(0);
    expect(resposta.possuiAlerta).toBe(true);
    expect(resposta.disciplinasAlerta[0].resultadoAcademico.aprovacaoDisciplina).toBe("PENDENTE");
  });

  it("aluno não acessa rendimento/opções e não consulta outro aluno", async () => {
    const c = cenario("aluno");
    await expect(c.service.obterRendimento(ofertaId, req)).rejects.toMatchObject({ status: 403 });
    await expect(c.service.listarOpcoes(req)).rejects.toMatchObject({ status: 403 });
    await expect(c.service.consultarAluno("55555555-5555-4555-8555-555555555555", req)).rejects.toMatchObject({ status: 403 });
    expect(c.resultados.consultar).not.toHaveBeenCalled();
  });
});

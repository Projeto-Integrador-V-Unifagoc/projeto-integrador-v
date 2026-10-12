import { describe, expect, it } from "vitest";
import type { ResultadoAcademico } from "../../models/resultado-academico-model";
import type { FrequenciaAluno, MatriculaDisciplinaFicha, NotaFicha } from "../../services/ficha-api";
import { montarNotasFicha, normalizarSemestre } from "./notasFicha.utils";

const ALUNO = "11111111-1111-1111-1111-111111111111";
const OFERTA_A = "22222222-2222-2222-2222-222222222222";
const OFERTA_B = "33333333-3333-3333-3333-333333333333";
const VINCULO_A = "44444444-4444-4444-4444-444444444444";
const VINCULO_B = "55555555-5555-5555-5555-555555555555";
const AVALIACAO = "66666666-6666-6666-6666-666666666666";

function criarResultado(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2, turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777", totalPontos: "120.00", cortePontos: "72.00",
    planoCompleto: true, avaliacoesRegulares: 6, avaliacoesLancadas: 6, avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "72.00", pontosMaximosLancados: "120.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "120.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "120.00", pontosEfetivos: "72.00", percentualResultado: 60,
    resultadoPorNota: "SUFICIENTE", elegivelRecuperacaoPorNota: false,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["FREQUENCIA_PENDENTE"], ...overrides,
  };
}

function criarNota(overrides: Partial<NotaFicha> = {}): NotaFicha {
  return {
    id: OFERTA_A, alunoId: ALUNO, alunoNome: "Aluno Teste",
    turmaId: "88888888-8888-8888-8888-888888888888", turmaNome: "Turma A",
    disciplinaId: "99999999-9999-9999-9999-999999999999", disciplinaNome: "Cálculo I",
    professorId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", professorNome: "Professor Teste", periodoLetivo: "2026/1",
    turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
    avaliacoes: [], media: 60, situacao: "APROVADO", resultadoAcademico: criarResultado(), ...overrides,
  };
}

function criarMatricula(overrides: Partial<MatriculaDisciplinaFicha> = {}): MatriculaDisciplinaFicha {
  return {
    id: VINCULO_A, matricula_id: VINCULO_A, aluno_id: ALUNO, curso_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    turma_id: "88888888-8888-8888-8888-888888888888", status: "ativa", data_matricula: "2026-02-03T03:00:00.000Z",
    aluno_nome: "Aluno Teste", aluno_cpf: "000.000.000-00", aluno_matricula: 1, curso_nome: "Curso Teste",
    turma_sigla: "TURMA-A", turma_descricao: "Turma A", turno: "Noturno", periodo_curricular: 1,
    periodo_letivo_codigo: "2026/1", periodo_codigo: "2026/1", semestre: "2026/1", ano: 2026, total_disciplinas: 1,
    matricula_turma_disciplina_id: VINCULO_A, turma_disciplina_id: OFERTA_A,
    disciplina_id: "99999999-9999-9999-9999-999999999999", disciplina_nome: "Cálculo I", professor_nome: "Professor Teste",
    vinculo_status: "ativa", ...overrides,
  };
}

function criarFrequencia(overrides: Partial<FrequenciaAluno["consolidado"][number]> = {}): FrequenciaAluno {
  return { alunoId: ALUNO, consolidado: [{
    alunoId: ALUNO, alunoNome: "Aluno Teste", turmaDisciplinaId: OFERTA_A,
    disciplinaId: "99999999-9999-9999-9999-999999999999", disciplinaNome: "Cálculo I",
    totalAulas: 20, presencas: 16, faltas: 4, naoLancadas: 0, percentual: 80, situacao: "ALERTA", ...overrides,
  }] };
}

describe("normalizarSemestre", () => {
  it("mantém a normalização do código apresentado na ficha", () => {
    expect(normalizarSemestre(" 2026/1 ")).toBe("2026-1");
  });
  it("mantém vazio para um semestre não informado", () => {
    expect(normalizarSemestre(null)).toBe("");
    expect(normalizarSemestre(undefined)).toBe("");
  });
});

describe("montarNotasFicha - contrato acadêmico da ficha ativa", () => {
  it("relaciona ofertas homônimas de períodos diferentes pelos UUIDs, independente da ordem das matrículas", () => {
    const notaB = criarNota({ id: OFERTA_B, turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B,
      periodoLetivo: "2025/2", resultadoAcademico: criarResultado({ turmaDisciplinaId: OFERTA_B,
        matriculaTurmaDisciplinaId: VINCULO_B, pontosRegularesObtidos: "84.00", pontosEfetivos: "84.00", percentualResultado: 70,
        indicadorRegular: { percentual: 70, parcial: false, denominadorPontos: "120.00" } }) });
    const matriculaB = criarMatricula({ turma_disciplina_id: OFERTA_B, matricula_turma_disciplina_id: VINCULO_B, semestre: "2025/2" });
    const resultado = montarNotasFicha([criarNota(), notaB], undefined, [matriculaB, criarMatricula()]);
    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(expect.arrayContaining([
      expect.objectContaining({ turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A,
        resultadoAcademico: expect.objectContaining({ pontosEfetivos: "72.00" }) }),
      expect.objectContaining({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B,
        resultadoAcademico: expect.objectContaining({ pontosEfetivos: "84.00" }) }),
    ]));
  });

  it("não funde a frequência de outra oferta homônima com a nota existente", () => {
    const matriculaB = criarMatricula({ turma_disciplina_id: OFERTA_B, matricula_turma_disciplina_id: VINCULO_B });
    const resultado = montarNotasFicha([criarNota()], criarFrequencia({ turmaDisciplinaId: OFERTA_B }), [criarMatricula(), matriculaB]);
    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(expect.arrayContaining([
      expect.objectContaining({ turmaDisciplinaId: OFERTA_A,
        resultadoAcademico: expect.objectContaining({ frequencia: expect.objectContaining({ percentual: null }) }) }),
      expect.objectContaining({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B, resultadoAcademico: null }),
    ]));
  });

  it("gera uma única linha para a mesma oferta encontrada em nota, frequência e matrícula", () => {
    const resultado = montarNotasFicha([criarNota()], criarFrequencia(), [criarMatricula()]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A });
  });

  it("mostra a matrícula sem registros com resultado indisponível, sem inventar nota ou frequência zero", () => {
    const resultado = montarNotasFicha([], undefined, [criarMatricula()]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A, avaliacoes: [], resultadoAcademico: null });
  });

  it("preserva zero textual como lançado e null como ausência em avaliações de nomes livres", () => {
    const nota = criarNota({ avaliacoes: [
      { id: AVALIACAO, nome: "Projeto livre", nota: "0.00", peso: "42.00", matricula_turma_disciplina_id: VINCULO_A },
      { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Projeto livre", nota: null, peso: "18.00", matricula_turma_disciplina_id: VINCULO_A },
    ] });
    const resultado = montarNotasFicha([nota], undefined, [criarMatricula()]);
    expect(resultado[0]).toMatchObject({ avaliacoes: [
      { id: AVALIACAO, nome: "Projeto livre", nota: "0.00", peso: "42.00" },
      { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Projeto livre", nota: null, peso: "18.00" },
    ] });
  });

  it("transporta nota suficiente com frequência pendente sem promovê-la a aprovação conjunta pelo alias legado", () => {
    const resultado = montarNotasFicha([criarNota({ media: 100, situacao: "APROVADO" })], undefined, []);
    expect(resultado[0]).toMatchObject({ resultadoAcademico: {
      resultadoPorNota: "SUFICIENTE", aprovacaoDisciplina: "PENDENTE",
      frequencia: { percentual: null, requisito: "PENDENTE" }, motivos: ["FREQUENCIA_PENDENTE"],
    } });
  });

  it("mantém indicador parcial de 100% sem pontos efetivos, aprovação ou recuperação antecipada", () => {
    const parcial = criarResultado({ planoCompleto: false, etapaRegularCompleta: false, avaliacoesRegulares: 2, avaliacoesLancadas: 1,
      avaliacoesSemNota: [AVALIACAO], pontosRegularesObtidos: "12.00", pontosMaximosLancados: "12.00",
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "12.00" },
      pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "EM_ANDAMENTO", elegivelRecuperacaoPorNota: false,
      motivos: ["PLANO_INCOMPLETO", "NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] });
    const resultado = montarNotasFicha([criarNota({ resultadoAcademico: parcial })], undefined, []);
    expect(resultado[0]).toMatchObject({ resultadoAcademico: parcial });
  });

  it("preserva a melhor recuperação após retificação regular sem somar ou recalcular o resultado do servidor", () => {
    const recuperada = criarResultado({ pontosRegularesObtidos: "70.00", pontosRecuperacao: "80.00", pontosEfetivos: "80.00",
      indicadorRegular: { percentual: 58.33, parcial: false, denominadorPontos: "120.00" }, percentualResultado: 66.67,
      elegivelRecuperacaoPorNota: true, frequencia: { presencas: 19, faltas: 1, percentual: 95, situacao: "REGULAR", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "APROVADA", motivos: [] });
    const resultado = montarNotasFicha([criarNota({ media: 58.33, resultadoAcademico: recuperada })], undefined, []);
    expect(resultado[0]).toMatchObject({ resultadoAcademico: recuperada });
  });

  it("preserva frequência insuficiente do resultado canônico mesmo que o consolidado legado indique outra situação", () => {
    const reprovacao = criarResultado({ frequencia: { presencas: 10, faltas: 10, percentual: 50,
      situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" }, aprovacaoDisciplina: "NAO_APROVADA", motivos: ["FREQUENCIA_INSUFICIENTE"] });
    const resultado = montarNotasFicha([criarNota({ resultadoAcademico: reprovacao })], criarFrequencia(), []);
    expect(resultado[0]).toMatchObject({ resultadoAcademico: reprovacao });
  });

  it("mantém centésimos além do inteiro seguro e corte de três casas sem coerção numérica", () => {
    const nota = criarNota({ resultadoAcademico: criarResultado({ totalPontos: "9007199254740993.02", cortePontos: "5404319552844595.812",
      avaliacoesRegulares: 1, avaliacoesLancadas: 1, pontosRegularesObtidos: "9007199254740993.01", pontosMaximosLancados: "9007199254740993.02",
      pontosEfetivos: "9007199254740993.01", percentualResultado: 100, valorMaximoRecuperacao: "9007199254740993.02",
      indicadorRegular: { percentual: 100, parcial: false, denominadorPontos: "9007199254740993.02" } }), avaliacoes: [
      { id: AVALIACAO, nome: "Entrega exata", nota: "9007199254740993.01", peso: "9007199254740993.02", matricula_turma_disciplina_id: VINCULO_A },
    ] });
    const resultado = montarNotasFicha([nota], undefined, []);
    expect(resultado[0]).toMatchObject({ resultadoAcademico: { cortePontos: "5404319552844595.812", pontosEfetivos: "9007199254740993.01" },
      avaliacoes: [{ nota: "9007199254740993.01", peso: "9007199254740993.02" }] });
    expect(nota.avaliacoes[0].nota).toBe("9007199254740993.01");
  });

  it("filtra o período apresentado sem usar nome homônimo para trocar o UUID da matrícula", () => {
    const notaB = criarNota({ id: OFERTA_B, turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B, periodoLetivo: "2025/2",
      resultadoAcademico: criarResultado({ turmaDisciplinaId: OFERTA_B, matriculaTurmaDisciplinaId: VINCULO_B }) });
    const matriculaB = criarMatricula({ turma_disciplina_id: OFERTA_B, matricula_turma_disciplina_id: VINCULO_B, semestre: "2025/2" });
    const resultado = montarNotasFicha([criarNota(), notaB], undefined, [matriculaB, criarMatricula()], "2026-1");
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ turmaDisciplinaId: OFERTA_A, matriculaTurmaDisciplinaId: VINCULO_A });
  });
});

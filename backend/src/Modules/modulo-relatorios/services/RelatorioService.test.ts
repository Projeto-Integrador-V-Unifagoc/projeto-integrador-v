import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { RelatorioService } from "./RelatorioService";
import type { RelatorioAcademicoLinha } from "../models/RelatorioAcademico";

const linhaBase = (over: Partial<RelatorioAcademicoLinha> = {}): RelatorioAcademicoLinha => ({
  alunoId: "a1", matricula: 1, aluno: "Aluno Um",
  curso: "Sistemas de Informacao", periodo: "1", ano: "2026",
  disciplina: "Programacao Orientada a Objetos", cargaHoraria: 60,
  avaliacao: "P1", tipoAvaliacao: "PROVA", valorAvaliacao: 20, dataAvaliacao: "2026-05-10",
  nota: 75, frequencia: 90, totalAulas: 20, presencas: 18, faltas: 2, situacao: "Aprovado",
  ...over,
});

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    listarLinhasAcademicas: async (_f: any) => [linhaBase()],
    listarNotasDetalhadas: async (_f: any) => [linhaBase()],
    contarFontesAcademicas: async () => ({ alunos: 1 }),
    buscarAlunoPorUsuarioId: async (_id: string) => ({ id: "a1" }),
    buscarProfessorPorUsuarioId: async (_id: string) => ({ id: "prof1" }),
    listarTurmasDisciplinaDoProfessor: async (_id: string) => [{ id: "t1" }],
    ...overrides,
  };
  const service = new RelatorioService();
  (service as any).repository = repository;
  return { service, repository };
}

describe("RelatorioService.listarRelatorios", () => {
  it("monta relatorios de Notas/Frequencia/Historico/Consulta para a secretaria", async () => {
    const { service } = criar();
    const relatorios = await service.listarRelatorios({});
    const tipos = new Set(relatorios.map((r) => r.tipo));
    assert.ok(tipos.has("Notas"));
    assert.ok(tipos.has("Frequencia"));
    assert.ok(tipos.has("Consulta"));
    assert.ok(relatorios.every((r) => r.periodos.some((p) => p.disciplinas.length > 0)));
  });

  it("nao gera relatorio de Consulta para o perfil Aluno", async () => {
    const { service } = criar();
    const relatorios = await service.listarRelatorios({}, { usuarioId: "u1", tipoUsuario: "aluno" });
    assert.equal(relatorios.some((r) => r.tipo === "Consulta"), false);
    assert.ok(relatorios.every((r) => r.perfis.includes("Aluno")));
  });

  it("filtra pelo tipo solicitado", async () => {
    const { service } = criar();
    const relatorios = await service.listarRelatorios({ tipo: "Notas" });
    assert.ok(relatorios.length > 0);
    assert.ok(relatorios.every((r) => r.tipo === "Notas"));
  });

  it("aplica o filtro de busca ignorando acentos e caixa", async () => {
    const { service } = criar();
    const comMatch = await service.listarRelatorios({ busca: "PROGRAMACAO" });
    assert.ok(comMatch.length > 0);
    const semMatch = await service.listarRelatorios({ busca: "termo-inexistente-xyz" });
    assert.equal(semMatch.length, 0);
  });

  it("restringe o aluno ao proprio vinculo", async () => {
    let filtrosRecebidos: any;
    const { service } = criar({
      listarLinhasAcademicas: async (f: any) => {
        filtrosRecebidos = f;
        return [linhaBase()];
      },
    });
    await service.listarRelatorios({}, { usuarioId: "u1", tipoUsuario: "aluno" });
    assert.equal(filtrosRecebidos.alunoId, "a1");
    assert.equal(filtrosRecebidos.perfil, "Aluno");
  });

  it("marca aluno sem vinculo com sentinela __sem_vinculo__", async () => {
    let filtrosRecebidos: any;
    const { service } = criar({
      buscarAlunoPorUsuarioId: async () => null,
      listarLinhasAcademicas: async (f: any) => {
        filtrosRecebidos = f;
        return [];
      },
    });
    await service.listarRelatorios({}, { usuarioId: "u1", tipoUsuario: "aluno" });
    assert.equal(filtrosRecebidos.alunoId, "__sem_vinculo__");
  });

  it("marca professor sem vinculo docente com sentinela __sem_vinculo__", async () => {
    let filtrosRecebidos: any;
    const { service } = criar({
      buscarProfessorPorUsuarioId: async () => null,
      listarLinhasAcademicas: async (f: any) => { filtrosRecebidos = f; return []; },
    });
    await service.listarRelatorios({}, { usuarioId: "u1", tipoUsuario: "professor" });
    assert.equal(filtrosRecebidos.turmaId, "__sem_vinculo__");
    assert.deepEqual(filtrosRecebidos.turmaIdsPermitidos, ["__sem_vinculo__"]);
  });

  it("aplica o perfil Secretaria quando o contexto autenticado e de secretaria", async () => {
    let filtrosRecebidos: any;
    const { service } = criar({
      listarLinhasAcademicas: async (f: any) => { filtrosRecebidos = f; return [linhaBase()]; },
    });
    await service.listarRelatorios({}, { usuarioId: "u1", tipoUsuario: "secretaria" as any });
    assert.equal(filtrosRecebidos.perfil, "Secretaria");
  });

  it("bloqueia professor que pede turma fora das suas atribuicoes", async () => {
    let filtrosRecebidos: any;
    const { service } = criar({
      listarTurmasDisciplinaDoProfessor: async () => [{ id: "t1" }],
      listarLinhasAcademicas: async (f: any) => {
        filtrosRecebidos = f;
        return [];
      },
    });
    await service.listarRelatorios({ turmaId: "t999" }, { usuarioId: "u1", tipoUsuario: "professor" });
    assert.deepEqual(filtrosRecebidos.turmaIdsPermitidos, ["__sem_acesso__"]);
  });
});

describe("RelatorioService formatacao de valores", () => {
  it("trata nota, data, frequencia e contadores ausentes ou ja formatados", async () => {
    const linhaSemDados = linhaBase({
      nota: null as any, dataAvaliacao: null as any, frequencia: null as any,
      totalAulas: undefined as any, valorAvaliacao: null as any,
    });
    const linhaComPercentual = linhaBase({ frequencia: "95%" as any });
    const { service } = criar({
      listarLinhasAcademicas: async () => [linhaSemDados, linhaComPercentual],
    });
    const relatorios = await service.listarRelatorios({ tipo: "Historico" });
    const disciplinas = relatorios.flatMap((r) => r.periodos.flatMap((p) => p.disciplinas));
    const semDados = disciplinas.find((d) => d.nota === undefined);
    assert.ok(semDados);
    assert.equal(semDados!.dataAvaliacao, undefined);
    assert.equal(semDados!.frequencia, undefined);
    assert.equal(semDados!.totalAulas, undefined);
    const comPercentual = disciplinas.find((d) => d.frequencia === "95%");
    assert.ok(comPercentual);
  });

  it("mantem valores nao numericos de nota e frequencia como texto", async () => {
    const linha = linhaBase({ nota: "Aprovado por equivalencia" as any, frequencia: "Dispensado" as any });
    const { service } = criar({ listarLinhasAcademicas: async () => [linha] });
    const relatorios = await service.listarRelatorios({ tipo: "Historico" });
    const disciplina = relatorios[0].periodos[0].disciplinas[0];
    assert.equal(disciplina.nota, "Aprovado por equivalencia");
    assert.equal(disciplina.frequencia, "Dispensado");
  });
});

describe("RelatorioService.normalizarSituacao", () => {
  async function disciplinaCom(over: Partial<RelatorioAcademicoLinha>) {
    const { service } = criar({ listarLinhasAcademicas: async () => [linhaBase(over)] });
    const relatorios = await service.listarRelatorios({ tipo: "Historico" });
    return relatorios[0].periodos[0].disciplinas[0];
  }

  it("reconhece risco/reprovacao e alerta/recuperacao pelo texto da situacao", async () => {
    assert.equal((await disciplinaCom({ situacao: "Risco de Reprovacao" as any })).situacao, "Pendente");
    assert.equal((await disciplinaCom({ situacao: "Alerta" as any })).situacao, "Atencao");
    assert.equal((await disciplinaCom({ situacao: "Em Recuperacao" as any })).situacao, "Atencao");
  });

  it("recorre a frequencia e nota numericas quando a situacao nao e reconhecida", async () => {
    assert.equal((await disciplinaCom({ situacao: "" as any, frequencia: 70, nota: 90 })).situacao, "Pendente");
    assert.equal((await disciplinaCom({ situacao: "" as any, frequencia: "N/A" as any, nota: 5 })).situacao, "Recuperacao");
    assert.equal((await disciplinaCom({ situacao: "" as any, frequencia: 78, nota: 90 })).situacao, "Atencao");
    assert.equal((await disciplinaCom({ situacao: "" as any, frequencia: 90, nota: 9 })).situacao, "Aprovado");
  });
});

describe("RelatorioService.nomeAvaliacao", () => {
  it("usa o rotulo do tipo quando a avaliacao nao tem nome, e o proprio tipo quando desconhecido", async () => {
    const { service } = criar({
      listarLinhasAcademicas: async () => [
        linhaBase({ avaliacao: "" as any, tipoAvaliacao: "PROVA" }),
        linhaBase({ avaliacao: "" as any, tipoAvaliacao: null as any }),
        linhaBase({ avaliacao: "" as any, tipoAvaliacao: "SEMINARIO" as any }),
      ],
    });
    const relatorios = await service.listarRelatorios({ tipo: "Historico" });
    const avaliacoes = relatorios[0].periodos[0].disciplinas.map((d: any) => d.avaliacao);
    assert.ok(avaliacoes.includes("Prova"));
    assert.ok(avaliacoes.includes("Avaliacao"));
    assert.ok(avaliacoes.includes("SEMINARIO"));
  });
});

describe("RelatorioService.obterStatusFonteDados", () => {
  it("retorna o schema e a contagem de fontes", async () => {
    const { service } = criar();
    const status = await service.obterStatusFonteDados();
    assert.equal(status.source, "database");
    assert.equal(status.schema, "piv");
    assert.deepEqual(status.tabelas, { alunos: 1 });
  });
});

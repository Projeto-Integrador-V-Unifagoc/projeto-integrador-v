import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { RelatorioService } from "./RelatorioService";
import { calcularResultadoAcademico } from "../../notas/models/ResultadoAcademico";

vi.mock("../../../database/connection", () => ({ db: vi.fn(() => { throw new Error("SQL real proibido nesta unidade."); }) }));
vi.mock("../../notas/service/criarResultadoAcademicoService", () => ({ criarResultadoAcademicoService: () => ({ consultar: vi.fn() }) }));
const id = (n: number) => `${n.toString().padStart(8, "0")}-aaaa-bbbb-cccc-000000000000`;
const req = (perfil = "secretaria") => ({ user: { id: id(90), tipo_usuario: perfil } }) as unknown as Request;
function criar(perfil = "secretaria") {
  const ofertas = [120, 300].map((total, i) => ({ id: id(i + 1), curso_id: id(10), curso_nome: "Sistemas de Informação",
    turma_id: id(i + 11), turma_sigla: "A", disciplina_id: id(20), disciplina_nome: "Programação",
    carga_horaria: 60, periodo_letivo_id: id(i + 21), periodo_codigo: "Mesmo rótulo", ano: 2026, semestre: 1,
    plano: { turmaDisciplinaId: id(i + 1), regraPontuacaoId: id(i + 31), totalPontos: `${total}.00`, planoCompleto: true,
      podeCriarRegular: false, motivosBloqueio: [], subgrupos: [] },
    avaliacoes: [{ id: id(i + 41), tipo: "REGULAR", valor: `${total}.00`, descricao: "Atividade", data_lancamento: "2026-05-10" }] }));
  const matriculas = ofertas.map((o, i) => {
    const notas = new Map([[o.avaliacoes[0].id, i ? "179.99" : "72.00"]]);
    return { aluno_id: id(50), aluno_nome: "Pessoa sintética", matricula: 2026001,
      matricula_turma_disciplina_id: id(i + 51), turma_disciplina_id: o.id, notas,
      resultadoAcademico: calcularResultadoAcademico({ turmaDisciplinaId: o.id, matriculaTurmaDisciplinaId: id(i + 51),
        plano: o.plano, avaliacoes: o.avaliacoes as any, notasPorAvaliacao: notas,
        frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" } }) };
  });
  const lote = { contexto: { usuarioId: id(90), perfil }, ofertas, matriculas };
  const repository = { carregarResultadoAcademico: vi.fn(async (_f: any, _req: any) => lote), contarFontesAcademicas: vi.fn(async () => ({ aluno: 1 })) };
  const gateway = { estaConfigurado: vi.fn(() => false), listarLinhas: vi.fn(async (_f: any, _autorizadas: any) => []) };
  const service = new RelatorioService();
  Object.assign(service as any, { repository, gateway });
  return { service, repository, gateway, lote };
}
const disciplinas = (relatorios: any[]) => relatorios.flatMap(r => r.periodos.flatMap((p: any) => p.disciplinas));
describe("Relatório projeta um lote acadêmico autorizado sem fórmula alternativa", () => {
  it.each(["secretaria", "administrador", "professor", "aluno"])("usa requisição original e perfil autenticado de %s", async perfil => {
    const c = criar(perfil); const request = req(perfil);
    const relatorios = await (c.service.listarRelatorios as any)({ perfil: "Secretaria" }, request);
    expect(c.repository.carregarResultadoAcademico).toHaveBeenCalledTimes(1);
    expect(c.repository.carregarResultadoAcademico).toHaveBeenCalledWith({ perfil: "Secretaria" }, request);
    expect(relatorios.every((r: any) => r.perfis[0] === (perfil === "aluno" ? "Aluno" : perfil === "professor" ? "Professor" : "Secretaria"))).toBe(true);
    expect(relatorios.map((r: any) => r.tipo)).toEqual(perfil === "aluno" ? ["Notas", "Frequencia", "Historico"] : ["Notas", "Frequencia", "Historico", "Consulta"]);
  });
  it.each([undefined, req("visitante")])("nega contexto ausente/desconhecido antes de qualquer consulta", async request => {
    const c = criar(); await expect((c.service.listarRelatorios as any)({}, request)).rejects.toMatchObject({ status: request ? 403 : 401 });
    expect(c.repository.carregarResultadoAcademico).not.toHaveBeenCalled(); expect(c.gateway.listarLinhas).not.toHaveBeenCalled();
  });
  it("preserva oferta/matrícula/periodo por UUID e repassa resultado, pontos e corte exatos", async () => {
    const c = criar(); const relatorios = await (c.service.listarRelatorios as any)({ tipo: "Historico" }, req());
    expect(relatorios[0].periodos).toHaveLength(2);
    const ds = disciplinas(relatorios); expect(ds).toHaveLength(2);
    for (const [i, d] of ds.entries()) {
      expect(d).toMatchObject({ turmaDisciplinaId: c.lote.ofertas[i].id, matriculaTurmaDisciplinaId: c.lote.matriculas[i].matricula_turma_disciplina_id,
        resultadoAcademico: c.lote.matriculas[i].resultadoAcademico, nota: i ? "179.99" : "72.00", frequencia: "75%" });
    }
    expect(ds[0].situacao).toBe("Aprovado"); expect(ds[1].situacao).toBe("Recuperacao");
    expect(ds[1].resultadoAcademico.percentualResultado).toBe(60);
    expect(ds[1].resultadoAcademico.aprovacaoDisciplina).toBe("PENDENTE");
    expect(relatorios[0].pdf.colunas).toContain("Pontos"); expect(relatorios[0].pdf.colunas).toContain("Total"); expect(relatorios[0].pdf.colunas).toContain("Corte");
    expect(relatorios[0].pdf.linhas[1]).toMatchObject({ Pontos: "179.99", Total: "300.00", Corte: "180.00", Situacao: "Recuperação" });
  });
  it("ausência não desaparece e não vira zero/100/aprovação", async () => {
    const c = criar(); const m = c.lote.matriculas[0], o = c.lote.ofertas[0]; m.notas.clear();
    m.resultadoAcademico = calcularResultadoAcademico({ turmaDisciplinaId: o.id, matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id,
      plano: o.plano, avaliacoes: o.avaliacoes as any, notasPorAvaliacao: m.notas,
      frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" } });
    const relatorios = await (c.service.listarRelatorios as any)({}, req());
    for (const r of relatorios) {
      const d = disciplinas([r]).find(d => d.turmaDisciplinaId === o.id);
      expect(d).toBeDefined(); expect(d.nota).toBeNull(); expect(d.frequencia).toBeNull(); expect(d.situacao).toBe("Pendente");
      expect(d.resultadoAcademico.pontosEfetivos).toBeNull();
    }
  });
  it("aluno recebe avaliações ausentes/zero como null/string sem perder precisão nem histórico", async () => {
    const c = criar("aluno"); const o = c.lote.ofertas[0], m = c.lote.matriculas[0];
    o.avaliacoes[0].tipo = "PROVA"; m.notas.set(o.avaliacoes[0].id, "0.00"); c.lote.matriculas[1].notas.clear();
    const relatorios = await (c.service.listarRelatorios as any)({ tipo: "Notas" }, req("aluno"));
    const ds = disciplinas(relatorios);
    expect(ds[0]).toMatchObject({ nota: "0.00", valorAvaliacao: "120.00", tipoAvaliacao: "Prova", avaliacao: "Atividade", dataAvaliacao: "10/05/2026" });
    expect(ds[1].nota).toBeNull(); expect(ds[1].valorAvaliacao).toBe("300.00");
    expect(relatorios[0].pdf.linhas[1].Nota).toBe("-");
  });
  it("não promove nota suficiente se a frequência do resultado impede aprovação", async () => {
    const c = criar(); Object.assign(c.lote.matriculas[0].resultadoAcademico, { aprovacaoDisciplina: "NAO_APROVADA",
      frequencia: { presencas: 2, faltas: 2, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" }, motivos: ["FREQUENCIA_INSUFICIENTE"] });
    const ds = disciplinas(await (c.service.listarRelatorios as any)({ tipo: "Historico" }, req()));
    expect(ds[0].situacao).toBe("Reprovado"); expect(ds[0].resultadoAcademico.resultadoPorNota).toBe("SUFICIENTE");
  });
  it("conserva filtros de tipo/ano/busca sem acentos e identidade do curso", async () => {
    const c = criar(); const relatorios = await (c.service.listarRelatorios as any)({ tipo: "Notas", ano: "2026/1", busca: "PROGRAMACAO", cursoId: id(10) }, req());
    expect(relatorios).toHaveLength(1); expect(relatorios[0].curso).toBe("Sistemas de Informação");
    expect(await (c.service.listarRelatorios as any)({ busca: "inexistente" }, req())).toEqual([]);
    expect(await (c.service.listarRelatorios as any)({ ano: "2025/1" }, req())).toEqual([]);
  });
  it("propaga falha/escopo negado sem fallback externo ou resultado inventado", async () => {
    const c = criar(); const erro = { status: 403, codigo: "ESCOPO_PROIBIDO" }; c.repository.carregarResultadoAcademico.mockRejectedValueOnce(erro);
    await expect((c.service.listarRelatorios as any)({}, req("professor"))).rejects.toBe(erro);
    expect(c.gateway.listarLinhas).not.toHaveBeenCalled();
  });
  it("consulta gateway configurado somente após autorização e rejeita incompatibilidade", async () => {
    const c = criar(); c.gateway.estaConfigurado.mockReturnValue(true);
    const erro = { status: 502, codigo: "RESULTADO_EXTERNO_INCOMPATIVEL" }; c.gateway.listarLinhas.mockRejectedValueOnce(erro);
    await expect((c.service.listarRelatorios as any)({}, req())).rejects.toBe(erro);
    expect(c.gateway.listarLinhas).toHaveBeenCalledTimes(1);
    expect(c.gateway.listarLinhas.mock.calls[0][1]).toEqual(expect.arrayContaining([expect.objectContaining({
      turmaDisciplinaId: c.lote.ofertas[0].id, resultadoAcademico: c.lote.matriculas[0].resultadoAcademico })]));
  });
  it("status conserva fonte e contagens, exigindo autenticação", async () => {
    const c = criar();
    expect(await (c.service.obterStatusFonteDados as any)(req())).toEqual({ source: "database", schema: "piv", tabelas: { aluno: 1 } });
    await expect((c.service.obterStatusFonteDados as any)()).rejects.toMatchObject({ status: 401 });
  });
});

import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { FichaService } from "./FichaService";
import { calcularResultadoAcademico } from "../../notas/models/ResultadoAcademico";

// Nenhuma dependência desta unidade pode abrir pool/consultar SQL real.
vi.mock("../../../database/connection", () => {
  const db = vi.fn(() => { throw new Error("SQL real proibido nesta unidade."); });
  return { db, default: db };
});
vi.mock("../../notas/service/criarResultadoAcademicoService", () => ({ criarResultadoAcademicoService: () => ({ consultar: vi.fn() }) }));

const alunoId = "11111111-1111-1111-1111-111111111111";
const usuarioId = "22222222-2222-2222-2222-222222222222";
const matriculaId = "33333333-3333-3333-3333-333333333333";
const ofertaIds = ["44444444-4444-4444-4444-444444444444", "55555555-5555-5555-5555-555555555555"];
const mtdIds = ["66666666-6666-6666-6666-666666666666", "77777777-7777-7777-7777-777777777777"];
const avIds = ["88888888-8888-8888-8888-888888888888", "99999999-9999-9999-9999-999999999999"];
const req = (perfil = "secretaria") => ({ user: { id: usuarioId, tipo_usuario: perfil } }) as unknown as Request;

function criar() {
  const ofertas = ofertaIds.map((id, i) => ({ id, turma_id: `turma-${i}`, turma_sigla: "A", turma_descricao: "Turma",
    disciplina_id: "disciplina-comum", disciplina_nome: "Disciplina homônima", professor_id: `professor-${i}`, professor_nome: `Professor${i}`,
    periodo_letivo_id: `periodo-${i}`, periodo_codigo: `2026/${i + 1}`, avaliacoes: [{ id: avIds[i], tipo: "REGULAR", valor: i ? "300.00" : "120.00", descricao: "Plano regular" }] }));
  const matriculas = ofertas.map((o, i) => {
    const valor = i ? "179.99" : "72.00";
    const plano = { turmaDisciplinaId: o.id, regraPontuacaoId: `regra-${i}`, totalPontos: o.avaliacoes[0].valor,
      planoCompleto: true, podeCriarRegular: false, motivosBloqueio: [], subgrupos: [] };
    return { aluno_id: alunoId, aluno_nome: "Pessoa sintética", matricula_id: matriculaId, status_matricula: "ativa",
      matricula_turma_disciplina_id: mtdIds[i], turma_disciplina_id: o.id, notas: new Map([[avIds[i], valor]]),
      resultadoAcademico: calcularResultadoAcademico({ turmaDisciplinaId: o.id, matriculaTurmaDisciplinaId: mtdIds[i], plano,
        avaliacoes: o.avaliacoes as any, notasPorAvaliacao: new Map([[avIds[i], valor]]),
        frequencia: { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" } }) };
  });
  const lote = { contexto: { usuarioId, perfil: "secretaria" }, ofertas, matriculas };
  const service = new FichaService();
  const resultadoService = { consultar: vi.fn(async (_f: any, _req: any) => lote) };
  const alunoService = { buscarAlunoPorId: vi.fn(async () => ({ id: alunoId, pessoa: { nome: "Pessoa sintética", cpf: "cpf-sintético" } })) };
  const vinculos = ofertas.map((o, i) => ({ id: mtdIds[i], turma_disciplina_id: o.id, disciplina_id: o.disciplina_id,
    disciplina_nome: o.disciplina_nome, professor_nome: o.professor_nome, status: "ativa" }));
  const matriculaService = { listarPorAluno: vi.fn(async () => [{ id: matriculaId, periodo_letivo_codigo: "2026/1", turma_sigla: "A" }]),
    listarVinculos: vi.fn(async (_id: string) => vinculos) };
  const documentoService = { listarPorAluno: vi.fn(async () => [{ id: "documento-sintético" }]) };
  const periodoService = { listarPeriodosLetivos: vi.fn(async () => [{ id: "periodo-sintético", codigo: "2026/1" }]) };
  const frequenciaService = { consultarAlunoInterno: vi.fn(async () => ({ alunoId, consolidado: [] })) };
  const notaRepository = { buscarAvaliacoesParaFicha: vi.fn(async () => []) };
  Object.assign(service as any, { resultadoService, alunoService, matriculaService, documentoService, periodoService, frequenciaService, notaRepository });
  return { service, lote, resultadoService, alunoService, matriculaService, documentoService, periodoService, frequenciaService, notaRepository };
}

describe("FichaService autorizada e composta pelo resultado comum", () => {
  it.each(["professor", "aluno", "visitante"])("nega %s antes de carregar dados pessoais/documentos ou qualquer oferta", async (perfil) => {
    const c = criar();
    await expect((c.service.montarFicha as any)(alunoId, req(perfil))).rejects.toMatchObject({ status: 403 });
    for (const consulta of [c.resultadoService.consultar, c.alunoService.buscarAlunoPorId, c.matriculaService.listarPorAluno,
      c.matriculaService.listarVinculos, c.documentoService.listarPorAluno, c.periodoService.listarPeriodosLetivos,
      c.frequenciaService.consultarAlunoInterno, c.notaRepository.buscarAvaliacoesParaFicha]) expect(consulta).not.toHaveBeenCalled();
  });

  it("não autoriza consulta interna sem contexto autenticado", async () => {
    const c = criar();
    await expect(c.service.montarFicha(alunoId)).rejects.toMatchObject({ status: 403 });
    expect(c.alunoService.buscarAlunoPorId).not.toHaveBeenCalled();
  });

  it("normaliza UUID válido em maiúsculas antes do lote e das seções pessoais", async () => {
    const c = criar(); const canonico = "aaaaaaaa-aaaa-bbbb-cccc-dddddddddddd";
    for (const m of c.lote.matriculas) m.aluno_id = canonico;
    const request = req();
    await expect(c.service.montarFicha(canonico.toUpperCase(), request)).resolves.toBeDefined();
    expect(c.resultadoService.consultar).toHaveBeenCalledWith({ alunoId: canonico, incluirMatriculasHistoricas: true }, request);
    expect(c.alunoService.buscarAlunoPorId).toHaveBeenCalledWith(canonico);
    expect(c.documentoService.listarPorAluno).toHaveBeenCalledWith(canonico);
  });

  it.each(["secretaria", "administrador"])("permite ficha completa e histórica para %s usando requisição autenticada no lote", async (perfil) => {
    const c = criar(); c.lote.contexto.perfil = perfil;
    const request = req(perfil);
    const ficha = await (c.service.montarFicha as any)(alunoId, request);
    expect(c.resultadoService.consultar).toHaveBeenCalledWith({ alunoId, incluirMatriculasHistoricas: true }, request);
    expect(c.resultadoService.consultar).toHaveBeenCalledTimes(1);
    expect(Object.keys(ficha).sort()).toEqual(["aluno", "documentos", "frequencia", "matriculas", "notas", "periodos"].sort());
    expect(ficha.aluno.id).toBe(alunoId); expect(ficha.documentos).toEqual([{ id: "documento-sintético" }]);
    expect(c.notaRepository.buscarAvaliacoesParaFicha).not.toHaveBeenCalled();
  });

  it("preserva ofertas homônimas por UUID e matrícula, sem juntar períodos nem recalcular corte", async () => {
    const c = criar();
    const ficha = await (c.service.montarFicha as any)(alunoId, req());
    expect(ficha.notas).toHaveLength(2);
    expect(ficha.notas.map((n: any) => n.turmaDisciplinaId)).toEqual(ofertaIds);
    expect(ficha.notas.map((n: any) => n.matriculaTurmaDisciplinaId)).toEqual(mtdIds);
    expect(ficha.notas.map((n: any) => n.id)).toEqual(mtdIds);
    for (const [i, bloco] of ficha.notas.entries()) expect(bloco.resultadoAcademico).toEqual(c.lote.matriculas[i].resultadoAcademico);
    expect(ficha.notas[0]).toMatchObject({ periodoLetivo: "2026/1", media: 60, avaliacoes: [expect.objectContaining({ nota: "72.00", peso: "120.00" })] });
    expect(ficha.notas[1]).toMatchObject({ periodoLetivo: "2026/2", media: 60, resultadoAcademico: { resultadoPorNota: "EM_RECUPERACAO", aprovacaoDisciplina: "PENDENTE" } });
  });

  it("mantém ausência de nota e percentuais finais null sem transformar zero em ausência", async () => {
    const c = criar(); const m = c.lote.matriculas[0];
    m.notas.clear();
    Object.assign(m.resultadoAcademico, { etapaRegularCompleta: false, avaliacoesLancadas: 0, avaliacoesSemNota: [avIds[0]],
      pontosRegularesObtidos: "0.00", pontosMaximosLancados: "0.00", indicadorRegular: { percentual: null, parcial: true, denominadorPontos: "0.00" },
      pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "NAO_LANCADA", aprovacaoDisciplina: "PENDENTE" });
    c.lote.matriculas[1].notas.set(avIds[1], "0.00");
    const ficha = await (c.service.montarFicha as any)(alunoId, req());
    expect(ficha.notas[0].media).toBeNull(); expect(ficha.notas[0].avaliacoes[0].nota).toBeNull();
    expect(ficha.notas[1].avaliacoes[0].nota).toBe("0.00");
  });

  it("expande múltiplos vínculos e preserva matrícula sem vínculo com IDs nulos", async () => {
    const c = criar();
    c.matriculaService.listarPorAluno.mockResolvedValueOnce([{ id: matriculaId, periodo_letivo_codigo: "2026/1", turma_sigla: "A" }, { id: "matricula-sem-vinculo", periodo_letivo_codigo: "2026/2", turma_sigla: "B" }]);
    c.matriculaService.listarVinculos.mockImplementation(async (id) => id === matriculaId ? c.lote.ofertas.map((o, i) => ({ id: mtdIds[i], turma_disciplina_id: o.id, disciplina_id: o.disciplina_id, disciplina_nome: o.disciplina_nome, professor_nome: o.professor_nome, status: "ativa" })) : []);
    const ficha = await (c.service.montarFicha as any)(alunoId, req());
    expect(ficha.matriculas).toHaveLength(3);
    expect(ficha.matriculas[2]).toMatchObject({ matricula_id: "matricula-sem-vinculo", matricula_turma_disciplina_id: null, turma_disciplina_id: null, disciplina_nome: null });
  });

  it("reutiliza vínculos históricos autorizados do lote, sem buscar a matrícula e os vínculos novamente", async () => {
    const c = criar();
    c.lote.matriculas[0].status_matricula = "aprovada";
    c.lote.matriculas[1].status_matricula = "cancelada";
    c.matriculaService.listarVinculos.mockRejectedValue(new Error("Consulta por matrícula não faz parte da projeção em lote."));
    const ficha = await c.service.montarFicha(alunoId, req());
    expect(c.matriculaService.listarPorAluno).toHaveBeenCalledTimes(1);
    expect(c.matriculaService.listarVinculos).not.toHaveBeenCalled();
    expect(ficha.matriculas).toEqual(c.lote.matriculas.map((m, i) => expect.objectContaining({
      matricula_id: matriculaId, matricula_turma_disciplina_id: m.matricula_turma_disciplina_id,
      turma_disciplina_id: ofertaIds[i], disciplina_id: c.lote.ofertas[i].disciplina_id,
      disciplina_nome: c.lote.ofertas[i].disciplina_nome, professor_nome: c.lote.ofertas[i].professor_nome,
      vinculo_status: m.status_matricula, periodo_codigo: "2026/1", semestre: "A",
    })));
  });

  it("ordena pais por data decrescente/UUID e disciplinas por nome/UUID, preservando pai sem vínculo", async () => {
    const c = criar();
    c.lote.ofertas[0].disciplina_nome = "Zoologia";
    c.lote.ofertas[1].disciplina_nome = "Álgebra";
    c.lote.matriculas.reverse();
    const outroId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    c.matriculaService.listarPorAluno.mockResolvedValueOnce([
      { id: matriculaId, periodo_letivo_codigo: "2026/1", turma_sigla: "A", data_matricula: "2026-01-01" },
      { id: outroId, periodo_letivo_codigo: "2026/2", turma_sigla: "B", data_matricula: "2026-02-01" },
    ] as any);
    c.matriculaService.listarVinculos.mockImplementation(async (id) => id === matriculaId
      ? c.lote.ofertas.map((o, i) => ({ id: mtdIds[i], turma_disciplina_id: o.id, disciplina_id: o.disciplina_id,
        disciplina_nome: o.disciplina_nome, professor_nome: o.professor_nome, status: "ativa" })) : []);
    const ficha = await c.service.montarFicha(alunoId, req());
    expect(ficha.matriculas.map((m) => m.matricula_turma_disciplina_id)).toEqual([null, mtdIds[1], mtdIds[0]]);
    expect(ficha.matriculas[0]).toMatchObject({ matricula_id: outroId, periodo_codigo: "2026/2", semestre: "B", vinculo_status: null });
    expect(ficha.matriculas.slice(1).map((m) => m.disciplina_nome)).toEqual(["Álgebra", "Zoologia"]);
  });

  it("desempata datas e disciplinas homônimas por UUID sem alterar o lote recebido", async () => {
    const c = criar(); c.lote.matriculas.reverse();
    const outroId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    c.matriculaService.listarPorAluno.mockResolvedValueOnce([
      { id: outroId, periodo_letivo_codigo: "2026/2", turma_sigla: "B", data_matricula: "2026-01-01" },
      { id: matriculaId, periodo_letivo_codigo: "2026/1", turma_sigla: "A", data_matricula: "2026-01-01" },
    ] as any);
    const antes = [...c.lote.matriculas];
    const ficha = await c.service.montarFicha(alunoId, req());
    expect(ficha.matriculas.map((m) => m.matricula_turma_disciplina_id)).toEqual([...mtdIds, null]);
    expect(c.lote.matriculas).toEqual(antes);
    expect(c.matriculaService.listarVinculos).not.toHaveBeenCalled();
  });

  it.each(["resultado", "matriculas", "frequencia", "documentos", "periodos"])("propaga falha de %s sem simular seção vazia ou nota aprovada", async (nome) => {
    const c = criar(); const erro = new Error(`Falha sintética:${nome}`);
    const consulta = nome === "resultado" ? c.resultadoService.consultar : nome === "matriculas" ? c.matriculaService.listarPorAluno
      : nome === "frequencia" ? c.frequenciaService.consultarAlunoInterno : nome === "documentos" ? c.documentoService.listarPorAluno : c.periodoService.listarPeriodosLetivos;
    consulta.mockRejectedValueOnce(erro);
    await expect((c.service.montarFicha as any)(alunoId, req())).rejects.toBe(erro);
    if (nome === "resultado") expect(c.alunoService.buscarAlunoPorId).not.toHaveBeenCalled();
  });

  it("falha fechada quando a composição retorna contexto não autorizado ou matrícula de terceiro", async () => {
    const c = criar(); c.lote.contexto.perfil = "professor";
    await expect((c.service.montarFicha as any)(alunoId, req())).rejects.toMatchObject({ status: 403 });
    expect(c.alunoService.buscarAlunoPorId).not.toHaveBeenCalled();
    c.lote.contexto.perfil = "secretaria"; c.lote.matriculas[0].aluno_id = "outro-aluno";
    await expect((c.service.montarFicha as any)(alunoId, req())).rejects.toThrow(/incompatível|escopo/i);
    expect(c.alunoService.buscarAlunoPorId).not.toHaveBeenCalled();
  });
});

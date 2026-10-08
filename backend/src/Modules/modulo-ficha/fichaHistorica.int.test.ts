import type { Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startPgIntegration, type PgIntegration } from "../../test-helpers/pgIntegration";
import { criarPontuacaoFixture, criarAvaliacaoPontuacao, criarNotaPontuacao, type PontuacaoFixture } from "../../test-helpers/pontuacaoFixture";
import { ResultadoAcademicoService, type DependenciasResultadoAcademico } from "../notas/service/ResultadoAcademicoService";
import { EstruturaAcademicaGateway } from "../notas/gateways/EstruturaAcademicaGateway";
import { PlanoAvaliacaoGateway } from "../avaliacao/gateways/PlanoAvaliacaoGateway";
import { FrequenciaConsolidadaGateway } from "../frequencia/gateways/FrequenciaConsolidadaGateway";
import { AuthContextGateway } from "../notas/gateways/AuthContextGateway";
import type { NotaRepository } from "../notas/repository/NotaRepository";

let pg: PgIntegration;
let bancoGlobal: Knex;
let deps: DependenciasResultadoAcademico;
let repository: NotaRepository;
let FichaService: typeof import("./service/FichaService").FichaService;

beforeAll(async () => {
  pg = await startPgIntegration();
  const { NotaRepository } = await import("../notas/repository/NotaRepository");
  const { FrequenciaRepository } = await import("../frequencia/repository/FrequenciaRepository");
  const { avaliacaoRepository } = await import("../avaliacao/repository/avaliacaoRepository");
  ({ FichaService } = await import("./service/FichaService"));
  ({ db: bancoGlobal } = await import("../../database/connection"));
  repository = new NotaRepository(pg.db);
  deps = { banco: pg.db, auth: new AuthContextGateway(repository), estrutura: new EstruturaAcademicaGateway(),
    planos: new PlanoAvaliacaoGateway((ids, executor) => avaliacaoRepository.listarEmLote(ids, executor)),
    notas: repository, frequencia: new FrequenciaConsolidadaGateway(new FrequenciaRepository()) };
}, 180_000);

afterAll(async () => { try { await bancoGlobal?.destroy(); } finally { await pg?.stop(); } });

const req = (id: string, tipo_usuario = "secretaria") => ({ user: { id, tipo_usuario } }) as any;

async function completo() {
  const fixture = await criarPontuacaoFixture(pg.db, { totalPontos: "120.00", subgrupos: [
    { nome: "Regular", orcamento_pontos: "120.00", modo_quantidade: "FIXA", quantidade_fixa: 1 },
  ] });
  const avaliacaoId = await criarAvaliacaoPontuacao(pg.db, fixture, { valor: "120.00" });
  const notaId = await criarNotaPontuacao(pg.db, fixture, avaliacaoId, { valor: "72.00" });
  return { ...fixture, avaliacaoId, notaId };
}

function fichaService(fixture: PontuacaoFixture) {
  const resultadoService = new ResultadoAcademicoService(deps);
  const lerSecaoInstitucional = vi.fn();
  const service = new FichaService();
  // Resultado, autorização, plano, notas e frequência consolidada usam PostgreSQL real.
  // As demais seções ficam isoladas; a expansão lê somente os IDs desta fixture.
  Object.assign(service, {
    resultadoService,
    alunoService: { buscarAlunoPorId: async (id: string) => {
      lerSecaoInstitucional(); return { id, pessoa: { nome: "Aluno sintético" } };
    } },
    matriculaService: {
      listarPorAluno: (alunoId: string) => pg.db("piv.matricula").where({ aluno_id: alunoId }).select("*"),
      listarVinculos: (matriculaId: string) => pg.db("piv.matricula_turma_disciplina").where({ matricula_id: matriculaId }).select("*"),
    },
    frequenciaService: { consultarAlunoInterno: async () => [] },
    documentoService: { listarPorAluno: async () => { lerSecaoInstitucional(); return []; } },
    periodoService: { listarPeriodosLetivos: async () => [{ id: fixture.periodoId }] },
  });
  return { service, resultadoService, lerSecaoInstitucional };
}

async function snapshot(f: Awaited<ReturnType<typeof completo>>) {
  return {
    matricula: await pg.db("piv.matricula").where({ id: f.matriculaId }).first(),
    vinculo: await pg.db("piv.matricula_turma_disciplina").where({ id: f.matriculaDisciplinaId }).first(),
    avaliacao: await pg.db("piv.avaliacao").where({ id: f.avaliacaoId }).first(),
    nota: await pg.db("piv.nota").where({ id: f.notaId }).first(),
  };
}

describe("ficha institucional - preservação de notas históricas autorizadas", () => {
  it("continua compondo a matrícula ativa com resultado comum e pontos textuais", async () => {
    const f = await completo();
    const { service } = fichaService(f);
    const ficha = await service.montarFicha(f.alunoId, req(f.usuarioId));
    expect(ficha.notas.find((nota) => nota.matriculaTurmaDisciplinaId === f.matriculaDisciplinaId))
      .toMatchObject({ turmaDisciplinaId: f.ofertaId, avaliacoes: [{ id: f.avaliacaoId, nota: "72.00", peso: "120.00" }],
        resultadoAcademico: { pontosEfetivos: "72.00", totalPontos: "120.00", resultadoPorNota: "SUFICIENTE" } });
  });

  it.each([
    { nome: "pai concluído", matriculaStatus: "concluida", vinculoStatus: "ativa" },
    { nome: "vínculo aprovado", matriculaStatus: "ativa", vinculoStatus: "aprovada" },
    { nome: "vínculo reprovado", matriculaStatus: "ativa", vinculoStatus: "reprovada" },
    { nome: "matrícula e vínculo cancelados", matriculaStatus: "cancelada", vinculoStatus: "cancelada" },
  ])("preserva IDs, nota e resultado da ficha com $nome, sem alterar a leitura ativa padrão", async (caso) => {
    const f = await completo();
    await pg.db("piv.matricula").where({ id: f.matriculaId }).update({ status: caso.matriculaStatus });
    await pg.db("piv.matricula_turma_disciplina").where({ id: f.matriculaDisciplinaId }).update({ status: caso.vinculoStatus });
    const antes = await snapshot(f);
    // O seletor usado pela ficha anterior à US3 também inclui este histórico.
    expect(await repository.buscarAvaliacoesParaFicha([f.matriculaDisciplinaId], pg.db))
      .toEqual([expect.objectContaining({ id: f.avaliacaoId, nota: "72.00", matricula_turma_disciplina_id: f.matriculaDisciplinaId })]);
    const { service, resultadoService } = fichaService(f);
    const leituraAtiva = await resultadoService.consultar({ alunoId: f.alunoId }, req(f.usuarioId));
    expect(leituraAtiva.matriculas.some((m) => m.matricula_turma_disciplina_id === f.matriculaDisciplinaId)).toBe(false);
    const ficha = await service.montarFicha(f.alunoId, req(f.usuarioId));
    expect(ficha.matriculas).toContainEqual(expect.objectContaining({
      matricula_id: f.matriculaId, matricula_turma_disciplina_id: f.matriculaDisciplinaId,
      status: caso.matriculaStatus, vinculo_status: caso.vinculoStatus,
    }));
    expect(await snapshot(f)).toEqual(antes);
    expect(ficha.notas.find((nota) => nota.matriculaTurmaDisciplinaId === f.matriculaDisciplinaId))
      .toMatchObject({ turmaDisciplinaId: f.ofertaId, avaliacoes: [{ id: f.avaliacaoId, nota: "72.00", peso: "120.00" }],
        resultadoAcademico: { matriculaTurmaDisciplinaId: f.matriculaDisciplinaId,
          pontosEfetivos: "72.00", totalPontos: "120.00", resultadoPorNota: "SUFICIENTE" } });
  });

  it.each(["professor", "aluno"])("continua negando a ficha inteira ao perfil %s antes de consultar seções pessoais", async (perfil) => {
    const f = await completo();
    const { service, lerSecaoInstitucional } = fichaService(f);
    const queries: string[] = [];
    const registrar = (query: any) => queries.push(query.sql);
    pg.db.on("query", registrar);
    try { await expect(service.montarFicha(f.alunoId, req(f.usuarioId, perfil))).rejects
      .toMatchObject({ status: 403, codigo: "PERFIL_PROIBIDO" }); }
    finally { pg.db.off("query", registrar); }
    expect(queries).toEqual([]);
    expect(lerSecaoInstitucional).not.toHaveBeenCalled();
  });
});

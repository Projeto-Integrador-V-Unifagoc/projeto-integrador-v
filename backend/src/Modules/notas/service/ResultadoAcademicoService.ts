import type { Knex } from "knex";
import type { Request } from "express";
import { snapshotAcademico, type ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import type { AuthContextGateway, ContextoNota } from "../gateways/AuthContextGateway";
import type { EstruturaAcademicaGateway, FiltrosResultadoAcademico, OfertaResultadoAcademico, MatriculaResultadoAcademico } from "../gateways/EstruturaAcademicaGateway";
import type { PlanoAvaliacaoGateway, PlanoResultadoLote } from "../../avaliacao/gateways/PlanoAvaliacaoGateway";
import type { FrequenciaConsolidadaGateway } from "../../frequencia/gateways/FrequenciaConsolidadaGateway";
import type { NotaRepository } from "../repository/NotaRepository";
import { calcularResultadoAcademico, type ResultadoAcademico } from "../models/ResultadoAcademico";

export interface DependenciasResultadoAcademico {
  banco: Knex;
  auth: Pick<AuthContextGateway, "obterContexto">;
  estrutura: Pick<EstruturaAcademicaGateway, "carregar">;
  planos: Pick<PlanoAvaliacaoGateway, "carregar">;
  notas: Pick<NotaRepository, "listarNotasEmLote">;
  frequencia: Pick<FrequenciaConsolidadaGateway, "carregar">;
}

/** Um snapshot, um executor e consultas em lote. Nenhum cálculo alternativo nos leitores. */
export class ResultadoAcademicoService {
  constructor(private readonly deps: DependenciasResultadoAcademico) {}

  consultar(filtros: FiltrosResultadoAcademico, req: Request) {
    return snapshotAcademico(this.deps.banco, async (trx) => {
      const ctx = await this.deps.auth.obterContexto(req, trx);
      return this.compor(filtros, ctx, trx);
    });
  }

  /** Entrada interna para escritores que já revalidaram contexto sob T010. Não abre savepoint. */
  async compor(filtros: FiltrosResultadoAcademico, ctx: ContextoNota, executor: ExecutorAcademico) {
    const estrutura = await this.deps.estrutura.carregar(filtros, ctx, executor);
    const ofertasAutorizadas = new Set(estrutura.ofertas.map((o) => o.id));
    if (estrutura.matriculas.some((m) => !ofertasAutorizadas.has(m.turma_disciplina_id))) {
      throw new Error("Matrícula acadêmica incompatível com a estrutura autorizada.");
    }
    // Sequenciais no mesmo cliente PostgreSQL; listas nunca ampliadas depois da autorização.
    const planos = await this.deps.planos.carregar(estrutura.ofertas, executor);
    if (estrutura.ofertas.some((o) => !planos.has(o.id))) throw new Error("Lote de planos acadêmicos incompleto.");
    const ids = estrutura.matriculas.map((m) => m.matricula_turma_disciplina_id);
    const notas = await this.deps.notas.listarNotasEmLote(ids, executor);
    const frequencias = await this.deps.frequencia.carregar(ids, executor);
    const matriculasPorId = new Map(estrutura.matriculas.map((m) => [m.matricula_turma_disciplina_id, m]));
    const notasPorMatricula = new Map<string, Map<string, string>>();
    for (const nota of notas) {
      const matricula = matriculasPorId.get(nota.matricula_turma_disciplina_id);
      const plano = matricula ? planos.get(matricula.turma_disciplina_id) : undefined;
      if (!matricula || nota.turma_disciplina_id !== matricula.turma_disciplina_id ||
        !plano?.avaliacoes.some((a) => a.id === nota.avaliacao_id)) {
        throw new Error("Nota acadêmica incompatível com o lote autorizado.");
      }
      const mapa = notasPorMatricula.get(matricula.matricula_turma_disciplina_id) ?? new Map<string, string>();
      if (mapa.has(nota.avaliacao_id)) throw new Error("Nota acadêmica duplicada no lote.");
      mapa.set(nota.avaliacao_id, nota.valor);
      notasPorMatricula.set(matricula.matricula_turma_disciplina_id, mapa);
    }
    const ofertas = estrutura.ofertas.map((oferta): OfertaResultadoAcademico & PlanoResultadoLote => {
      const dados = planos.get(oferta.id);
      if (!dados) throw new Error("Lote de planos acadêmicos incompleto.");
      return { ...oferta, ...dados };
    });
    const matriculas = estrutura.matriculas.map((matricula): MatriculaResultadoAcademico & {
      notas: Map<string, string>; resultadoAcademico: ResultadoAcademico;
    } => {
      const dados = planos.get(matricula.turma_disciplina_id);
      const frequencia = frequencias.get(matricula.matricula_turma_disciplina_id);
      if (!dados || !frequencia) throw new Error("Lote de resultado acadêmico incompleto.");
      const mapa = notasPorMatricula.get(matricula.matricula_turma_disciplina_id) ?? new Map<string, string>();
      return { ...matricula, notas: mapa, resultadoAcademico: calcularResultadoAcademico({
        turmaDisciplinaId: matricula.turma_disciplina_id,
        matriculaTurmaDisciplinaId: matricula.matricula_turma_disciplina_id,
        plano: dados.plano, avaliacoes: dados.avaliacoes, notasPorAvaliacao: mapa, frequencia,
      }) };
    });
    return { contexto: ctx, ofertas, matriculas };
  }
}
